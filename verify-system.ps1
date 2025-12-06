# 放射化学纯度检测仪系统验证脚本
# System Verification Script for Radiation Purity Detector
# Author: xitg
# Version: 2.0.0
# Date: 2025-12-06

param(
    [switch]$Detailed = $false,
    [switch]$Fix = $false,
    [switch]$Export = $false,
    [string]$OutputPath = ""
)

# 设置错误处理
$ErrorActionPreference = "Continue"

# 脚本路径
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectPath = Split-Path -Parent (Split-Path -Parent $ScriptPath)
$LogPath = Join-Path $ProjectPath "logs"
$ReportPath = Join-Path $LogPath "verification-reports"

# 创建必要目录
if (!(Test-Path $LogPath)) {
    New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
}
if (!(Test-Path $ReportPath)) {
    New-Item -ItemType Directory -Path $ReportPath -Force | Out-Null
}

# 全局验证结果
$Global:VerificationResults = @{
    StartTime = Get-Date
    Environment = @{}
    Dependencies = @{}
    Configuration = @{}
    Services = @{}
    Ports = @{}
    API = @{}
    Database = @{}
    Serial = @{}
    Security = @{}
    Performance = @{}
    Overall = @{
        Status = "UNKNOWN"
        Score = 0
        Issues = @()
        Warnings = @()
    }
}

# 日志函数
function Write-Log {
    param([string]$Message, [string]$Level = "INFO", [string]$Category = "GENERAL")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] [$Category] $Message"
    
    # 输出到控制台
    $color = switch($Level) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    
    if ($Detailed -or $Level -ne "INFO") {
        Write-Host $logMessage -ForegroundColor $color
    }
    
    # 写入日志文件
    $logFile = Join-Path $LogPath "verification-$(Get-Date -Format 'yyyyMMdd').log"
    Add-Content -Path $logFile -Value $logMessage
}

# 添加验证结果
function Add-VerificationResult {
    param(
        [string]$Category,
        [string]$Test,
        [string]$Status,
        [string]$Message = "",
        [object]$Data = $null
    )
    
    if (!$Global:VerificationResults[$Category]) {
        $Global:VerificationResults[$Category] = @{}
    }
    
    $Global:VerificationResults[$Category][$Test] = @{
        Status = $Status
        Message = $Message
        Data = $Data
        Timestamp = Get-Date
    }
    
    # 记录日志
    $logLevel = switch($Status) {
        "PASS" { "SUCCESS" }
        "FAIL" { "ERROR" }
        "WARN" { "WARN" }
        default { "INFO" }
    }
    
    Write-Log "$Test - $Status : $Message" $logLevel $Category
}

# 检查环境
function Test-Environment {
    Write-Log "开始检查系统环境..." "INFO" "ENVIRONMENT"
    
    # 检查操作系统
    $osInfo = Get-WmiObject -Class Win32_OperatingSystem
    Add-VerificationResult "Environment" "OperatingSystem" "PASS" "Windows $($osInfo.Version)"
    
    # 检查Node.js
    try {
        $nodeVersion = node --version
        $versionParts = $nodeVersion.TrimStart('v').Split('.')
        $majorVersion = [int]$versionParts[0]
        
        if ($majorVersion -ge 16) {
            Add-VerificationResult "Environment" "NodeJS" "PASS" "Node.js $nodeVersion (满足要求)"
        }
        else {
            Add-VerificationResult "Environment" "NodeJS" "FAIL" "Node.js版本过低: $nodeVersion (需要>=16.0)"
        }
    }
    catch {
        Add-VerificationResult "Environment" "NodeJS" "FAIL" "Node.js未安装或不在PATH中"
    }
    
    # 检查npm
    try {
        $npmVersion = npm --version
        Add-VerificationResult "Environment" "NPM" "PASS" "npm $npmVersion"
    }
    catch {
        Add-VerificationResult "Environment" "NPM" "FAIL" "npm未安装或不在PATH中"
    }
    
    # 检查PowerShell版本
    $psVersion = $PSVersionTable.PSVersion
    Add-VerificationResult "Environment" "PowerShell" "PASS" "PowerShell $($psVersion.Major).$($psVersion.Minor)"
    
    # 检查磁盘空间
    try {
        $disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
        $freeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 2)
        $totalSpaceGB = [math]::Round($disk.Size / 1GB, 2)
        
        if ($freeSpaceGB -gt 1) {
            Add-VerificationResult "Environment" "DiskSpace" "PASS" "可用空间: ${freeSpaceGB}GB / ${totalSpaceGB}GB"
        }
        else {
            Add-VerificationResult "Environment" "DiskSpace" "WARN" "磁盘空间不足: ${freeSpaceGB}GB"
        }
    }
    catch {
        Add-VerificationResult "Environment" "DiskSpace" "FAIL" "无法获取磁盘空间信息"
    }
}

