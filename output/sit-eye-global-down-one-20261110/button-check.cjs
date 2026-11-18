const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.stack || e.message));
  await page.route('**/api/project?*',r=>r.request().method()==='GET'?r.continue():r.abort());
  await page.goto('http://localhost:8765/?project=character-ff47ea32-14f3-4489-aec3-3c1797b97955');
  await page.waitForFunction(()=>PE.app?.persistence?.ready&&PE.app.project.layers.filter(l=>l.hairAnimation?.part==='eyes').length===3);
  await page.evaluate(()=>{
   const app=PE.app,p=app.project;
   app.selectFrame(3,0,0);
   const l=p.layers.find(l=>l.sheetIndex===1&&l.hairAnimation?.part==='eyes'&&l.visible),g=l.hairAnimation;
   g.live=false;
   for(let i=0;i<4;i++)g.offsets['original16_sit/side/'+i].y=20;
   const target=p.layers.find(t=>t.sheetIndex===3&&t.hairAnimationId===g.id);
   for(let i=0;i<4;i++)target.getFrameData('3_0_'+i).placement.y=12;
   p.currentLayerIndex=p.layers.indexOf(target);app.updateAll();
   window.clickSyncCount=0;const H=PE.HairAnimation,sync=H.sync;H.sync=(...args)=>{const result=sync(...args);window.clickSyncCount++;return result;};
  });
  for(let attempt=0;attempt<2;attempt++){
   await page.locator('#hair-sync-all').evaluate(el=>el.click());
   const result=await page.evaluate(()=>{
    const p=PE.app.project,l=PE.HairAnimation.master(p),g=l.hairAnimation;
    const target=p.layers.find(t=>t.sheetIndex===3&&t.hairAnimationId===g.id);
    const ai=p.spriteSheets[l.sheetIndex].actions.findIndex(a=>a.direction==='side');
    const y=l.getFrameData(p.getFrameKey(l.sheetIndex,ai,0)).placement.y;
    return {actual:[0,1,2,3].map(i=>target.getFrameData('3_0_'+i).placement.y-y),clicks:window.clickSyncCount};
   });
   assert.deepEqual(result.actual,[-1,-1,0,0]);assert.equal(result.clicks,attempt+1);console.log('click',attempt+1,result);
  }
  console.log("Browser errors:",errors);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
