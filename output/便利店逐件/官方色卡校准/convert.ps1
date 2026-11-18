$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$dir=$PSScriptRoot
$palette=Get-Content (Join-Path $dir 'palette.json') -Raw | ConvertFrom-Json
$map=@{'#AC846C'='#9E7565';'#CFB07C'='#D1AE8A'}
$report=@()
foreach($f in (Get-Content (Join-Path $dir 'images.json') -Raw | ConvertFrom-Json)){
 $src=[System.Drawing.Bitmap]::FromFile((Join-Path $dir $f.file));$dst=New-Object System.Drawing.Bitmap $src.Width,$src.Height;$changed=0
 for($y=0;$y -lt $src.Height;$y++){for($x=0;$x -lt $src.Width;$x++){
  $c=$src.GetPixel($x,$y);$h='#{0:X2}{1:X2}{2:X2}' -f $c.R,$c.G,$c.B;$out=$c
  if($c.A -gt 0 -and $h -notin $palette){if(!$map.ContainsKey($h)){throw "未指定替换色 $h"};$t=[System.Drawing.ColorTranslator]::FromHtml($map[$h]);$out=[System.Drawing.Color]::FromArgb($c.A,$t.R,$t.G,$t.B);$changed++}
  $dst.SetPixel($x,$y,$out)
 }}
 for($y=0;$y -lt $src.Height;$y++){for($x=0;$x -lt $src.Width;$x++){
  $a=$src.GetPixel($x,$y);$b=$dst.GetPixel($x,$y);if($a.A -ne $b.A){throw '透明度变化'}
  if($b.A -gt 0){$h='#{0:X2}{1:X2}{2:X2}' -f $b.R,$b.G,$b.B;if($h -notin $palette){throw '仍有色卡外像素'}}
  $h='#{0:X2}{1:X2}{2:X2}' -f $a.R,$a.G,$a.B;if($a.A -gt 0 -and $h -in $palette -and $a.ToArgb() -ne $b.ToArgb()){throw '改到了原有官方颜色'}
 }}
 $file='corrected-'+$f.file
 if($changed -gt 0){$dst.Save((Join-Path $dir $file))}else{Copy-Item -LiteralPath (Join-Path $dir $f.file) -Destination (Join-Path $dir $file)}
 $report+=@{path=$f.path;original=$f.file;corrected=$file;changedPixels=$changed;width=$src.Width;height=$src.Height}
 $src.Dispose();$dst.Dispose()
}
@{replacements=$map;images=$report;verified='原有色卡内像素、尺寸、透明度不变；转换后全部可见像素属于96色'} | ConvertTo-Json -Depth 12 | Set-Content -Encoding utf8 (Join-Path $dir 'pixel-verification.json')
$report | ForEach-Object {($_.path -join '.')+': '+$_.changedPixels+' pixels'}
