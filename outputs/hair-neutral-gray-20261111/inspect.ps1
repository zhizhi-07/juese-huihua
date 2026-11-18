Add-Type -AssemblyName System.Drawing
$id='merchant-original-1794364657183'
$url="http://127.0.0.1:8765/api/project?id=$id"
$dir=Join-Path (Get-Location) 'outputs/hair-neutral-gray-20261111'
$r=Invoke-WebRequest $url -UseBasicParsing
[IO.File]::WriteAllText("$dir/original.json",$r.Content,[Text.UTF8Encoding]::new($false))
$r.Headers.ETag | Set-Content "$dir/original-etag.txt"
Get-FileHash "$dir/original.json" -Algorithm SHA256 | Format-List | Out-File "$dir/original-sha256.txt"
$p=$r.Content|ConvertFrom-Json
$colors=@{}
foreach($l in $p.layers){if($l.name -ne 'hair'){continue};foreach($f in $l.frameData.PSObject.Properties){
$b=[Convert]::FromBase64String($f.Value.dataURL.Split(',')[1]);$ms=[IO.MemoryStream]::new($b);$im=[Drawing.Bitmap]::new($ms)
for($y=0;$y -lt $im.Height;$y++){for($x=0;$x -lt $im.Width;$x++){$c=$im.GetPixel($x,$y);if($c.A){$k=('{0:X2}{1:X2}{2:X2}' -f $c.R,$c.G,$c.B);$colors[$k]++}}}
$im.Dispose();$ms.Dispose()
}}
$colors|ConvertTo-Json|Set-Content "$dir/colors-before.json"
$colors|ConvertTo-Json