# 检查依赖
function Test-Dependencies {
    Write-Log "开始检查项目依赖..." "INFO" "DEPENDENCIES"
    
    Set-Location $ProjectPath
    
    try {
        # 检查package.json
        if (Test-Path "package.json") {
            Add-VerificationResult "Dependencies" "PackageJson" "PASS" "package.json存在"
            
            # 检查关键依赖
            $packageJson = Get-Content "package.json" | ConvertFrom-Json
            $keyDependencies = @("express", "cors", "helmet", "serialport")
            
            foreach ($dep in $keyDependencies) {
                if ($packageJson.dependencies.$dep) {
                    Add-VerificationResult "Dependencies" "Dependency_$dep" "PASS" "$dep 已安装"
                }
                else {
                    Add-VerificationResult "Dependencies" "Dependency_$dep" "FAIL" "$dep 未安装"
                }
            }
        }
        else {
            Add-VerificationResult "Dependencies" "PackageJson" "FAIL" "package.json不存在"
        }
        
        # 检查node_modules
        if (Test-Path "node_modules") {
            $moduleCount = (Get-ChildItem "node_modules" -Directory).Count
            Add-VerificationResult "Dependencies" "NodeModules" "PASS" "node_modules存在，包含 $moduleCount 个模块"
        }
        else {
            Add-VerificationResult "Dependencies" "NodeModules" "FAIL" "node_modules目录不存在，请运行npm install"
        }
    }
    catch {
        Add-VerificationResult "Dependencies" "General" "FAIL" "依赖检查失败: $($_.Exception.Message)"
    }
    finally {
        Set-Location $ScriptPath
    }
}

# 检查配置文件
function Test-Configuration {
    Write-Log "开始检查配置文件..." "INFO" "CONFIGURATION"
    
    $configFiles = @{
        "config/port-config.json" = "端口配置"
        "config/communication-config.json" = "通讯配置"
        "config/system-settings.json" = "系统设置"
    }
    
    foreach ($file in $configFiles.Keys) {
        $fullPath = Join-Path $ProjectPath $file
        if (Test-Path $fullPath) {
            try {
                $content = Get-Content $fullPath | ConvertFrom-Json
                Add-VerificationResult "Configuration" $file "PASS" "$($configFiles[$file]) 有效"
            }
            catch {
                Add-VerificationResult "Configuration" $file "WARN" "$($configFiles[$file]) 格式无效"
            }
        }
        else {
            Add-VerificationResult "Configuration" $file "WARN" "$($configFiles[$file]) 文件不存在"
        }
    }
    
    # 检查数据库文件
    $dbDir = Join-Path $ProjectPath "database"
    if (Test-Path $dbDir) {
        Add-VerificationResult "Configuration" "DatabaseDir" "PASS" "数据库目录存在"
    }
    else {
        Add-VerificationResult "Configuration" "DatabaseDir" "WARN" "数据库目录不存在"
    }
}

# 检查端口
function Test-Ports {
    Write-Log "开始检查端口状态..." "INFO" "PORTS"
    
    $ports = @{
        3000 = "后端API服务"
        3001 = "前端Web服务"
    }
    
    foreach ($port in $ports.Keys) {
        try {
            $connection = Test-NetConnection -ComputerName "localhost" -Port $port -WarningAction SilentlyContinue
            if ($connection.TcpTestSucceeded) {
                Add-VerificationResult "Ports" "Port_$port" "PASS" "$($ports[$port]) 正在运行"
            }
            else {
                Add-VerificationResult "Ports" "Port_$port" "WARN" "$($ports[$port]) 未运行"
            }
        }
        catch {
            Add-VerificationResult "Ports" "Port_$port" "FAIL" "检查端口 $port 时出错: $($_.Exception.Message)"
        }
    }
}

