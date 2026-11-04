const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),net=require('node:net'),{spawn}=require('node:child_process');
const {chromium}=require('playwright'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..');
async function main(){
  console.log('TEST starting isolated HD browser fixture');
  const output=path.join(__dirname,'output/hd-canvas');fs.mkdirSync(output,{recursive:true});
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hd-canvas-test-'));
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
    const beforeRegion=await page.evaluate(async()=>({data:await PE.app.exportManager.exportProject(false).text(),dirty:PE.app.persistence.dirty,history:PE.app.history.undoStack.length,tool:PE.app.toolManager.currentTool}));
    await page.getByRole('button',{name:'新建高清画布',exact:true}).click();
    const regionDialog=page.getByRole('dialog',{name:'新建高清画布',exact:true}),regionCanvas=page.getByLabel('高清画布框选范围',{exact:true});
    const regionPoint=async(x,y)=>{const b=await regionCanvas.boundingBox();return {x:b.x+x/32*b.width,y:b.y+y/32*b.height};};
    const regionDrag=async(x1,y1,x2,y2)=>{const a=await regionPoint(x1,y1),b=await regionPoint(x2,y2);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});await page.mouse.up();};
    await regionDrag(21,16,11,11);assert.equal(await page.getByLabel('高清源宽度',{exact:true}).inputValue(),'60');assert.equal(await page.getByLabel('高清源高度',{exact:true}).inputValue(),'30');assert.equal(await page.getByLabel('新建高清放置宽度',{exact:true}).inputValue(),'10');
    await page.setViewportSize({width:620,height:860});assert(await regionDialog.evaluate(d=>d.scrollWidth<=d.clientWidth+1),'region dialog fits a narrow screen');await page.screenshot({path:path.join(output,'browser-hd-region-preview.png')});
    await page.getByRole('button',{name:'取消新建',exact:true}).focus();await page.keyboard.press('e');await page.keyboard.press('Control+z');
    await page.getByRole('button',{name:'取消新建',exact:true}).click();
    assert.deepEqual(await page.evaluate(async()=>({data:await PE.app.exportManager.exportProject(false).text(),dirty:PE.app.persistence.dirty,history:PE.app.history.undoStack.length,tool:PE.app.toolManager.currentTool})),beforeRegion,'preview and cancel leave pixels, dirty state, history and tools untouched');
    await page.setViewportSize({width:1440,height:980});await page.getByRole('button',{name:'新建高清画布',exact:true}).click();
    await regionDrag(11,11,21,16);await page.getByLabel('高清源宽度',{exact:true}).fill('513');await page.getByRole('button',{name:'创建并绘画',exact:true}).click();await regionDialog.getByText('源宽高需为 1–512',{exact:false}).waitFor();assert.equal(await page.evaluate(()=>PE.app.project.layers.length),1);
    await page.getByLabel('高清源宽度',{exact:true}).fill('60');
    await page.evaluate(()=>PE.app.project.getCurrentFrame().addLockedRegion(11,11,1,1));await page.getByRole('button',{name:'创建并绘画',exact:true}).click();await regionDialog.getByText('图片会覆盖当前帧的保护区域',{exact:false}).waitFor();assert.equal(await page.evaluate(()=>PE.app.project.layers.length),1);await page.evaluate(()=>{PE.app.project.getCurrentFrame().lockedRegions=[];});
    await page.getByRole('button',{name:'创建并绘画',exact:true}).click();
    const made=await page.evaluate(()=>{const p=PE.app.project,d=p.getCurrentLayer().getFrameData(p.getFrameKey());return {w:d.width,h:d.height,placement:{...d.placement},blank:!d.data.some(Boolean)};});
    assert.deepEqual(made,{w:60,h:30,placement:{x:11,y:11,w:10,h:5},blank:true},'drag defines actual new layer size and non-centered position; reference stays out of the new layer');
    await page.getByRole('button',{name:'撤销',exact:true}).click();assert.equal(await page.evaluate(()=>PE.app.project.layers.length),1);await page.getByRole('button',{name:'重做',exact:true}).click();assert.deepEqual(await page.evaluate(()=>PE.app.toolManager.selection),made.placement);await page.getByRole('button',{name:'撤销',exact:true}).click();
    await page.getByRole('button',{name:'新建高清画布',exact:true}).click();
    await page.getByLabel('高清源宽度',{exact:true}).fill('96');await page.getByLabel('高清源高度',{exact:true}).fill('48');
    await page.getByLabel('新建高清放置宽度',{exact:true}).fill('16');
    await page.getByRole('button',{name:'创建并绘画',exact:true}).click();
    assert.equal(await page.locator('dialog[open]').count(),0,'Create goes directly to main canvas');
    const state=()=>page.evaluate(()=>{const p=PE.app.project,d=p.getCurrentLayer().getFrameData(p.getFrameKey());return {width:d.width,height:d.height,placement:{...d.placement},pixels:[...d.data]};});
    const blank=await state();assert.deepEqual([blank.width,blank.height],[96,48]);assert.deepEqual(blank.placement,{x:8,y:12,w:16,h:8});
    const point=async(x,y)=>page.evaluate(({x,y})=>{const app=PE.app,c=app.canvasManager,d=app.project.getCurrentLayer().getFrameData(app.project.getFrameKey()),r=d.placement,b=c.canvas.getBoundingClientRect();return {x:b.x+(c.offsetX+(r.x+(x+.3)*r.w/d.width)*c.zoom)*b.width/c.canvas.width,y:b.y+(c.offsetY+(r.y+(y+.3)*r.h/d.height)*c.zoom)*b.height/c.canvas.height};},{x,y});
    async function dot(x,y){const q=await point(x,y);await page.mouse.click(q.x,q.y);}
    await page.locator('#color-primary').fill('#1768ff');await dot(30,12);const i=(12*96+30)*4,painted=await state();assert.deepEqual(painted.pixels.slice(i,i+4),[23,104,255,255]);assert.deepEqual(painted.placement,blank.placement);
    await page.getByRole('button',{name:'撤销',exact:true}).click();assert.deepEqual(await state(),blank);await page.getByRole('button',{name:'重做',exact:true}).click();assert.deepEqual(await state(),painted);
    await dot(31,12);const two=await state(),j=(12*96+31)*4;assert.deepEqual(two.pixels.slice(j,j+4),[23,104,255,255]);
    await page.getByLabel('橡皮',{exact:true}).click();await dot(30,12);const erased=await state();assert.deepEqual(erased.pixels.slice(i,i+4),[0,0,0,0]);assert.deepEqual(erased.pixels.slice(j,j+4),[23,104,255,255],'One native pixel erased, adjacent native pixel exact');await page.getByRole('button',{name:'撤销',exact:true}).click();assert.deepEqual(await state(),two);
    await page.getByRole('button',{name:'编辑高清画布',exact:true}).click();assert.equal(await page.locator('dialog[open]').count(),0,'Edit never opens an isolated source window');assert(await page.getByRole('status').allTextContents().then(a=>a.some(t=>t.includes('直接在主画布'))));
    await page.getByLabel('框选',{exact:true}).click();const q=await point(30,12);await page.mouse.click(q.x,q.y);
    const sel=await page.evaluate(()=>({...PE.app.toolManager.selection}));assert(Math.abs(sel.w-1/6)<1e-6);assert(Math.abs(sel.h-1/6)<1e-6);
    await page.getByLabel('移动 / 缩放',{exact:true}).click();await page.keyboard.press('ArrowRight');const moved=await state();assert.equal(moved.pixels[i+3],0);assert.deepEqual(moved.pixels.slice(j,j+4),two.pixels.slice(i,i+4));assert(Math.abs((await page.evaluate(()=>PE.app.toolManager.selection.x))-sel.x-1/6)<1e-6);await page.getByRole('button',{name:'撤销',exact:true}).click();assert.deepEqual(await state(),two);
    const nativeDragStart=await point(30,12),nativeDragEnd=await point(31,12);await page.mouse.move(nativeDragStart.x,nativeDragStart.y);await page.mouse.down();await page.mouse.move(nativeDragEnd.x,nativeDragEnd.y,{steps:4});assert.deepEqual(await state(),two,'Native partial mouse drag remains a preview');await page.mouse.up();assert.equal((await state()).pixels[i+3],0);assert.deepEqual((await state()).pixels.slice(j,j+4),two.pixels.slice(i,i+4));await page.getByRole('button',{name:'撤销',exact:true}).click();assert.deepEqual(await state(),two);
    await page.getByRole('button',{name:'复制',exact:true}).click();assert.deepEqual(await page.evaluate(()=>[PE.app.frameClipboard.pixels.width,PE.app.frameClipboard.pixels.height]),[1,1]);await page.getByRole('button',{name:'剪切',exact:true}).click();assert.equal((await state()).pixels[i+3],0);await page.getByRole('button',{name:'粘贴',exact:true}).click();assert.deepEqual(await state(),two);
    await page.getByRole('button',{name:'编辑高清画布',exact:true}).click();await page.getByLabel('吸色',{exact:true}).click();await dot(30,12);assert.equal(await page.locator('#color-primary').inputValue(),'#1768ff');
    await page.getByLabel('框选',{exact:true}).click();const dragA=await point(30,12),dragB=await point(31,12);await page.mouse.move(dragA.x,dragA.y);await page.mouse.down();await page.mouse.move(dragB.x,dragB.y,{steps:3});await page.mouse.up();assert(Math.abs((await page.evaluate(()=>PE.app.toolManager.selection.w))-2/6)<1e-6);
    await page.getByLabel('填充',{exact:true}).click();await page.locator('#color-primary').fill('#ee5577');await dot(30,12);const filled=await state();assert.deepEqual(filled.pixels.slice(i,i+4),[238,85,119,255]);assert.deepEqual(filled.pixels.slice(j,j+4),[238,85,119,255]);assert.equal(filled.pixels.filter((v,i)=>i%4===3&&v>0).length,2,'Fill cannot spill outside selected native pixels');await page.getByRole('button',{name:'撤销',exact:true}).click();assert.deepEqual(await state(),two);
    await page.getByRole('button',{name:'编辑高清画布',exact:true}).click();await page.getByLabel('橡皮',{exact:true}).click();await page.screenshot({path:path.join(output,'browser-inline-hd-main-canvas.png')});
    await page.getByRole('button',{name:'保存工程',exact:true}).click();await page.waitForFunction(()=>!PE.app.persistence.dirty&&!PE.app.persistence.saving);
    const saved=await (await fetch(base+'/api/project?id=draft-hd-image-test')).json();assert.deepEqual(saved.layers[1].frameData['0_0_0'].placement,two.placement);const faceCheck=createCanvas(32,32);faceCheck.getContext('2d').drawImage(await loadImage(saved.layers[0].frameData['0_0_0'].dataURL),0,0);assert.deepEqual(faceCheck.getContext('2d').getImageData(0,0,32,32).data,sc.getImageData(0,0,32,32).data,'Face pixels are untouched; PNG encoders may differ');
    const context2=await browser.newContext(),reopened=await context2.newPage();reopened.on('pageerror',e=>errors.push(e.message));await reopened.goto(base+'/index.html?project=draft-hd-image-test');await reopened.waitForFunction(()=>PE.app.persistence.ready&&document.querySelector('.studio-loading')?.hidden);
    assert.deepEqual(await reopened.evaluate(()=>{const p=PE.app.project,d=p.layers[1].getFrameData('0_0_0');return {width:d.width,height:d.height,placement:{...d.placement},pixels:[...d.data]};}),two);
    await reopened.evaluate(()=>{PE.app.project.currentLayerIndex=1;PE.app.updateAll();});await reopened.getByRole('button',{name:'编辑高清画布',exact:true}).click();assert.equal(await reopened.locator('dialog[open]').count(),0);
    assert.deepEqual(errors,[]);console.log('PASS: forward/reverse drag-to-create at exact non-centered bounds; 6x source dimensions; narrow-screen preview; cancel leaves project untouched; invalid size and selected-area locks reject safely; create undo/redo; manual fallback; main-canvas pencil/eraser/selection/move/fill/copy; unchanged reference; ETag save/fresh reopen/re-edit.');
    console.log('Isolated fixture: '+dir);
  }finally{await browser?.close();server.kill();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
