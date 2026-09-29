// ===========================================
// SmartProperty - Monitoring and alerting
// ===========================================
// Applied on its own, next to the resources main.bicep created, so it never
// touches the API or the site:
//
//   az deployment group what-if -g rg-smartproperty -f infra/monitoring.bicep -p alertEmail=<address>
//   az deployment group create  -g rg-smartproperty -f infra/monitoring.bicep -p alertEmail=<address>
//
// Creates an email action group; Application Insights on the existing Log
// Analytics workspace, with an availability test on the API (and optionally
// the site); alerts for downtime, restarts, memory and error bursts; and a
// workbook.
//
// Sized to last the Azure for Students credit. At September 2026 retail
// prices an availability test run is $0.000645, so each probe location checked
// every 15 minutes is about $1.86 a month; metric alerts are $0.05 a month each
// at a 15-minute evaluation, the log alert $0.50, and the first 1,000 emails a
// month are free. The defaults come to about $2.55 a month.

targetScope = 'resourceGroup'

@description('Where alert emails go.')
param alertEmail string

@description('Region for Application Insights, the tests, the log alert and the workbook.')
param location string = 'italynorth'

param containerAppName string = 'ca-smartproperty-api2'
param workspaceName string = 'log-smartproperty'
param siteUrl string = 'https://smartproperties.tech'

@description('Seconds between availability test runs.')
@allowed([300, 600, 900])
param testFrequency int = 900

@description('''
Probe locations for the API check. The alert needs all of them to fail. One
location keeps the cost down; a failed run is retried before it counts, and a
second location (e.g. 'emea-fr-pra-edge', France Central) rules out a bad probe
for about $1.86 a month more.
''')
param apiTestLocations array = ['emea-nl-ams-azr']

@description('''
Probe locations for the site check, e.g. ['emea-gb-db3-azr'] (North Europe).
Empty by default: the site is static files behind Cloudflare, and every deploy
already checks the live site serves the new build.
''')
param siteTestLocations array = []

resource api 'Microsoft.App/containerApps@2024-03-01' existing = {
  name: containerAppName
}

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = {
  name: workspaceName
}

// ---------------------------------------------------------------
// Who gets told
// ---------------------------------------------------------------
resource oncall 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: 'ag-smartproperty-oncall'
  location: 'global'
  properties: {
    groupShortName: 'sp-oncall'
    enabled: true
    emailReceivers: [
      {
        name: 'owner'
        emailAddress: alertEmail
        useCommonAlertSchema: true
      }
    ]
  }
}

// ---------------------------------------------------------------
// Availability, checked from outside Azure
// ---------------------------------------------------------------
// Workspace-based, so test results land in the same Log Analytics workspace
// as the API's logs (table AppAvailabilityResults). Nothing in the app sends
// telemetry to it; it exists to hold the availability tests.
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-smartproperty'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspace.id
    IngestionMode: 'LogAnalytics'
  }
}

// Only values known before the deployment starts can drive a loop, so the
// API's address (read from the container app during it) is picked per test
// inside the loops rather than stored here.
var apiHealthUrl = 'https://${api.properties.configuration.ingress.fqdn}/api/health'

// A check with no probe locations is left out entirely.
var tests = filter(
  [
    {
      key: 'api'
      title: 'API health'
      expect: '"status":"ok"'
      locations: apiTestLocations
    }
    {
      key: 'site'
      title: 'Website'
      expect: '<title>SmartProperty'
      locations: siteTestLocations
    }
  ],
  t => !empty(t.locations)
)

resource webTests 'Microsoft.Insights/webtests@2022-06-15' = [
  for t in tests: {
    name: 'avail-smartproperty-${t.key}'
    location: location
    // Required: ties the test to its Application Insights resource.
    tags: {
      'hidden-link:${appInsights.id}': 'Resource'
    }
    kind: 'standard'
    properties: {
      SyntheticMonitorId: 'avail-smartproperty-${t.key}'
      Name: t.title
      Enabled: true
      Frequency: testFrequency
      Timeout: 30
      Kind: 'standard'
      // A run counts as failed only after three attempts in a row fail.
      RetryEnabled: true
      Locations: map(t.locations, l => { Id: l })
      Request: {
        RequestUrl: t.key == 'api' ? apiHealthUrl : siteUrl
        HttpVerb: 'GET'
        ParseDependentRequests: false
      }
      ValidationRules: {
        ExpectedHttpStatusCode: 200
        // Also fails while the certificate has less than a week to live.
        SSLCheck: true
        SSLCertRemainingLifetimeCheck: 7
        ContentValidation: {
          ContentMatch: t.expect
          IgnoreCase: false
          PassIfTextFound: true
        }
      }
    }
  }
]

