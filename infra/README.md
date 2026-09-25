# Infrastructure

Azure deployment for SmartProperty, sized for the Azure for Students $100 credit.

| Component | Service | Cost |
|---|---|---|
| Frontend | Static Web Apps (Free) | $0 |
| API | Container Apps (consumption) | ~$3–5/mo warm |
| Database | Cosmos DB for MongoDB vCore (free tier) | $0 |
| Logs | Log Analytics (5 GB/mo free) | $0 |
| Registry | GitHub Container Registry | $0 |

No Redis: the backend registers no Bull queues, so it was removed rather
than deployed. Azure Cache for Redis Basic would have been ~$16/mo.

## Files

- `main.bicep` — Log Analytics, Container Apps environment, the API container
  app, and the Static Web App.
- `../.github/workflows/deploy.yml` — test → build image → deploy → smoke test.

## One-time setup

### 1. Resource group

```bash
az login
az account set --subscription "Azure for Students"
az group create -n rg-smartproperty -l westeurope
az extension add --name containerapp --upgrade
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
```

Keep `westeurope` unless you have a reason not to. Static Web Apps Free is
only offered in a subset of regions, and cross-region traffic costs money.

### 2. Database

Create **Cosmos DB for MongoDB vCore** on its free tier in the portal
(Cosmos DB → MongoDB → vCore → Free tier). It speaks the MongoDB 6/7 wire
protocol, so the existing TypeORM driver works unchanged. Avoid the older
RU-based Mongo API.

Under Networking, allow access from Azure services. Copy the connection
string — it already includes `tls=true`.

### 3. OIDC federated credentials

This is what lets the workflow authenticate **without storing an Azure
secret in GitHub**. Replace `<owner>/<repo>`:

```bash
# App registration + service principal
appId=$(az ad app create --display-name smartproperty-deploy --query appId -o tsv)
az ad sp create --id "$appId"

# Trust GitHub Actions on the main branch of this repo
az ad app federated-credential create --id "$appId" --parameters '{
  "name": "github-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:<owner>/<repo>:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'

# Scope its permissions to this resource group only, never the subscription
subId=$(az account show --query id -o tsv)
az role assignment create \
  --assignee "$appId" \
  --role Contributor \
  --scope "/subscriptions/$subId/resourceGroups/rg-smartproperty"

echo "AZURE_CLIENT_ID=$appId"
echo "AZURE_SUBSCRIPTION_ID=$subId"
echo "AZURE_TENANT_ID=$(az account show --query tenantId -o tsv)"
```

The `subject` must match the workflow's trigger exactly. A workflow running
on a different branch, or on a pull request, will not match
`ref:refs/heads/main` and login will fail with a generic credential error.

### 4. GitHub repository secrets

Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `AZURE_CLIENT_ID` | from step 3 |
| `AZURE_TENANT_ID` | from step 3 |
| `AZURE_SUBSCRIPTION_ID` | from step 3 |
| `MONGODB_URI` | Cosmos connection string |
| `MONGODB_USERNAME` | Cosmos admin user |
| `MONGODB_PASSWORD` | Cosmos admin password |
| `JWT_SECRET` | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | `openssl rand -base64 48` — a different value |
| `CORS_ORIGIN` | Static Web App URL; set after the first deploy |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | portal → the SWA → Manage deployment token |

`MONGODB_USERNAME` and `MONGODB_PASSWORD` are required by the app's config
schema **even though** `MONGODB_URI` already contains them. Omitting them
fails Joi validation and the container will not start.

Both JWT secrets must be at least 32 characters. Shorter and the API
deliberately refuses to boot.

## First deployment

```bash
az deployment group what-if \
  --resource-group rg-smartproperty \
  --template-file infra/main.bicep \
  --parameters backendImage=ghcr.io/<owner>/smartproperty-backend:latest \
               mongodbUri='<...>' mongodbUsername='<...>' mongodbPassword='<...>' \
               jwtSecret='<...>' jwtRefreshSecret='<...>'
```

Run `what-if` before `create` — it prints exactly what will change.

There is a deliberate two-pass ordering:

1. Deploy the API, note its FQDN.
2. Build the frontend with that URL — `VITE_*` variables are baked in at
   build time, so setting them as Static Web App settings does nothing.
3. Set `CORS_ORIGIN` to the Static Web App URL and redeploy the API.

The workflow handles pass 2 automatically by reading the API URL from the
deployment output. `CORS_ORIGIN` is the one value you set by hand after the
Static Web App exists.

## After deploying

- Make the GHCR package public (`ghcr.io/<owner>/smartproperty-backend` →
  Package settings → Change visibility), or add `registries` credentials to
  `main.bicep`. A private package without credentials fails to pull.
- Update the Google and Facebook OAuth callback URLs to the deployed hosts.
- Seed demo data. `SEED_PASSWORD` is required outside development.
- Set a budget alert at $50 and $80: Cost Management → Budgets.

## Notes

- `maxReplicas` is pinned to 1. The rate limiter uses in-memory storage, so
  each replica counts independently and scaling out multiplies the effective
  limit.
- `minReplicas: 0` scales to zero and costs almost nothing, at the price of
  a cold start of roughly 10–30s on the first request.