# 检查API接口
function Test-API {
    Write-Log "开始检查API接口..." "INFO" "API"
    
    $apiEndpoints = @{
        "http://localhost:3000/api/health" = "健康检查"
        "http://localhost:3000/api/status" = "状态查询"
        "http://localhost:3000/api/devices/status" = "设备状态"
    }
    
    foreach ($endpoint in $apiEndpoints.Keys) {
        try {
            $response = Invoke-WebRequest -Uri $endpoint -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                $content = $response.Content
                Add-VerificationResult "API" $endpoint "PASS" "$($apiEndpoints[$endpoint]) 正常"
            }
            else {
                Add-VerificationResult "API" $endpoint "WARN" "$($apiEndpoints[$endpoint]) 状态码: $($response.StatusCode)"
            }
        }
        catch {
            Add-VerificationResult "API" $endpoint "FAIL" "$($apiEndpoints[$endpoint]) 不可访问: $($_.Exception.Message)"
        }
    }
}

# 检查前端页面
function Test-Frontend {
    Write-Log "开始检查前端页面..." "INFO" "FRONTEND"
    
    $frontendPages = @{
        "http://localhost:3001" = "主页面"
        "http://localhost:3001/system-verification.html" = "验证页面"
        "http://localhost:3001/performance-monitoring.html" = "性能监控"
        "http://localhost:3001/permission-management.html" = "权限管理"
    }
    
    foreach ($page in $frontendPages.Keys) {
        try {
            $response = Invoke-WebRequest -Uri $page -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Add-VerificationResult "Frontend" $page "PASS" "$($frontendPages[$page]) 可访问"
            }
            else {
                Add-VerificationResult "Frontend" $page "WARN" "$($frontendPages[$page]) 状态码: $($response.StatusCode)"
            }
        }
        catch {
            Add-VerificationResult "Frontend" $page "FAIL" "$($frontendPages[$page]) 不可访问: $($_.Exception.Message)"
        }
    }
}

# 检查数据库
function Test-Database {
    Write-Log "开始检查数据库..." "INFO" "DATABASE"
    
    try {
        # 通过API检查数据库状态
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/database/status" -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            $data = $response.Content | ConvertFrom-Json
            Add-VerificationResult "Database" "Connection" "PASS" "数据库连接正常"
            Add-VerificationResult "Database" "Tables" "PASS" "数据表状态: $($data.tables)"
        }
        else {
            Add-VerificationResult "Database" "Connection" "WARN" "数据库状态码: $($response.StatusCode)"
        }
    }
    catch {
        Add-VerificationResult "Database" "Connection" "FAIL" "数据库连接失败: $($_.Exception.Message)"
    }
}

# 检查串口通讯
function Test-Serial {
    Write-Log "开始检查串口通讯..." "INFO" "SERIAL"
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/devices/serial/status" -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            $data = $response.Content | ConvertFrom-Json
            if ($data.connected) {
                Add-VerificationResult "Serial" "Connection" "PASS" "串口已连接: $($data.portName)"
            }
            else {
                Add-VerificationResult "Serial" "Connection" "WARN" "串口未连接"
            }
            Add-VerificationResult "Serial" "Simulator" "PASS" "模拟器状态: $($data.simulatorMode)"
        }
        else {
            Add-VerificationResult "Serial" "Connection" "WARN" "串口状态码: $($response.StatusCode)"
        }
    }
    catch {
        Add-VerificationResult "Serial" "Connection" "FAIL" "串口检查失败: $($_.Exception.Message)"
    }
}