resource downAlerts 'Microsoft.Insights/metricAlerts@2018-03-01' = [
  for (t, i) in tests: {
    name: 'alert-smartproperty-${t.key}-down'
    location: 'global'
    properties: {
      description: '${t.title} failed from every probe location: ${t.key == 'api' ? apiHealthUrl : siteUrl}'
      severity: 1
      enabled: true
      scopes: [
        webTests[i].id
        appInsights.id
      ]
      evaluationFrequency: 'PT15M'
      // At least one run per location falls in the window at a 15-minute frequency.
      windowSize: 'PT15M'
      criteria: {
        'odata.type': 'Microsoft.Azure.Monitor.WebtestLocationAvailabilityCriteria'
        webTestId: webTests[i].id
        componentId: appInsights.id
        failedLocationCount: length(t.locations)
      }
      autoMitigate: true
      actions: [
        {
          actionGroupId: oncall.id
        }
      ]
    }
  }
]

// ---------------------------------------------------------------
// The API container, from its platform metrics
// ---------------------------------------------------------------
// The express environment reports requests, restarts, replicas, CPU and
// memory, but not status codes or response times, so 5xx errors are caught
// from the logs below instead.
var containerAlerts = [
  {
    key: 'restarted'
    description: 'The API container restarted: a crash or a failed liveness probe. The workbook shows the errors logged before it.'
    metric: 'RestartCount'
    aggregation: 'Total'
    operator: 'GreaterThan'
    threshold: 0
    severity: 2
  }
  {
    key: 'no-replica'
    description: 'The API has had no running replica for 15 minutes, so it cannot answer at all.'
    metric: 'Replicas'
    aggregation: 'Maximum'
    operator: 'LessThan'
    threshold: 1
    severity: 1
  }
  {
    key: 'memory'
    description: 'The API container used over 80% of its 0.5 GiB memory. Past the limit it is killed and restarted; go back to 1 GiB if this repeats.'
    metric: 'WorkingSetBytes'
    aggregation: 'Maximum'
    operator: 'GreaterThan'
    threshold: 429496729
    severity: 2
  }
]

resource containerMetricAlerts 'Microsoft.Insights/metricAlerts@2018-03-01' = [
  for a in containerAlerts: {
    name: 'alert-smartproperty-api-${a.key}'
    location: 'global'
    properties: {
      description: a.description
      severity: a.severity
      enabled: true
      scopes: [
        api.id
      ]
      evaluationFrequency: 'PT15M'
      windowSize: 'PT15M'
      criteria: {
        'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
        allOf: [
          {
            criterionType: 'StaticThresholdCriterion'
            name: a.metric
            metricName: a.metric
            metricNamespace: 'Microsoft.App/containerApps'
            operator: a.operator
            threshold: a.threshold
            timeAggregation: a.aggregation
          }
        ]
      }
      autoMitigate: true
      actions: [
        {
          actionGroupId: oncall.id
        }
      ]
    }
  }
]

// ---------------------------------------------------------------
// Error bursts, from the API's logs
// ---------------------------------------------------------------
// Normal running logs 0-2 errors a day; 5 in 15 minutes has only happened
// while the deployment itself was broken.
resource errorBurstAlert 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = {
  name: 'alert-smartproperty-api-error-burst'
  location: location
  kind: 'LogAlert'
  properties: {
    displayName: 'API error burst'
    description: 'The API logged 5 or more errors within 15 minutes. The workbook lists the messages.'
    severity: 2
    enabled: true
    evaluationFrequency: 'PT15M'
    windowSize: 'PT15M'
    scopes: [
      workspace.id
    ]
    criteria: {
      allOf: [
        {
          // A ''' string is verbatim - no ${} interpolation - which keeps the
          // regex backslashes intact, so the app name is swapped in by replace().
          // what-if displays this query with one quote of '' missing; the
          // deployed rule stores it intact (checked by reading it back).
          query: replace(
            '''
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == '__APP__'
| extend line = replace_regex(Log_s, @'\x1b\[[0-9;]*m', '')
| where line matches regex @'\bERROR\b'
''',
            '__APP__',
            containerAppName
          )
          timeAggregation: 'Count'
          operator: 'GreaterThanOrEqual'
          threshold: 5
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    autoMitigate: true
    actions: {
      actionGroups: [
        oncall.id
      ]
    }
  }
}

// ---------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------
resource workbook 'Microsoft.Insights/workbooks@2023-06-01' = {
  name: guid(resourceGroup().id, 'smartproperty-operations')
  location: location
  kind: 'shared'
  properties: {
    displayName: 'SmartProperty operations'
    category: 'workbook'
    sourceId: workspace.id
    // monitoring-workbook.json holds three placeholders, filled in here.
    serializedData: replace(
      replace(
        replace(loadTextContent('monitoring-workbook.json'), '__WORKSPACE_ID__', workspace.id),
        '__CONTAINER_APP_ID__',
        api.id
      ),
      '__APP_NAME__',
      containerAppName
    )
  }
}

output appInsightsName string = appInsights.name
output workbookUrl string = 'https://portal.azure.com/#resource${workbook.id}/workbook'
