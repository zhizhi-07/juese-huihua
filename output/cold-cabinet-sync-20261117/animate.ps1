$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$dir=$PSScriptRoot
$angles=@(0,20,40,60,80,100,110,100,80,60,40,20)
$durations=@(600,100,100,100,100,100,600,100,100,100,100,100)
$manifest=Get-Content (Join-Path $dir 'layers.json') -Raw|ConvertFrom-Json
$door=($manifest|Where-Object name -eq '玻璃门框与把手')
$src=[System.Drawing.Bitmap]::FromFile((Join-Path $dir $door.file))
function PixelLine($bmp,[int]$x0,[int]$y0,[int]$x1,[int]$y1,$color){
 $dx=[Math]::Abs($x1-$x0);$sx=if($x0 -lt $x1){1}else{-1};$dy=-[Math]::Abs($y1-$y0);$sy=if($y0 -lt $y1){1}else{-1};$err=$dx+$dy
 while($true){if($x0 -ge 0 -and $x0 -lt 32 -and $y0 -ge 0 -and $y0 -lt 48){$bmp.SetPixel($x0,$y0,$color)};if($x0 -eq $x1 -and $y0 -eq $y1){break};$e=2*$err;if($e -ge $dy){$err+=$dy;$x0+=$sx};if($e -le $dx){$err+=$dx;$y0+=$sy}}
}
$contact=New-Object System.Drawing.Bitmap 192,96;$cg=[System.Drawing.Graphics]::FromImage($contact);$cg.Clear([System.Drawing.Color]::FromArgb(235,234,226))
$strip=New-Object System.Drawing.Bitmap 384,48;$sg=[System.Drawing.Graphics]::FromImage($strip);$sg.Clear([System.Drawing.Color]::Transparent)
$frames=@()
for($f=0;$f -lt $angles.Count;$f++){
 $dst=New-Object System.Drawing.Bitmap 32,48;$angle=$angles[$f];$rad=$angle*[Math]::PI/180;$cos=[Math]::Cos($rad);$sin=[Math]::Sin($rad)
 if($angle -eq 0){for($y=0;$y -lt 48;$y++){for($x=0;$x -lt 32;$x++){$dst.SetPixel($x,$y,$src.GetPixel($x,$y))}}}
 else{
  for($y=0;$y -lt 48;$y++){for($x=0;$x -lt 32;$x++){if($y -lt 20 -or $y -gt 37 -or $x -lt 7 -or $x -gt 24){$dst.SetPixel($x,$y,$src.GetPixel($x,$y))}}}
  foreach($side in @(@{hinge=7;sign=1},@{hinge=24;sign=-1})){
   $hinge=$side.hinge;$sign=$side.sign;$edge=[int][Math]::Round($hinge+$sign*8*$cos);$shift=[int][Math]::Round(4*$sin)
   if($edge -eq $hinge){$edge=$hinge+$sign}
   $left=[Math]::Min($hinge,$edge);$right=[Math]::Max($hinge,$edge)
   for($x=$left;$x -le $right;$x++){$t=($x-$hinge)/($edge-$hinge);$sx=[int][Math]::Round($hinge+$sign*8*$t);$offset=[int][Math]::Round(4*$sin*$t);for($y=20;$y -le 41;$y++){$sy=$y-$offset;if($sy -ge 20 -and $sy -le 37){$color=$src.GetPixel($sx,$sy);if($color.A -gt 0){$dst.SetPixel($x,$y,$color)}}}}
   $topColor=$src.GetPixel($hinge,20);if($topColor.A -eq 0){$topColor=$src.GetPixel(8,37)};PixelLine $dst $hinge 20 $edge (20+$shift) $topColor
   PixelLine $dst $hinge 37 $edge (37+$shift) ($src.GetPixel(($hinge+$sign),37))
  }
  for($y=27;$y -le 30;$y++){for($sx=14;$sx -le 17;$sx++){$hinge=if($sx -le 15){7}else{24};$sign=if($sx -le 15){1}else{-1};$t=[Math]::Abs($sx-$hinge)/8;$x=[int][Math]::Round($hinge+($sx-$hinge)*$cos);$dy=[int][Math]::Round(4*$sin*$t);$c=$src.GetPixel($sx,$y);if($c.A -gt 0){$dst.SetPixel($x,$y+$dy,$c)}}}
 }
 for($y=0;$y -lt 20;$y++){for($x=0;$x -lt 32;$x++){if($dst.GetPixel($x,$y).ToArgb() -ne $src.GetPixel($x,$y).ToArgb()){throw '顶部装饰发生变化'}}}
 $doorFile='door-'+$f+'.png';$dst.Save((Join-Path $dir $doorFile))
 $result=New-Object System.Drawing.Bitmap 32,48;$g=[System.Drawing.Graphics]::FromImage($result);$g.Clear([System.Drawing.Color]::Transparent)
 foreach($l in $manifest){if(!$l.visible){continue};if($l.index -eq $door.index){$g.DrawImageUnscaled($dst,0,0)}else{$img=[System.Drawing.Image]::FromFile((Join-Path $dir $l.file));$g.DrawImageUnscaled($img,0,0);$img.Dispose()}}
 $g.Dispose();$file='frame-'+$f+'.png';$result.Save((Join-Path $dir $file));$sg.DrawImageUnscaled($result,$f*32,0);$cg.DrawImageUnscaled($result,($f%6)*32,([Math]::Floor($f/6))*48)
 $frames+=@{index=$f;angle=$angle;duration=$durations[$f];door=$doorFile;composite=$file}
 $dst.Dispose();$result.Dispose()
}
$cg.Dispose();$sg.Dispose();$strip.Save((Join-Path $dir 'animation-strip.png'));$strip.Dispose()
$preview=New-Object System.Drawing.Bitmap 768,384;$g=[System.Drawing.Graphics]::FromImage($preview);$g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor;$g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::Half;$g.DrawImage($contact,0,0,768,384);$preview.Save((Join-Path $dir 'contact-sheet.png'));$g.Dispose();$preview.Dispose();$contact.Dispose();$src.Dispose()
@{doorLayerIndex=$door.index;frames=$frames;verified='闭合帧逐像素保留原稿；门上方装饰每帧一致；柜体与商品仅复制不修改'}|ConvertTo-Json -Depth 10|Set-Content -Encoding utf8 (Join-Path $dir 'animation.json')
$args=@();foreach($f in $frames){$args+=@('-delay',[string]($f.duration/10),(Join-Path $dir $f.composite))};$args+=@('-loop','0','-filter','point','-resize','800%',(Join-Path $dir 'preview.gif')); & 'C:\Users\Administrator\AppData\Local\Temp\imagemagick\magick.exe' @args
if($LASTEXITCODE -ne 0){throw 'GIF生成失败'}


