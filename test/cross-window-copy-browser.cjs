const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
async function main(){
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost');
    if(req.method!=='GET'||url.pathname.startsWith('/api/')){res.writeHead(404,{'Content-Type':'application/json'}).end('{}');return;}
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}/index.html`;
  let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});
    // 同一浏览器上下文 = 同一组标签页，共享 localStorage。
    const context=await browser.newContext({viewport:{width:1280,height:900}});
    const errors=[];
    const setup=async(project,layerName,{withPixels=true}={})=>{
      const page=await context.newPage();
      page.on('pageerror',e=>errors.push(project+': '+e.message));
      await page.goto(`${base}?project=${project}`);
      await page.waitForFunction(()=>document.querySelector('.studio-loading')?.hidden);
      await page.evaluate(({layerName,withPixels})=>{
        const app=PE.app,p=app.project,s=new PE.SpriteSheet('original32_test');s.frameWidth=s.frameHeight=32;
        s.actions=['down'].map(direction=>{const a=new PE.Action(direction,direction);a.frames=[new PE.Frame(0,0,0,32,32)];return a;});
        p.spriteSheets=[s];p.currentSheetIndex=p.currentActionIndex=p.currentFrameIndex=p.currentLayerIndex=0;
        const hair=new PE.Layer(layerName);hair.sheetIndex=0;p.layers=[hair];
        if(withPixels){const pixels=new ImageData(32,32);pixels.data.set([255,0,0,255],(8*32+16)*4);hair.frameData.set('0_0_0',pixels);}
        app.persistence.ready=true;app.history.clear();app.updateAll();
      },{layerName,withPixels});
      return page;
    };
    const pageA=await setup('cross-window-a','头发 / 跨窗口 / 后发');
    const pageB=await setup('cross-window-b','头发 / 跨窗口 / 后发',{withPixels:false});

    // 窗口 A 复制
    await pageA.locator('#copy-cel-btn').click();
    const shared=await pageB.evaluate(()=>PE.SharedClipboard.loadPayload());
    assert.ok(shared,'窗口 B 应能读到共享剪贴板');
    assert.equal(shared.source.layerName,'头发 / 跨窗口 / 后发');

    // 窗口 B 粘贴（Ctrl+V）
    await pageB.locator('#paste-cel-btn').click();
    const pixelB=await pageB.evaluate(()=>{
      const p=PE.app.project,l=p.layers.find(l=>l.name==='头发 / 跨窗口 / 后发');
      return l?.getFrameData('0_0_0')?.data[(8*32+16)*4]||0;
    });
    assert.equal(pixelB,255,'窗口 B 应粘贴到像素');
    assert.equal(await pageB.evaluate(()=>PE.app.project.layers.length),1,'目标已有同名图层，不应新建第二个');

    // 窗口 B 里的复制不会影响窗口 A 的工程
    assert.equal(await pageA.evaluate(()=>PE.app.project.layers.find(l=>l.name==='头发 / 跨窗口 / 后发').getFrameData('0_0_0').data[(8*32+16)*4]),255);

    // 撤销
    await pageB.keyboard.press('Control+z');
    assert.equal(await pageB.evaluate(()=>PE.app.project.layers.find(l=>l.name==='头发 / 跨窗口 / 后发').getFrameData('0_0_0')),null,'撤销应移除粘贴内容');

    // 目标工程没有同名图层时，应自动新建独立图层
    const pageC=await setup('cross-window-c','其它图层');
    await pageC.locator('#paste-cel-btn').click();
    assert.equal(await pageC.evaluate(()=>PE.app.project.layers.length),2,'应新建一个同名图层');
    assert.equal(await pageC.evaluate(()=>PE.app.project.layers[1].getFrameData('0_0_0').data[(8*32+16)*4]),255);
    await pageC.keyboard.press('Control+z');
    assert.equal(await pageC.evaluate(()=>PE.app.project.layers.length),1,'撤销应移除新建图层');

    // 窗口 B 复制后，窗口 A 也能粘贴（反向）
    await pageB.locator('#copy-cel-btn').click();
    await pageA.locator('#paste-cel-btn').click();
    assert.equal(await pageA.evaluate(()=>PE.app.project.layers.length),1);

    assert.deepEqual(errors,[]);
    await fs.mkdir(path.join(root,'test/output/cross-window-copy'),{recursive:true});
    await pageB.screenshot({path:path.join(root,'test/output/cross-window-copy/window-b-after-paste.png')});
    console.log('PASS: 两个窗口共享剪贴板；A 复制 → B 粘贴像素正确；同名图层复用；无同名图层时新建并可撤销；反向复制同样可用；无页面错误。');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
