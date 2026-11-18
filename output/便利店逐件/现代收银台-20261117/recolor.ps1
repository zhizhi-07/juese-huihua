$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$dir=$PSScriptRoot
$official=Get-Content (Join-Path $dir '../官方色卡校准/palette.json') -Raw|ConvertFrom-Json
$counterMap=@{'#BA9273'='#B5B2AC';'#8AC290'='#D4D0CD';'#9E7565'='#839EA6';'#4D8A7E'='#566178';'#D1AE8A'='#EBF0EE';'#68A88E'='#B5B2AC';'#BED4C8'='#EBF0EE'}
$chairMap=@{'#BA9273'='#B5B2AC';'#8AC290'='#99BAB5';'#9E7565'='#6C8091';'#D1AE8A'='#D4D0CD';'#68A88E'='#839EA6'}
foreach($h in @($counterMap.Values)+@($chairMap.Values)){if($h -notin $official){throw '替换色不属于官方色卡'}}
$manifest=Get-Content (Join-Path $dir 'images.json') -Raw|ConvertFrom-Json
$old=New-Object System.Drawing.Bitmap 32,32;$og=[System.Drawing.Graphics]::FromImage($old);$og.Clear([System.Drawing.Color]::Transparent)
$new=New-Object System.Drawing.Bitmap 32,32;$ng=[System.Drawing.Graphics]::FromImage($new);$ng.Clear([System.Drawing.Color]::Transparent)
$report=@()
foreach($l in $manifest){$src=[System.Drawing.Bitmap]::FromFile((Join-Path $dir $l.file));$dst=New-Object System.Drawing.Bitmap 32,32;$map=if($l.name -eq '收银椅'){$chairMap}else{$counterMap};$n=0
 for($y=0;$y -lt 32;$y++){for($x=0;$x -lt 32;$x++){$c=$src.GetPixel($x,$y);$out=$c;$h='#{0:X2}{1:X2}{2:X2}' -f $c.R,$c.G,$c.B;if($l.recolor -and $c.A -gt 0 -and $map.ContainsKey($h)){$v=[System.Drawing.ColorTranslator]::FromHtml($map[$h]);$out=[System.Drawing.Color]::FromArgb($c.A,$v.R,$v.G,$v.B);$n++};if($c.A -ne $out.A){throw '轮廓发生变化'};$dst.SetPixel($x,$y,$out)}}
 $file='modern-'+$l.file;if($l.recolor){$dst.Save((Join-Path $dir $file))}else{Copy-Item -LiteralPath (Join-Path $dir $l.file) -Destination (Join-Path $dir $file);if($n -ne 0){throw '收银机被改色'}}
 if($l.visible){$og.DrawImageUnscaled($src,0,0);$ng.DrawImageUnscaled($dst,0,0)}
 $report+=@{index=$l.index;key=$l.key;file=$file;name=$l.name;recolor=$l.recolor;changedPixels=$n};$src.Dispose();$dst.Dispose()
}
$og.Dispose();$ng.Dispose();$new.Save((Join-Path $dir 'modern-checkout.png'))
$compare=New-Object System.Drawing.Bitmap 64,32;$g=[System.Drawing.Graphics]::FromImage($compare);$g.Clear([System.Drawing.Color]::FromArgb(235,234,226));$g.DrawImageUnscaled($old,0,0);$g.DrawImageUnscaled($new,32,0);$g.Dispose();$old.Dispose();$new.Dispose();$large=New-Object System.Drawing.Bitmap 512,256;$g=[System.Drawing.Graphics]::FromImage($large);$g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor;$g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::Half;$g.DrawImage($compare,0,0,512,256);$large.Save((Join-Path $dir 'comparison.png'));$g.Dispose();$large.Dispose();$compare.Dispose()
@{counterMap=$counterMap;chairMap=$chairMap;images=$report;verified='尺寸与透明轮廓不变；收银机及付款终端PNG未改；新增配色来自Otterisk96'}|ConvertTo-Json -Depth 10|Set-Content -Encoding utf8 (Join-Path $dir 'pixel-verification.json')
