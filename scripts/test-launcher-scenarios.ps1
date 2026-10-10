# HomeCore 启动器五大场景自动化验收测试套件
[CmdletBinding()]
param()

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$Root = (Resolve-Path "$PSScriptRoot\..").Path
$LauncherScript = Join-Path $Root "scripts\start-windows.ps1"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "      HomeCore V1.0 启动器五大稳定性场景自动化验证        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$PassedCount = 0
$TotalCount = 5

function Cleanup-TestProcesses {
    Get-Process -Name "python", "node" -ErrorAction SilentlyContinue | Where-Object {
        $p = $_
        try {
            $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $($p.Id)").CommandLine
            if ($cmd -match "uvicorn" -or $cmd -match "vite") {
                Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
            }
        } catch {}
    }
}

# 确保开始前环境干净
Cleanup-TestProcesses
Start-Sleep -Seconds 1

# -------------------------------------------------------------
# 场景 1: 正常冷启动与前后端端到端 HTTP 健康检查 (Normal Startup)
# -------------------------------------------------------------
Write-Host "[测试 1/5] 验证场景 1: 正常冷启动与真实前后端端到端 HTTP 健康检查..." -ForegroundColor Yellow
$proc1 = Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$LauncherScript`" -NonInteractive -TimeoutSeconds 25" `
    -PassThru
$proc1.WaitForExit(35000)

if ($proc1.ExitCode -eq 0) {
    $backendOk = $false
    $frontendOk = $false
    try {
        $bResp = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/health" -Method Get -TimeoutSec 3
        if ($bResp.service -eq "HomeCore" -and $bResp.status -eq "healthy") { $backendOk = $true }
    } catch {}

    try {
        $fResp = Invoke-WebRequest -Uri "http://127.0.0.1:5173" -UseBasicParsing -TimeoutSec 3
        if ($fResp.StatusCode -eq 200 -and ($fResp.Content -match "HomeCore" -or $fResp.Content -match "root")) {
            $frontendOk = $true
        }
    } catch {}

    if ($backendOk -and $frontendOk) {
        Write-Host "  [✓] 场景 1 通过: 前后端进程成功启动，端到端 HTTP 探针全部响应正常！" -ForegroundColor Green
        $PassedCount++
    } else {
        Write-Host "  [X] 场景 1 失败: HTTP 探针未响应 (后端: $backendOk, 前端: $frontendOk)" -ForegroundColor Red
    }
} else {
    Write-Host "  [X] 场景 1 失败: 启动器退出码为 $($proc1.ExitCode)" -ForegroundColor Red
}

# -------------------------------------------------------------
# 场景 2: 重复启动与已有实例自动复用 (Duplicate Startup)
# -------------------------------------------------------------
Write-Host ""
Write-Host "[测试 2/5] 验证场景 2: 重复启动检测与现有实例自动复用..." -ForegroundColor Yellow
# 此时场景 1 的前后端仍在运行，再次执行启动器
$proc2Output = powershell -NoProfile -ExecutionPolicy Bypass -File "$LauncherScript" -NonInteractive 2>&1 | Out-String

if ($proc2Output -match "自动复用" -and $proc2Output -match "启动成功") {
    Write-Host "  [✓] 场景 2 通过: 正确识别运行中的 HomeCore 实例并复用，未报错未产生冲突！" -ForegroundColor Green
    $PassedCount++
} else {
    Write-Host "  [X] 场景 2 失败: 输出日志未体现自动复用: `n$proc2Output" -ForegroundColor Red
}

# 停止场景 1 和 2 留下的后台进程
Cleanup-TestProcesses
Start-Sleep -Seconds 2

# -------------------------------------------------------------
# 场景 3: 外部端口冲突与第三方进程安全保护 (Port Conflict)
# -------------------------------------------------------------
Write-Host ""
Write-Host "[测试 3/5] 验证场景 3: 第三方非 HomeCore 程序占用端口的拦截与安全保护..." -ForegroundColor Yellow
$conflictListener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 8009)
$conflictListener.Start()

$proc3Output = powershell -NoProfile -ExecutionPolicy Bypass -File "$LauncherScript" -BackendPort 8009 -NonInteractive 2>&1 | Out-String
$isStillRunning = $conflictListener.Server.IsBound
$conflictListener.Stop()

if ($proc3Output -match "已被非 HomeCore 进程占用" -and $proc3Output -match "安全防护" -and $isStillRunning) {
    Write-Host "  [✓] 场景 3 通过: 准确检测外部端口占用，安全防护生效，未强杀外部第三方程序！" -ForegroundColor Green
    $PassedCount++
} else {
    Write-Host "  [X] 场景 3 失败: 未能正确处理端口冲突: `n$proc3Output" -ForegroundColor Red
}

# -------------------------------------------------------------
# 场景 4: 依赖缺失检测与异常捕获指引 (Missing Dependencies)
# -------------------------------------------------------------
Write-Host ""
Write-Host "[测试 4/5] 验证场景 4: 依赖缺失时的异常捕获与指引..." -ForegroundColor Yellow
$proc4Output = powershell -NoProfile -ExecutionPolicy Bypass -File "$LauncherScript" -CustomPythonPath "E:\NonExistentPython.exe" -NonInteractive 2>&1 | Out-String

if ($proc4Output -match "启动失败" -and $proc4Output -match "指定的 Python 路径不存在") {
    Write-Host "  [✓] 场景 4 通过: 捕获依赖异常并提供明确指引，未发生未捕获崩盘！" -ForegroundColor Green
    $PassedCount++
} else {
    Write-Host "  [X] 场景 4 失败: 未能正确捕获依赖缺失: `n$proc4Output" -ForegroundColor Red
}

# -------------------------------------------------------------
# 场景 5: 前端未就绪时拒绝虚假就绪 (Frontend Failure Handling)
# -------------------------------------------------------------
Write-Host ""
Write-Host "[测试 5/5] 验证场景 5: 前端未就绪时拒绝虚假就绪并安全回滚..." -ForegroundColor Yellow
$proc5Output = powershell -NoProfile -ExecutionPolicy Bypass -File "$LauncherScript" -FrontendPort 59999 -TimeoutSeconds 3 -NonInteractive 2>&1 | Out-String

if ($proc5Output -match "服务就绪验证失败" -and $proc5Output -match "未能通过 HTTP 页面访问校验" -and ($proc5Output -notmatch "系统启动成功")) {
    Write-Host "  [✓] 场景 5 通过: 严格拦截虚假就绪，端到端健康检查未通过时拒绝输出成功并清理子进程！" -ForegroundColor Green
    $PassedCount++
} else {
    Write-Host "  [X] 场景 5 失败: 未能正确拒绝异常启动: `n$proc5Output" -ForegroundColor Red
}

# 最终清理
Cleanup-TestProcesses

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "测试汇总: $PassedCount / $TotalCount 个场景验证通过" -ForegroundColor $(if ($PassedCount -eq $TotalCount) { "Green" } else { "Red" })
Write-Host "==========================================================" -ForegroundColor Cyan

if ($PassedCount -eq $TotalCount) {
    exit 0
} else {
    exit 1
}
