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
    await page.getByRole('button',{name:'新建高清画布',exact:true}).click();
    await page.getByLabel('高清源宽度',{exact:true}).fill('96');await page.getByLabel('高清源高度',{exact:true}).fill('48');
    await page.getByRole('button',{name:'创建并绘画',exact:true}).click();
    const d=page.getByRole('dialog',{name:'可编辑高清源画布',exact:true});await d.waitFor({state:'visible'});
    const state=()=>page.evaluate(()=>{const p=PE.app.project,d=p.getCurrentLayer().getFrameData(p.getFrameKey());return {width:d.width,height:d.height,placement:{...d.placement},pixels:[...d.data]};});
    const blank=await state();assert.deepEqual([blank.width,blank.height],[96,48]);assert.deepEqual(blank.placement,{x:8,y:12,w:16,h:8});
    const cv=d.getByLabel('高清源像素画布',{exact:true});
    async function dot(x,y){const q=await cv.evaluate((c,{x,y})=>{const b=c.getBoundingClientRect(),z=Math.max(1,Math.min(16,Math.floor(Math.min((c.width-24)/96,(c.height-24)/48))));return {x:b.x+(c.width-96*z)/2+(x+.5)*z,y:b.y+(c.height-48*z)/2+(y+.5)*z};},{x,y});await page.mouse.click(q.x,q.y);}
    await d.getByLabel('高清画布颜色',{exact:true}).fill('#1768ff');await dot(30,12);assert.deepEqual(await state(),blank,'editing working canvas must not touch project before Apply');
    await cv.press('Control+z');await d.getByRole('button',{name:'应用到当前图层',exact:true}).click();assert.deepEqual(await state(),blank,'local Ctrl+Z, not main-layer undo');
    await page.getByRole('button',{name:'编辑高清画布',exact:true}).click();await d.getByLabel('高清画布颜色',{exact:true}).fill('#1768ff');await dot(30,12);await d.getByRole('button',{name:'应用到当前图层',exact:true}).click();
    const painted=await state(),i=(12*96+30)*4;assert.deepEqual(painted.pixels.slice(i,i+4),[23,104,255,255]);assert.deepEqual(painted.placement,blank.placement);
    await page.getByRole('button',{name:'撤销',exact:true}).click();assert.deepEqual(await state(),blank);await page.getByRole('button',{name:'重做',exact:true}).click();assert.deepEqual(await state(),painted);
    await page.getByRole('button',{name:'编辑高清画布',exact:true}).click();await d.getByRole('button',{name:'橡皮',exact:true}).click();await dot(30,12);await d.getByRole('button',{name:'取消',exact:true}).click();assert(await d.isVisible(),'dismissed confirmation keeps working draft');
    page.removeAllListeners('dialog');page.on('dialog',d=>d.accept());await d.getByRole('button',{name:'取消',exact:true}).click();assert.deepEqual(await state(),painted,'cancel keeps original');
    await page.getByRole('button',{name:'编辑高清画布',exact:true}).click();await page.screenshot({path:path.join(output,'browser-editable-source.png')});await d.getByRole('button',{name:'取消',exact:true}).click();
    await page.getByRole('button',{name:'保存工程',exact:true}).click();await page.waitForFunction(()=>!PE.app.persistence.dirty&&!PE.app.persistence.saving);
    const saved=await (await fetch(base+'/api/project?id=draft-hd-image-test')).json();assert.equal(saved.layers[1].frameData['0_0_0'].width,96);assert.deepEqual(saved.layers[1].frameData['0_0_0'].placement,painted.placement);
    const context2=await browser.newContext(),reopened=await context2.newPage();reopened.on('pageerror',e=>errors.push(e.message));await reopened.goto(base+'/index.html?project=draft-hd-image-test');await reopened.waitForFunction(()=>PE.app.persistence.ready&&document.querySelector('.studio-loading')?.hidden);
    assert.deepEqual(await reopened.evaluate(()=>{const p=PE.app.project,d=p.layers[1].getFrameData('0_0_0');return {width:d.width,height:d.height,placement:{...d.placement},pixels:[...d.data]};}),painted);
    await reopened.evaluate(()=>{const p=PE.app.project;p.currentLayerIndex=1;PE.app.updateAll();});await reopened.getByRole('button',{name:'编辑高清画布',exact:true}).click();assert(await reopened.getByRole('dialog',{name:'可编辑高清源画布',exact:true}).isVisible());
    assert.deepEqual(errors,[]);console.log('PASS: real UI create blank source, draw native pixel, local and main undo/redo, cancel confirmation, unchanged placement, manual ETag save, fresh-context exact reopen and re-edit; no user projects touched.');
    console.log('Isolated fixture: '+dir);
  }finally{await browser?.close();server.kill();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
