param([string]$TargetDirectory = (Join-Path $PSScriptRoot '..\..'))
$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..')).TrimEnd('\')
$directory = (Resolve-Path -LiteralPath $TargetDirectory).Path.TrimEnd('\')
if ($directory -ne $workspace -and -not $directory.StartsWith($workspace + '\', [StringComparison]::OrdinalIgnoreCase)) { throw '恢复目标必须位于当前工作区。' }
$source = Join-Path $PSScriptRoot 'hair-auto-demo.html'
$target = Join-Path $directory 'hair-auto-demo.html'
if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash -ne '067E1BEA22CF135D983F70EFB1E8C1A3385BF7B6746CCBBD6F4F87A35E6410B9') { throw '备份哈希不符，停止恢复。' }
if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { throw '目标页面不存在，停止恢复。' }
$hash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
if ($hash -notin @('067E1BEA22CF135D983F70EFB1E8C1A3385BF7B6746CCBBD6F4F87A35E6410B9', '04DC262D132B459DB3E8BF3D666B993A49705300099A54BAD7751E7171D043A8')) { throw '页面已有其他修改，拒绝覆盖。请先手工合并。' }
Copy-Item -LiteralPath $source -Destination $target
if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne '067E1BEA22CF135D983F70EFB1E8C1A3385BF7B6746CCBBD6F4F87A35E6410B9') { throw '恢复后哈希校验失败。' }
Write-Output "已恢复原页面：$target（未改工程数据；新增JS保留但原页不再引用）"