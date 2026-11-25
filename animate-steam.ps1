Add-Type -AssemblyName System.Drawing
$d='C:/Users/Administrator/Desktop/角色绘画/output/hotspring-steam-20261123'
$pool=[Drawing.Bitmap]::FromFile("$d/pool.png");$steam=[Drawing.Bitmap]::FromFile("$d/steam.png")
$sheet=New-Object Drawing.Bitmap 256,34
$contact=New-Object Drawing.Bitmap 512,272
$cg=[Drawing.Graphics]::FromImage($contact);$cg.Clear([Drawing.ColorTranslator]::FromHtml('#decbbf'));$cg.InterpolationMode='NearestNeighbor';$cg.PixelOffsetMode='Half'
$sg=[Drawing.Graphics]::FromImage($sheet)
for($f=0;$f -lt 8;$f++){
 $b=New-Object Drawing.Bitmap 32,34
 $t=2*[Math]::PI*$f/8
 for($y=0;$y -lt 34;$y++){for($x=0;$x -lt 32;$x++){
  $c=$steam.GetPixel($x,$y);if($c.A -eq 0){continue}
  $phase=0;if($x -gt 16){$phase=1.4}
  $dx=[int][Math]::Round(0.7*([Math]::Sin($y*0.45+$t+$phase)-[Math]::Sin($y*0.45+$phase)))
  $dy=[int][Math]::Round(0.55*([Math]::Cos($t+$phase-$y*0.3)-[Math]::Cos($phase-$y*0.3)))
  $nx=$x+$dx;$ny=$y+$dy
  if($nx -ge 0 -and $nx -lt 32 -and $ny -ge 0 -and $ny -lt 34){$b.SetPixel($nx,$ny,$c)}
 }}
 $b.Save("$d/steam-$f.png")
 $mix=New-Object Drawing.Bitmap 32,34;$g=[Drawing.Graphics]::FromImage($mix);$g.DrawImageUnscaled($pool,0,0);$g.DrawImageUnscaled($b,0,0);$g.Dispose();$mix.Save("$d/frame-$f.png");$sg.DrawImageUnscaled($mix,$f*32,0)
 $cg.DrawImage($mix,($f%4)*128,[int][Math]::Floor($f/4)*136,128,136)
 $mix.Dispose();$b.Dispose()
}
$cg.Dispose();$sg.Dispose();$sheet.Save("$d/spritesheet.png");$contact.Save("$d/contact.png");$sheet.Dispose();$contact.Dispose();$pool.Dispose();$steam.Dispose()
