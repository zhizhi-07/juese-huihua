param([string]$TargetRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath($TargetRoot).TrimEnd('\')
$items = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'restore-manifest.json') -Raw | ConvertFrom-Json
foreach ($item in $items) {
    $target = [IO.Path]::GetFullPath((Join-Path $root $item.target))
    if (-not $target.StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase)) { throw '恢复路径越界' }
    if ((Get-FileHash -LiteralPath (Join-Path $PSScriptRoot $item.backup) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $item.before) { throw '原始备份校验失败' }
    if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $item.after) { throw "已有后续改动，停止恢复：$target" }
}
foreach ($item in $items) {
    $target = Join-Path $root $item.target
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $item.backup) -Destination $target
    if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $item.before) { throw '恢复校验失败' }
    Write-Output "RESTORED $target"
}
Write-Output '仅恢复本次三个代码/测试文件；不修改工程数据。'
