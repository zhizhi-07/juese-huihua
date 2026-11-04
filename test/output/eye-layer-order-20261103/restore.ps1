param([string]$TargetRoot = (Join-Path $PSScriptRoot '../../..'))
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath($TargetRoot).TrimEnd([IO.Path]::DirectorySeparatorChar)
$items=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'manifest.json') -Raw | ConvertFrom-Json
foreach($item in $items){
  $target=[IO.Path]::GetFullPath((Join-Path $root $item.file))
  if(!$target.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Target escaped requested root'}
  $backup=Join-Path (Join-Path $PSScriptRoot 'before') $item.file
  if((Get-FileHash -Algorithm SHA256 -LiteralPath $backup).Hash -ine $item.before){throw "Backup changed: $($item.file)"}
  if((Get-FileHash -Algorithm SHA256 -LiteralPath $target).Hash -ine $item.after){throw "File changed since this patch; refusing overwrite: $($item.file)"}
}
foreach($item in $items){
  $target=Join-Path $root $item.file
  Copy-Item -LiteralPath (Join-Path (Join-Path $PSScriptRoot 'before') $item.file) -Destination $target
  if((Get-FileHash -Algorithm SHA256 -LiteralPath $target).Hash -ine $item.before){throw "Restore verification failed: $($item.file)"}
}
Write-Output "Restored and hash-verified $($items.Count) files in $root. Project JSON and added tests were not touched."