# 计算总体分数
function Calculate-OverallScore {
    $totalTests = 0
    $passedTests = 0
    $failedTests = 0
    $warnings = 0
    
    foreach ($category in $Global:VerificationResults.Keys) {
        if ($category -eq "Overall" -or $category -eq "StartTime") { continue }
        
        foreach ($test in $Global:VerificationResults[$category].Keys) {
            $totalTests++
            $result = $Global:VerificationResults[$category][$test]
            
            switch ($result.Status) {
                "PASS" { $passedTests++ }
                "FAIL" { $failedTests++; $Global:VerificationResults.Overall.Issues += "$category.$test: $($result.Message)" }
                "WARN" { $warnings++; $Global:VerificationResults.Overall.Warnings += "$category.$test: $($result.Message)" }
            }
        }
    }
    
    if ($totalTests -gt 0) {
        $score = [math]::Round(($passedTests / $totalTests) * 100, 1)
    }
    else {
        $score = 0
    }
    
    $Global:VerificationResults.Overall.Score = $score
    
    if ($failedTests -eq 0) {
        if ($warnings -eq 0) {
            $Global:VerificationResults.Overall.Status = "PASS"
        }
        else {
            $Global:VerificationResults.Overall.Status = "WARN"
        }
    }
    else {
        $Global:VerificationResults.Overall.Status = "FAIL"
    }
    
    return @{
        TotalTests = $totalTests
        PassedTests = $passedTests
        FailedTests = $failedTests
        Warnings = $warnings
        Score = $score
        Status = $Global:VerificationResults.Overall.Status
    }
}

# 生成报告
function Generate-Report {
    param([string]$Format = "CONSOLE")
    
    $overall = Calculate-OverallScore
    $Global:VerificationResults.EndTime = Get-Date
    $Global:VerificationResults.Overall.Duration = ($Global:VerificationResults.EndTime - $Global:VerificationResults.StartTime).TotalSeconds
    
    $reportFile = Join-Path $ReportPath "verification-report-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    
    switch ($Format) {
        "JSON" {
            $Global:VerificationResults | ConvertTo-Json -Depth 5 | Out-File -FilePath "$reportFile.json" -Encoding UTF8
            Write-Log "JSON报告已保存: $reportFile.json" "SUCCESS"
        }
        "HTML" {
            $html = Generate-HTMLReport
            $html | Out-File -FilePath "$reportFile.html" -Encoding UTF8
            Write-Log "HTML报告已保存: $reportFile.html" "SUCCESS"
        }
        default {
            Show-ConsoleReport
        }
    }
}

