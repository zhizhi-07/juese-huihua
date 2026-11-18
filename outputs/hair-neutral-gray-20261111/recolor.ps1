Add-Type -AssemblyName System.Drawing
$dir=Join-Path (Get-Location) 'outputs/hair-neutral-gray-20261111'
$p=Get-Content "$dir/original.json" -Raw|ConvertFrom-Json
$map=@{'2F3B3D'=56;'4B6C2E'=94;'6D8740'=125;'8AA355'=152}
$count=0;$pixels=0
$preview=[Drawing.Bitmap]::new(24*32,4*40)
$g=[Drawing.Graphics]::FromImage($preview);$g.Clear([Drawing.Color]::FromArgb(184,200,195));$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::NearestNeighbor;$g.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::Half
foreach($l in $p.layers){if($l.name -ne 'hair'){continue};foreach($f in $l.frameData.PSObject.Properties){
$ms=[IO.MemoryStream]::new([Convert]::FromBase64String($f.Value.dataURL.Split(',')[1]));$im=[Drawing.Bitmap]::new($ms)
for($y=0;$y -lt $im.Height;$y++){for($x=0;$x -lt $im.Width;$x++){$c=$im.GetPixel($x,$y);if($c.A){$k=('{0:X2}{1:X2}{2:X2}' -f $c.R,$c.G,$c.B);if(!$map.ContainsKey($k)){throw "Unexpected color $k"};$v=$map[$k];$im.SetPixel($x,$y,[Drawing.Color]::FromArgb($c.A,$v,$v,$v));$pixels++}}}
$out=[IO.MemoryStream]::new();$im.Save($out,[Drawing.Imaging.ImageFormat]::Png);$f.Value.dataURL='data:image/png;base64,'+[Convert]::ToBase64String($out.ToArray())
if($count -lt 96){$col=$count%24;$row=[math]::Floor($count/24);$g.DrawImage($im,[Drawing.Rectangle]::new($col*32,$row*40,$im.Width*2,$im.Height*2))}
$im.Dispose();$ms.Dispose();$out.Dispose();$count++
}}
$g.Dispose();$preview.Save("$dir/hair-preview.png");$preview.Dispose()
$json=$p|ConvertTo-Json -Depth 100 -Compress
[IO.File]::WriteAllText("$dir/candidate.json",$json,[Text.UTF8Encoding]::new($false))
$etag=(Get-Content "$dir/original-etag.txt" -Raw).Trim()
$r=Invoke-WebRequest 'http://127.0.0.1:8765/api/project?id=merchant-original-1794364657183' -Method Put -Headers @{'X-Pixel-Editor'='1';'If-Match'=$etag} -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes($json)) -UseBasicParsing
$r.Content|Set-Content "$dir/save-response.txt"
$read=Invoke-WebRequest 'http://127.0.0.1:8765/api/project?id=merchant-original-1794364657183' -UseBasicParsing
[IO.File]::WriteAllText("$dir/readback.json",$read.Content,[Text.UTF8Encoding]::new($false))
"frames=$count pixels=$pixels status=$($r.StatusCode)"|Tee-Object -FilePath "$dir/result.txt"
