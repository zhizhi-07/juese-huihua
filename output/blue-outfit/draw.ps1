Add-Type -AssemblyName System.Drawing
$dir=Join-Path $PWD 'output/blue-outfit'
$r=Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8765/api/project?id=main'
[IO.File]::WriteAllText("$dir/original.json",$r.Content,[Text.UTF8Encoding]::new($false))
$etag=$r.Headers.ETag|Select-Object -First 1
@{etag=$etag;sha256=(Get-FileHash "$dir/original.json" -Algorithm SHA256).Hash}|ConvertTo-Json|Set-Content "$dir/backup-info.json"
$p=$r.Content|ConvertFrom-Json
$old=$p.layers; $layers=[Collections.Generic.List[object]]::new();$map=@{};$added=0
function Decode($d){$ms=[IO.MemoryStream]::new([Convert]::FromBase64String($d.dataURL.Split(',')[1]));$b=[Drawing.Bitmap]::new($ms);$copy=[Drawing.Bitmap]::new($b);$b.Dispose();$ms.Dispose();return $copy}
foreach($i in 0..($old.Count-1)){
$l=$old[$i];$map[$i]=$layers.Count;$layers.Add($l)
if($l.name -ne 'body'){continue}
$fd=[ordered]@{}
foreach($prop in $l.frameData.PSObject.Properties){
$d=$prop.Value;$b=Decode $d;$o=[Drawing.Bitmap]::new($b.Width,$b.Height);$top=$b.Height;$left=$b.Width;$right=0
for($y=0;$y -lt $b.Height;$y++){for($x=0;$x -lt $b.Width;$x++){if($b.GetPixel($x,$y).A){$top=[Math]::Min($top,$y);$left=[Math]::Min($left,$x);$right=[Math]::Max($right,$x)}}}
for($y=0;$y -lt $b.Height;$y++){for($x=0;$x -lt $b.Width;$x++){
$c=$b.GetPixel($x,$y);if(!$c.A){continue};$dy=$y-$top
if($c.R -eq 70 -and $c.G -eq 70){$o.SetPixel($x,$y,$c);continue}
if($dy -eq 0 -and $x -eq [Math]::Floor(($left+$right)/2)){continue}
$hex=if($dy -lt 3){if($c.R -lt 250){'#6284AF'}else{'#9CB6D6'}}else{if($c.R -lt 250){'#46465E'}else{'#626681'}}
$o.SetPixel($x,$y,[Drawing.ColorTranslator]::FromHtml($hex))
}}
$ms=[IO.MemoryStream]::new();$o.Save($ms,[Drawing.Imaging.ImageFormat]::Png)
$v=[ordered]@{width=$d.width;height=$d.height;dataURL='data:image/png;base64,'+[Convert]::ToBase64String($ms.ToArray())};if($d.placement){$v.placement=$d.placement};$fd[$prop.Name]=$v
$b.Dispose();$o.Dispose();$ms.Dispose();$added++
}
$layers.Add([pscustomobject]@{sheetIndex=$l.sheetIndex;isGroup=$false;parent=$l.parent;depth=$l.depth;name='服装 / 蓝色背心与短裤';visible=$true;locked=$false;opacity=1;frameData=$fd})
}
foreach($l in $layers){if($null -ne $l.parent){$l.parent=$map[[int]$l.parent]}}
$p.currentLayerIndex=$map[[int]$p.currentLayerIndex];$p.layers=$layers.ToArray()
$json=$p|ConvertTo-Json -Depth 100 -Compress
[IO.File]::WriteAllText("$dir/candidate.json",$json,[Text.UTF8Encoding]::new($false))
# Existing layers must remain identical apart from the necessary parent-index remap.
$before=$r.Content|ConvertFrom-Json
foreach($i in 0..($old.Count-1)){$a=$before.layers[$i];if($null -ne $a.parent){$a.parent=$map[[int]$a.parent]};if(($a|ConvertTo-Json -Depth 100 -Compress) -cne ($p.layers[$map[$i]]|ConvertTo-Json -Depth 100 -Compress)){throw "Original layer changed: $i"}}
$result=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8765/api/project?id=main' -Method Put -Headers @{'X-Pixel-Editor'='1';'If-Match'=$etag} -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes($json))
$read=Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8765/api/project?id=main'
[IO.File]::WriteAllText("$dir/verified.json",$read.Content,[Text.UTF8Encoding]::new($false))
$q=$read.Content|ConvertFrom-Json
if(($q|ConvertTo-Json -Depth 100 -Compress) -cne $json){throw 'Readback mismatch'}
"PUT status: $($result.StatusCode); new clothing frames: $added; existing layers preserved: $($old.Count)"|Tee-Object "$dir/verification.txt"
# Contact sheet: current saved layers, all action/direction first frames, nearest-neighbor zoom.
$atlas=[Drawing.Bitmap]::new(4*160,3*160);$g=[Drawing.Graphics]::FromImage($atlas);$g.Clear([Drawing.ColorTranslator]::FromHtml('#ddd5ed'));$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::NearestNeighbor;$g.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::Half
foreach($si in 0..3){foreach($ai in 0..2){$key="${si}_${ai}_0";foreach($l in $q.layers){if(!$l.visible -or $l.isGroup -or $l.sheetIndex -ne $si){continue};$d=$l.frameData.$key;if(!$d){continue};$b=Decode $d;$x=0;$y=0;if($d.placement){$x=$d.placement.x;$y=$d.placement.y};$g.DrawImage($b,[Drawing.Rectangle]::new($si*160+$x*6,$ai*160+$y*6,$b.Width*6,$b.Height*6));$b.Dispose()}}}
$atlas.Save("$dir/preview.png",[Drawing.Imaging.ImageFormat]::Png);$g.Dispose();$atlas.Dispose()
