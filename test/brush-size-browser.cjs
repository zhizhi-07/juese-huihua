const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),output=path.join(root,'test/output/brush-size-20261102');
(async()=>{
  await fs.mkdir(output,{recursive:true});
  let writes=0;
  const server=http.createServer(async(req,res)=>{
    if(req.method!=='GET'){writes++;res.writeHead(405).end();return;}
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
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?project=brush-size-isolated-test`);
    await page.waitForFunction(()=>PE.app?.toolManager&&document.querySelector('.studio-loading')?.hidden);
    if(process.argv.includes('--before')){
      const state=await page.evaluate(()=>({sliderMax:document.querySelector('#brush-size').max,inPalette:!!document.querySelector('#palette-container').closest('section').querySelector('#brush-size'),numeric:!!document.querySelector('#brush-size-number')}));
      assert.deepEqual(state,{sliderMax:'16',inPalette:true,numeric:false});
      await page.evaluate(()=>{PE.app.toolManager.setBrushSize(64);});
      assert.equal(await page.evaluate(()=>PE.app.toolManager.brushSize),32);
      await page.screenshot({path:path.join(output,'before.png')});
      console.log('BEFORE: '+JSON.stringify(state)+'; ToolManager caps requested 64px at 32px.');return;
    }
    const slider=page.getByLabel('画笔 / 橡皮大小滑条',{exact:true}),number=page.getByLabel('画笔 / 橡皮大小',{exact:true});
    assert(await slider.isVisible());assert(await number.isVisible());
    assert.equal(await slider.getAttribute('max'),'128');
    assert(await slider.evaluate(e=>!!e.closest('.canvas-viewbar')),'Size stays above canvas, outside dockable/collapsible palette');
    async function size(n){await number.fill(String(n));await number.press('Tab');assert.equal(await slider.inputValue(),String(n));assert.equal(await page.evaluate(()=>PE.app.toolManager.brushSize),n);}
    await size(40);await page.locator('#tool-eraser').click();await page.keyboard.press(']');assert.equal(await number.inputValue(),'41');assert.equal(await slider.inputValue(),'41');await page.keyboard.press('[');assert.equal(await number.inputValue(),'40');
    await number.fill('999');await number.press('Tab');assert.equal(await number.inputValue(),'128');await page.locator('#tool-pencil').click();await page.keyboard.press(']');assert.equal(await number.inputValue(),'128');
    await number.fill('0');await number.press('Tab');assert.equal(await number.inputValue(),'1');await number.fill('');await number.press('Tab');assert.equal(await number.inputValue(),'1');
    await page.evaluate(()=>{const t=PE.app.toolManager;for(const n of [NaN,Infinity,-Infinity]){t.setBrushSize(n);if(!Number.isFinite(t.brushSize))throw Error('Invalid size');}PE.app.setBrushSize(1);});
    const box=await slider.boundingBox();await page.mouse.click(box.x+box.width*.55,box.y+box.height/2);assert(Number(await number.inputValue())>32,'Dragging slider reaches HD brush sizes');
    const fixture=async hd=>page.evaluate(hd=>{
      const app=PE.app,p=app.project,s=new PE.SpriteSheet('大小测试'),a=new PE.Action('idle');
      s.frameWidth=s.frameHeight=64;s.imageData=new ImageData(64,64);s.actions=[a];a.frames=[new PE.Frame(0,0,0,64,64)];p.spriteSheets=[s];p.layers=[new PE.Layer('只读参考'),new PE.Layer(hd?'高清测试':'普通测试')];p.layers[0].locked=true;p.currentSheetIndex=p.currentActionIndex=p.currentFrameIndex=0;p.currentLayerIndex=1;
      const reference=new ImageData(64,64);reference.data.fill(33);p.layers[0].frameData.set('0_0_0',reference);
      const image=new ImageData(hd?192:64,hd?192:64);if(hd)image.placement={x:8,y:8,w:48,h:48};p.layers[1].frameData.set('0_0_0',image);
      app.toolManager.clearSelection();app.history.clear();app.persistence.ready=true;app.persistence.dirty=false;app.updateAll();
      const c=app.canvasManager;c.zoom=6;c.offsetX=Math.round((c.canvas.width-64*6)/2);c.offsetY=Math.round((c.canvas.height-64*6)/2);c.render();
    },hd);
    const state=()=>page.evaluate(()=>{const p=PE.app.project,d=p.layers[1].getFrameData('0_0_0');return {count:d.data.filter((v,i)=>i%4===3&&v>0).length,width:d.width,placement:d.placement||null,reference:p.layers[0].getFrameData('0_0_0').data.every(v=>v===33)};});
    async function dot(x,y){const q=await page.evaluate(({x,y})=>{const app=PE.app,c=app.canvasManager,d=app.project.getCurrentLayer().getFrameData('0_0_0'),r=d.placement||{x:0,y:0,w:d.width,h:d.height},b=c.canvas.getBoundingClientRect();return {x:b.x+(c.offsetX+(r.x+(x+.25)*r.w/d.width)*c.zoom)*b.width/c.canvas.width,y:b.y+(c.offsetY+(r.y+(y+.25)*r.h/d.height)*c.zoom)*b.height/c.canvas.height};},{x,y});await page.mouse.click(q.x,q.y);}
    for(const hd of [false,true]){
      await fixture(hd);await page.locator('#tool-pencil').click();await size(hd?40:9);await dot(hd?96:32,hd?96:32);
      const painted=await state();assert.equal(painted.count,hd?1600:81);assert(painted.reference);assert.deepEqual(painted.placement,hd?{x:8,y:8,w:48,h:48}:null);
      await page.locator('#tool-eraser').click();await size(3);await dot(hd?96:32,hd?96:32);assert.equal((await state()).count,painted.count-9,'Eraser footprint follows size in native pixels');
      await page.getByRole('button',{name:'撤销',exact:true}).click();assert.deepEqual(await state(),painted);await page.getByRole('button',{name:'重做',exact:true}).click();assert.equal((await state()).count,painted.count-9);
      await page.locator('#tool-pencil').click();await size(4);await dot(0,0);assert.equal((await state()).count,painted.count-9+4,'Even brush clips safely at canvas edge');assert((await state()).reference);
      const beforeLocked=await state();await page.evaluate(()=>PE.app.project.getCurrentLayer().locked=true);await dot(20,20);assert.deepEqual(await state(),beforeLocked,'Locked layers remain unchanged');
      console.log('PASS '+(hd?'HD source':'ordinary canvas')+': exact brush/eraser area, boundaries, reference protection, undo/redo.');
    }
    await page.screenshot({path:path.join(output,'after-hd.png')});
    for(const width of [1100,800,620]){await page.setViewportSize({width,height:900});assert(await number.isVisible());assert(await number.evaluate(e=>{const b=e.getBoundingClientRect(),p=e.closest('#center-viewport').getBoundingClientRect();return b.left>=p.left&&b.right<=p.right&&b.top>=p.top&&b.bottom<=p.bottom;}),'Control remains inside canvas panel at '+width);}
    await page.screenshot({path:path.join(output,'after-narrow.png')});
    assert.deepEqual(errors,[]);assert.equal(writes,0,'No project writes');
    console.log('PASS: visible slider + numeric input; range 1–128; bracket sync and clamping; narrow layouts; zero page errors; no project writes.');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
