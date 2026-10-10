[CmdletBinding()]
param(
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 5173,
    [int]$TimeoutSeconds = 25,
    [string]$CustomPythonPath = "",
    [string]$CustomWebDir = "",
    [switch]$NonInteractive,
    [switch]$OpenBrowser
)

# 统一编码策略，防止 Windows 终端中文乱码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$Host.UI.RawUI.WindowTitle = "HomeCore V1.0 - Windows 服务中枢"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         HomeCore V1.0 - 家庭数字操作系统启动器           " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$Root = (Resolve-Path "$PSScriptRoot\..").Path
$VenvPython = if ($CustomPythonPath) { $CustomPythonPath } else { Join-Path $Root ".venv\Scripts\python.exe" }
$WebDir = if ($CustomWebDir) { $CustomWebDir } else { Join-Path $Root "apps\web" }
$EnvFile = Join-Path $Root ".env"
$EnvExample = Join-Path $Root ".env.example"

# 0. 检查并初始化 .env 配置
if (-not (Test-Path $EnvFile) -and (Test-Path $EnvExample)) {
    Write-Host "[*] 未检测到 .env 配置文件，正在从 .env.example 自动生成..." -ForegroundColor Gray
    Copy-Item $EnvExample $EnvFile -Force
}

# 1. 检查 Python 运行环境
if (-not (Test-Path $VenvPython)) {
    Write-Host "[!] 未检测到指定的 Python 执行文件: $VenvPython" -ForegroundColor Yellow
    if ($CustomPythonPath) {
        Write-Host "[X] 启动失败: 指定的 Python 路径不存在，请核实环境配置。" -ForegroundColor Red
        exit 1
    }
    $SysPython = Get-Command "python.exe", "python" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1
    if (-not $SysPython) {
        Write-Host "[X] 启动失败: 未检测到系统 Python。请先安装 Python 3.12+ 并添加至环境变量。" -ForegroundColor Red
        exit 1
    }
    Write-Host "[*] 正在基于系统 Python 创建本地虚拟环境 .venv ..." -ForegroundColor Green
    & $SysPython -m venv (Join-Path $Root ".venv")
    $PipExe = Join-Path $Root ".venv\Scripts\pip.exe"
    if (Test-Path $PipExe) {
        & $PipExe install -r (Join-Path $Root "services\api\requirements.txt")
    }
}

