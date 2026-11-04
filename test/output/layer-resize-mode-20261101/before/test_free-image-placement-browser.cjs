const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),net=require('node:net'),{spawn}=require('node:child_process');
const {chromium}=require('playwright'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..');
async function main(){
  console.log('TEST starting isolated HD browser fixture');
  const output=path.join(__dirname,'output/free-placement');fs.mkdirSync(output,{recursive:true});
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'free-placement-test-'));
  for(const file of ['server.js','index.html'])fs.copyFileSync(path.join(root,file),path.join(dir,file));
  for(const folder of ['js','js/vendor','css']){
    fs.mkdirSync(path.join(dir,folder),{recursive:true});
    for(const entry of fs.readdirSync(path.join(root,folder),{withFileTypes:true}))if(entry.isFile())fs.copyFileSync(path.join(root,folder,entry.name),path.join(dir,folder,entry.name));
  }
  console.log('TEST editor copied');
  fs.mkdirSync(path.join(dir,'data/projects'),{recursive:true});
  const skin=createCanvas(32,32),sc=skin.getContext('2d');sc.fillStyle='#eec9ad';sc.fillRect(10,9,12,14);sc.fillStyle='#664e63';sc.fillRect(9,7,14,5);
  const png=skin.toDataURL('image/png'),fixture={version:'1.0',name:'高清眼睛功能验证（临时工程）',spriteSheets:[{name:'fixture',frameWidth:32,frameHeight:32,columns:1,rows:1,imageDataURL:png,actions:[{name:'待机',direction:'down',frames:[{sheetIndex:0,sourceX:0,sourceY:0,width:32,height:32}]}]}],layers:[{name:'测试底图',sheetIndex:0,visible:true,locked:true,opacity:1,frameData:{'0_0_0':{width:32,height:32,dataURL:png}}}]};
  const projectFile=path.join(dir,'data/projects/draft-hd-image-test.json');fs.writeFileSync(projectFile,JSON.stringify(fixture));
  console.log('TEST fixture written');
  const eyes=createCanvas(32,16),ec=eyes.getContext('2d');
  for(const x of [1,18]){ec.fillStyle='#342d48';ec.fillRect(x,3,12,9);ec.fillRect(x-1,2,12,2);ec.fillStyle='#f7f7ff';ec.fillRect(x+1,5,10,6);ec.fillStyle='#3656a8';ec.fillRect(x+4,4,5,8);ec.fillStyle='#161b3c';ec.fillRect(x+5,4,2,7);ec.fillStyle='#ffffff';ec.fillRect(x+5,5,2,2);ec.fillStyle='#90cdec';ec.fillRect(x+4,10,4,2);}
  const reservation=net.createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
  const server=spawn(process.execPath,[path.join(dir,'server.js'),String(port)],{windowsHide:true,stdio:['ignore','pipe','pipe']}),base='http://127.0.0.1:'+port;let browser;
  console.log('TEST server launched');
  try{
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Test server timeout')),10000);server.stdout.once('data',()=>{clearTimeout(timer);resolve();});server.once('error',reject);});
    browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:980},acceptDownloads:true}),page=await context.newPage(),errors=[];
    console.log('TEST browser launched');
    page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.dismiss());
    await page.goto(base+'/index.html?project=draft-hd-image-test');await page.waitForFunction(()=>PE.app.persistence.ready&&document.querySelector('.studio-loading')?.hidden);
    console.log('TEST fixture opened');
    await page.getByRole('button',{name:'上传图片',exact:true}).click();await page.getByLabel('上传源图片').setInputFiles({name:'功能测试高清眼睛.png',mimeType:'image/png',buffer:eyes.toBuffer('image/png')});
    await page.getByLabel('高清图片图层（保留原图，无损缩放）',{exact:true}).check();await page.getByLabel('放置宽度',{exact:true}).fill('8');
    assert(await page.getByLabel('转成像素图',{exact:true}).isDisabled());assert(await page.getByLabel('缩小方式',{exact:true}).isDisabled());
    assert.deepEqual(await page.locator('[data-preview]').evaluate(c=>[c.width,c.height]),[32,16]);
    await page.screenshot({path:path.join(output,'browser-hd-import.png')});await page.getByRole('button',{name:'放到当前画布',exact:true}).click();
    const state=()=>page.evaluate(()=>{const p=PE.app.project,d=p.getCurrentLayer().getFrameData(p.getFrameKey());return {width:d.width,height:d.height,placement:{...d.placement},pixels:[...d.data]};});
    const original=await state();assert.equal(original.width,32);assert.equal(original.height,16);assert.deepEqual(original.placement,{x:12,y:14,w:8,h:4});
    const free=page.getByLabel('无视像素格放置',{exact:true});assert.equal(await free.isChecked(),false);
    await free.check();await page.getByLabel('图层位置 X',{exact:true}).fill('12.5');await page.getByLabel('图层位置 X',{exact:true}).press('Tab');
    assert.equal((await state()).placement.x,12.5);assert.deepEqual((await state()).pixels,original.pixels);
    await page.getByLabel('图层位置 Y',{exact:true}).fill('14.25');await page.getByLabel('图层位置 Y',{exact:true}).press('Tab');assert.equal((await state()).placement.y,14.25);
    await page.getByRole('button',{name:'撤销',exact:true}).click();await page.getByRole('button',{name:'撤销',exact:true}).click();assert.deepEqual(await state(),original);
    await page.evaluate(()=>{const c=PE.app.canvasManager;c.zoom=16;c.centerView();c.render();});
    const start=await page.evaluate(()=>{const c=PE.app.canvasManager,b=c.canvas.getBoundingClientRect();return{x:b.x+(c.offsetX+14.25*c.zoom)*b.width/c.canvas.width,y:b.y+(c.offsetY+15.25*c.zoom)*b.height/c.canvas.height,dx:8*b.width/c.canvas.width,dy:4*b.height/c.canvas.height};});
    await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+start.dx,start.y+start.dy,{steps:4});assert.deepEqual(await state(),original,'live drag preview not yet committed');await page.mouse.up();
    const fraction=await state();assert.deepEqual(fraction.placement,{x:12.5,y:14.25,w:8,h:4});assert.deepEqual(fraction.pixels,original.pixels);
    await page.keyboard.press('ArrowRight');assert.equal((await state()).placement.x,12.6);await page.getByRole('button',{name:'撤销',exact:true}).click();assert.deepEqual(await state(),fraction);
    await page.screenshot({path:path.join(output,'browser-free-placement.png')});
    await page.getByRole('button',{name:'保存工程',exact:true}).click();await page.waitForFunction(()=>!PE.app.persistence.dirty&&!PE.app.persistence.saving);
    const fractionSaved=await(await fetch(base+'/api/project?id=draft-hd-image-test')).json();assert.deepEqual(fractionSaved.layers[1].frameData['0_0_0'].placement,fraction.placement);
    const freeContext=await browser.newContext(),freePage=await freeContext.newPage();freePage.on('pageerror',e=>errors.push(e.message));await freePage.goto(base+'/index.html?project=draft-hd-image-test');await freePage.waitForFunction(()=>PE.app.persistence.ready&&document.querySelector('.studio-loading')?.hidden);
    assert.deepEqual(await freePage.evaluate(()=>{const d=PE.app.project.layers[1].getFrameData('0_0_0');return {placement:{...d.placement},pixels:[...d.data]};}),{placement:fraction.placement,pixels:fraction.pixels});assert.equal(await freePage.getByLabel('无视像素格放置',{exact:true}).isChecked(),false);await freeContext.close();
    await free.uncheck();assert.deepEqual(await state(),fraction,'unchecking must not move the existing image');await page.getByRole('button',{name:'撤销',exact:true}).click();assert.deepEqual(await state(),original);
    console.log('PASS: unchecked default, free X/Y, half-pixel drag, 0.1 arrow nudge, undo, real revision-checked fractional save and fresh-context exact reopen, original native pixels unchanged.');

    await page.getByLabel('图层位置 X',{exact:true}).fill('-2');await page.getByLabel('图层位置 X',{exact:true}).press('Tab');
    await page.getByLabel('图层位置 Y',{exact:true}).fill('34');await page.getByLabel('图层位置 Y',{exact:true}).press('Tab');
    const outside=await state();assert.deepEqual(outside.placement,{x:-2,y:34,w:8,h:4});assert.deepEqual(outside.pixels,original.pixels);
    assert.deepEqual(await page.evaluate(()=>PE.app.toolManager.selection),outside.placement,'Off-canvas box must not be clipped');
    await page.getByRole('button',{name:'保存工程',exact:true}).click();await page.waitForFunction(()=>!PE.app.persistence.dirty&&!PE.app.persistence.saving);
    const outsideContext=await browser.newContext(),outsidePage=await outsideContext.newPage();await outsidePage.goto(base+'/index.html?project=draft-hd-image-test');await outsidePage.waitForFunction(()=>PE.app.persistence.ready&&document.querySelector('.studio-loading')?.hidden);
    assert.deepEqual(await outsidePage.evaluate(()=>{const d=PE.app.project.layers[1].getFrameData('0_0_0');return {width:d.width,height:d.height,placement:{...d.placement},pixels:[...d.data]};}),outside);await outsideContext.close();
    await page.getByLabel('图层位置 X',{exact:true}).fill('12');await page.getByLabel('图层位置 X',{exact:true}).press('Tab');await page.getByLabel('图层位置 Y',{exact:true}).fill('14');await page.getByLabel('图层位置 Y',{exact:true}).press('Tab');assert.deepEqual(await state(),original);
    await page.evaluate(()=>{const c=PE.app.canvasManager;c.zoom=8;c.centerView();c.render();});
    const hdPoint=async(x,y)=>page.evaluate(({x,y})=>{const c=PE.app.canvasManager,b=c.canvas.getBoundingClientRect();return {x:b.x+(c.offsetX+x*c.zoom)*b.width/c.canvas.width,y:b.y+(c.offsetY+y*c.zoom)*b.height/c.canvas.height};},{x,y});
    const outsideStart=await hdPoint(14.25,15.25),outsideEnd=await hdPoint(-1.75,15.25);await page.mouse.move(outsideStart.x,outsideStart.y);await page.mouse.down();await page.mouse.move(outsideEnd.x,outsideEnd.y,{steps:8});assert.deepEqual(await state(),original);await page.mouse.up();assert.deepEqual((await state()).placement,{x:-4,y:14,w:8,h:4});assert.deepEqual((await state()).pixels,original.pixels);
    await page.screenshot({path:path.join(output,'browser-off-canvas-drag.png')});await page.getByRole('button',{name:'撤销',exact:true}).click();assert.deepEqual(await state(),original);await page.getByRole('button',{name:'重做',exact:true}).click();assert.equal((await state()).placement.x,-4);await page.getByRole('button',{name:'撤销',exact:true}).click();
    console.log('PASS: real negative X and beyond-bottom Y, unchanged full source, intact outside selection box, revision-checked save/fresh reopen, real drag across canvas boundary, undo/redo and exact return.');
    await page.evaluate(()=>{const c=PE.app.canvasManager;c.zoom=16;c.centerView();c.render();});
    await page.getByLabel('框选',{exact:true}).click();const marqueeStart=await hdPoint(12.05,14.05),marqueeEnd=await hdPoint(13.8,15.8);await page.mouse.move(marqueeStart.x,marqueeStart.y);await page.mouse.down();await page.mouse.move(marqueeEnd.x,marqueeEnd.y,{steps:3});await page.mouse.up();
    assert.deepEqual(await page.evaluate(()=>PE.app.toolManager.selection),{x:12,y:14,w:2,h:2});await page.getByLabel('移动 / 缩放',{exact:true}).click();
    const partialStart=await hdPoint(13.25,15.25),partialEnd=await hdPoint(11.25,15.25);await page.mouse.move(partialStart.x,partialStart.y);await page.mouse.down();await page.mouse.move(partialEnd.x,partialEnd.y,{steps:4});assert.deepEqual(await state(),original,'HD partial drag remains preview only');await page.mouse.up();
    const partial=await state();assert.deepEqual(partial.placement,{x:10,y:14,w:10,h:4});assert.deepEqual([partial.width,partial.height],[40,16]);
    for(let y=0;y<16;y++)for(let x=8;x<32;x++)assert.deepEqual(partial.pixels.slice((y*40+x+8)*4,(y*40+x+9)*4),original.pixels.slice((y*32+x)*4,(y*32+x+1)*4),'Unselected right eye must stay byte-exact');
    await page.screenshot({path:path.join(output,'browser-hd-partial-marquee-moved.png')});await page.getByRole('button',{name:'撤销',exact:true}).click();assert.deepEqual(await state(),original);await page.getByRole('button',{name:'重做',exact:true}).click();assert.deepEqual(await state(),partial);await page.getByRole('button',{name:'撤销',exact:true}).click();
    await page.evaluate(()=>{const t=PE.app.toolManager;t.clearSelection();t.setSelection(12,14,8,4);});console.log('PASS: real HD marquee, switch to move, partial mouse drag without whole-image reset, exact unselected eye, expansion, undo and redo.');

    await page.getByLabel('高清图层放置宽度',{exact:true}).fill('4');await page.getByLabel('高清图层放置宽度',{exact:true}).press('Tab');assert.deepEqual((await state()).placement,{x:12,y:14,w:4,h:2});
    await page.getByLabel('高清图层放置宽度',{exact:true}).fill('8');await page.getByLabel('高清图层放置宽度',{exact:true}).press('Tab');assert.deepEqual(await state(),original);
    await page.getByRole('button',{name:'缩小图片',exact:true}).click();assert.equal((await state()).width,32);await page.getByRole('button',{name:'撤销',exact:true}).click();assert.deepEqual(await state(),original);
    const r=original.placement;
    async function point(x,y){return page.evaluate(({x,y})=>{const c=PE.app.canvasManager,b=c.canvas.getBoundingClientRect();return {x:b.x+(c.offsetX+(x+.5)*c.zoom)*b.width/c.canvas.width,y:b.y+(c.offsetY+(y+.5)*c.zoom)*b.height/c.canvas.height};},{x,y});}
    const a=await point(r.x+2,r.y+1),b=await point(r.x+3,r.y+1);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});assert.equal((await state()).placement.x,r.x);await page.mouse.up();assert.equal((await state()).placement.x,r.x+1);assert.deepEqual((await state()).pixels,original.pixels);
    await page.getByRole('button',{name:'撤销',exact:true}).click();assert.deepEqual(await state(),original);
    await page.evaluate(()=>{const a=PE.app;a.toolManager.clearSelection();a.canvasManager.showGrid=false;a.canvasManager.zoom=18;a.canvasManager.centerView();a.updateZoomDisplay();});
    await page.screenshot({path:path.join(output,'browser-hd-canvas.png')});
    await page.getByRole('button',{name:'保存工程',exact:true}).click();await page.waitForFunction(()=>!PE.app.persistence.dirty&&!PE.app.persistence.saving);
    let response=await fetch(base+'/api/project?id=draft-hd-image-test'),etag=response.headers.get('ETag'),saved=await response.json();assert.deepEqual(saved.layers[1].frameData['0_0_0'].placement,original.placement);assert.equal(saved.layers[1].frameData['0_0_0'].width,32);assert(fs.existsSync(projectFile+'.bak'));
    const preservedBase=createCanvas(32,32);preservedBase.getContext('2d').drawImage(await loadImage(saved.layers[0].frameData['0_0_0'].dataURL),0,0);assert.deepEqual(preservedBase.getContext('2d').getImageData(0,0,32,32).data,sc.getImageData(0,0,32,32).data);
    fs.writeFileSync(path.join(output,'browser-saved-project.json'),JSON.stringify(saved,null,2));
    const exportDownload=page.waitForEvent('download');await page.locator('.dropdown-toggle').click();await page.getByRole('button',{name:'导出当前帧 (PNG)',exact:true}).click();const download=await exportDownload;const exported=path.join(output,'browser-hd-export.png');await download.saveAs(exported);assert.equal((await loadImage(exported)).width,128);
    const secondContext=await browser.newContext({viewport:{width:1000,height:760}}),reopened=await secondContext.newPage();reopened.on('pageerror',e=>errors.push(e.message));
    await reopened.goto(base+'/index.html?project=draft-hd-image-test');await reopened.waitForFunction(()=>PE.app.persistence.ready&&document.querySelector('.studio-loading')?.hidden);
    assert.deepEqual(await reopened.evaluate(()=>{const d=PE.app.project.layers[1].getFrameData('0_0_0');return {width:d.width,height:d.height,placement:{...d.placement},pixels:[...d.data]};}),original);
    assert(await reopened.locator('.image-edit-toolbar').evaluate(el=>el.scrollWidth<=el.clientWidth));await reopened.screenshot({path:path.join(output,'browser-hd-reopened-narrow.png')});
    // Ordinary native layer, not imported or created as an HD layer.
    await page.evaluate(()=>{const app=PE.app,p=app.project,l=new PE.Layer('普通图层自由移动测试'),d=new ImageData(32,32);for(let y=24;y<27;y++)for(let x=4;x<8;x++)d.data.set([80,90,100,255],(y*32+x)*4);l.sheetIndex=0;l.frameData.set('0_0_0',d);p.layers.push(l);p.currentLayerIndex=p.layers.length-1;app.toolManager.clearSelection();app.toolManager.setTool('move');app.toolManager.setSelection(4,24,4,3);app.canvasManager.zoom=16;app.canvasManager.centerView();app.updateAll();});
    await free.check();const nativeBefore=await state();assert.deepEqual([nativeBefore.width,nativeBefore.height],[32,32]);assert.deepEqual(nativeBefore.placement,{});assert.equal(await page.getByLabel('图层位置 X',{exact:true}).inputValue(),'4');
    await page.getByLabel('图层位置 X',{exact:true}).fill('-1.5');await page.getByLabel('图层位置 X',{exact:true}).press('Tab');assert.deepEqual((await state()).placement,{x:-1.5,y:24,w:4,h:3});assert.deepEqual((await state()).pixels,Array.from({length:12},()=>[80,90,100,255]).flat());await page.getByRole('button',{name:'撤销',exact:true}).click();assert.deepEqual(await state(),nativeBefore);
    await page.evaluate(()=>{const c=PE.app.canvasManager;c.zoom=16;c.centerView();c.render();});
    const nativePoint=await page.evaluate(()=>{const c=PE.app.canvasManager,b=c.canvas.getBoundingClientRect();return {x:b.x+(c.offsetX+6*c.zoom)*b.width/c.canvas.width,y:b.y+(c.offsetY+25*c.zoom)*b.height/c.canvas.height,dx:8*b.width/c.canvas.width};});
    await page.mouse.move(nativePoint.x,nativePoint.y);await page.mouse.down();await page.mouse.move(nativePoint.x+nativePoint.dx,nativePoint.y,{steps:4});assert.deepEqual(await state(),nativeBefore,'Native drag must remain preview-only');await page.mouse.up();
    const nativeMoved=await state();assert.deepEqual(nativeMoved.placement,{x:4.5,y:24,w:4,h:3});assert.deepEqual([nativeMoved.width,nativeMoved.height],[4,3]);assert.deepEqual(nativeMoved.pixels,Array.from({length:12},()=>[80,90,100,255]).flat());
    await page.getByRole('button',{name:'撤销',exact:true}).click();assert.deepEqual(await state(),nativeBefore);await page.getByRole('button',{name:'重做',exact:true}).click();assert.deepEqual(await state(),nativeMoved);
    await page.keyboard.press('ArrowRight');assert.equal((await state()).placement.x,4.6);await page.getByLabel('图层位置 Y',{exact:true}).fill('24.1');await page.getByLabel('图层位置 Y',{exact:true}).press('Tab');const nativeFinal=await state();assert.equal(nativeFinal.placement.y,24.1);assert.deepEqual(nativeFinal.pixels,nativeMoved.pixels);
    await page.screenshot({path:path.join(output,'browser-native-free-placement.png')});
    await page.getByRole('button',{name:'保存工程',exact:true}).click();await page.waitForFunction(()=>!PE.app.persistence.dirty&&!PE.app.persistence.saving);
    const nativeContext=await browser.newContext(),nativePage=await nativeContext.newPage();await nativePage.goto(base+'/index.html?project=draft-hd-image-test');await nativePage.waitForFunction(()=>PE.app.persistence.ready&&document.querySelector('.studio-loading')?.hidden);
    assert.deepEqual(await nativePage.evaluate(()=>{const d=PE.app.project.layers.at(-1).getFrameData('0_0_0');return {width:d.width,height:d.height,placement:{...d.placement},pixels:[...d.data]};}),nativeFinal);await nativeContext.close();
    const nativeDownload=page.waitForEvent('download');await page.locator('.dropdown-toggle').click();await page.getByRole('button',{name:'导出当前帧 (PNG)',exact:true}).click();const nativeExport=path.join(output,'browser-native-free-export.png');await(await nativeDownload).saveAs(nativeExport);const nativeImage=await loadImage(nativeExport);assert.equal(nativeImage.width,320);
    const nativeCheck=createCanvas(320,320),nativeCtx=nativeCheck.getContext('2d');nativeCtx.drawImage(nativeImage,0,0);
    for(const [x,y]of [[46,241],[85,241],[46,270],[85,270]])assert.deepEqual([...nativeCtx.getImageData(x,y,1,1).data],[80,90,100,255],'0.1-grid placement survives PNG export exactly');
    assert.equal(nativeCtx.getImageData(45,241,1,1).data[3],0);assert.equal(nativeCtx.getImageData(86,241,1,1).data[3],0);
    console.log('PASS: ordinary layer free mouse drag, untouched preview, exact source pixels, undo to native layer, redo, 0.1 arrows and X/Y, real save/fresh reopen and high-density PNG export.');
    response=await fetch(base+'/api/project?id=draft-hd-image-test');etag=response.headers.get('ETag');saved=await response.json();
    // Only this disposable fixture is changed by the simulated second writer.
    saved.name='另一个窗口更新（测试）';response=await fetch(base+'/api/project?id=draft-hd-image-test',{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(saved)});assert.equal(response.status,200);
    const conflict=await fetch(base+'/api/project?id=draft-hd-image-test',{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(fixture)});assert.equal(conflict.status,409);assert.equal(JSON.parse(fs.readFileSync(projectFile)).layers[1].frameData['0_0_0'].width,32);
    await page.getByRole('button',{name:'上传图片',exact:true}).click();await page.getByRole('button',{name:'新建独立素材',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.pixel-import-dialog').open);
    assert.deepEqual(await page.evaluate(()=>{const p=PE.app.project,f=p.getCurrentFrame(),d=p.getCurrentLayer().getFrameData(p.getFrameKey());return {logical:[f.width,f.height],source:[d.width,d.height],placement:{...d.placement}};}),{logical:[8,4],source:[32,16],placement:{x:0,y:0,w:8,h:4}});
    assert.deepEqual(errors,[]);console.log('PASS: browser native-HD upload, disabled destructive controls, exact resize roundtrip, drag and undo, revision-checked real server save/reopen, original layer preserved, downloadable 4x PNG, narrow UI, stale-write rejection; user projects untouched.');
    console.log('Isolated test directory: '+dir);
  }finally{await browser?.close();server.kill();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
