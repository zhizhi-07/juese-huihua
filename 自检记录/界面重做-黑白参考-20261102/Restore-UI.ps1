param([string]$Root = (Join-Path $PSScriptRoot '..\..'))
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path -LiteralPath $Root).Path
$files = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'restore-manifest.json') -Raw | ConvertFrom-Json
# Refuse to overwrite any edits made after this redesign.
foreach ($file in $files) {
  if ((Get-FileHash -LiteralPath (Join-Path $Root $file.Target)).Hash -ne $file.AfterHash) { throw "Later changes found: $($file.Target). Nothing restored." }
  if ((Get-FileHash -LiteralPath (Join-Path $PSScriptRoot $file.Backup)).Hash -ne $file.BeforeHash) { throw "Backup mismatch: $($file.Backup). Nothing restored." }
}
foreach ($file in $files) {
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file.Backup) -Destination (Join-Path $Root $file.Target)
  if ((Get-FileHash -LiteralPath (Join-Path $Root $file.Target)).Hash -ne $file.BeforeHash) { throw "Restore failed: $($file.Target)" }
}
Write-Output 'PASS: this redesign reverted to its starting state; no project data touched.'
