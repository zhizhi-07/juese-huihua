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
    await free.check();await page.getByLabel('高清图层位置 X',{exact:true}).fill('12.5');await page.getByLabel('高清图层位置 X',{exact:true}).press('Tab');
    assert.equal((await state()).placement.x,12.5);assert.deepEqual((await state()).pixels,original.pixels);
    await page.getByLabel('高清图层位置 Y',{exact:true}).fill('14.25');await page.getByLabel('高清图层位置 Y',{exact:true}).press('Tab');assert.equal((await state()).placement.y,14.25);
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
