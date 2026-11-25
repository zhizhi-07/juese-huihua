Add-Type -AssemblyName System.Drawing
$im=[Drawing.Bitmap]::new('C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-3a30ad09-1932-48a0-8a26-f9f744ca7b7e.png')
$b=[Drawing.Bitmap]::new(12,17);$pixels=@();for($y=0;$y -lt 17;$y++){ $row=@();for($x=0;$x -lt 12;$x++){ $c=$im.GetPixel([int](28+$x*4.3),[int](22+$y*4.2));$b.SetPixel($x,$y,$c);$row+=('#{0:x2}{1:x2}{2:x2}' -f $c.R,$c.G,$c.B)};$pixels+=,$row};ConvertTo-Json -InputObject $pixels -Depth 3 | Set-Content outputs/inn-sofa-exact-20261120/samples.json
$big=[Drawing.Bitmap]::new(384,544);$g=[Drawing.Graphics]::FromImage($big);$g.InterpolationMode='NearestNeighbor';$g.PixelOffsetMode='Half';$g.DrawImage($b,0,0,384,544);$big.Save("$pwd/outputs/inn-sofa-exact-20261120/sample.png");$g.Dispose();$b.Dispose();$im.Dispose();$big.Dispose()
