// ===========================================
// SmartProperty - Azure Infrastructure
// ===========================================
// Resource-group scoped. Create the group first:
//   az group create -n rg-smartproperty -l westeurope
//
// Sized for the Azure for Students $100 credit:
//   - Static Web Apps Free tier          $0
//   - Container Apps consumption         ~$3-5/mo warm
//   - Log Analytics (5 GB/mo free)       $0
//   - No Redis: the backend registers no Bull queues.

targetScope = 'resourceGroup'

@description('Short name used as a prefix for every resource.')
param appName string = 'smartproperty'

@description('''
Deployment region. This subscription carries an "Allowed resource deployment
regions" policy limiting it to: austriaeast, germanywestcentral, italynorth,
polandcentral, spaincentral. Italy North is the closest of those to Tunisia.
If a region reports capacity problems, polandcentral is the well-established
fallback.
''')
@allowed([
  'austriaeast'
  'germanywestcentral'
  'italynorth'
  'polandcentral'
  'spaincentral'
])
param location string = 'italynorth'

@description('Container image for the API, e.g. ghcr.io/<owner>/smartproperty-backend:<sha>.')
param backendImage string

@description('''
Suffix for the API container app's name. Deleting a container app on an
express environment leaves an internal artifact pending for a long while, and
recreating under the same name fails with FailedIdentityOperation / "resource
already exists". Bumping this sidesteps the stuck artifact. Changing it
changes the API's FQDN.
''')
param apiNameSuffix string = ''

@description('''
GitHub username for pulling the image from ghcr.io. Required only when the
package is private - which it is here, because the organization disables
public packages.
''')
param ghcrUsername string = ''

@description('GitHub PAT with read:packages, used to pull the private image.')
@secure()
param ghcrToken string = ''

@description('JWT signing secret. Minimum 32 characters or the API refuses to start.')
@secure()
@minLength(32)
param jwtSecret string

@description('JWT refresh secret. Minimum 32 characters or the API refuses to start.')
@secure()
@minLength(32)
param jwtRefreshSecret string

@description('''
Extra allowed browser origin(s) for CORS, comma separated. The static site's
own URL is always included automatically, so this is only needed for a custom
domain or a local dev origin.
''')
param corsOrigin string = ''

@description('Requests per throttle window. In-memory storage means this is per replica.')
param throttleLimit int = 100

@description('Keep one replica warm. Set to 0 to scale to zero and trade cold starts for cost.')
@minValue(0)
@maxValue(1)
param minReplicas int = 1

var logAnalyticsName = 'log-${appName}'
var environmentName = 'cae-${appName}'
var backendAppName = 'ca-${appName}-api${apiNameSuffix}'
// primaryEndpoints.web carries a trailing slash; an Origin header never does,
// so it is trimmed here or every request would fail the allow-list comparison.
var frontendEndpoint = frontendStorage.properties.primaryEndpoints.web
var frontendOrigin = substring(frontendEndpoint, 0, max(length(frontendEndpoint) - 1, 0))
var effectiveCorsOrigin = empty(corsOrigin) ? frontendOrigin : '${frontendOrigin},${corsOrigin}'

var cosmosAccountName = 'cosmos-${appName}-${uniqueString(resourceGroup().id)}'
// Storage account names: 3-24 chars, lowercase letters and digits only.
var frontendStorageName = take('stweb${appName}${uniqueString(resourceGroup().id)}', 24)

// ---------------------------------------------------------------
// Log Analytics - Container Apps requires a workspace for logs
// ---------------------------------------------------------------
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    features: {
      searchVersion: 1
    }
  }
}

