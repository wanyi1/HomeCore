$Root = Resolve-Path "$PSScriptRoot\.."
Write-Host "[*] Running backend tests (pytest)..." -ForegroundColor Cyan
& "$Root\.venv\Scripts\pytest.exe" -v "$Root\tests"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Backend tests failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "[*] Running frontend build check (tsc and vite build)..." -ForegroundColor Cyan
Push-Location "$Root\apps\web"
pnpm build
Pop-Location

if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Frontend build failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "[+] All tests and builds passed successfully!" -ForegroundColor Green
