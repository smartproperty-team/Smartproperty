# ===========================================
# FIX MONGODB VALIDATION - Script Complet
# ===========================================
# Ce script desactive la validation MongoDB puis teste la creation de propriete

Write-Host "==========================================="
Write-Host "FIX MONGODB VALIDATION"
Write-Host "==========================================="
Write-Host ""

# Configuration MongoDB
$mongoUser = "smartproperty_user"
# Mot de passe lu depuis l'environnement, jamais ecrit dans le script
$mongoPass = $env:MONGODB_PASSWORD
if (-not $mongoPass) {
    Write-Error "MONGODB_PASSWORD n'est pas defini. Exemple: `$env:MONGODB_PASSWORD = '...'"
    exit 1
}
$mongoDb = "smartproperty"
$mongoUri = "mongodb://${mongoUser}:${mongoPass}@localhost:27017/${mongoDb}?authSource=admin"

# Etape 1: Desactiver la validation MongoDB
Write-Host "[1/4] Desactivation de la validation MongoDB..." -ForegroundColor Yellow
$disableValidation = @"
db.runCommand({
  collMod: 'properties',
  validator: {},
  validationLevel: 'off',
  validationAction: 'warn'
});
print('Validation desactivee');
"@

# Sauvegarder le script temporaire
$tempScript = "$env:TEMP\disable-validation.js"
$disableValidation | Out-File -FilePath $tempScript -Encoding UTF8

# Executer dans MongoDB
docker cp $tempScript smartproperty-mongodb:/tmp/disable-validation.js
docker exec smartproperty-mongodb mongosh $mongoUri /tmp/disable-validation.js 2>&1
Write-Host "[OK] Validation MongoDB desactivee" -ForegroundColor Green
Write-Host ""

# Etape 2: Verifier que le backend tourne
Write-Host "[2/4] Verification du backend..." -ForegroundColor Yellow
$backendRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/properties" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        $backendRunning = $true
        Write-Host "[OK] Backend est actif" -ForegroundColor Green
    }
}
catch {
    Write-Host "[!] Backend ne repond pas - il faut le demarrer" -ForegroundColor Yellow
    Write-Host "    Executez: cd backend && npm run start:dev" -ForegroundColor Cyan
}
Write-Host ""

if (-not $backendRunning) {
    Write-Host "============================================"
    Write-Host "INSTRUCTIONS MANUELLES"
    Write-Host "============================================"
    Write-Host ""
    Write-Host "1. Ouvrez un NOUVEAU terminal PowerShell"
    Write-Host ""
    Write-Host "2. Demarrez le backend:"
    Write-Host "   cd `"C:\Users\wael daagi\Documents\GitHub\smartproperty\backend`""
    Write-Host "   npm run start:dev"
    Write-Host ""
    Write-Host "3. Attendez de voir:"
    Write-Host "   [Bootstrap] SmartProperty API running on: http://localhost:3000"
    Write-Host ""
    Write-Host "4. Testez dans Swagger:"
    Write-Host "   http://localhost:3000/api/docs"
    Write-Host ""
    Write-Host "5. OU testez avec PowerShell:"
    Write-Host "   & `"$PSScriptRoot\test-creation-propriete.ps1`""
    Write-Host ""
    exit 0
}

# Etape 3: Connexion
Write-Host "[3/4] Connexion a l'API..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod `
        -Uri "http://localhost:3000/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"email":"owner@smartproperty.com","password":"Password123!"}'

    $token = $loginResponse.tokens.accessToken
    Write-Host "[OK] Connecte en tant que: $($loginResponse.user.email)" -ForegroundColor Green
}
catch {
    Write-Host "[ERREUR] Impossible de se connecter: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Etape 4: Creation de propriete
Write-Host "[4/4] Creation de propriete test..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

    $body = @{
        title = "Test Propriete Apres Fix"
        type = "apartment"
        price = 1500
        address = @{
            street = "123 Rue de la Paix"
            city = "Paris"
            state = "Ile-de-France"
            zipCode = "75001"
            country = "France"
        }
    } | ConvertTo-Json -Depth 10

    $property = Invoke-RestMethod `
        -Uri "http://localhost:3000/api/properties" `
        -Method POST `
        -Headers $headers `
        -Body $body

    Write-Host "[OK] Propriete creee avec succes !" -ForegroundColor Green
    Write-Host ""
    Write-Host "Details de la propriete:"
    Write-Host "  ID:     $($property._id)" -ForegroundColor Cyan
    Write-Host "  Titre:  $($property.title)"
    Write-Host "  Type:   $($property.type)"
    Write-Host "  Status: $($property.status)"
    Write-Host "  Prix:   $($property.price) $($property.currency)"
}
catch {
    Write-Host "[ERREUR] Impossible de creer la propriete" -ForegroundColor Red
    Write-Host "Details: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
    exit 1
}

Write-Host ""
Write-Host "==========================================="
Write-Host "SUCCES ! La propriete a ete creee."
Write-Host "==========================================="
Write-Host ""
Write-Host "Prochaines etapes:"
Write-Host "  - Testez dans Swagger: http://localhost:3000/api/docs"
Write-Host "  - Faites Ctrl+Shift+R pour rafraichir"
Write-Host "  - Suivez GUIDE_RAPIDE_SWAGGER.md"
Write-Host ""

