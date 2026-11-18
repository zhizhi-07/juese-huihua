const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage(),errors=[],name='\u670d\u88c5 / \u9ec4\u8272',data=fs.readFileSync(process.argv[2],'utf8');
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/project?*',r=>r.fulfill({status:200,contentType:'application/json',headers:{ETag:'"test"'},body:r.request().method()==='GET'?data:'{"saved":true}'}));
    await page.goto('http://127.0.0.1:8765/?project=yellow-sit-button-test');
    await page.waitForFunction(()=>PE.app?.persistence?.ready);
    await page.evaluate(name=>{
      const app=PE.app,p=app.project;
      app.selectFrame(1,0,0);
      p.currentLayerIndex=p.layers.findIndex(l=>l.sheetIndex===1&&l.name===name);app.updateAll();
      window.layer=ai=>p.layers.find(l=>l.sheetIndex===3&&l.name===name&&PE.isLayerInAction(p,l,3,ai));
      window.frames=Array.from({length:3},(_,ai)=>Array.from({length:4},(_,fi)=>layer(ai).getFrameData('3_'+ai+'_'+fi)));
      window.clickSync=()=>document.querySelector('#clothing-sync-all').click();
    },name);
    const unchanged=await page.evaluate(()=>{
      clickSync();
      return [0,1,2].every(ai=>[0,1,2,3].every(fi=>layer(ai).getFrameData('3_'+ai+'_'+fi)===frames[ai][fi]));
    });
    assert.equal(unchanged,true,'existing yellow cels should remain untouched');
    const result=await page.evaluate(()=>{
      const p=PE.app.project,C=PE.ClothingSync;
      for(const ai of [0,1])for(const fi of [2,3])layer(ai).frameData.delete('3_'+ai+'_'+fi);
      for(const fi of [0,1,2,3])layer(2).frameData.delete('3_2_'+fi);
      clickSync();
      const pixelMatch=[0,1].every(ai=>[2,3].every(fi=>{
        const key='3_'+ai+'_'+fi,frame=p.spriteSheets[3].actions[ai].frames[fi],expected=C.raster(frames[ai][fi],frame,2),actual=C.raster(layer(ai).getFrameData(key),frame,2);
        return actual.data.every((v,i)=>v===expected.data[i]);
      }));
      const rear=[0,1,2,3].every(fi=>layer(2).getFrameData('3_2_'+fi)?.data.some((v,i)=>i%4===3&&v));
      const firstKept=[0,1].every(ai=>layer(ai).getFrameData('3_'+ai+'_0')===frames[ai][0]);
      layer(0).frameData.delete('3_0_0');layer(0).frameData.delete('3_0_2');clickSync();
      const waitsForSide=!layer(0).getFrameData('3_0_2');
      return {pixelMatch,rear,firstKept,waitsForSide};
    });
    assert.deepEqual(result,{pixelMatch:true,rear:true,firstKept:true,waitsForSide:true});
    assert.deepEqual(errors,[]);
    console.log('PASS: served sync button preserves saved cels; rebuilds side and front frames pixel-for-pixel; builds back from two sources; skips when side is missing. API intercepted.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
