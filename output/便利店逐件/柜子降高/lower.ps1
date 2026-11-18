$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$dir=$PSScriptRoot
$remove=@(7,8,9,10,15,23,30,36,38)
$keep=@(0..47|Where-Object{$_ -notin $remove})
$manifest=Get-Content (Join-Path $dir 'layers.json') -Raw|ConvertFrom-Json
$composite=New-Object System.Drawing.Bitmap 32,48
$g=[System.Drawing.Graphics]::FromImage($composite);$g.Clear([System.Drawing.Color]::Transparent)
$report=@()
foreach($l in $manifest){
 $src=[System.Drawing.Bitmap]::FromFile((Join-Path $dir $l.file));$dst=New-Object System.Drawing.Bitmap 32,48;$removed=0
 foreach($y in $remove){for($x=0;$x -lt 32;$x++){if($src.GetPixel($x,$y).A -gt 0){$removed++}}}
 if($l.name -eq '商品' -and $removed -ne 0){throw '不能裁掉商品细节'}
 for($j=0;$j -lt $keep.Count;$j++){for($x=0;$x -lt 32;$x++){$dst.SetPixel($x,$j+$remove.Count,$src.GetPixel($x,$keep[$j]))}}
 for($j=0;$j -lt $keep.Count;$j++){for($x=0;$x -lt 32;$x++){if($dst.GetPixel($x,$j+$remove.Count).ToArgb() -ne $src.GetPixel($x,$keep[$j]).ToArgb()){throw '像素映射失败'}}}
 $name='lower-'+$l.file;$dst.Save((Join-Path $dir $name));if($l.visible){$g.DrawImageUnscaled($dst,0,0)}
 $report+=@{name=$l.name;file=$name;index=$l.index;removedPixels=$removed}
 $src.Dispose();$dst.Dispose()
}
$g.Dispose();$composite.Save((Join-Path $dir 'after.png'))
function Bounds($file){$b=[System.Drawing.Bitmap]::FromFile($file);$xs=@();$ys=@();for($y=0;$y -lt $b.Height;$y++){for($x=0;$x -lt $b.Width;$x++){if($b.GetPixel($x,$y).A -gt 0){$xs+=$x;$ys+=$y}}};$b.Dispose();return @{left=($xs|Measure-Object -Minimum).Minimum;right=($xs|Measure-Object -Maximum).Maximum;top=($ys|Measure-Object -Minimum).Minimum;bottom=($ys|Measure-Object -Maximum).Maximum}}
$old=Bounds (Join-Path $dir 'before.png');$new=Bounds (Join-Path $dir 'after.png')
if($old.left -ne $new.left -or $old.right -ne $new.right -or $old.bottom -ne $new.bottom){throw '宽度或落地位置变化'}
if(($old.bottom-$old.top)-($new.bottom-$new.top) -ne 9){throw '降高不正确'}
@{removedRows=$remove;oldBounds=$old;newBounds=$new;layers=$report;verified='无重采样、不混色；商品像素无删除；宽度和脚底位置不变'}|ConvertTo-Json -Depth 10|Set-Content -Encoding utf8 (Join-Path $dir 'pixel-verification.json')
$b=New-Object System.Drawing.Bitmap 256,384;$g=[System.Drawing.Graphics]::FromImage($b);$g.Clear([System.Drawing.Color]::FromArgb(235,234,226));$g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor;$g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::Half;$g.DrawImage($composite,0,0,256,384);$b.Save((Join-Path $dir 'after-preview.png'));$g.Dispose();$b.Dispose();$composite.Dispose()
$old;$new
