# ===========================================
# Update MongoDB Users Schema Validator
# ===========================================
# This script applies the updated users collection schema to MongoDB

Write-Host "🔄 Updating MongoDB users collection schema..." -ForegroundColor Cyan

# Check if mongosh is available
$mongosh = Get-Command mongosh -ErrorAction SilentlyContinue

if (-not $mongosh) {
  Write-Host "❌ mongosh not found. Please ensure MongoDB tools are installed." -ForegroundColor Red
  Write-Host "📝 Alternative: Connect to MongoDB manually and run:" -ForegroundColor Yellow
  Write-Host "   mongosh smartproperty < docker/update-users-schema.js" -ForegroundColor Yellow
  exit 1
}

# Run the migration script
try {
  mongosh smartproperty < docker/update-users-schema.js
  
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ MongoDB users collection schema updated successfully!" -ForegroundColor Green
    Write-Host "🚀 You can now restart the backend with: npm run dev" -ForegroundColor Green
  } else {
    Write-Host "❌ Schema update failed with exit code $LASTEXITCODE" -ForegroundColor Red
  }
} catch {
  Write-Host "❌ Error running migration script: $_" -ForegroundColor Red
  Write-Host "📝 Try running manually: mongosh smartproperty < docker/update-users-schema.js" -ForegroundColor Yellow
  exit 1
}
