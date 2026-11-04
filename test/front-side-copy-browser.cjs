const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..'),out=path.join(root,'test/output/front-side-copy-20261103');
async function main(){
  const snapshot=await fs.readFile(path.join(out,'project-snapshot.json'));
  let writes=0;
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost');
    if(req.method!=='GET'){writes++;res.writeHead(405).end();return;}
    if(url.pathname==='/api/project'){res.writeHead(200,{'Content-Type':'application/json',ETag:'"test-snapshot"'}).end(snapshot);return;}
    if(url.pathname.startsWith('/api/')){res.writeHead(404,{'Content-Type':'application/json'}).end('{}');return;}
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?project=front-side-copy-test`);
    await page.waitForFunction(()=>document.querySelector('.studio-loading')?.hidden&&PE.app.persistence.ready);
    await page.evaluate(()=>{
      const app=PE.app,p=app.project,si=p.spriteSheets.findIndex(s=>s.name==='original32_idle'),ai=p.spriteSheets[si].actions.findIndex(a=>a.direction==='down');
      app.animationPlayer.pause();p.selectFrame(si,ai,0);p.currentLayerIndex=p.layers.findIndex(l=>l.sheetIndex===si&&l.name==='后发');app.toolManager.clearSelection();app.updateAll();
    });
    await page.locator('#copy-cel-btn').click();
    assert.match(await page.locator('.frame-edit-status').textContent(),/已复制.*后发/);
    await page.getByRole('button',{name:'侧面',exact:true}).click();
    await page.locator('#paste-cel-btn').click();
    assert.match(await page.locator('.frame-edit-status').textContent(),/已粘贴.*428/);
    const state=await page.evaluate(()=>{
      const p=PE.app.project,l=p.getCurrentLayer(),d=l.getFrameData(p.getFrameKey());
      return {width:d.width,height:d.height,name:l.name,count:d.data.reduce((n,v,i)=>n+(i%4===3&&v>0?1:0),0),direction:p.getCurrentAction().direction};
    });
    assert.deepEqual(state,{width:28,height:36,name:'后发',count:428,direction:'side'});
    await page.keyboard.press('Control+z');
    assert(await page.evaluate(()=>!PE.app.project.getCurrentLayer().getFrameData(PE.app.project.getFrameKey())));
    await page.keyboard.press('Control+y');
    await page.screenshot({path:path.join(out,'browser-verified.png')});
    assert.equal(writes,0);assert.deepEqual(errors,[]);
    console.log('PASS: actual project snapshot loaded in isolated browser; copy button -> side direction -> paste button; 428 pixels in 28x36 rear-hair layer; Ctrl+Z/Y; no page errors; no save requests.');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
