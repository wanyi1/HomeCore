$Host.UI.RawUI.WindowTitle = "HomeCore V1.0 - Family Intelligence OS"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         HomeCore V1.0 - Windows Launcher                 " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$Root = Resolve-Path "$PSScriptRoot\.."
$VenvPython = "$Root\.venv\Scripts\python.exe"

if (-not (Test-Path $VenvPython)) {
    Write-Host "[!] Virtualenv not found. Creating .venv..." -ForegroundColor Yellow
    python -m venv "$Root\.venv"
    & "$Root\.venv\Scripts\pip.exe" install -r "$Root\services\api\requirements.txt"
}

$Port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($Port8000) {
    Write-Host "[!] Port 8000 is currently occupied." -ForegroundColor Yellow
}

$Port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($Port5173) {
    Write-Host "[!] Port 5173 is currently occupied." -ForegroundColor Yellow
}

Write-Host "[*] Starting Backend API (http://127.0.0.1:8000)..." -ForegroundColor Green
$BackendProcess = Start-Process -FilePath $VenvPython -ArgumentList "-m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload" -WorkingDirectory "$Root\services\api" -PassThru

Write-Host "[*] Starting Frontend UI (http://127.0.0.1:5173)..." -ForegroundColor Green
$FrontendProcess = Start-Process -FilePath "pnpm" -ArgumentList "run dev --host 127.0.0.1" -WorkingDirectory "$Root\apps\web" -PassThru

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  HomeCore Services are Ready!" -ForegroundColor Green
Write-Host "  -> Web Console: http://127.0.0.1:5173" -ForegroundColor White
Write-Host "  -> Backend API: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "  -> Health Check: http://127.0.0.1:8000/api/v1/health" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Press Enter or 'Q' to cleanly shutdown all services..." -ForegroundColor Yellow

$null = Read-Host

Write-Host "[*] Stopping HomeCore services gracefully..." -ForegroundColor Yellow
if ($BackendProcess -and -not $BackendProcess.HasExited) {
    Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
}
if ($FrontendProcess -and -not $FrontendProcess.HasExited) {
    Stop-Process -Id $FrontendProcess.Id -Force -ErrorAction SilentlyContinue
}
Write-Host "[+] All HomeCore services stopped." -ForegroundColor Green
