param([string]$TargetRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath($TargetRoot).TrimEnd('\')
$items = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'restore-manifest.json') -Raw | ConvertFrom-Json
foreach ($item in $items) {
    $target = [IO.Path]::GetFullPath((Join-Path $root $item.target))
    if (-not $target.StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase)) { throw '恢复路径越界' }
    $source = Join-Path $PSScriptRoot $item.backup
    if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $item.before) { throw "备份损坏：$source" }
    if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $item.after) { throw "修复后又有修改，停止恢复以免覆盖：$target" }
}
foreach ($item in $items) {
    $target = Join-Path $root $item.target
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $item.backup) -Destination $target
    if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $item.before) { throw "恢复验证失败：$target" }
    Write-Output "RESTORED $target"
}
Write-Output '修复涉及的代码/测试文件已恢复；未修改任何工程数据。'
