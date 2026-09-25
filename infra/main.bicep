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

@description('Region for the API and its logs. Keep this equal to the database region: the API talks to it on every request.')
param location string = 'northeurope'

@description('''
Region for the Static Web App. Static Web Apps is offered in only five
regions and West Europe is the sole European one, so it cannot sit next to
the API. It is CDN-fronted, so its origin region has little practical effect.
''')
param staticWebAppLocation string = 'westeurope'

@description('Container image for the API, e.g. ghcr.io/<owner>/smartproperty-backend:<sha>.')
param backendImage string

@description('Mongo connection string (Cosmos DB for MongoDB vCore).')
@secure()
param mongodbUri string

@description('Mongo username. Required by the app config schema even when a URI is supplied.')
@secure()
param mongodbUsername string

@description('Mongo password. Required by the app config schema even when a URI is supplied.')
@secure()
param mongodbPassword string

@description('JWT signing secret. Minimum 32 characters or the API refuses to start.')
@secure()
@minLength(32)
param jwtSecret string

@description('JWT refresh secret. Minimum 32 characters or the API refuses to start.')
@secure()
@minLength(32)
param jwtRefreshSecret string

@description('Allowed browser origin(s) for CORS, comma separated. Set to the Static Web App URL after its first deploy.')
param corsOrigin string = ''

@description('Requests per throttle window. In-memory storage means this is per replica.')
param throttleLimit int = 100

@description('Keep one replica warm. Set to 0 to scale to zero and trade cold starts for cost.')
@minValue(0)
@maxValue(1)
param minReplicas int = 1

var logAnalyticsName = 'log-${appName}'
var environmentName = 'cae-${appName}'
var backendAppName = 'ca-${appName}-api'
var staticWebAppName = 'swa-${appName}'

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
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
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
      secrets: [
        { name: 'mongodb-uri', value: mongodbUri }
        { name: 'mongodb-username', value: mongodbUsername }
        { name: 'mongodb-password', value: mongodbPassword }
        { name: 'jwt-secret', value: jwtSecret }
        { name: 'jwt-refresh-secret', value: jwtRefreshSecret }
      ]
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
            { name: 'CORS_ORIGIN', value: corsOrigin }
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
// Frontend - Static Web Apps Free tier
// ---------------------------------------------------------------
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: staticWebAppName
  location: staticWebAppLocation
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    // The build is driven by GitHub Actions, not by Azure's own builder,
    // because VITE_* variables must be present at build time.
    allowConfigFileUpdates: true
    stagingEnvironmentPolicy: 'Enabled'
  }
}

output backendFqdn string = backend.properties.configuration.ingress.fqdn
output backendUrl string = 'https://${backend.properties.configuration.ingress.fqdn}'
output backendApiUrl string = 'https://${backend.properties.configuration.ingress.fqdn}/api'
output staticWebAppHostname string = staticWebApp.properties.defaultHostname
output staticWebAppUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output containerAppEnvName string = containerAppEnv.name
