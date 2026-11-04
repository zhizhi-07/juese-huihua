const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),output=path.join(root,'test/output/layer-resize-mode-20261101');
(async()=>{
  await fs.mkdir(output,{recursive:true});
  const server=http.createServer(async(req,res)=>{
    if(req.method!=='GET'){res.writeHead(405).end();return;}
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/api/')){res.writeHead(404,{'Content-Type':'application/json'}).end('{}');return;}
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?project=resize-mode-isolated-test`);
    await page.waitForFunction(()=>PE.app?.toolManager&&document.querySelector('.studio-loading')?.hidden);
    await page.getByRole('button',{name:'图像工具',exact:true}).click();
    await page.evaluate(()=>{
      const app=PE.app,p=app.project,s=new PE.SpriteSheet('缩放测试'),a=new PE.Action('idle');
      s.frameWidth=s.frameHeight=16;s.imageData=new ImageData(16,16);s.actions=[a];a.frames=[new PE.Frame(0,0,0,16,16)];p.spriteSheets=[s];p.layers=[new PE.Layer('缩放测试图层')];p.currentSheetIndex=p.currentActionIndex=p.currentFrameIndex=p.currentLayerIndex=0;
      const image=new ImageData(16,16);for(let y=3;y<5;y++)for(let x=2;x<6;x++)image.data.set([x*20,y*30,100,255],(y*16+x)*4);p.layers[0].frameData.set(p.getFrameKey(),image);
      app.toolManager.clearSelection();app.toolManager.setSelection(2,3,4,2);app.toolManager.setTool('move');app.history.clear();app.persistence.ready=true;app.updateAll();
    });
    const mode=page.getByLabel('图层缩放方式',{exact:true}),width=page.getByLabel('图层缩放宽度',{exact:true});
    const state=()=>page.evaluate(()=>{const p=PE.app.project,d=p.getCurrentLayer().getFrameData(p.getFrameKey());return {width:d.width,height:d.height,placement:d.placement||null,rgba:[...d.data],selection:{...PE.app.toolManager.selection}};});
    async function setWidth(w){await width.fill(String(w));await width.press('Tab');}
    assert.equal(await mode.inputValue(),'pixel');assert.equal(await width.inputValue(),'4');const original=await state();
    await mode.selectOption('hd');assert.deepEqual(await state(),original,'mode switch alone must not rewrite image pixels');
    await setWidth(2);const smallHD=await state();assert.equal(smallHD.width,4);assert.equal(smallHD.height,2);assert.deepEqual(smallHD.placement,{x:2,y:3,w:2,h:1});
    await setWidth(4);assert.equal((await state()).width,4);assert.deepEqual((await state()).rgba,smallHD.rgba);
    await page.getByRole('button',{name:'缩小图片',exact:true}).click();assert.equal((await state()).width,4,'toolbar resize follows HD mode');
    await page.evaluate(()=>{PE.app.history.undo(PE.app.project);PE.app.updateAll();});
    await mode.selectOption('pixel');await setWidth(2);const smallPixel=await state();assert.equal(smallPixel.placement,null);assert.equal(smallPixel.width,16);assert.deepEqual(smallPixel.selection,{x:2,y:3,w:2,h:1});assert.notDeepEqual(smallPixel.rgba,original.rgba);
    await page.evaluate(()=>{PE.app.history.undo(PE.app.project);PE.app.updateAll();});assert.deepEqual((await state()).rgba,smallHD.rgba,'undo restores high resolution source');
    await page.getByRole('button',{name:'缩小图片',exact:true}).click();assert.equal((await state()).placement,null,'toolbar resize follows ordinary mode');
    await page.evaluate(()=>{PE.app.history.undo(PE.app.project);PE.app.updateAll();});await mode.selectOption('hd');
    async function dragTo(w,h){
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const box=await page.locator('#main-canvas').boundingBox();
      const points=await page.evaluate(({w,h})=>{const cm=PE.app.canvasManager,s=PE.app.toolManager.selection;return {x:cm.offsetX+(s.x+s.w)*cm.zoom,y:cm.offsetY+(s.y+s.h)*cm.zoom,tx:cm.offsetX+(s.x+w)*cm.zoom,ty:cm.offsetY+(s.y+h)*cm.zoom};},{w,h});
      await page.mouse.move(box.x+points.x,box.y+points.y);await page.mouse.down();await page.mouse.move(box.x+points.tx,box.y+points.ty,{steps:4});await page.mouse.up();
    }
    await dragTo(2,1);assert.equal((await state()).width,4);assert.equal((await state()).placement.w,2,'drag handle follows HD mode');
    await mode.selectOption('pixel');await dragTo(4,2);assert.equal((await state()).placement,null,'drag handle follows pixel mode');
    await page.evaluate(()=>{PE.app.history.undo(PE.app.project);PE.app.updateAll();});await mode.selectOption('hd');
    await page.screenshot({path:path.join(output,'mode-switch.png')});await page.setViewportSize({width:720,height:950});await width.scrollIntoViewIfNeeded();assert(await mode.isVisible());await page.screenshot({path:path.join(output,'mode-switch-narrow.png')});
    assert.deepEqual(errors,[]);console.log('PASS: isolated browser UI; both modes; custom width; toolbar buttons; real drag; exact HD roundtrip; pixel resampling; undo; mode-switch no-op; narrow layout; no page errors. User projects untouched.');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
