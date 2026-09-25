# Infrastructure

Azure deployment for SmartProperty, sized for the Azure for Students $100 credit.

## The constraint that shaped this

This subscription carries an **"Allowed resource deployment regions"** policy
limiting every resource to:

```
austriaeast  germanywestcentral  italynorth  polandcentral  spaincentral
```

Two consequences, both verified with `az provider show`:

- **Azure Static Web Apps cannot be used.** It exists in only five regions
  worldwide (Central US, East US 2, West US 2, West Europe, East Asia) and
  none is permitted here. The frontend is served from a storage account's
  static website endpoint instead.
- **The Cosmos DB vCore free tier cannot be used.** Its free regions do not
  intersect the allowed list either. The RU-based account is used, whose
  free tier gives 1000 RU/s and 25 GB. The codebase issues no aggregation
  pipelines, which is where the RU API's compatibility gaps appear.

Default region is `italynorth`, the closest permitted region to Tunisia.
`polandcentral` is the fallback if capacity is reported.

## What gets created

| Resource | Purpose | Cost |
|---|---|---|
| Log Analytics workspace | Container Apps requires one | $0 (5 GB/mo free) |
| Container Apps environment | Networking and logging boundary | $0 |
| Container App `ca-smartproperty-api` | The NestJS API | ~$3–5/mo warm |
| Cosmos DB (MongoDB, RU, free tier) | Database, capped at 1000 RU/s | $0 |
| Storage account `stweb…` | Static website for the React build | ~$0.05/mo |

No Redis: the backend registers no Bull queues.

## One-time setup

### 1. Resource group and providers

```bash
az login
az account set --subscription <subscription-id>
az group create -n rg-smartproperty -l westeurope

az extension add --name containerapp --upgrade
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
az provider register --namespace Microsoft.DocumentDB
az provider register --namespace Microsoft.Storage
```

The resource group may sit in `westeurope` even though resources may not —
a group's location only stores its metadata.

### 2. OIDC federated credentials

This is what lets the workflow authenticate **without storing an Azure secret
in GitHub**. Replace `<owner>/<repo>`:

```bash
appId=$(az ad app create --display-name smartproperty-deploy --query appId -o tsv)
az ad sp create --id "$appId"

az ad app federated-credential create --id "$appId" --parameters '{
  "name": "github-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:<owner>/<repo>:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'

subId=$(az account show --query id -o tsv)
rg="/subscriptions/$subId/resourceGroups/rg-smartproperty"

# Control plane: create and update resources in this group only
az role assignment create --assignee "$appId" --role Contributor --scope "$rg"

# Data plane: Contributor does NOT allow writing blobs. The frontend upload
# uses --auth-mode login, so this second assignment is required or the
# deploy job fails with an authorization error at the upload step.
az role assignment create --assignee "$appId" \
  --role "Storage Blob Data Contributor" --scope "$rg"

echo "AZURE_CLIENT_ID=$appId"
echo "AZURE_SUBSCRIPTION_ID=$subId"
echo "AZURE_TENANT_ID=$(az account show --query tenantId -o tsv)"
```

The `subject` must match the workflow's trigger exactly. A run on another
branch, or from a pull request, produces a different subject, does not match,
and fails with a generic credential error — it is not a wrong secret, it is a
trust rule that does not cover that run.

### 3. GitHub repository secrets

Settings → Secrets and variables → Actions. Six values:

| Secret | Value |
|---|---|
| `AZURE_CLIENT_ID` | from step 2 |
| `AZURE_TENANT_ID` | from step 2 |
| `AZURE_SUBSCRIPTION_ID` | from step 2 |
| `JWT_SECRET` | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | `openssl rand -base64 48` — a different value |
| `CORS_ORIGIN` | the static website URL; set after the first deploy |

Both JWT secrets must be at least 32 characters. Shorter and the API
deliberately refuses to boot.

No database secrets: the template creates the Cosmos account and reads its
connection string and key with `listConnectionStrings()` and `listKeys()`,
which ARM resolves at deploy time. No database credential is ever typed by
hand or stored in CI.

## First deployment

Always `what-if` first. It prints exactly what would change and creates
nothing:

```bash
az deployment group what-if \
  --resource-group rg-smartproperty \
  --template-file infra/main.bicep \
  --parameters backendImage=ghcr.io/<owner>/smartproperty-backend:latest \
               jwtSecret="$(openssl rand -base64 48)" \
               jwtRefreshSecret="$(openssl rand -base64 48)"
```

Swap `what-if` for `create` when the plan looks right. Re-running is safe.

There is a deliberate two-pass ordering:

1. Deploy the API and the storage account.
2. Build the frontend with the API URL — `VITE_*` variables are baked in at
   build time, so runtime settings cannot supply them.
3. Set `CORS_ORIGIN` to the static website URL and redeploy the API.

The workflow handles pass 2 by reading the API URL from the deployment
output. `CORS_ORIGIN` is the one value set by hand once the site URL exists.

## After deploying

- Make the GHCR package public (Package settings → Change visibility), or add
  `registries` credentials to `main.bicep`. A private package without
  credentials fails to pull with an error that does not mention permissions.
- Update the Google and Facebook OAuth callback URLs to the deployed hosts.
- Seed demo data. `SEED_PASSWORD` is required outside development.
- Set a budget alert at $50 and $80: Cost Management → Budgets.

## Notes

- `maxReplicas` is pinned to 1. The rate limiter uses in-memory storage, so
  each replica counts independently and scaling out multiplies the effective
  limit.
- `minReplicas: 0` scales to zero and costs almost nothing, at the price of a
  10–30s cold start on the first request.
- The Cosmos account sets `totalThroughputLimit: 1000`, a hard ceiling at the
  free allowance so nothing can quietly overrun it.
- Static website hosting is a data-plane setting that ARM cannot enable, so
  the workflow turns it on with `az storage blob service-properties update`.
  `index.html` is also the 404 document, which gives the React SPA its
  client-side routing fallback.
