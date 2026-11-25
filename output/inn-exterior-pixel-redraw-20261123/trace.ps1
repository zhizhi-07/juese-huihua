Add-Type -AssemblyName System.Drawing
$d='C:/Users/Administrator/Desktop/角色绘画/output/inn-exterior-pixel-redraw-20261123'
$src=[Drawing.Bitmap]::FromFile('C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-80926cc4-b4e3-43eb-bb3e-1dd38177fbb4.png')
$p=Get-Content "$d/original.json" -Raw|ConvertFrom-Json
$pal=@($p.palette|ForEach-Object{[Drawing.Color]::FromArgb(255,$_.r,$_.g,$_.b)})
# Trace the reference silhouette on its native 3-screen-pixels-per-pixel grid.
$pts=@(19,11,70,1,70,20,68,20,68,73,64,73,64,76,62,78,58,78,56,76,55,76,55,78,49,78,47,75,46,72,27,72,25,76,23,78,19,78,17,76,12,76,10,74,7,74,7,72,6,72,6,50,5,50,5,31,6,31,6,25,19,25)
$points=@();for($i=0;$i -lt $pts.Count;$i+=2){$points+=New-Object Drawing.Point $pts[$i],$pts[$i+1]}
$mask=New-Object Drawing.Bitmap 79,86;$mg=[Drawing.Graphics]::FromImage($mask);$mg.FillPolygon([Drawing.Brushes]::White,[Drawing.Point[]]$points);$mg.Dispose()
# Editable layers are disjoint exact pixel grids, not a generated-image resize.
$names=@('屋顶','墙体与木梁','左侧阳台','四扇楼上窗','招牌与雨篷','入口双门','告示与壁灯','门前盆栽')
$imgs=@();0..7|ForEach-Object{$imgs+=,(New-Object Drawing.Bitmap 66,78)}
for($gy=1;$gy -lt 79;$gy++){for($gx=5;$gx -lt 71;$gx++){
 if($mask.GetPixel($gx,$gy).A -eq 0){continue}; if($gy -ge 72 -and -not (($gx -ge 12 -and $gx -le 17 -and $gy -le 75)-or($gx -ge 19 -and $gx -le 24 -and $gy -le 76)-or($gx -ge 49 -and $gx -le 54 -and $gy -le 76)-or($gx -ge 57 -and $gx -le 63 -and $gy -le 76))){continue}
 # Balcony railing holes stay transparent; preserve the narrow wooden uprights.
 if($gy -ge 27 -and $gy -le 30 -and (($gx -ge 9 -and $gx -le 10)-or($gx -ge 13 -and $gx -le 14)-or($gx -ge 17 -and $gx -le 18))){continue}
 $c=$src.GetPixel([Math]::Min(236,$gx*3+1),[Math]::Min(255,$gy*3+1))
 $best=$pal[0];$dist=1e10
 foreach($v in $pal){$dd=[Math]::Pow($v.R-$c.R,2)+[Math]::Pow($v.G-$c.G,2)+[Math]::Pow($v.B-$c.B,2);if($dd -lt $dist){$dist=$dd;$best=$v}}
 if($c.R -lt 77 -and $c.G -lt 82 -and $c.B -lt 83){$best=$pal[0]}
 $l=1
 if($gx -ge 19 -and $gy -le (32-0.21*($gx-19))){$l=0}
 elseif($gx -le 24 -and $gy -ge 25 -and $gy -lt 50){$l=2}
 elseif($gx -ge 27 -and $gx -le 63 -and $gy -ge 31 -and $gy -le 43){$l=3}
 elseif($gx -ge 24 -and $gx -le 47 -and $gy -ge 44 -and $gy -le 58){$l=4}
 elseif($gx -ge 27 -and $gx -le 44 -and $gy -ge 59 -and $gy -le 71){$l=5}
 elseif(($gx -ge 13 -and $gx -le 22 -and $gy -ge 55 -and $gy -le 64)-or($gx -ge 50 -and $gx -le 58 -and $gy -ge 53 -and $gy -le 64)){$l=6}
 elseif($gy -ge 65 -and (($gx -ge 10 -and $gx -le 25)-or($gx -ge 47 -and $gx -le 64))){$l=7}
 $imgs[$l].SetPixel($gx-5,$gy-1,$best)
}}
# Reconstruct the left pot bottom where a foreground character covers it.
$colors=@('2f3b3d','9e7565','80575b');
# Re-establish flat window-light clusters at the reference coordinates.
foreach($wx in @(28,37,46,55)){
 for($yy=32;$yy -le 42;$yy++){for($xx=$wx;$xx -lt $wx+8;$xx++){
  $hex='2f3b3d'
  if($xx -gt $wx -and $xx -lt $wx+7 -and $yy -gt 32 -and $yy -lt 42){$hex='8a7b63'}
  if($xx -ge $wx+2 -and $xx -le $wx+5 -and $yy -ge 35 -and $yy -le 40){$hex='e8cd97';if($yy -ge 36 -and $yy -le 39){$hex='e6dfa1'}}
  $imgs[3].SetPixel($xx-5,$yy-1,[Drawing.ColorTranslator]::FromHtml("#$hex"))
 }}
}
foreach($gy in 74..75){foreach($gx in 12..17){$col=$colors[1];if($gy -eq 75 -or $gx -eq 12 -or $gx -eq 17){$col=$colors[0]};$imgs[7].SetPixel($gx-5,$gy-1,[Drawing.ColorTranslator]::FromHtml("#$col"))}}
$mix=New-Object Drawing.Bitmap 66,78;$g=[Drawing.Graphics]::FromImage($mix)
for($i=0;$i -lt 8;$i++){$imgs[$i].Save("$d/layer-$i.png");$g.DrawImageUnscaled($imgs[$i],0,0)}
$g.Dispose();$mix.Save("$d/inn.png")
$prev=New-Object Drawing.Bitmap 330,390;$g=[Drawing.Graphics]::FromImage($prev);$g.Clear([Drawing.ColorTranslator]::FromHtml('#2f3b3d'));$g.InterpolationMode='NearestNeighbor';$g.PixelOffsetMode='Half';$g.DrawImage($mix,0,0,330,390);$g.Dispose();$prev.Save("$d/preview.png")
$src.Dispose();$mask.Dispose();$mix.Dispose();$prev.Dispose();$imgs|ForEach-Object{$_.Dispose()}

