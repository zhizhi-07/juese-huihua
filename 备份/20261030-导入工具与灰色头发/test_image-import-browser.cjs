const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright'),{createCanvas}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..');
async function main(){
  const server=http.createServer(async(req,res)=>{
    if(req.method!=='GET'){res.writeHead(405).end();return;}
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/api/')){res.writeHead(404,{'Content-Type':'application/json'}).end('{}');return;}
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    try{const data=await fs.readFile(file);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.dismiss());
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?project=image-ui-test`);
    await page.waitForFunction(()=>window.PE?.app?.toolManager&&document.querySelector('.studio-loading')?.hidden);
    await page.evaluate(()=>{const a=PE.app;a.project.layers=[new PE.Layer('空白底图')];a.project.currentLayerIndex=0;a.persistence.ready=true;a.history.clear();a.updateAll();a.canvasManager.showGrid=false;a.canvasManager.centerView();});
    const source=createCanvas(24,16),ctx=source.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,12,16);ctx.fillStyle='#0000ff';ctx.fillRect(12,0,12,16);
    await page.getByRole('button',{name:'上传图片',exact:true}).click();
    await page.getByLabel('上传源图片').setInputFiles({name:'测试图片.png',mimeType:'image/png',buffer:source.toBuffer('image/png')});
    await page.getByRole('button',{name:'放到当前画布',exact:true}).waitFor({state:'visible'});
    assert.equal(await page.getByLabel('颜色数量').inputValue(),'0');assert.equal(await page.getByLabel('缩小方式').inputValue(),'smooth');
    const cropCanvas=page.getByLabel('原图裁选'),box=await cropCanvas.boundingBox();
    const cropPoint=(x,y)=>({x:box.x+x*box.width/24,y:box.y+y*box.height/16});
    async function cropDrag(x,y,dx,dy){const a=cropPoint(x,y),b=cropPoint(dx,dy);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});await page.mouse.up();}
    await cropDrag(2.1,2.1,18.1,14.1);assert.equal(await page.getByLabel('裁选宽度',{exact:true}).inputValue(),'16');
    await cropDrag(8.1,7.1,10.1,8.1);assert.equal(await page.getByLabel('裁选 X',{exact:true}).inputValue(),'4');assert.equal(await page.getByLabel('裁选 Y',{exact:true}).inputValue(),'3');
    await cropDrag(20,15,22.5,16);assert.equal(await page.getByLabel('裁选宽度',{exact:true}).inputValue(),'18');
    await page.getByRole('button',{name:'选整张图',exact:true}).click();await page.getByLabel('像素宽度',{exact:true}).fill('12');
    await page.getByRole('button',{name:'放到当前画布',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'移动 / 缩放',exact:true}).getAttribute('aria-pressed'),'true');
    const selection=()=>page.evaluate(()=>({...PE.app.toolManager.selection}));
    const original=await selection();assert.equal(original.w,12);assert.equal(original.h,8);
    async function screenPoint(x,y){return page.evaluate(({x,y})=>{const cm=PE.app.canvasManager,r=cm.canvas.getBoundingClientRect();return {x:r.left+(cm.offsetX+(x+.5)*cm.zoom)*r.width/cm.canvas.width,y:r.top+(cm.offsetY+(y+.5)*cm.zoom)*r.height/cm.canvas.height};},{x,y});}
    const start=await screenPoint(original.x+3,original.y+3),end=await screenPoint(original.x+6,original.y+5);
    await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:6});
    assert.equal((await selection()).x,original.x+3);assert(await page.evaluate(()=>PE.app.toolManager.isDrawing));
    await page.mouse.up();const moved=await selection();assert.equal(moved.y,original.y+2);
    await page.getByRole('button',{name:'缩小图片',exact:true}).click();assert((await selection()).w<moved.w);
    await page.getByRole('button',{name:'撤销',exact:true}).click();assert.deepEqual(await selection(),moved);
    const handle=await screenPoint(moved.x+moved.w,moved.y+moved.h),larger=await screenPoint(moved.x+moved.w+3,moved.y+moved.h+2);
    await page.mouse.move(handle.x-.5*await page.evaluate(()=>PE.app.canvasManager.zoom),handle.y-.5*await page.evaluate(()=>PE.app.canvasManager.zoom));await page.mouse.down();await page.mouse.move(larger.x,larger.y,{steps:6});await page.mouse.up();assert((await selection()).w>moved.w);
    await page.evaluate(()=>PE.app.toolManager.clearSelection());const click=await screenPoint(moved.x+2,moved.y+2);await page.mouse.click(click.x,click.y);assert((await selection()).w>0);
    await page.keyboard.press('ArrowLeft');assert.equal((await selection()).x,moved.x-1);
    await page.getByRole('button',{name:'上传图片',exact:true}).click();await page.screenshot({path:path.join(root,'test/image-import-preview.png')});
    await page.getByRole('button',{name:'关闭',exact:true}).last().click();await page.screenshot({path:path.join(root,'test/image-transform-preview.png')});
    await page.getByRole('button',{name:'上传图片',exact:true}).click();await page.getByRole('button',{name:'新建独立素材',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.pixel-import-dialog').open);
    assert.deepEqual(await selection(),{x:0,y:0,w:12,h:8});assert.equal(await page.evaluate(()=>PE.app.toolManager.currentTool),'move');
    assert.deepEqual(errors,[]);console.log('PASS: browser upload; crop/move/resize; original colors; visible move tool; drag; size buttons and handle; undo; reselect; keyboard nudge; no page errors.');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
