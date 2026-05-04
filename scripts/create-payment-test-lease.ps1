# ===========================================
# SmartProperty - Payment Test Lease Setup
# ===========================================

param(
    [string]$BaseUrl = "http://localhost:3000/api",
    [string]$PropertyTitle = "Sousse Marina Apartment",
    [string]$TenantEmail = "tenant@smartproperty.com",
    [string]$TenantPassword = "Password123!",
    [string]$OwnerEmail = "owner@smartproperty.com",
    [string]$OwnerPassword = "Password123!",
    [string]$AdminEmail = "superadmin@smartproperty.com",
    [string]$AdminPassword = "Password123!",
    [string]$LeaseStartDate = "2026-06-01T00:00:00.000Z",
    [string]$LeaseEndDate = "2027-05-31T23:59:59.000Z"
)

$ErrorActionPreference = 'Stop'

function Get-ErrorBody {
    param([Parameter(Mandatory = $true)] $ErrorRecord)

    if (-not $ErrorRecord.Exception.Response) {
        return $ErrorRecord.Exception.Message
    }

    try {
        $stream = $ErrorRecord.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        return $reader.ReadToEnd()
    } catch {
        return $ErrorRecord.Exception.Message
    }
}

function Write-Step {
    param([string]$Message)
    Write-Host "`n$Message" -ForegroundColor Yellow
}

function Write-Ok {
    param([string]$Message)
    Write-Host "  [OK] $Message" -ForegroundColor Green
}

function Invoke-JsonApi {
    param(
        [Parameter(Mandatory = $true)][ValidateSet('GET','POST','PATCH','PUT','DELETE')][string]$Method,
        [Parameter(Mandatory = $true)][string]$Uri,
        [hashtable]$Headers,
        $Body
    )

    $params = @{ Uri = $Uri; Method = $Method; ErrorAction = 'Stop' }
    if ($Headers) { $params.Headers = $Headers }
    if ($null -ne $Body) {
        $params.ContentType = 'application/json'
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
    }

    return Invoke-RestMethod @params
}

Write-Host "SmartProperty payment test lease setup" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor DarkGray

Write-Step "1) Login as tenant"
try {
    $tenantLogin = Invoke-JsonApi -Method POST -Uri "$BaseUrl/auth/login" -Body @{
        email = $TenantEmail
        password = $TenantPassword
        reactivateAccount = $true
    }
    $tenantToken = $tenantLogin.tokens.accessToken
    $tenantId = $tenantLogin.user.id
    Write-Ok "Tenant logged in: $TenantEmail"
} catch {
    Write-Host "  [ERROR] Tenant login failed: $(Get-ErrorBody $_)" -ForegroundColor Red
    exit 1
}

Write-Step "2) Login as owner"
try {
    $ownerLogin = Invoke-JsonApi -Method POST -Uri "$BaseUrl/auth/login" -Body @{
        email = $OwnerEmail
        password = $OwnerPassword
        reactivateAccount = $true
    }
    $ownerToken = $ownerLogin.tokens.accessToken
    $ownerId = $ownerLogin.user.id
    Write-Ok "Owner logged in: $OwnerEmail"
} catch {
    Write-Host "  [ERROR] Owner login failed: $(Get-ErrorBody $_)" -ForegroundColor Red
    exit 1
}

Write-Step "3) Login as admin"
try {
    $adminLogin = Invoke-JsonApi -Method POST -Uri "$BaseUrl/auth/login" -Body @{
        email = $AdminEmail
        password = $AdminPassword
        reactivateAccount = $true
    }
    $adminToken = $adminLogin.tokens.accessToken
    Write-Ok "Admin logged in: $AdminEmail"
} catch {
    Write-Host "  [ERROR] Admin login failed: $(Get-ErrorBody $_)" -ForegroundColor Red
    exit 1
}

Write-Step "4) Find the seed property"
try {
    $propertySearch = Invoke-JsonApi -Method GET -Uri "$BaseUrl/properties?search=$([uri]::EscapeDataString($PropertyTitle))&limit=50"
    $property = $propertySearch.properties | Where-Object { $_.title -eq $PropertyTitle } | Select-Object -First 1

    if (-not $property) {
        throw "Property '$PropertyTitle' was not found in the seed data."
    }

    Write-Ok "Property found: $($property.title)"
    Write-Host "    Property ID : $($property.id)" -ForegroundColor DarkGray
    Write-Host "    Owner ID    : $($property.ownerId)" -ForegroundColor DarkGray
    Write-Host "    Manager ID  : $($property.managerId)" -ForegroundColor DarkGray
} catch {
    Write-Host "  [ERROR] Property lookup failed: $(Get-ErrorBody $_)" -ForegroundColor Red
    exit 1
}

Write-Step "5) Find or create tenant application"
try {
    $tenantApplications = Invoke-JsonApi -Method GET -Uri "$BaseUrl/applications/my?propertyId=$($property.id)&limit=50" -Headers @{ Authorization = "Bearer $tenantToken" }
    $application = $tenantApplications.applications | Sort-Object createdAt -Descending | Select-Object -First 1

    if ($application) {
        Write-Ok "Reusing existing application: $($application.id) [$($application.status)]"
    } else {
        $application = Invoke-JsonApi -Method POST -Uri "$BaseUrl/applications" -Headers @{ Authorization = "Bearer $tenantToken" } -Body @{
            propertyId = $property.id
            employmentInfo = @{
                companyName = 'Acme Corp'
                jobTitle = 'Software Engineer'
                monthlyIncome = 3000
            }
            messageToOwner = 'Automated application for payment testing.'
        }
        Write-Ok "Created new application: $($application.id)"
    }

    Write-Host "    Application status: $($application.status)" -ForegroundColor DarkGray
} catch {
    Write-Host "  [ERROR] Application step failed: $(Get-ErrorBody $_)" -ForegroundColor Red
    exit 1
}

