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
| `GHCR_PULL_TOKEN` | GitHub PAT with `read:packages`, for pulling the image |
| `CORS_ORIGIN` | extra origins only; the site's own URL is added automatically |

Optional repository **variable** (not a secret): `API_NAME_SUFFIX`. Set it to
`2`, `3`, … only to recover from a stuck express-environment artifact, as
described under Notes. It changes the container app's name and FQDN.

`GHCR_PULL_TOKEN` is required because this organization disables public and
internal package visibility, so the image cannot be pulled anonymously. If it
is absent the template renders `registries: []` and the container app fails to
pull with an error that does not mention authentication.

Both JWT secrets must be at least 32 characters. Shorter and the API
deliberately refuses to boot.

No database secrets: the template creates the Cosmos account and reads its
connection string and key with `listConnectionStrings()` and `listKeys()`,
which ARM resolves at deploy time. No database credential is ever typed by
hand or stored in CI.

## Database

The app runs against **MongoDB Atlas** (free M0), not the Cosmos account this
template creates. Cosmos DB's RU-based Mongo API requires an index for every
sorted field and supports only a subset of the aggregation pipeline. This
codebase has 42 sorted queries, three aggregation pipelines, and one endpoint
that sorts on a user-supplied field - so the set of required indexes is not
knowable ahead of time and a missing one fails at runtime, not at build time.

The vCore tier has none of these limits, but its free tier is not offered in
any region this subscription's policy allows.

Set `MONGODB_URI` on the container app to the Atlas connection string.
`MONGODB_RETRY_WRITES` may be left unset; it exists only to disable retryable
writes, which Cosmos rejects and Atlas supports.

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

## Custom domain

`https://smartproperties.tech` serves the frontend. Getting there needed a
route around two Azure limits:

- **Container Apps custom domains are unavailable.** The express environment
  this subscription provisions rejects them with
  `ExpressEnvironmentFeatureNotSupported`, alongside managed identity,
  revision suffixes and revision restarts. So the API stays on its
  `azurecontainerapps.io` hostname; it is not user-visible.
- **Blob Storage static websites cannot serve a certificate for a custom
  domain**, and they route by `Host` header, so pointing a CNAME at the web
  endpoint returns `400 InvalidUri`.

The domain is on Cloudflare (free), which terminates TLS with a Let's Encrypt
certificate and rewrites the `Host` header toward the storage endpoint.

The rewrite is done with **Cloud Connector** (Rules -> Cloud Connector),
*not* Origin Rules: Origin Rules' Host Header override is Enterprise-only,
while Cloud Connector is free and purpose-built for cloud object storage.

DNS records:

| Type | Name | Content | Proxy |
|---|---|---|---|
| CNAME | `@` | the storage web endpoint | Proxied |
| CNAME | `api` | the container app FQDN | DNS only |
| TXT | `asuid.api` | the app's customDomainVerificationId | - |

The `api` records are left over from an attempt to bind a custom domain to
the container app and are currently unused. `CORS_ORIGIN` on the container
app must include `https://smartproperties.tech`.

Deep links return HTTP 404 while serving `index.html`, so React Router
renders the route correctly but crawlers see the wrong status. Fixing that
properly needs a CDN rewrite rule rather than an error-document fallback.

## Object storage

Uploads go to **Cloudflare R2**, which speaks the S3 API, so the existing
MinIO client is reused rather than replaced. Two settings make it work:

| Variable | Value | Why |
|---|---|---|
| `MINIO_ENDPOINT` | `<account>.r2.cloudflarestorage.com` | R2's S3 endpoint |
| `MINIO_PORT` / `MINIO_USE_SSL` | `443` / `true` | |
| `MINIO_REGION` | `auto` | R2 requires it; without a region the SDK attempts GetBucketLocation, which R2 answers differently from S3 |
| `MINIO_BUCKET_NAME` | `smartproperty` | |
| `MINIO_PUBLIC_URL` | `https://pub-<id>.r2.dev` | the bucket's public r2.dev domain |
| `MINIO_PUBLIC_INCLUDE_BUCKET` | `false` | r2.dev is already bound to one bucket and serves `{publicUrl}/{key}`; including the bucket 404s |

The R2 API token is scoped to **Object Read & Write** on this bucket only. It
cannot perform bucket-level operations, so `ensureBucketExists()` logs
`Failed to ensure bucket exists` on every start. That is expected and
harmless - the error is caught and the bucket already exists.

## Deploying a new image

Container Apps caches `:latest`, and cycling replicas does not re-pull it.
Deploy by digest so the rollout is unambiguous:

```bash
docker build --target prod -t ghcr.io/<owner>/smartproperty-backend:latest ./backend
docker push ghcr.io/<owner>/smartproperty-backend:latest   # note the digest
az containerapp update -n ca-smartproperty-api2 -g rg-smartproperty   --image ghcr.io/<owner>/smartproperty-backend@sha256:<digest>
```

Changing the image this way does restart the container, unlike a secret change.

## Operational notes

**Changing a secret does not restart the container.** On the express
Container Apps environment this subscription gets, `az containerapp secret
set` updates the stored value but the running process keeps the value it was
started with. `az containerapp revision restart` fails with
`InternalServerError`, `--revision-suffix` is rejected, and `update
--set-env-vars` reports Succeeded without cycling the process. The only
reliable way to pick up a new secret:

```bash
az containerapp update -n <app> -g rg-smartproperty --min-replicas 0
# wait until: az containerapp replica list -n <app> -g rg-smartproperty
#             --query 'length(@)' -o tsv   returns 0
az containerapp update -n <app> -g rg-smartproperty --min-replicas 1
```

Check `properties.containers[].runningStateDetails` on the replica: if the
container start time predates the secret change, it is still running the old
value regardless of what `secret show` reports.

**Atlas rejects unlisted IPs at the TLS layer**, not with an auth error. The
symptom is `MongoServerSelectionError: ... tlsv1 alert internal error: SSL
alert number 80`, which reads like a certificate problem. Check the Atlas IP
Access List first. Container Apps on consumption has no stable egress IP, so
the list needs `0.0.0.0/0`.

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
