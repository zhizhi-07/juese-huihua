param([string]$Workspace = (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent))
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $Workspace).Path.TrimEnd('\','/')
$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'manifest.json') -Raw | ConvertFrom-Json
foreach ($entry in $manifest) {
  $target = [IO.Path]::GetFullPath((Join-Path $root $entry.file))
  if (-not $target.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw '恢复路径超出工作区' }
  if (-not (Test-Path -LiteralPath $target) -or (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne $entry.afterSha256) { throw "文件已变化，停止恢复：$target" }
  if ($entry.existed) {
    $backup = Join-Path (Join-Path $PSScriptRoot 'before') $entry.file
    if ((Get-FileHash -LiteralPath $backup -Algorithm SHA256).Hash -ne $entry.beforeSha256) { throw "备份校验失败：$backup" }
  }
}
foreach ($entry in $manifest) {
  $target = [IO.Path]::GetFullPath((Join-Path $root $entry.file))
  if ($entry.existed) {
    Copy-Item -LiteralPath (Join-Path (Join-Path $PSScriptRoot 'before') $entry.file) -Destination $target
    if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne $entry.beforeSha256) { throw "恢复回读不一致：$target" }
  } else { Remove-Item -LiteralPath $target }
}
'已恢复本次编辑器代码；未修改工程数据。'
