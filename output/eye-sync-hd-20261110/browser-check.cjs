const {chromium}=require('playwright'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
(async()=>{
 const base='http://127.0.0.1:8765', status=await (await fetch(base+'/api/status')).json(), id=status.characterBaseProjectId;
 const url=base+'/api/project?id='+id, before=process.argv.includes('--before'), label=before?'before':'after';
 async function read(){const r=await fetch(url),bytes=Buffer.from(await r.arrayBuffer());assert(r.ok);return {bytes,etag:r.headers.get('etag'),sha256:createHash('sha256').update(bytes).digest('hex')};}
 const raw=await read();fs.writeFileSync(path.join(__dirname,'project-'+label+'.json'),raw.bytes);
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',r=>r.request().method()==='GET'?r.continue():r.abort());
  if(before)await page.route('**/js/hair-animation.js?*',r=>r.fulfill({path:path.join(__dirname,'before/js/hair-animation.js')}));
  await page.goto(base+'/?project='+id);
  await page.waitForFunction(()=>PE.app?.persistence?.ready&&PE.app.project.layers.some(l=>l.hairAnimation?.part==='eyes'&&l.visible));
  await page.evaluate(()=>{
    const app=PE.app,p=app.project,si=p.spriteSheets.findIndex(s=>s.name==='original16_sit');
    app.selectFrame(si,0,0);
    const l=p.layers.find(l=>l.hairAnimation?.part==='eyes'&&l.visible);
    const target=p.layers.find(t=>t.sheetIndex===si&&t.hairAnimationId===l.hairAnimationId);p.currentLayerIndex=p.layers.indexOf(target);app.updateAll();
  });
  for(let i=0;i<2;i++){
    await page.locator('#hair-sync-all').evaluate(el=>el.click());
    const result=await page.evaluate(()=>{
      const p=PE.app.project, l=PE.HairAnimation.master(p), g=l.hairAnimation,si=p.currentSheetIndex,a=p.getCurrentAction();
      const target=p.layers.find(t=>t.sheetIndex===si&&t.hairAnimationId===g.id);
      const ai=p.spriteSheets[l.sheetIndex].actions.findIndex(a=>a.direction==='side');
      const src=l.getFrameData(p.getFrameKey(l.sheetIndex,ai,0));
      const images=a.frames.map((_,fi)=>target.getFrameData(p.getFrameKey(si,0,fi)));
      return {source:[src.width,src.height], offsets:images.map(im=>im.placement.y-src.placement.y),
        lossless:images.every(im=>im.width===src.width&&im.height===src.height&&im.placement.w===src.placement.w&&im.placement.h===src.placement.h&&im.data.every((v,i)=>v===src.data[i]))};
    });
    assert.deepEqual(result.source,[22,8]);assert(result.lossless);assert.deepEqual(result.offsets,before?[0,0,1,1]:[1,1,2,2]);
    console.log('sync',i+1,result);
  }
  await page.evaluate(()=>{
    const app=PE.app,p=app.project,l=p.layers.find(l=>l.hairAnimation&&l.hairAnimation.part!=='eyes');
    p.currentLayerIndex=p.layers.indexOf(l);app.canvasManager.render();document.querySelector('#hair-sway').click();
  });
  await page.waitForFunction(()=>{const c=document.querySelector('.hair-sway-dialog [data-preview]');return c&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v);});
  const preview=await page.locator('.hair-sway-dialog [data-preview]').evaluate(c=>[c.width,c.height]);
  assert.deepEqual(preview,before?[16,16]:[32,32]);console.log('hair preview',preview);
  await page.locator('.hair-sway-dialog [data-preview]').screenshot({path:path.join(__dirname,'preview-'+label+'.png')});
  assert.deepEqual(errors,[]);
  const end=await read();assert.equal(end.etag,raw.etag);assert.equal(end.sha256,raw.sha256);
  console.log({id,etag:raw.etag,sha256:raw.sha256,serverProjectUnchanged:true});
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
