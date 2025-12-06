# 放射化学纯度检测仪系统启动脚本
# System Startup Script for Radiation Purity Detector
# Author: MiniMax Agent
# Version: 2.0.0
# Date: 2025-12-06

param(
    [switch]$Force = $false,
    [switch]$Verbose = $false
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 脚本路径
#$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
#$ProjectPath = Split-Path -Parent (Split-Path -Parent $ScriptPath)
$ScriptPath = Get-Location
$ProjectPath = Get-Location
$LogPath = Join-Path $ProjectPath "logs"

# 创建日志目录
if (!(Test-Path $LogPath)) {
    New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
}

# 日志函数
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # 输出到控制台
    if ($Verbose -or $Level -eq "ERROR") {
        Write-Host $logMessage -ForegroundColor $(if($Level -eq "ERROR"){"Red"} elseif($Level -eq "WARN"){"Yellow"} else{"Green"})
    }
    
    # 写入日志文件
    $logFile = Join-Path $LogPath "startup-$(Get-Date -Format 'yyyyMMdd').log"
    Add-Content -Path $logFile -Value $logMessage
}

# 检查管理员权限
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# 检查Node.js环境
function Test-NodeJS {
    try {
        $nodeVersion = node --version
        Write-Log "Node.js版本检查通过: $nodeVersion"
        
        # 检查版本是否满足要求 (>=16.0)
        $versionParts = $nodeVersion.TrimStart('v').Split('.')
        $majorVersion = [int]$versionParts[0]
        
        if ($majorVersion -lt 16) {
            throw "Node.js版本过低，需要16.0或更高版本"
        }
        
        return $true
    }
    catch {
        Write-Log "Node.js未安装或版本不满足要求: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# 检查端口占用
function Test-PortAvailable {
    param([int]$Port)
    
    try {
        $connection = Test-NetConnection -ComputerName "localhost" -Port $Port -WarningAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            Write-Log "端口 $Port 已被占用" "WARN"
            return $false
        }
        else {
            Write-Log "端口 $Port 可用"
            return $true
        }
    }
    catch {
        Write-Log "检查端口 $Port 状态时出错: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# 安装依赖
function Install-Dependencies {
    Write-Log "开始安装项目依赖..."
    
    try {
        # 检查npm是否可用
        $npmVersion = npm --version
        Write-Log "npm版本: $npmVersion"
        
        # 安装依赖
        Set-Location $ProjectPath
        npm install
        
        Write-Log "依赖安装完成"
        return $true
    }
    catch {
        Write-Log "依赖安装失败: $($_.Exception.Message)" "ERROR"
        return $false
    }
    finally {
        Set-Location $ScriptPath
    }
}

# 启动后端服务
function Start-BackendService {
    Write-Log "启动后端服务..."
    
    try {
        # 检查后端服务脚本是否存在
        $backendScript = Join-Path $ProjectPath "api-server.js"
        if (!(Test-Path $backendScript)) {
            throw "后端服务脚本不存在: $backendScript"
        }
        
        # 启动后端服务 (后台运行)
        $process = Start-Process -FilePath "node" -ArgumentList "api-server.js" -WorkingDirectory $ProjectPath -PassThru
        
        Write-Log "后端服务已启动，进程ID: $($process.Id)"
        
        # 等待服务启动 - 给予足够时间初始化
        Start-Sleep -Seconds 8
        
        # 检查服务是否正常运行
        $attempts = 0
        $maxAttempts = 15
        while ($attempts -lt $maxAttempts) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 5 -ErrorAction Stop
                if ($response.StatusCode -eq 200) {
                    Write-Log "后端服务启动成功"
                    return $true
                }
            }
            catch {
                $attempts++
                if ($attempts -lt $maxAttempts) {
                    Write-Log "等待后端服务启动... ($attempts/$maxAttempts)"
                    Start-Sleep -Seconds 2
                }
            }
        }
        
        # 检查进程是否还在运行
        if (Get-Process -Id $process.Id -ErrorAction SilentlyContinue) {
            Write-Log "后端服务进程正在运行但健康检查失败，可能仍在初始化中" "WARN"
            # 再等待一会儿
            Start-Sleep -Seconds 5
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 5 -ErrorAction Stop
                if ($response.StatusCode -eq 200) {
                    Write-Log "后端服务启动成功（延迟响应）"
                    return $true
                }
            }
            catch {
                Write-Log "后端服务健康检查最终失败" "ERROR"
            }
        }
        
        throw "后端服务启动超时"
    }
    catch {
        Write-Log "后端服务启动失败: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# 启动前端服务
function Start-FrontendService {
    Write-Log "启动前端服务..."
    
    try {
        Set-Location $ProjectPath
        
        # 检查前端构建脚本
        $frontendScript = Join-Path $ProjectPath "serve.js"
        if (!(Test-Path $frontendScript)) {
            # 使用npm脚本启动
            $process = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $ProjectPath -PassThru
        }
        else {
            $process = Start-Process -FilePath "node" -ArgumentList $frontendScript -WorkingDirectory $ProjectPath -PassThru
        }
        
        Write-Log "前端服务已启动，进程ID: $($process.Id)"
        
        # 等待服务启动
        Start-Sleep -Seconds 5
        
        # 检查服务是否正常运行
        $attempts = 0
        while ($attempts -lt 10) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:3001" -TimeoutSec 5
                if ($response.StatusCode -eq 200) {
                    Write-Log "前端服务启动成功"
                    return $true
                }
            }
            catch {
                $attempts++
                Write-Log "等待前端服务启动... ($attempts/10)"
                Start-Sleep -Seconds 2
            }
        }
        
        Write-Log "前端服务启动超时，但进程可能仍在运行" "WARN"
        return $true
    }
    catch {
        Write-Log "前端服务启动失败: $($_.Exception.Message)" "ERROR"
        return $false
    }
    finally {
        Set-Location $ScriptPath
    }
}

