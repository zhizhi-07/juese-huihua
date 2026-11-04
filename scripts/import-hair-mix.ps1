$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$id='draft-hair-mix-'+(Get-Date -Format 'yyyyMMdd-HHmmss')
$out=Join-Path (Get-Location) ('发型素材\'+$id)
New-Item -ItemType Directory -Path $out | Out-Null
function Url($b){$m=[IO.MemoryStream]::new();$b.Save($m,[Drawing.Imaging.ImageFormat]::Png);$s='data:image/png;base64,'+[Convert]::ToBase64String($m.ToArray());$m.Dispose();return $s}
$blank=[Drawing.Bitmap]::new(48,48);$empty=Url $blank
$names=@('前发80011','后发80009背面','后发80009前侧面')
$files=@('TV_FrontHair1_p80011.png','TV_RearHair1_p80009.png','TV_RearHair2_p80009.png')
$images=@();$hashes=@()
for($i=0;$i -lt 3;$i++){$src=Join-Path 'C:\Users\Administrator\Desktop\衣服\衣服\10\TV\Female' $files[$i];$images+=,[Drawing.Bitmap]::new($src);$hashes+=Get-FileHash -LiteralPath $src -Algorithm SHA256;Copy-Item -LiteralPath $src -Destination $out}
$directions=@('down','left','right','up');$labels=@('正面','左侧','右侧','背面');$actions=@();$front=@{};$rear=@{}
$preview=[Drawing.Bitmap]::new(384,192);$pg=[Drawing.Graphics]::FromImage($preview);$pg.Clear([Drawing.Color]::FromArgb(190,200,195));$pg.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::NearestNeighbor;$pg.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::Half
for($a=0;$a -lt 4;$a++){
 $actions+=@{name='待机 · '+$labels[$a];direction=$directions[$a];frames=@(@{sheetIndex=0;sourceX=0;sourceY=0;width=48;height=48;duration=200})}
 $rect=[Drawing.Rectangle]::new(48,48*$a,48,48)
 $f=if($a -eq 3){[Drawing.Bitmap]::new(48,48)}else{$images[0].Clone($rect,[Drawing.Imaging.PixelFormat]::Format32bppArgb)}
 $r=$images[$(if($a -eq 3){1}else{2})].Clone($rect,[Drawing.Imaging.PixelFormat]::Format32bppArgb)

 $count=0;for($y=0;$y -lt 48;$y++){for($x=0;$x -lt 48;$x++){if($r.GetPixel($x,$y).A){$count++}}};if(!$count){throw 'Empty rear hair'}
 $key='0_'+$a+'_0';$front[$key]=@{width=48;height=48;dataURL=(Url $f)};$rear[$key]=@{width=48;height=48;dataURL=(Url $r)}
 $c=[Drawing.Bitmap]::new(48,48);$g=[Drawing.Graphics]::FromImage($c);$g.DrawImageUnscaled($r,0,0);$g.DrawImageUnscaled($f,0,0);$g.Dispose();$c.Save((Join-Path $out ($labels[$a]+'.png')));$pg.DrawImage($c,[Drawing.Rectangle]::new($a*96,0,96,96));$pg.FillRectangle([Drawing.Brushes]::DarkSlateGray,$a*96,96,96,96);$pg.DrawImage($c,[Drawing.Rectangle]::new($a*96,96,96,96));$c.Dispose();$f.Dispose();$r.Dispose()
}
$pg.Dispose();$preview.Save((Join-Path $out '四向浅深底预览.png'));$preview.Dispose()
$p=@{version='1.0';name='金发混搭 · 前80011＋后80009';bgColor='#bec8c3';palette=@();currentSheetIndex=0;currentActionIndex=0;currentFrameIndex=0;currentLayerIndex=1;spriteSheets=@(@{name='原尺寸混搭待机';frameWidth=48;frameHeight=48;columns=1;rows=1;imageDataURL=$empty;actions=$actions});layers=@(@{name='头发 / 80009 / 后发';sheetIndex=0;visible=$true;locked=$false;opacity=1;frameData=$rear},@{name='头发 / 80011 / 前发';sheetIndex=0;visible=$true;locked=$false;opacity=1;frameData=$front})}
$json=$p|ConvertTo-Json -Depth 30 -Compress
[IO.File]::WriteAllText((Join-Path $out 'candidate.json'),$json)
$uri='http://127.0.0.1:8765/api/project?id='+$id
$result=Invoke-WebRequest -Uri $uri -Method Put -SkipHeaderValidation -Headers @{'X-Pixel-Editor'='1';'If-Match'='none'} -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes($json))
$read=Invoke-WebRequest -Uri $uri
if(($read.Content|ConvertFrom-Json).name -ne $p.name){throw 'Readback mismatch'}
[IO.File]::WriteAllText((Join-Path $out 'api-readback.json'),$read.Content)
$hashes|Format-Table -AutoSize|Out-String|Set-Content (Join-Path $out '来源SHA256.txt')
"id=$id`nPUT=$($result.StatusCode) GET=$($read.StatusCode) ETag=$($read.Headers.ETag)`n仅原尺寸四向静态头发，未适配人物或绘制动画。"|Set-Content (Join-Path $out '验证记录.txt')
$images|ForEach-Object {$_.Dispose()};$blank.Dispose()
"ID=$id`nOUT=$out`nPUT=$($result.StatusCode) GET=$($read.StatusCode)"

