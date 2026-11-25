Add-Type -AssemblyName System.Drawing
$im=[Drawing.Bitmap]::new('C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-cb78ed7a-9717-4778-a231-e373b3ab5a2b.png')
for($y=0;$y -lt 12;$y++){ $row=@();for($x=0;$x -lt 13;$x++){ $c=$im.GetPixel([int](5+$x*4.35),[int](19+$y*4.35));$row+=('{0:X2}{1:X2}{2:X2}' -f $c.R,$c.G,$c.B)};Write-Output ($row -join ' ')}
$p=Get-Content outputs/deer-head-20261120/original.json -Raw|ConvertFrom-Json
foreach($i in @(0,1,22)){[IO.File]::WriteAllBytes("$pwd/outputs/deer-head-20261120/existing-$i.png",[Convert]::FromBase64String(($p.spriteSheets[$i].imageDataURL -split ',')[1]))}