# 验证系统状态
function Test-SystemHealth {
    Write-Log "验证系统健康状态..."
    
    $results = @{}
    
    # 检查后端API
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            $results.Backend = "正常"
            Write-Log "后端API检查: 正常"
        }
        else {
            $results.Backend = "异常"
            Write-Log "后端API检查: 异常 (状态码: $($response.StatusCode))" "WARN"
        }
    }
    catch {
        $results.Backend = "不可达"
        Write-Log "后端API检查: 不可达" "ERROR"
    }
    
    # 检查前端页面
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            $results.Frontend = "正常"
            Write-Log "前端页面检查: 正常"
        }
        else {
            $results.Frontend = "异常"
            Write-Log "前端页面检查: 异常 (状态码: $($response.StatusCode))" "WARN"
        }
    }
    catch {
        $results.Frontend = "不可达"
        Write-Log "前端页面检查: 不可达" "ERROR"
    }
    
    # 检查验证页面
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/public/system-verification.html" -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            $results.Verification = "正常"
            Write-Log "验证页面检查: 正常"
        }
        else {
            $results.Verification = "异常"
            Write-Log "验证页面检查: 异常 (状态码: $($response.StatusCode))" "WARN"
        }
    }
    catch {
        $results.Verification = "不可达"
        Write-Log "验证页面检查: 不可达" "ERROR"
    }
    
    return $results
}

# 打开浏览器
function Open-Browser {
    Write-Log "打开浏览器访问系统..."
    
    try {
        Start-Process "http://localhost:3000/public/system-verification.html"
        Write-Log "浏览器已打开"
    }
    catch {
        Write-Log "打开浏览器失败: $($_.Exception.Message)" "WARN"
    }
}

# 显示使用说明
function Show-Usage {
    Write-Host ""
    Write-Host "=== 放射化学纯度检测仪系统启动完成 ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 访问地址:" -ForegroundColor Cyan
    Write-Host "   主页面:     http://localhost:3000"
    Write-Host "   验证页面:   http://localhost:3000/public/system-verification.html"
    Write-Host "   API接口:    http://localhost:3000/api"
    Write-Host ""
    Write-Host "🔧 管理命令:" -ForegroundColor Cyan
    Write-Host "   停止系统:   .\stop-system.ps1"
    Write-Host "   重启系统:   .\restart-system.ps1"
    Write-Host "   系统验证:   .\verify-system.ps1"
    Write-Host ""
    Write-Host "📋 端口信息:" -ForegroundColor Cyan
    Write-Host "   前端服务:   3001"
    Write-Host "   后端服务:   3000"
    Write-Host ""
    Write-Host "⚠️  注意事项:" -ForegroundColor Yellow
    Write-Host "   - 确保检测设备已正确连接"
    Write-Host "   - 检查串口配置是否正确"
    Write-Host "   - 定期查看系统日志"
    Write-Host ""
}

# 主函数
function Start-System {
    Write-Log "=== 开始启动放射化学纯度检测仪系统 ===" "INFO"
    
    # 检查管理员权限
    if (!(Test-Administrator)) {
        Write-Log "建议以管理员权限运行以确保串口访问正常" "WARN"
    }
    
    # 检查Node.js环境
    if (!(Test-NodeJS)) {
        Write-Log "Node.js环境检查失败，请先安装Node.js 16.0或更高版本" "ERROR"
        exit 1
    }
    
    # 检查端口可用性
    if (!(Test-PortAvailable 3000)) {
        if (!$Force) {
            Write-Log "端口3000被占用，使用 -Force 参数强制启动或关闭占用端口的程序" "ERROR"
            exit 1
        }
        Write-Log "强制启动，端口3000可能被占用" "WARN"
    }
    
    if (!(Test-PortAvailable 3001)) {
        if (!$Force) {
            Write-Log "端口3001被占用，使用 -Force 参数强制启动或关闭占用端口的程序" "ERROR"
            exit 1
        }
        Write-Log "强制启动，端口3001可能被占用" "WARN"
    }
    
    # 安装依赖
    if (!(Install-Dependencies)) {
        Write-Log "依赖安装失败，系统启动终止" "ERROR"
        exit 1
    }
    
    # 启动后端服务
    if (!(Start-BackendService)) {
        Write-Log "后端服务启动失败，系统启动终止" "ERROR"
        exit 1
    }
    
    # 启动前端服务
    if (!(Start-FrontendService)) {
        Write-Log "前端服务启动失败" "WARN"
        Write-Log "请手动检查前端服务状态" "WARN"
    }
    
    # 验证系统健康状态
    $healthResults = Test-SystemHealth
    
    # 打开浏览器
    Open-Browser
    
    # 显示使用说明
    Show-Usage
    
    Write-Log "=== 系统启动完成 ===" "INFO"
    
    # 返回健康检查结果
    return $healthResults
}

# 执行主函数
try {
    $healthStatus = Start-System
    exit 0
}
catch {
    Write-Log "系统启动过程中发生错误: $($_.Exception.Message)" "ERROR"
    Write-Log "请检查日志文件: $LogPath" "ERROR"
    exit 1
}