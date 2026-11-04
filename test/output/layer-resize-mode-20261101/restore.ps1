param([Parameter(Mandatory=$true)][string]$TargetRoot)
$ErrorActionPreference='Stop'
$root=(Resolve-Path -LiteralPath $TargetRoot).Path.TrimEnd('\')
$before=Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'before-sha256.json') | ConvertFrom-Json
$after=Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'after-sha256.json') | ConvertFrom-Json
$targets=foreach($item in $before){
  $target=[IO.Path]::GetFullPath((Join-Path $root $item.path))
  if(!$target.StartsWith($root+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Target escaped the selected root'}
  $backup=Join-Path $PSScriptRoot ('before/'+$item.path.Replace('/','_'))
  if((Get-FileHash -LiteralPath $backup -Algorithm SHA256).Hash -ne $item.sha256){throw "Backup checksum mismatch: $($item.path)"}
  $expected=($after | Where-Object path -eq $item.path).sha256
  $current=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
  if($current -ne $expected -and $current -ne $item.sha256){throw "File changed after this patch; refusing to overwrite: $($item.path)"}
  [pscustomobject]@{target=$target;backup=$backup;hash=$item.sha256}
}
foreach($item in $targets){Copy-Item -LiteralPath $item.backup -Destination $item.target; if((Get-FileHash -LiteralPath $item.target -Algorithm SHA256).Hash -ne $item.hash){throw 'Restored checksum mismatch'}}
Write-Output 'PASS: restored all five existing files; original SHA256 checksums match. New regression test files are retained.'
