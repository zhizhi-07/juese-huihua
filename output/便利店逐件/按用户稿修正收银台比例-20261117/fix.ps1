$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$dir=$PSScriptRoot
function Bounds($b,[int]$limit=1000){$xmin=1000;$xmax=-1;$ymin=1000;$ymax=-1;for($y=0;$y -lt $b.Height;$y++){for($x=0;$x -lt [Math]::Min($b.Width,$limit);$x++){if($b.GetPixel($x,$y).A -gt 0){$xmin=[Math]::Min($xmin,$x);$xmax=[Math]::Max($xmax,$x);$ymin=[Math]::Min($ymin,$y);$ymax=[Math]::Max($ymax,$y)}}};return @{left=$xmin;right=$xmax;top=$ymin;bottom=$ymax;width=$xmax-$xmin+1;height=$ymax-$ymin+1}}
$frontCounter=[System.Drawing.Bitmap]::FromFile((Join-Path $dir 'layer-23-7_0_0.png'));$frontComputer=[System.Drawing.Bitmap]::FromFile((Join-Path $dir 'layer-24-7_0_0.png'))
$frontLength=(Bounds $frontCounter).width;$computerWidth=(Bounds $frontComputer 20).width
$frontCounter.Dispose();$frontComputer.Dispose()
if($frontLength -ne 28 -or $computerWidth -ne 14){throw '最新正面尺寸已变，停止固定尺寸转换'}
$report=@()
foreach($i in 22,23,24){$src=[System.Drawing.Bitmap]::FromFile((Join-Path $dir ('layer-'+$i+'-7_1_0.png')));$dst=New-Object System.Drawing.Bitmap 32,40
 $repeat=if($i -eq 23){6}elseif($i -eq 24){3}else{0};$cut=if($i -eq 23){12}else{13};$offset=if($i -eq 24){1}else{0}
 for($y=0;$y -lt $src.Height;$y++){$dy=$y+$offset;if($y -gt $cut){$dy+=$repeat};for($x=0;$x -lt 32;$x++){$c=$src.GetPixel($x,$y);if($dy -lt 40){$dst.SetPixel($x,$dy,$c)}elseif($c.A -gt 0){throw '有原像素超出画布'}}}
 for($j=1;$j -le $repeat;$j++){for($x=0;$x -lt 32;$x++){$dst.SetPixel($x,$cut+$offset+$j,$src.GetPixel($x,$cut))}}
 for($y=0;$y -lt $src.Height;$y++){$dy=$y+$offset;if($y -gt $cut){$dy+=$repeat};for($x=0;$x -lt 32;$x++){if($dy -lt 40 -and $src.GetPixel($x,$y).ToArgb() -ne $dst.GetPixel($x,$dy).ToArgb()){throw '用户原像素未保留'}}}
 if($i -eq 23){$counterLength=(23+$repeat)-2+1;if($counterLength -ne $frontLength){throw '台面不等长'}}
 if($i -eq 24){$cb=Bounds $dst;if($cb.height -ne $computerWidth){throw '电脑本体不等长'}}
 $file='fixed-layer-'+$i+'.png';$dst.Save((Join-Path $dir $file));$report+=@{index=$i;file=$file;insertedRows=$repeat;shiftY=$offset};$src.Dispose();$dst.Dispose()
}
$strip=New-Object System.Drawing.Bitmap 64,40;$g=[System.Drawing.Graphics]::FromImage($strip);$g.Clear([System.Drawing.Color]::Transparent)
foreach($i in 22,23,24){$img=[System.Drawing.Image]::FromFile((Join-Path $dir ('layer-'+$i+'-7_0_0.png')));$g.DrawImageUnscaled($img,0,0);$img.Dispose();$img=[System.Drawing.Image]::FromFile((Join-Path $dir ('fixed-layer-'+$i+'.png')));$g.DrawImageUnscaled($img,32,0);$img.Dispose()};$g.Dispose();$strip.Save((Join-Path $dir 'strip.png'))
$preview=New-Object System.Drawing.Bitmap 640,400;$g=[System.Drawing.Graphics]::FromImage($preview);$g.Clear([System.Drawing.Color]::FromArgb(235,234,226));$g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor;$g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::Half;$g.DrawImage($strip,0,0,640,400);$preview.Save((Join-Path $dir 'comparison.png'));$g.Dispose();$preview.Dispose();$strip.Dispose()
@{frontCounterLength=$frontLength;sideCounterTopLength=$counterLength;sideTableTopRows='2..29（含台面边框，不含下方柜身）';frontComputerWidth=$computerWidth;sideComputerLength=$cb.height;sideComputerRows=($cb.top.ToString()+'..'+$cb.bottom);layers=$report;verified='仅插入原稿平直段像素行；用户原有每个像素均保留；正面未改'}|ConvertTo-Json -Depth 10|Set-Content -Encoding utf8 (Join-Path $dir 'measurements.json')
