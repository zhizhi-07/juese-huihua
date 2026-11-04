const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const png=require('../scripts/png.cjs');
const dir=path.resolve(__dirname,'../备份/保存冲突修复-20261102/canvas-merge'),info=JSON.parse(fs.readFileSync(path.join(dir,'saved.json'))),originalId='character-56620e79-ce79-4fd9-b49c-081f7bc57d67',api=id=>'http://127.0.0.1:8765/api/project?id='+id;
(async()=>{
  const original=await fetch(api(originalId)).then(r=>r.text()),before=JSON.parse(fs.readFileSync(path.join(dir,'merged-project.json')));
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(info.url);await page.waitForFunction(()=>PE.app?.persistence?.ready&&document.querySelector('.studio-loading')?.hidden);
    const sample='data:image/png;base64,'+png.encode(2,1,new Uint8Array([13,17,19,10,200,10,40,255])).toString('base64');
    assert.deepEqual(await page.evaluate(async url=>{const e=PE.app.exportManager,im=await e._dataURLToImageData(url),unchanged=e._imageDataToDataURL(im)===url;im.data[4]=201;const edited=e._imageDataToDataURL(im),decoded=await e._dataURLToImageData(edited);return {unchanged,edited:edited!==url,paintedValue:decoded.data[4]}},sample),{unchanged:true,edited:true,paintedValue:201},'unchanged PNGs are lossless, but actual painting must invalidate the original PNG');
    assert.equal(await page.evaluate(()=>PE.app.persistence.projectId),info.id);
    assert.equal(await page.evaluate(()=>PE.app.persistence.conflict),false);
    assert(await page.evaluate(()=>PE.app.persistence.saveNow()),'new merged project can be saved normally');
    await page.reload();await page.waitForFunction(()=>PE.app?.persistence?.ready&&document.querySelector('.studio-loading')?.hidden);
    assert.equal(await page.evaluate(()=>PE.app.persistence.conflict),false);
    const read=await fetch(api(info.id)),raw=await read.text(),after=JSON.parse(raw);
    const pixels=url=>png.decode(Buffer.from(url.split(',')[1],'base64'));
    for(let si=0;si<before.spriteSheets.length;si++){
      const a=before.spriteSheets[si],b=after.spriteSheets[si];assert.deepEqual({...a,imageDataURL:undefined},{...b,imageDataURL:undefined},'canvas sizes, frame counts and timing survive actual browser save/reopen');assert.deepEqual(pixels(a.imageDataURL),pixels(b.imageDataURL),'PNG re-encoding preserves atlas pixels');
    }
    assert.equal(after.layers.length,before.layers.length);
    before.layers.forEach((a,i)=>{const b=after.layers[i];assert.equal(a.name,b.name);assert.deepEqual(Object.keys(a.frameData||{}),Object.keys(b.frameData||{}));for(const [key,c]of Object.entries(a.frameData||{})){const d=b.frameData[key];assert.deepEqual({...c,dataURL:undefined},{...d,dataURL:undefined});assert.deepEqual(pixels(c.dataURL),pixels(d.dataURL),'editable source pixels preserved after browser PNG re-encoding')}});
    assert.equal(await fetch(api(originalId)).then(r=>r.text()),original,'original project never overwritten');assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(dir,'browser-readback.json'),raw);fs.writeFileSync(path.join(dir,'browser-verification.json'),JSON.stringify({savedAndReopened:true,projectId:info.id,etag:read.headers.get('etag'),layers:after.layers.length,canvasLayoutsPreserved:true,layerPixelsPreserved:true,originalUntouched:true,pageErrors:errors},null,2));
    await page.screenshot({path:path.join(dir,'browser-saved.png')});console.log('PASS: actual 8765 merged project opens, saves and reopens without conflict; 214 layers and every canvas layout/pixel preserved; original project unchanged.');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
