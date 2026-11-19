const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const base='http://127.0.0.1:8765',id='scene-noodle-shop-20261118',out=path.resolve(__dirname,'../outputs/scene-assembler-interaction');fs.mkdirSync(out,{recursive:true});
(async()=>{
  const source=await fetch(base+'/api/project?id='+id).then(r=>r.json());source.sceneAssembly={version:1,width:160,height:128,objects:[{id:'table',material:'桌子',variant:'桌子',x:10,y:10,flip:false}]};
  const browser=await chromium.launch({channel:'msedge',headless:true}),failures=[];
  async function check(name,fn){try{await fn();console.log('PASS '+name);}catch(e){failures.push(name+': '+e.message);console.log('FAIL '+name+': '+e.message);}}
  async function open(options={}){const context=await browser.newContext({viewport:{width:1440,height:1000},...options});const page=await context.newPage();let saved=structuredClone(source),puts=0;await page.route('**/api/project?*',r=>{if(r.request().method()==='PUT'){puts++;saved=r.request().postDataJSON();}return r.fulfill({status:200,contentType:'application/json',headers:{ETag:'"fixture"'},body:JSON.stringify(saved)});});page.on('dialog',d=>d.accept());await page.goto(base+'/scene-assembler.html?project='+id);await page.waitForFunction(()=>window.sceneAssembler?.ready);return{context,page,get puts(){return puts;},get saved(){return saved;}};}
  try{
    await check('手机滑动素材列表不选中或放置物件',async()=>{
      const {context,page}=await open({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
      try{const before=await page.evaluate(()=>document.querySelector('aside').scrollTop),rect=await page.locator('aside').boundingBox(),session=await context.newCDPSession(page),x=rect.x+rect.width/2,y=rect.y+Math.min(rect.height-35,420);
        await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=12;i++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*18}]});await page.waitForTimeout(20);}await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(200);
        assert((await page.evaluate(()=>document.querySelector('aside').scrollTop))>before+40,'素材列表必须能原生滚动');assert.equal(await page.locator('.material.active').count(),0);assert.equal(await page.evaluate(()=>sceneAssembler.scene.objects.length),1);
        await page.getByRole('button',{name:'放置桌子',exact:true}).tap();assert.equal(await page.locator('.material.active').count(),1);const c=await page.locator('#scene').boundingBox();await page.touchscreen.tap(c.x+c.width/2,c.y+c.height/2);assert.equal(await page.evaluate(()=>sceneAssembler.scene.objects.length),2);
        await page.screenshot({path:path.join(out,'mobile.png')});
      }finally{await context.close();}
    });
    await check('未保存的修改刷新丢弃，手动保存后刷新保留，忽略旧自动草稿',async()=>{
      const session=await open(),{context,page}=session;
      try{const before=await page.evaluate(()=>sceneAssembler.scene);await page.getByRole('button',{name:'放置桌子',exact:true}).focus();await page.keyboard.press('Enter');const c=await page.locator('#scene').boundingBox();await page.mouse.click(c.x+c.width/2,c.y+c.height/2);assert.equal(await page.evaluate(()=>sceneAssembler.scene.objects.length),2);assert.equal(session.puts,0);
        await page.reload();await page.waitForFunction(()=>window.sceneAssembler?.ready);assert.deepEqual(await page.evaluate(()=>sceneAssembler.scene),before,'刷新应回到上次手动保存状态');
        await page.getByRole('button',{name:'放置桌子',exact:true}).focus();await page.keyboard.press('Enter');await page.mouse.click(c.x+c.width/2,c.y+c.height/2);await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('已保存并回读核对'));assert.equal(session.puts,1);
        const manual=await page.evaluate(()=>sceneAssembler.scene);await page.evaluate(async id=>{const r=indexedDB.open('pixel-workbench',1);await new Promise(resolve=>{r.onsuccess=()=>{const t=r.result.transaction('projects','readwrite'),s=t.objectStore('projects');s.put(new Blob([JSON.stringify({sceneAssembly:{version:1,width:32,height:32,objects:[]}})]),'assembly-'+id);s.put({pending:true,revision:'"old"'},'assembly-'+id+'-meta');t.oncomplete=resolve;};});},id);
        await page.reload();await page.waitForFunction(()=>window.sceneAssembler?.ready);assert.deepEqual(await page.evaluate(()=>sceneAssembler.scene),manual);assert.equal(await page.evaluate(()=>sceneAssembler.dirty),false);
      }finally{await context.close();}
    });
    for(const dpr of [1,1.25,3])await check('硬像素及缩放，DPR='+dpr,async()=>{
      const {context,page}=await open({deviceScaleFactor:dpr});try{
        for(const button of [null,'#in','#in','#out','#fit']){
          if(button)await page.locator(button).click();await page.waitForTimeout(40);
          const result=await page.evaluate(()=>{const c=document.querySelector('#scene'),r=c.getBoundingClientRect(),zoom=sceneAssembler.view?.zoom||Number(document.querySelector('#zoom').textContent.replace('%',''))/100;return {width:c.width,expected:Math.round(r.width*devicePixelRatio),physicalZoom:zoom*devicePixelRatio};});
          assert.equal(result.width,result.expected,'画布必须按屏幕像素密度渲染');assert(Math.abs(result.physicalZoom-Math.round(result.physicalZoom))<1e-8,'每个素材像素必须对应整数个屏幕像素');
        }
        const blocks=await page.evaluate(()=>{const c=document.querySelector('#scene'),ctx=c.getContext('2d'),v=sceneAssembler.view,step=Math.round(v.zoom*devicePixelRatio),x0=Math.round(v.offset.x*devicePixelRatio)+10*step,y0=Math.round(v.offset.y*devicePixelRatio)+10*step;let mismatches=0;for(let y=1;y<17;y++)for(let x=1;x<16;x++){const data=ctx.getImageData(x0+x*step,y0+y*step,step,step).data;for(let i=4;i<data.length;i+=4)if(data[i]!==data[0]||data[i+1]!==data[1]||data[i+2]!==data[2]||data[i+3]!==data[3]){mismatches++;break;}}return mismatches;});assert.equal(blocks,0,'同一个源像素的屏幕像素块颜色必须一致');
        await page.screenshot({path:path.join(out,'pixel-dpr-'+dpr+'.png')});
        const session=await context.newCDPSession(page);await session.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1.5,mobile:false});await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>sceneAssembler.view.zoom*devicePixelRatio),Math.round(await page.evaluate(()=>sceneAssembler.view.zoom*devicePixelRatio)),'切换屏幕密度后仍应对齐屏幕像素');
      }finally{await context.close();}
    });
  }finally{await browser.close();}
  assert.deepEqual(failures,[]);
})().catch(e=>{console.error(e);process.exitCode=1;});
