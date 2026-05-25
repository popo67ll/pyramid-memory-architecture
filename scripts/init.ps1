# 金字塔记忆架构 - Windows 一键初始化脚本 v2.0
# 用法: 在 PowerShell 中运行 .\init.ps1 [工作区名称]
# 示例: .\init.ps1 my-agent

param(
    [string]$WorkspaceName = "my-new-agent"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$SkillDir = Split-Path -Parent $ScriptDir
$TargetDir = Join-Path $SkillDir "workspace-$WorkspaceName"

Write-Host "🏗️ 开始初始化工作区: $WorkspaceName..." -ForegroundColor Cyan

# 1. 创建目录结构
$Dirs = @(
    "$TargetDir\docs",
    "$TargetDir\memory",
    "$TargetDir\self-improving\domains",
    "$TargetDir\self-improving\projects",
    "$TargetDir\self-improving\archive"
)

foreach ($Dir in $Dirs) {
    if (-not (Test-Path $Dir)) {
        New-Item -ItemType Directory -Force -Path $Dir | Out-Null
    }
}

# 2. 复制模板文件
$TemplatesDir = Join-Path $SkillDir "templates"
$Templates = @(
    "AGENTS.md",
    "MEMORY.md",
    "SOUL.md",
    "HEARTBEAT.md",
    "IDENTITY.md",
    "USER.md",
    "TOOLS.md"
)

foreach ($Template in $Templates) {
    $Src = Join-Path $TemplatesDir $Template
    if (Test-Path $Src) {
        Copy-Item -Path $Src -Destination $TargetDir -Force
    }
}

Write-Host "✅ 工作区 '$WorkspaceName' 初始化完成！" -ForegroundColor Green
Write-Host "📂 路径: $TargetDir" -ForegroundColor Yellow
Write-Host "📝 请编辑各 .md 文件，替换 [方括号] 内容为你的实际配置。"
