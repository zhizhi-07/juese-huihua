param([string]$Root = (Join-Path $PSScriptRoot '..\..'))
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path -LiteralPath $Root).Path
$files = @(
  @{ Target='index.html'; Backup='index.before.html'; Current='8CA514BA2B54EA6C7AF2ED855ED0C58E7F35B856C3CC87E066AD52C1E250DC8D'; Original='D7FFA7A9E3D9A997D42CCD5244479B071A62126A780ED65E72BA98231C1579B8' },
  @{ Target='js\app.js'; Backup='app.before.js'; Current='4CE5BB01085930E61C446D228EE123A4E35C47161237F832A37D12B4C788EF4F'; Original='E9A6E3125A531FEC80E3D707CDE0DD897AC78067DCFAEA3D1CEAE0DA811847CE' }
)
# Check every file first so later edits cannot be silently overwritten.
foreach ($file in $files) {
  if ((Get-FileHash -LiteralPath (Join-Path $Root $file.Target)).Hash -ne $file.Current) { throw "File changed since UI update: $($file.Target). Merge manually; nothing restored." }
  if ((Get-FileHash -LiteralPath (Join-Path $PSScriptRoot $file.Backup)).Hash -ne $file.Original) { throw "Backup hash mismatch: $($file.Backup). Nothing restored." }
}
foreach ($file in $files) {
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file.Backup) -Destination (Join-Path $Root $file.Target)
  if ((Get-FileHash -LiteralPath (Join-Path $Root $file.Target)).Hash -ne $file.Original) { throw "Restore verification failed: $($file.Target)" }
}
Write-Output 'PASS: previous interface restored; project data untouched. The unlinked studio-theme.css may remain.'
