param([string]$TargetRoot='C:\Users\Administrator\Desktop\角色绘画')
$ErrorActionPreference='Stop'
$root=(Resolve-Path -LiteralPath $TargetRoot).Path.TrimEnd('\','/')
$manifest=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'file-hashes.json') -Raw | ConvertFrom-Json
# 全部校验完再写入；后续代码有变化时拒绝覆盖。
foreach($entry in $manifest){
  $target=[IO.Path]::GetFullPath((Join-Path $root $entry.path))
  if(!$target.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw '恢复路径越界'}
  if((Get-FileHash -LiteralPath $target).Hash -ne $entry.modified){throw "文件已有后续修改，拒绝覆盖：$($entry.path)"}
  if((Get-FileHash -LiteralPath (Join-Path $PSScriptRoot ('rollback/'+$entry.path))).Hash -ne $entry.rollback){throw "恢复副本校验失败：$($entry.path)"}
}
foreach($entry in $manifest){Copy-Item -LiteralPath (Join-Path $PSScriptRoot ('rollback/'+$entry.path)) -Destination (Join-Path $root $entry.path)}
foreach($entry in $manifest){if((Get-FileHash -LiteralPath (Join-Path $root $entry.path)).Hash -ne $entry.rollback){throw "恢复后校验失败：$($entry.path)"}}
Write-Output 'PASS: 本次四个文件改动已撤回；工程数据及测试产物未改动。'
