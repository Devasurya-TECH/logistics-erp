# Deploy LogiTrace to Vercel - 3 Apps
# Run this script from the project root

Write-Host "=== Deploying LogiTrace Driver App ===" -ForegroundColor Cyan

# Create a temporary .vercel config for driver project
$driverProject = @{
    projectId = ""
    orgId = ""
}

# Deploy driver app
$env:NEXT_PUBLIC_APP_ROLE = "driver"
npx vercel deploy --prod --yes --name logitrace-driver --env NEXT_PUBLIC_APP_ROLE=driver 2>&1

Write-Host ""
Write-Host "=== Deploying LogiTrace Supervisor App ===" -ForegroundColor Yellow

$env:NEXT_PUBLIC_APP_ROLE = "supervisor"
npx vercel deploy --prod --yes --name logitrace-supervisor --env NEXT_PUBLIC_APP_ROLE=supervisor 2>&1

Write-Host ""
Write-Host "=== Deploying LogiTrace Admin App ===" -ForegroundColor Green

$env:NEXT_PUBLIC_APP_ROLE = "manager"
npx vercel deploy --prod --yes --name logitrace-admin --env NEXT_PUBLIC_APP_ROLE=manager 2>&1

# Clean up
Remove-Item Env:\NEXT_PUBLIC_APP_ROLE -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== All 3 apps deployed! ===" -ForegroundColor Magenta