# 生成HTML报告
function Generate-HTMLReport {
    $overall = Calculate-OverallScore
    
    $html = @"
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>放射化学纯度检测仪系统验证报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #007bff; color: white; padding: 20px; border-radius: 10px; }
        .summary { background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .category { margin: 20px 0; }
        .test-result { padding: 10px; margin: 5px 0; border-radius: 5px; }
        .pass { background: #d4edda; border: 1px solid #c3e6cb; }
        .fail { background: #f8d7da; border: 1px solid #f5c6cb; }
        .warn { background: #fff3cd; border: 1px solid #ffeaa7; }
    </style>
</head>
<body>
    <div class="header">
        <h1>放射化学纯度检测仪系统验证报告</h1>
        <p>生成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</p>
        <p>总体状态: $($overall.Status) | 分数: $($overall.Score)% | 测试数: $($overall.TotalTests)</p>
    </div>
    
    <div class="summary">
        <h3>验证摘要</h3>
        <ul>
            <li>通过测试: $($overall.PassedTests)</li>
            <li>失败测试: $($overall.FailedTests)</li>
            <li>警告: $($overall.Warnings)</li>
            <li>执行时间: $($Global:VerificationResults.Overall.Duration)秒</li>
        </ul>
    </div>
"@

    foreach ($category in $Global:VerificationResults.Keys) {
        if ($category -in @("Overall", "StartTime", "EndTime")) { continue }
        
        $html += "`n    <div class='category'>"
        $html += "`n        <h3>$category</h3>"
        
        foreach ($test in $Global:VerificationResults[$category].Keys) {
            $result = $Global:VerificationResults[$category][$test]
            $class = switch($result.Status) { "PASS" { "pass" } "FAIL" { "fail" } default { "warn" } }
            
            $html += "`n        <div class='test-result $class'>"
            $html += "`n            <strong>$test</strong> - $($result.Status): $($result.Message)"
            $html += "`n        </div>"
        }
        
        $html += "`n    </div>"
    }
    
    $html += "`n</body>`n</html>"
    return $html
}

# 显示控制台报告
function Show-ConsoleReport {
    $overall = Calculate-OverallScore
    
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                    放射化学纯度检测仪系统验证报告                               ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 验证摘要:" -ForegroundColor Yellow
    Write-Host "   状态:     $($overall.Status)" -ForegroundColor $(switch($overall.Status) { "PASS" {"Green"} "FAIL" {"Red"} default {"Yellow"} })
    Write-Host "   分数:     $($overall.Score)%" -ForegroundColor Cyan
    Write-Host "   通过:     $($overall.PassedTests) 项测试" -ForegroundColor Green
    Write-Host "   失败:     $($overall.FailedTests) 项测试" -ForegroundColor Red
    Write-Host "   警告:     $($overall.Warnings) 项" -ForegroundColor Yellow
    Write-Host "   用时:     $($Global:VerificationResults.Overall.Duration) 秒" -ForegroundColor Cyan
    Write-Host ""
    
    # 显示各分类结果
    foreach ($category in $Global:VerificationResults.Keys) {
        if ($category -in @("Overall", "StartTime", "EndTime")) { continue }
        
        Write-Host "🔍 $category:" -ForegroundColor Magenta
        
        foreach ($test in $Global:VerificationResults[$category].Keys) {
            $result = $Global:VerificationResults[$category][$test]
            $icon = switch($result.Status) { "PASS" { "✅" } "FAIL" { "❌" } default { "⚠️" } }
            $color = switch($result.Status) { "PASS" { "Green" } "FAIL" { "Red" } default { "Yellow" } }
            
            Write-Host "   $icon $test - $($result.Message)" -ForegroundColor $color
        }
        Write-Host ""
    }
    
    # 显示问题和警告
    if ($Global:VerificationResults.Overall.Issues.Count -gt 0) {
        Write-Host "🚨 发现的问题:" -ForegroundColor Red
        foreach ($issue in $Global:VerificationResults.Overall.Issues) {
            Write-Host "   • $issue" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    if ($Global:VerificationResults.Overall.Warnings.Count -gt 0) {
        Write-Host "⚠️  警告信息:" -ForegroundColor Yellow
        foreach ($warning in $Global:VerificationResults.Overall.Warnings) {
            Write-Host "   • $warning" -ForegroundColor Yellow
        }
        Write-Host ""
    }
    
    # 显示建议
    Write-Host "💡 建议操作:" -ForegroundColor Cyan
    if ($overall.Status -eq "PASS") {
        Write-Host "   ✅ 系统运行正常，可以正常使用" -ForegroundColor Green
    }
    elseif ($overall.Status -eq "WARN") {
        Write-Host "   ⚠️  系统基本正常，但有警告需要关注" -ForegroundColor Yellow
        Write-Host "   🔧 建议检查警告项目并及时处理" -ForegroundColor Yellow
    }
    else {
        Write-Host "   ❌ 系统存在严重问题，需要立即处理" -ForegroundColor Red
        Write-Host "   🛠️  建议运行修复脚本或手动检查问题项目" -ForegroundColor Red
    }
    Write-Host ""
}

# 主函数
function Start-Verification {
    Write-Log "=== 开始系统验证 ===" "INFO" "VERIFICATION"
    Write-Log "详细模式: $Detailed, 修复模式: $Fix, 导出模式: $Export" "INFO" "VERIFICATION"
    
    # 执行各项检查
    Test-Environment
    Test-Dependencies
    Test-Configuration
    Test-Ports
    Test-API
    Test-Frontend
    Test-Database
    Test-Serial
    
    # 生成报告
    if ($Export) {
        if ($OutputPath) {
            # 自定义路径
            Generate-Report -Format "JSON"
        }
        else {
            # 默认路径
            Generate-Report -Format "JSON"
            Generate-Report -Format "HTML"
        }
    }
    else {
        Generate-Report
    }
    
    Write-Log "=== 验证完成 ===" "INFO" "VERIFICATION"
    
    return Calculate-OverallScore
}

# 执行主函数
try {
    $results = Start-Verification
    
    # 返回适当的退出码
    switch ($results.Status) {
        "PASS" { exit 0 }
        "WARN" { exit 1 }
        "FAIL" { exit 2 }
        default { exit 3 }
    }
}
catch {
    Write-Log "验证过程发生错误: $($_.Exception.Message)" "ERROR" "VERIFICATION"
    exit 4
}