# 2. 定位前端包管理工具 (pnpm.cmd / npm.cmd / node.exe)
function Find-FrontendTool {
    param([string]$TargetDir)

    if (-not (Test-Path $TargetDir)) {
        return $null
    }

    # 优先检测本地或当前用户 PATH 的 pnpm.cmd
    $pnpmList = @(
        (Get-Command "pnpm.cmd" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
        (Join-Path $env:APPDATA "npm\pnpm.cmd"),
        "C:\Program Files\nodejs\pnpm.cmd"
    )
    foreach ($p in $pnpmList) {
        if ($p -and (Test-Path $p)) {
            return @{ Name = "pnpm"; FilePath = $p; Args = "run dev --host 127.0.0.1" }
        }
    }

    # 备选检测 npm.cmd
    $npmList = @(
        (Get-Command "npm.cmd" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
        (Join-Path $env:APPDATA "npm\npm.cmd"),
        "C:\Program Files\nodejs\npm.cmd"
    )
    foreach ($n in $npmList) {
        if ($n -and (Test-Path $n)) {
            return @{ Name = "npm"; FilePath = $n; Args = "run dev -- --host 127.0.0.1" }
        }
    }

    # 备选检测 node.exe 直接运行 vite
    $nodeCmd = Get-Command "node.exe" -ErrorAction SilentlyContinue
    if ($nodeCmd -and (Test-Path $nodeCmd.Source)) {
        $viteScript = Join-Path $TargetDir "node_modules\vite\bin\vite.js"
        if (Test-Path $viteScript) {
            return @{ Name = "node-vite"; FilePath = $nodeCmd.Source; Args = "`"$viteScript`" --host 127.0.0.1" }
        }
    }

    return $null
}

$FrontendTool = Find-FrontendTool -TargetDir $WebDir
if (-not $FrontendTool) {
    Write-Host "[X] 启动失败: 未检测到前端构建工具或目标目录不存在 ($WebDir)。" -ForegroundColor Red
    Write-Host "[!] 请确认已安装 Node.js 18+ 及 pnpm，且前端工程目录完整。" -ForegroundColor Yellow
    exit 1
}

# 检查前端 node_modules
$WebNodeModules = Join-Path $WebDir "node_modules"
if (-not (Test-Path $WebNodeModules)) {
    Write-Host "[*] 检测到前端尚未安装依赖包，正在执行 $($FrontendTool.Name) install ..." -ForegroundColor Yellow
    Start-Process -FilePath $FrontendTool.FilePath -ArgumentList "install" -WorkingDirectory $WebDir -Wait -NoNewWindow
}

# 3. 端口探测与服务复用判断函数
function Get-PortListener {
    param([int]$Port)
    $listenConn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    return $listenConn
}

function Test-BackendHealth {
    param([int]$Port)
    try {
        $url = "http://127.0.0.1:$Port/api/v1/health"
        $resp = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 2 -ErrorAction Stop
        if ($resp -and $resp.service -eq "HomeCore" -and $resp.status -eq "healthy") {
            return $true
        }
    } catch {}
    return $false
}

function Test-FrontendHealth {
    param([int]$Port)
    try {
        $url = "http://127.0.0.1:$Port"
        $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($resp.StatusCode -eq 200 -and ($resp.Content -match "HomeCore" -or $resp.Content -match "vite")) {
            return $true
        }
    } catch {}
    return $false
}

# 检查后端端口
$BackendReused = $false
$BackendListener = Get-PortListener -Port $BackendPort
if ($BackendListener) {
    if (Test-BackendHealth -Port $BackendPort) {
        Write-Host "[✓] 端口 $BackendPort 检测到已有 HomeCore 后端实例正常运行 (PID: $($BackendListener.OwningProcess))，自动复用。" -ForegroundColor Green
        $BackendReused = $true
    } else {
        $proc = Get-Process -Id $BackendListener.OwningProcess -ErrorAction SilentlyContinue
        $pName = if ($proc) { $proc.ProcessName } else { "未知进程" }
        Write-Host "[X] 启动终止: 端口 $BackendPort 已被非 HomeCore 进程占用！" -ForegroundColor Red
        Write-Host "    占用详情: PID: $($BackendListener.OwningProcess), 进程名: $pName" -ForegroundColor Yellow
        Write-Host "    安全防护: 系统严禁强杀外部进程。请关闭占用程序，或在 .env 修改 PORT。" -ForegroundColor Yellow
        exit 1
    }
}

# 检查前端端口
$FrontendReused = $false
$FrontendListener = Get-PortListener -Port $FrontendPort
if ($FrontendListener) {
    if (Test-FrontendHealth -Port $FrontendPort) {
        Write-Host "[✓] 端口 $FrontendPort 检测到已有 HomeCore 前端实例正常运行 (PID: $($FrontendListener.OwningProcess))，自动复用。" -ForegroundColor Green
        $FrontendReused = $true
    } else {
        $proc = Get-Process -Id $FrontendListener.OwningProcess -ErrorAction SilentlyContinue
        $pName = if ($proc) { $proc.ProcessName } else { "未知进程" }
        Write-Host "[X] 启动终止: 端口 $FrontendPort 已被外部程序占用！" -ForegroundColor Red
        Write-Host "    占用详情: PID: $($FrontendListener.OwningProcess), 进程名: $pName" -ForegroundColor Yellow
        Write-Host "    安全防护: 系统严禁强杀外部进程。请关闭占用端口的程序后再试。" -ForegroundColor Yellow
        exit 1
    }
}

# 4. 启动服务进程
$BackendProcess = $null
$FrontendProcess = $null

if (-not $BackendReused) {
    Write-Host "[*] 启动后端 API 服务 (127.0.0.1:$BackendPort) ..." -ForegroundColor Green
    try {
        $env:PYTHONPATH = (Join-Path $Root "services\api")
        $BackendProcess = Start-Process -FilePath $VenvPython `
            -ArgumentList "-m uvicorn app.main:app --host 127.0.0.1 --port $BackendPort --reload" `
            -WorkingDirectory (Join-Path $Root "services\api") `
            -PassThru
    } catch {
        Write-Host "[X] 启动后端服务进程失败: $_" -ForegroundColor Red
        exit 1
    }
}

if (-not $FrontendReused) {
    Write-Host "[*] 启动前端 UI 服务 ($($FrontendTool.Name) on 127.0.0.1:$FrontendPort) ..." -ForegroundColor Green
    try {
        $FrontendProcess = Start-Process -FilePath $FrontendTool.FilePath `
            -ArgumentList $FrontendTool.Args `
            -WorkingDirectory $WebDir `
            -PassThru
    } catch {
        Write-Host "[X] 启动前端 UI 服务进程失败: $_" -ForegroundColor Red
        if ($BackendProcess -and -not $BackendProcess.HasExited) {
            Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
        }
        exit 1
    }
}

# 5. 端到端真实 HTTP 健康检查轮询
Write-Host "[*] 正在执行端到端 HTTP 健康检查，验证服务就绪状态..." -ForegroundColor Cyan
$StartTime = Get-Date
$BackendReady = $BackendReused
$FrontendReady = $FrontendReused

while (((Get-Date) - $StartTime).TotalSeconds -lt $TimeoutSeconds) {
    # 检查进程是否意外中途退出
    if ($BackendProcess -and $BackendProcess.HasExited) {
        Write-Host "[X] 后端进程意外退出 (退出码: $($BackendProcess.ExitCode))！请检查 Python 依赖与日志。" -ForegroundColor Red
        break
    }
    if ($FrontendProcess -and $FrontendProcess.HasExited) {
        Write-Host "[X] 前端进程意外退出 (退出码: $($FrontendProcess.ExitCode))！请检查 apps/web 构建配置。" -ForegroundColor Red
        break
    }

    if (-not $BackendReady) {
        $BackendReady = Test-BackendHealth -Port $BackendPort
    }
    if (-not $FrontendReady) {
        $FrontendReady = Test-FrontendHealth -Port $FrontendPort
    }

    if ($BackendReady -and $FrontendReady) {
        break
    }

    Start-Sleep -Milliseconds 800
}

# 6. 判定最终就绪状态
if (-not $BackendReady -or -not $FrontendReady) {
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Red
    Write-Host "  [X] 服务就绪验证失败！未通过端到端健康检查。" -ForegroundColor Red
    if (-not $BackendReady) {
        Write-Host "  - 后端 API (端口 $BackendPort): 未能响应 HTTP 健康探针。" -ForegroundColor Red
    }
    if (-not $FrontendReady) {
        Write-Host "  - 前端 UI  (端口 $FrontendPort): 未能通过 HTTP 页面访问校验。" -ForegroundColor Red
    }
    Write-Host "==========================================================" -ForegroundColor Red

    # 停止由本次启动创建的子进程
    if ($BackendProcess -and -not $BackendProcess.HasExited) {
        Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($FrontendProcess -and -not $FrontendProcess.HasExited) {
        Stop-Process -Id $FrontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    exit 1
}

# 7. 成功输出与控制台交互
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  [✓] HomeCore 系统启动成功 (前后端已通过端到端健康验证)  " -ForegroundColor Green
Write-Host "  -> 前端控制台:   http://127.0.0.1:$FrontendPort" -ForegroundColor White
Write-Host "  -> 后端接口文档: http://127.0.0.1:$BackendPort/docs" -ForegroundColor White
Write-Host "  -> 健康检查接口: http://127.0.0.1:$BackendPort/api/v1/health" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""

if ($OpenBrowser) {
    Start-Process "http://127.0.0.1:$FrontendPort"
}

if ($NonInteractive) {
    Write-Host "[*] 非交互模式已激活，服务在后台持续运行。" -ForegroundColor Gray
    exit 0
}

Write-Host "按回车键 [Enter] 或输入 'Q' 退出并安全关闭本次启动的服务..." -ForegroundColor Yellow
$null = Read-Host

Write-Host "[*] 正在安全关闭 HomeCore 服务进程..." -ForegroundColor Yellow
if ($BackendProcess -and -not $BackendProcess.HasExited) {
    Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "[✓] 后端服务已安全停止 (PID: $($BackendProcess.Id))" -ForegroundColor Gray
}
if ($FrontendProcess -and -not $FrontendProcess.HasExited) {
    Stop-Process -Id $FrontendProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "[✓] 前端服务已安全停止 (PID: $($FrontendProcess.Id))" -ForegroundColor Gray
}
Write-Host "[+] 服务安全退出完毕。" -ForegroundColor Green
