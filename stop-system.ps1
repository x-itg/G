# 放射化学纯度检测仪系统停止脚本
# System Shutdown Script for Radiation Purity Detector
# Author: MiniMax Agent
# Version: 2.0.0
# Date: 2025-12-06

param(
    [switch]$Force = $false,
    [switch]$Verbose = $false
)

# 设置错误处理
$ErrorActionPreference = "Continue"

# 脚本路径
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectPath = Split-Path -Parent (Split-Path -Parent $ScriptPath)
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
    $logFile = Join-Path $LogPath "shutdown-$(Get-Date -Format 'yyyyMMdd').log"
    Add-Content -Path $logFile -Value $logMessage
}

# 停止Node.js进程
function Stop-NodeProcesses {
    Write-Log "正在停止Node.js进程..."
    
    try {
        # 查找相关的Node.js进程
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
            $_.CommandLine -like "*api-server.js*" -or 
            $_.CommandLine -like "*serve.js*" -or
            $_.CommandLine -like "*radiation-detector*"
        }
        
        if ($nodeProcesses) {
            Write-Log "找到 $($nodeProcesses.Count) 个相关Node.js进程"
            
            foreach ($process in $nodeProcesses) {
                try {
                    Write-Log "停止进程: $($process.ProcessName) (PID: $($process.Id))"
                    
                    if ($Force) {
                        # 强制终止
                        $process.Kill()
                        Write-Log "强制终止进程 PID: $($process.Id)"
                    }
                    else {
                        # 正常终止
                        $process.CloseMainWindow()
                        Start-Sleep -Seconds 2
                        
                        # 检查进程是否已退出
                        if (!$process.HasExited) {
                            Write-Log "进程未响应，强制终止 PID: $($process.Id)" "WARN"
                            $process.Kill()
                        }
                        else {
                            Write-Log "正常停止进程 PID: $($process.Id)"
                        }
                    }
                }
                catch {
                    Write-Log "停止进程 $($process.Id) 时出错: $($_.Exception.Message)" "ERROR"
                }
            }
        }
        else {
            Write-Log "未找到相关的Node.js进程"
        }
    }
    catch {
        Write-Log "停止Node.js进程时发生错误: $($_.Exception.Message)" "ERROR"
    }
}

# 清理临时文件
function Clear-TemporaryFiles {
    Write-Log "清理临时文件..."
    
    try {
        $tempDirs = @(
            Join-Path $ProjectPath "tmp",
            Join-Path $ProjectPath "logs\*.log",
            Join-Path $ProjectPath "node_modules\.cache"
        )
        
        foreach ($tempDir in $tempDirs) {
            if (Test-Path $tempDir) {
                try {
                    Remove-Item -Path $tempDir -Recurse -Force
                    Write-Log "已清理: $tempDir"
                }
                catch {
                    Write-Log "清理失败: $tempDir - $($_.Exception.Message)" "WARN"
                }
            }
        }
    }
    catch {
        Write-Log "清理临时文件时发生错误: $($_.Exception.Message)" "ERROR"
    }
}

# 释放端口
function Release-Ports {
    Write-Log "检查端口占用情况..."
    
    $ports = @(3000, 3001)
    
    foreach ($port in $ports) {
        try {
            $connection = Test-NetConnection -ComputerName "localhost" -Port $port -WarningAction SilentlyContinue
            if ($connection.TcpTestSucceeded) {
                Write-Log "端口 $port 仍被占用" "WARN"
                
                # 查找占用端口的进程
                $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | 
                           Select-Object -ExpandProperty OwningProcess
            
                foreach ($processId in $processes) {
                    try {
                        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                        if ($process) {
                            Write-Log "终止占用端口 $port 的进程: $($process.ProcessName) (PID: $processId)"
                            $process.Kill()
                            $process.WaitForExit(5000)
                        }
                    }
                    catch {
                        Write-Log "终止进程 $processId 时出错: $($_.Exception.Message)" "ERROR"
                    }
                }
            }
            else {
                Write-Log "端口 $port 已释放"
            }
        }
        catch {
            Write-Log "检查端口 $port 时出错: $($_.Exception.Message)" "ERROR"
        }
    }
}

# 断开串口连接
function Disconnect-SerialPorts {
    Write-Log "断开串口连接..."
    
    try {
        # 这里可以通过API调用断开串口
        $apiUrl = "http://localhost:3000/api/devices/disconnect"
        
        try {
            $response = Invoke-WebRequest -Uri $apiUrl -Method POST -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Log "串口连接已断开"
            }
        }
        catch {
            Write-Log "通过API断开串口失败: $($_.Exception.Message)" "WARN"
        }
    }
    catch {
        Write-Log "断开串口连接时发生错误: $($_.Exception.Message)" "ERROR"
    }
}

# 保存系统状态
function Save-SystemState {
    Write-Log "保存系统关闭状态..."
    
    try {
        $stateFile = Join-Path $ProjectPath "logs\system-state.json"
        $state = @{
            shutdownTime = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
            version = "2.0.0"
            ports = @{
                frontend = 3001
                backend = 3000
            }
            processesStopped = $true
        }
        
        $state | ConvertTo-Json -Depth 3 | Out-File -FilePath $stateFile -Encoding UTF8
        Write-Log "系统状态已保存"
    }
    catch {
        Write-Log "保存系统状态时出错: $($_.Exception.Message)" "ERROR"
    }
}

