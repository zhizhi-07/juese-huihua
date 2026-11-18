param(
  [string]$Raw = "preview.raw",
  [int]$W = 0,
  [int]$H = 0,
  [string]$Out = "preview.png"
)
Add-Type -AssemblyName System.Drawing
$bytes = [IO.File]::ReadAllBytes((Join-Path (Get-Location) $Raw))
$bmp = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$rect = New-Object System.Drawing.Rectangle(0, 0, $W, $H)
$data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
[Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
$bmp.UnlockBits($data)
$bmp.Save((Join-Path (Get-Location) $Out), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
"wrote $Out $W x $H"