// ---------------------------------------------------------------
// Container Apps environment
// ---------------------------------------------------------------
resource containerAppEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ---------------------------------------------------------------
// Backend API
// ---------------------------------------------------------------
resource backend 'Microsoft.App/containerApps@2024-03-01' = {
  name: backendAppName
  location: location
  // No managed identity: this subscription gets an "express" Container Apps
  // environment, which rejects identity assignment outright, and nothing here
  // authenticates that way - the registry uses a secret and the database
  // credentials come from listKeys(). Declaring it caused both an update
  // failure and a FailedIdentityOperation on redeploy.
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      // Empty when the image is public; ghcr.io needs credentials otherwise.
      registries: empty(ghcrToken) ? [] : [
        {
          server: 'ghcr.io'
          username: ghcrUsername
          passwordSecretRef: 'ghcr-token'
        }
      ]
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      secrets: union([
        // Taken straight from the account this template creates, so no
        // database credential is ever passed in by hand or stored in CI.
        // For the Mongo API the username is the account name and the
        // password is the account's primary key.
        { name: 'mongodb-uri', value: cosmos.listConnectionStrings().connectionStrings[0].connectionString }
        // The account name is not sensitive; it is only carried as a secret
        // because the app's Joi schema requires MONGODB_USERNAME to be set
        // even when MONGODB_URI already contains it.
        #disable-next-line use-secure-value-for-secure-inputs
        { name: 'mongodb-username', value: cosmos.name }
        { name: 'mongodb-password', value: cosmos.listKeys().primaryMasterKey }
        { name: 'jwt-secret', value: jwtSecret }
        { name: 'jwt-refresh-secret', value: jwtRefreshSecret }
      ], empty(ghcrToken) ? [] : [
        {
          name: 'ghcr-token'
          value: ghcrToken
        }
      ])
    }
    template: {
      containers: [
        {
          name: 'api'
          image: backendImage
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
          env: [
            // NODE_ENV must come from the real environment. main.ts also
            // preloads .env files, but nothing ships one to this image.
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: '3000' }
            { name: 'CORS_ORIGIN', value: effectiveCorsOrigin }
            // Always a single origin, even when CORS_ORIGIN is a list, so
            // email links never get built from a comma-joined string.
            { name: 'FRONTEND_URL', value: frontendOrigin }
            { name: 'THROTTLE_LIMIT', value: string(throttleLimit) }
            { name: 'LOG_LEVEL', value: 'info' }
            { name: 'MONGODB_URI', secretRef: 'mongodb-uri' }
            { name: 'MONGODB_USERNAME', secretRef: 'mongodb-username' }
            { name: 'MONGODB_PASSWORD', secretRef: 'mongodb-password' }
            { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
            { name: 'JWT_REFRESH_SECRET', secretRef: 'jwt-refresh-secret' }
          ]
          probes: [
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/health'
                port: 3000
              }
              initialDelaySeconds: 10
              periodSeconds: 10
              failureThreshold: 6
            }
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/health'
                port: 3000
              }
              initialDelaySeconds: 30
              periodSeconds: 30
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        // Kept at 1 so the in-memory rate limiter means what it says.
        // Raising maxReplicas multiplies the effective limit per replica.
        minReplicas: minReplicas
        maxReplicas: 1
      }
    }
  }
}

// ---------------------------------------------------------------
// Database - Cosmos DB for MongoDB (RU-based, free tier)
// ---------------------------------------------------------------
// The vCore free tier is not offered in any region this subscription
// permits, so the RU-based account is used instead: 1000 RU/s and 25 GB
// free, one per subscription. The codebase issues no aggregation
// pipelines, which is where the RU API's compatibility gaps show up.
resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-11-15' = {
  name: cosmosAccountName
  location: location
  kind: 'MongoDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    enableFreeTier: true
    publicNetworkAccess: 'Enabled'
    // Hard ceiling at the free allowance so nothing can quietly overrun it.
    capacity: {
      totalThroughputLimit: 1000
    }
    apiProperties: {
      serverVersion: '7.0'
    }
    capabilities: [
      {
        name: 'EnableMongo'
      }
    ]
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    backupPolicy: {
      type: 'Periodic'
      periodicModeProperties: {
        backupIntervalInMinutes: 1440
        backupRetentionIntervalInHours: 48
        backupStorageRedundancy: 'Local'
      }
    }
  }
}

// ---------------------------------------------------------------
// Frontend - static website on Blob Storage
// ---------------------------------------------------------------
// Static Web Apps is unavailable in every region this subscription allows,
// so the built React bundle is served from a storage account's static
// website endpoint instead. Static website hosting is a data-plane setting
// and cannot be switched on from ARM; the deploy workflow enables it with
// `az storage blob service-properties update --static-website`.
resource frontendStorage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: frontendStorageName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: true
  }
}

output backendAppName string = backend.name
output backendFqdn string = backend.properties.configuration.ingress.fqdn
output backendUrl string = 'https://${backend.properties.configuration.ingress.fqdn}'
output backendApiUrl string = 'https://${backend.properties.configuration.ingress.fqdn}/api'
output frontendStorageAccount string = frontendStorage.name
output frontendUrl string = frontendStorage.properties.primaryEndpoints.web
output cosmosAccountName string = cosmos.name
output containerAppEnvName string = containerAppEnv.name
