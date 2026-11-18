$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$dir=$PSScriptRoot
$official=Get-Content (Join-Path $dir '../官方色卡校准/palette.json') -Raw|ConvertFrom-Json
$map=@{'#3E705C'='#566178';'#659A85'='#6C8091';'#4D8A7E'='#6C8091';'#68A88E'='#839EA6';'#8AC290'='#B5B2AC';'#8AC1AB'='#D4D0CD';'#BED4C8'='#EBF0EE';'#9E7565'='#566178';'#BA9273'='#839EA6';'#D1AE8A'='#D4D0CD'}
foreach($h in $map.Values){if($h -notin $official){throw '新颜色不属于官方色卡'}}
$manifest=Get-Content (Join-Path $dir 'images.json') -Raw|ConvertFrom-Json
$report=@()
foreach($item in $manifest){$newFile='modern-'+$item.file;$count=0
 if($item.recolor){$src=[System.Drawing.Bitmap]::FromFile((Join-Path $dir $item.file));$dst=New-Object System.Drawing.Bitmap 32,48
 for($y=0;$y -lt 48;$y++){for($x=0;$x -lt 32;$x++){$c=$src.GetPixel($x,$y);$h='#{0:X2}{1:X2}{2:X2}' -f $c.R,$c.G,$c.B;$out=$c;if($c.A -gt 0 -and $map.ContainsKey($h)){$t=[System.Drawing.ColorTranslator]::FromHtml($map[$h]);$out=[System.Drawing.Color]::FromArgb($c.A,$t.R,$t.G,$t.B);$count++};$dst.SetPixel($x,$y,$out);if($out.A -ne $c.A){throw '透明轮廓变化'}}}
 $dst.Save((Join-Path $dir $newFile));$src.Dispose();$dst.Dispose()
 }else{Copy-Item -LiteralPath (Join-Path $dir $item.file) -Destination (Join-Path $dir $newFile)}
 $report+=@{index=$item.index;key=$item.key;name=$item.name;visible=$item.visible;recolor=$item.recolor;file=$newFile;changedPixels=$count}
}
$source=Get-Content (Join-Path $dir 'original-project.json') -Raw|ConvertFrom-Json
$count=$source.spriteSheets[0].actions[0].frames.Count
$strip=New-Object System.Drawing.Bitmap ($count*32),48;$sg=[System.Drawing.Graphics]::FromImage($strip);$sg.Clear([System.Drawing.Color]::Transparent)
for($i=0;$i -lt $count;$i++){$key='0_0_'+$i;$frame=New-Object System.Drawing.Bitmap 32,48;$g=[System.Drawing.Graphics]::FromImage($frame);$g.Clear([System.Drawing.Color]::Transparent);foreach($l in ($report|Where-Object {$_.key -eq $key -and $_.visible})){$img=[System.Drawing.Image]::FromFile((Join-Path $dir $l.file));$g.DrawImageUnscaled($img,0,0);$img.Dispose()};$g.Dispose();$frame.Save((Join-Path $dir ('frame-'+$i+'.png')));$sg.DrawImageUnscaled($frame,32*$i,0);$frame.Dispose()};$sg.Dispose();$strip.Save((Join-Path $dir 'modern-strip.png'));$strip.Dispose()
$compare=New-Object System.Drawing.Bitmap 64,48;$g=[System.Drawing.Graphics]::FromImage($compare);$g.Clear([System.Drawing.Color]::FromArgb(235,234,226));foreach($l in ($manifest|Where-Object {$_.key -eq '0_0_0' -and $_.visible})){$img=[System.Drawing.Image]::FromFile((Join-Path $dir $l.file));$g.DrawImageUnscaled($img,0,0);$img.Dispose()};$img=[System.Drawing.Image]::FromFile((Join-Path $dir 'frame-0.png'));$g.DrawImageUnscaled($img,32,0);$img.Dispose();$g.Dispose();$large=New-Object System.Drawing.Bitmap 512,384;$g=[System.Drawing.Graphics]::FromImage($large);$g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor;$g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::Half;$g.DrawImage($compare,0,0,512,384);$large.Save((Join-Path $dir 'comparison.png'));$g.Dispose();$large.Dispose();$compare.Dispose()
@{map=$map;images=$report;verified='逐帧只换柜体和门框颜色，透明轮廓不变；商品PNG原样复制；新颜色来自Otterisk96'}|ConvertTo-Json -Depth 10|Set-Content -Encoding utf8 (Join-Path $dir 'pixel-verification.json')
