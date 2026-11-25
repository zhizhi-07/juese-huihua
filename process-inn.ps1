Add-Type -AssemblyName System.Drawing
$d='C:/Users/Administrator/Desktop/角色绘画/output/inn-exterior-20261123'
$src='C:/Users/Administrator/.codex/generated_images/01a20736-727f-7c43-86eb-9aaa86c1f879/exec-9d541838-0a2e-4d23-b5e2-eb54c28ae9da.png'
Copy-Item $src "$d/generated-source.png"
$im=[Drawing.Bitmap]::FromFile($src)
$p=Get-Content "$d/original.json" -Raw | ConvertFrom-Json
$pal=@($p.palette | ForEach-Object {[Drawing.Color]::FromArgb(255,$_.r,$_.g,$_.b)})
$b=New-Object Drawing.Bitmap 68,82
$layers=@();0..5|ForEach-Object{$layers+=,(New-Object Drawing.Bitmap 68,82)}
for($y=0;$y -lt 82;$y++){for($x=0;$x -lt 68;$x++){
 $c=$im.GetPixel([int](105+($x+0.5)*15),[int](($y+0.5)*15));if($c.A -lt 180){continue}
 $best=$pal[0];$dist=1e10;foreach($v in $pal){$dd=[Math]::Pow($v.R-$c.R,2)+[Math]::Pow($v.G-$c.G,2)+[Math]::Pow($v.B-$c.B,2);if($dd -lt $dist){$dist=$dd;$best=$v}}
 if($c.R -lt 75 -and $c.G -lt 80 -and $c.B -lt 82){$best=$pal[0]}
 $b.SetPixel($x,$y,$best)
 $li=1
 if($x -ge 12 -and $y -lt (34-0.22*($x-12))){$li=0}
 elseif($x -lt 22 -and $y -ge 25 -and $y -lt 52){$li=2}
 elseif($x -ge 20 -and $x -lt 44 -and $y -ge 44 -and $y -lt 61){$li=3}
 elseif($y -ge 67 -and (($x -gt 5 -and $x -lt 22) -or ($x -ge 44 -and $x -lt 62))){$li=5}
 elseif($x -ge 22 -and $x -lt 44 -and $y -ge 61){$li=4}
 $layers[$li].SetPixel($x,$y,$best)
}}
$b.Save("$d/inn.png");for($i=0;$i -lt 6;$i++){$layers[$i].Save("$d/layer-$i.png");$layers[$i].Dispose()}
$preview=New-Object Drawing.Bitmap 340,410;$g=[Drawing.Graphics]::FromImage($preview);$g.Clear([Drawing.ColorTranslator]::FromHtml('#2f3b3d'));$g.InterpolationMode='NearestNeighbor';$g.PixelOffsetMode='Half';$g.DrawImage($b,0,0,340,410);$g.Dispose();$preview.Save("$d/preview.png");$preview.Dispose();$b.Dispose();$im.Dispose()
