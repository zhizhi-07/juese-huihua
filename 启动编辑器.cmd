@echo off
setlocal
set "PIXEL_STUDIO_DIR=%~dp0"
powershell -NoProfile -Command "$ErrorActionPreference='Stop'; $node='C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'; if(!(Test-Path -LiteralPath $node)){$node=(Get-Command node -ErrorAction Stop).Source}; $url='http://localhost:8765/index.html'; function Ready {try{$request=[Net.WebRequest]::Create('http://127.0.0.1:8765/api/status');$request.Proxy=$null;$request.Timeout=1000;$response=$request.GetResponse();try{$reader=[IO.StreamReader]::new($response.GetResponseStream());return ($reader.ReadToEnd()|ConvertFrom-Json).version -eq 2}finally{$response.Close()}}catch{return $false}}; if(!(Ready)){$script=Join-Path $env:PIXEL_STUDIO_DIR 'server.js'; Start-Process -FilePath $node -ArgumentList @(([char]34+$script+[char]34),'8765') -WorkingDirectory $env:PIXEL_STUDIO_DIR -WindowStyle Hidden; for($i=0;$i -lt 25;$i++){Start-Sleep -Milliseconds 300;if(Ready){break}}}; if(!(Ready)){throw 'Editor not ready on port 8765. Check for another service using this port.'}; Start-Process $url"
if errorlevel 1 pause



