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

### 2. Deploy identity (OIDC)

This lets the Deploy workflow sign in to Azure **without any Azure secret
stored in GitHub**. GitHub gives each job a short-lived OIDC token, and Azure
exchanges it for an access token because a federated credential trusts it.

The usual recipe puts that credential on an Entra **app registration**, but
this tenant does not let student accounts create one (`az ad app create`
returns *Insufficient privileges*). A **user-assigned managed identity** can
carry federated credentials too, and it is an ordinary Azure resource, so the
subscription's Owner can create it:

```bash
rg=rg-smartproperty
az identity create -n id-smartproperty-deploy -g $rg -l italynorth

az identity federated-credential create \
  --identity-name id-smartproperty-deploy -g $rg --name github-production \
  --issuer https://token.actions.githubusercontent.com \
  --subject "repo:smartproperty-team/Smartproperty:environment:production" \
  --audiences api://AzureADTokenExchange
```

The identity is not attached to the container app (the express environment
rejects that); it exists only for the workflow to sign in as.

The `subject` trusts **only jobs that run in this repository's `production`
environment**. A pull request, a fork, or any job without that environment
presents a different subject and is refused.

It gets three narrow roles rather than Contributor on the group:

```bash
pid=$(az identity show -n id-smartproperty-deploy -g $rg --query principalId -o tsv)
scope=$(az group show -n $rg --query id -o tsv)
grant() {
  az role assignment create --assignee-object-id "$pid" \
    --assignee-principal-type ServicePrincipal --role "$1" --scope "$scope/providers/$2"
}
# Change the API's image
grant "Container Apps Contributor" Microsoft.App/containerApps/ca-smartproperty-api2
# Updating an app also needs managedEnvironments/join/action on its
# environment. On the environment itself this role grants only read and join.
grant "Container Apps Contributor" Microsoft.App/managedEnvironments/cae-smartproperty
# Publish the site: blob access to the $web container only
grant "Storage Blob Data Contributor" \
  'Microsoft.Storage/storageAccounts/stwebsmartpropertybyzjdc/blobServices/default/containers/$web'
```

So a deploy can do anything to the API's container app, including reading and
changing its settings and secrets, and can write the site's files - and
nothing else: no other resource, no other blob, no role assignments.

### 3. GitHub settings

Settings → Secrets and variables → Actions:

| Name | Kind | Value |
|---|---|---|
| `AZURE_CLIENT_ID` | secret | `az identity show -n id-smartproperty-deploy -g rg-smartproperty --query clientId -o tsv` |
| `AZURE_TENANT_ID` | secret | `az account show --query tenantId -o tsv` |
| `AZURE_SUBSCRIPTION_ID` | secret | `az account show --query id -o tsv` |
| `AZURE_DEPLOY_ENABLED` | variable | `true` to deploy every push to `main` |

None of the three IDs is a credential - the trust lives in the federated
credential - but secrets keep them out of the logs.

The first run that deploys creates the `production` environment. Then, under
Settings → Environments → production, set **Deployment branches** to `main`
only, so a run started by hand on another branch cannot deploy. Adding
**Required reviewers** there would make every deploy wait for an approval.

`main.bicep` is applied by hand (see First deployment), not by the workflow.
It needs `jwtSecret` and `jwtRefreshSecret` (at least 32 characters each, or
the API refuses to boot) and, because this organization disables public
packages, `ghcrUsername` and `ghcrToken` (a PAT with `read:packages`). Without
the token the template renders `registries: []` and the container app fails to
pull with an error that does not mention authentication.

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

The Deploy workflow repeats pass 2 on every deploy, reading the API URL from
the container app. `CORS_ORIGIN` is the one value set by hand once the site
URL exists.

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
| `MINIO_PRIVATE_BUCKET_NAME` | `smartproperty-private` | optional, this is the default; see below |

Listing and profile photos go to `smartproperty`, which is public through its
r2.dev domain. Verification documents (ID, proof of income) go to
`smartproperty-private`, which must **never** get an r2.dev or custom domain:
R2 makes a whole bucket public or none of it, so the two cannot share one. The
backend reads private files only through signed links that expire after 10
minutes.

The R2 API token is scoped to **Object Read & Write** on these two buckets
only. It cannot perform bucket-level operations, so `ensureBucketExists()`
logs `Failed to ensure bucket '...' exists` for each bucket on every start.
That is expected and harmless - the error is caught and the buckets already
exist. Create a new bucket in the Cloudflare dashboard, then add it to the
token.

## Continuous deployment

`.github/workflows/deploy.yml`, on every push to `main`:

1. **Test** - backend type check and a frontend build.
2. **Build and push API image** - tagged with the commit and pushed to GHCR.
   The commit is baked into the image, and `/api/health` reports it.
3. **Deploy API**, in the `production` environment - records the running
   image, points the container app at the new one *by digest*, then checks it:
   - `/api/health` must report this commit within 5 minutes;
   - then 10 healthy responses in a row, within 3 minutes;
   - then `GET /api/properties` must succeed, which needs the database.

   If a check fails, the job puts the previous image back and fails.
4. **Deploy frontend** - builds the site against the API's URL and uploads the
   hashed bundles, then the other files, then `index.html` last, so no visitor
   gets a page whose scripts are missing. It then checks the live site serves
   the new bundle. Hashed bundles are cached for a year; `index.html` is not
   cached.

Steps 3 and 4 run on a push only while `AZURE_DEPLOY_ENABLED` is `true`.
Running the workflow by hand (Actions → Deploy → Run workflow) always deploys.
Deploys queue behind each other and are never cancelled half-way.

The workflow does **not** apply `main.bicep`. Production has moved on from the
template - MongoDB Atlas instead of Cosmos DB, R2 storage settings set by hand -
so applying it would overwrite live settings. Until the template is brought
back in line, treat it as the record of the initial setup.

**A deploy briefly drops requests.** The express environment keeps a single
revision, `latest`, and replaces it in place, so the old and new versions never
serve side by side, and the readiness probe cannot close that gap. When last
measured, requests failed intermittently for about two minutes. The checks in
step 3 allow for that gap, but not for a build that keeps failing.

### Deploying or rolling back by hand

Every Build run's summary prints the command to deploy its image, and every
Deploy run's summary shows the image it replaced. Either way it is one command:

```bash
az containerapp update -n ca-smartproperty-api2 -g rg-smartproperty \
  --image ghcr.io/smartproperty-team/smartproperty-backend@sha256:<digest>
```

Always deploy by digest. Container Apps caches `:latest`, and cycling replicas
does not re-pull it. Changing the image restarts the container, unlike a secret
change.

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
  it was switched on once by hand with
  `az storage blob service-properties update --static-website`.
  `index.html` is also the 404 document, which gives the React SPA its
  client-side routing fallback.
