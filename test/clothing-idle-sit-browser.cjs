const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],name='\u670d\u88c5 / \u9ec4\u8272';
    page.on('pageerror',e=>errors.push(e.message));
    const data=fs.readFileSync(process.argv[2],'utf8');
    await page.route('**/api/project?*',r=>r.fulfill({status:200,contentType:'application/json',headers:{ETag:'"test"'},body:r.request().method()==='GET'?data:'{"saved":true}'}));
    await page.goto('http://127.0.0.1:8765/?project=yellow-test');
    await page.waitForFunction(()=>PE.app?.persistence?.ready);
    await page.evaluate(name=>{
      const app=PE.app,p=app.project;app.selectFrame(1,0,0);
      p.currentLayerIndex=p.layers.findIndex(l=>l.name===name&&l.sheetIndex===1);app.updateAll();
      window.before=p.getCurrentLayer().getFrameData('1_0_0').data.slice();
    },name);
    await page.locator('#clothing-sync-all').evaluate(el=>el.click());
    const shaded=()=>{const p=PE.app.project;return [...p.getCurrentLayer().getFrameData('1_0_0').data];};
    const first=await page.evaluate(shaded);
    const darker=await page.evaluate(first=>first.some((v,i)=>v<before[i]),first);
    if(process.argv.includes('--already-shaded')){
      assert.equal(darker,false);
      assert.equal(await page.evaluate(first=>first.every((v,i)=>v===before[i]),first),true);
    }else assert.equal(darker,true);
    await page.locator('#clothing-sync-all').evaluate(el=>el.click());
    assert.deepEqual(await page.evaluate(shaded),first);
    assert.equal(await page.evaluate(async name=>{
      const manager=PE.app.exportManager,blob=manager.exportProject(false);
      const {project}=await manager.importProject(blob);
      return Object.keys(project.layers.find(l=>l.name===name&&l.sheetIndex===1).clothingSync.idleShadows).length;
    },name),3);
    for(let ai=0;ai<3;ai++){
      await page.evaluate(ai=>PE.app.selectFrame(3,ai,0),ai);
      await page.getByRole('tab',{name:'\u8863\u670d',exact:true}).evaluate(el=>el.click());
      const row=page.locator('.visual-layer-card').filter({hasText:'\u9ec4\u8272'});
      assert.equal(await row.count(),1);
      await row.locator('.part-choose').first().evaluate(el=>el.click());
      const result=await page.evaluate(name=>{
        const app=PE.app,p=app.project,l=p.getCurrentLayer(),key=p.getFrameKey(),blank=!l.getFrameData(key);
        app.toolManager.drawPixel(p.currentLayerIndex,key,7,12,255,232,168,255);
        const drawn=l.getFrameData(key)?.data.some((v,i)=>i%4===3&&v);
        return [l.name===name,blank,!!drawn,p.layers[p.layers.indexOf(l)].sheetIndex];
      },name);
      assert.deepEqual(result,[true,true,true,3]);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS editor: sync button shades idle first frame once; each sitting direction shows exactly one empty Yellow layer and accepts paint; no page errors. API writes intercepted.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