# 验证系统停止
function Test-SystemStopped {
    Write-Log "验证系统是否已完全停止..."
    
    $results = @{}
    
    # 检查端口是否已释放
    foreach ($port in @(3000, 3001)) {
        try {
            $connection = Test-NetConnection -ComputerName "localhost" -Port $port -WarningAction SilentlyContinue
            if ($connection.TcpTestSucceeded) {
                $results["Port$port"] = "仍在占用"
                Write-Log "端口 $port 仍被占用" "WARN"
            }
            else {
                $results["Port$port"] = "已释放"
                Write-Log "端口 $port 已释放"
            }
        }
        catch {
            $results["Port$port"] = "检查失败"
            Write-Log "检查端口 $port 时出错: $($_.Exception.Message)" "ERROR"
        }
    }
    
    # 检查Node.js进程
    try {
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
            $_.CommandLine -like "*radiation-detector*" -or 
            $_.CommandLine -like "*api-server.js*"
        }
        
        if ($nodeProcesses) {
            $results.NodeProcesses = "$($nodeProcesses.Count) 个进程仍在运行"
            Write-Log "发现 $($nodeProcesses.Count) 个相关Node.js进程仍在运行" "WARN"
        }
        else {
            $results.NodeProcesses = "无相关进程"
            Write-Log "无相关Node.js进程运行"
        }
    }
    catch {
        $results.NodeProcesses = "检查失败"
        Write-Log "检查Node.js进程时出错: $($_.Exception.Message)" "ERROR"
    }
    
    return $results
}

# 显示停止报告
function Show-ShutdownReport {
    param([hashtable]$StopResults, [hashtable]$VerifyResults)
    
    Write-Host ""
    Write-Host "=== 放射化学纯度检测仪系统停止完成 ===" -ForegroundColor Red
    Write-Host ""
    Write-Host "🛑 停止操作摘要:" -ForegroundColor Yellow
    
    if ($StopResults) {
        foreach ($key in $StopResults.Keys) {
            Write-Host "   $key : $($StopResults[$key])"
        }
    }
    
    Write-Host ""
    Write-Host "🔍 停止验证结果:" -ForegroundColor Yellow
    
    if ($VerifyResults) {
        foreach ($key in $VerifyResults.Keys) {
            $color = if ($VerifyResults[$key] -like "*已释放*" -or $VerifyResults[$key] -like "*无相关*") { "Green" } else { "Yellow" }
            Write-Host "   $key : $($VerifyResults[$key])" -ForegroundColor $color
        }
    }
    
    Write-Host ""
    Write-Host "📂 重要文件位置:" -ForegroundColor Cyan
    Write-Host "   项目目录: $ProjectPath"
    Write-Host "   日志目录: $LogPath"
    Write-Host ""
    Write-Host "🚀 重新启动:" -ForegroundColor Green
    Write-Host "   启动系统: .\start-system.ps1"
    Write-Host ""
}

# 主函数
function Stop-System {
    Write-Log "=== 开始停止放射化学纯度检测仪系统 ===" "INFO"
    
    $stopResults = @{}
    
    # 断开串口连接
    Disconnect-SerialPorts
    $stopResults.SerialDisconnected = "完成"
    
    # 保存系统状态
    Save-SystemState
    $stopResults.StateSaved = "完成"
    
    # 停止Node.js进程
    Stop-NodeProcesses
    $stopResults.ProcessesStopped = "完成"
    
    # 释放端口
    Release-Ports
    $stopResults.PortsReleased = "完成"
    
    # 清理临时文件
    Clear-TemporaryFiles
    $stopResults.TempFilesCleared = "完成"
    
    # 验证系统停止
    $verifyResults = Test-SystemStopped
    
    Write-Log "=== 系统停止完成 ===" "INFO"
    
    # 显示停止报告
    Show-ShutdownReport -StopResults $stopResults -VerifyResults $verifyResults
    
    return @{
        StopResults = $stopResults
        VerifyResults = $verifyResults
    }
}

# 执行主函数
try {
    $results = Stop-System
    
    # 检查是否有警告
    $hasWarnings = $false
    foreach ($value in $results.VerifyResults.Values) {
        if ($value -notlike "*已释放*" -and $value -notlike "*无相关*") {
            $hasWarnings = $true
            break
        }
    }
    
    if ($hasWarnings) {
        Write-Host ""
        Write-Host "⚠️  系统停止过程中发现警告，建议检查上述项目" -ForegroundColor Yellow
        exit 1
    }
    else {
        Write-Host ""
        Write-Host "✅ 系统已完全停止" -ForegroundColor Green
        exit 0
    }
}
catch {
    Write-Log "系统停止过程中发生错误: $($_.Exception.Message)" "ERROR"
    Write-Log "请检查日志文件: $LogPath" "ERROR"
    exit 1
}