Write-Step "6) Approve the application"
try {
    if ($application.status -ne 'approved') {
        $application = Invoke-JsonApi -Method PATCH -Uri "$BaseUrl/applications/$($application.id)/approve" -Headers @{ Authorization = "Bearer $adminToken" }
        Write-Ok "Application approved"
    } else {
        Write-Ok "Application was already approved"
    }
} catch {
    Write-Host "  [ERROR] Application approval failed: $(Get-ErrorBody $_)" -ForegroundColor Red
    exit 1
}

Write-Step "7) Find or create lease"
try {
    $ownerLeases = Invoke-JsonApi -Method GET -Uri "$BaseUrl/leases/mine?propertyId=$($property.id)&limit=20" -Headers @{ Authorization = "Bearer $ownerToken" }
    $lease = $ownerLeases.items | Sort-Object createdAt -Descending | Select-Object -First 1

    if (-not $lease) {
        $lease = Invoke-JsonApi -Method POST -Uri "$BaseUrl/leases/from-application/$($application.id)" -Headers @{ Authorization = "Bearer $adminToken" } -Body @{
            startDate = $LeaseStartDate
            endDate = $LeaseEndDate
            monthlyRent = [int]$property.price
            securityDeposit = [int]$property.price
            currency = $property.currency
            terms = 'Automated test lease for payment interface validation.'
        }
        Write-Ok "Lease created: $($lease.id)"
    } else {
        Write-Ok "Reusing existing lease: $($lease.id) [$($lease.status)]"
    }

    Write-Host "    Lease status: $($lease.status)" -ForegroundColor DarkGray
} catch {
    Write-Host "  [ERROR] Lease creation failed: $(Get-ErrorBody $_)" -ForegroundColor Red
    exit 1
}

Write-Step "8) Approve lease terms as owner"
try {
    if ($lease.status -eq 'pending_owner_approval') {
        $lease = Invoke-JsonApi -Method PATCH -Uri "$BaseUrl/leases/$($lease.id)/owner-decision" -Headers @{ Authorization = "Bearer $ownerToken" } -Body @{
            approved = $true
            note = 'Approved for automated payment testing.'
        }
        Write-Ok "Lease approved by owner"
    } else {
        Write-Ok "Lease did not need owner approval (current status: $($lease.status))"
    }
} catch {
    Write-Host "  [ERROR] Lease owner approval failed: $(Get-ErrorBody $_)" -ForegroundColor Red
    exit 1
}

Write-Step "9) Sign lease as owner"
try {
    $lease = Invoke-JsonApi -Method PATCH -Uri "$BaseUrl/leases/$($lease.id)/sign" -Headers @{ Authorization = "Bearer $ownerToken" } -Body @{
        method = 'e_signature'
        note = 'Owner signed for payment testing.'
    }
    Write-Ok "Owner signature recorded"
} catch {
    $ownerError = Get-ErrorBody $_
    if ($ownerError -match 'already signed') {
        Write-Ok "Owner signature already exists"
    } else {
        Write-Host "  [ERROR] Owner signature failed: $ownerError" -ForegroundColor Red
        exit 1
    }
}

Write-Step "10) Sign lease as tenant"
try {
    $lease = Invoke-JsonApi -Method PATCH -Uri "$BaseUrl/leases/$($lease.id)/sign" -Headers @{ Authorization = "Bearer $tenantToken" } -Body @{
        method = 'e_signature'
        note = 'Tenant signed for payment testing.'
    }
    Write-Ok "Tenant signature recorded"
} catch {
    $tenantError = Get-ErrorBody $_
    if ($tenantError -match 'already signed') {
        Write-Ok "Tenant signature already exists"
    } else {
        Write-Host "  [ERROR] Tenant signature failed: $tenantError" -ForegroundColor Red
        exit 1
    }
}

Write-Step "11) Initiate payment for the signed lease"
try {
    $paymentAmount = [int]($lease.monthlyRent * 1000)
    $payment = Invoke-JsonApi -Method POST -Uri "$BaseUrl/payments/initiate" -Headers @{ Authorization = "Bearer $tenantToken" } -Body @{
        leaseId = $lease.id
        tenantId = $tenantId
        amount = $paymentAmount
        currency = $lease.currency
        type = 'rent'
        method = 'card'
        description = "Rent payment test for $PropertyTitle"
        idempotencyKey = "test-$($lease.id)-rent"
    }

    Write-Ok "Payment initiated successfully"
    Write-Host "    Payment ID     : $($payment.id)" -ForegroundColor DarkGray
    Write-Host "    Payment Status : $($payment.status)" -ForegroundColor DarkGray
    if ($payment.clientSecret) {
        Write-Host "    Client Secret  : $($payment.clientSecret)" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "  [ERROR] Payment initiation failed: $(Get-ErrorBody $_)" -ForegroundColor Red
    exit 1
}

Write-Host "`nDone." -ForegroundColor Cyan
Write-Host "Open the lease workspace to confirm the pay button:" -ForegroundColor Cyan
Write-Host "  http://localhost:5173/leases?leaseId=$($lease.id)" -ForegroundColor White
Write-Host "`nIf you want to run payment confirmation next, keep the returned client secret from the payment response." -ForegroundColor Cyan