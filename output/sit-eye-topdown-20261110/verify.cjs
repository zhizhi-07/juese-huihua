const assert=require('node:assert/strict'),{chromium}=require('playwright'),{loadImage,createCanvas}=require('@napi-rs/canvas'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
(async()=>{
 const id='draft-conflict-1794277219868-e36ffb28',base='http://127.0.0.1:8765',url=base+'/api/project?id='+id;
 const read=async()=>{const r=await fetch(url),bytes=Buffer.from(await r.arrayBuffer());assert(r.ok);return [r.headers.get('etag'),createHash('sha256').update(bytes).digest('hex')];};
 const before=await read(),b=await chromium.launch({channel:'msedge',headless:true});
 const sheet=createCanvas(4*192,2*216),ctx=sheet.getContext('2d');ctx.fillStyle='#f3eef7';ctx.fillRect(0,0,sheet.width,sheet.height);ctx.font='14px sans-serif';
 try{
 for(let row=0;row<2;row++){
  const page=await b.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',r=>r.request().method()==='GET'?r.continue():r.abort());
  if(row===0)await page.route('**/js/hair-animation.js?*',r=>r.fulfill({path:path.join(__dirname,'before/js/hair-animation.js')}));
  await page.goto(base+'/?project='+id);await page.waitForFunction(()=>PE.app?.persistence?.ready);
  const result=await page.evaluate(()=>{
   const app=PE.app,p=app.project,sit=p.spriteSheets.findIndex(s=>s.name==='original16_sit'),a=p.spriteSheets[sit].actions[0];
   app.selectFrame(sit,0,0);
   const sources=[p.layers.find(l=>l.name==='头发 / -卷 / 前发'&&l.hairAnimation),p.layers.find(l=>l.name==='高清 · 眼睛'&&l.hairAnimation)];
   const targets=sources.map(s=>p.layers.find(l=>l.sheetIndex===sit&&l.hairAnimationId===s.hairAnimationId)),eye=sources[1],eyeAI=p.spriteSheets[eye.sheetIndex].actions.findIndex(a=>a.direction==='side'),src=eye.getFrameData(p.getFrameKey(eye.sheetIndex,eyeAI,0));
   const top=(im)=>{const r=im.placement||{y:0,h:im.height};for(let i=3;i<im.data.length;i+=4)if(im.data[i])return r.y+Math.floor(i/4/im.width)*r.h/im.height;};
   for(const l of targets)l.visible=true; const stats=[], status=[],png=[]; const H=PE.HairAnimation,sync=H.sync,clicked=[]; H.sync=(...args)=>{const r=sync(...args);clicked.push(r.edits.length);return r;};
   for(let attempt=0;attempt<2;attempt++){
    for(const layer of targets){p.currentLayerIndex=p.layers.indexOf(layer);app.updateAll();document.querySelector('#hair-sync-all').click();status.push(document.querySelector('.hair-animation-status').textContent);}
    const frames=a.frames.map((f,fi)=>{
     const key=p.getFrameKey(sit,0,fi),[h,e]=targets.map(t=>t.getFrameData(key));
     if(attempt===1){
      const c=document.createElement('canvas');c.width=c.height=192;const ctx=c.getContext('2d');
      ctx.fillStyle='#ddd1ef';ctx.fillRect(0,0,192,192);
      for(const l of PE.getRenderLayers(p,sit,0)){if(l!==targets[1]&&!PE.isLayerVisible(p,l,sit)||l.isGroup)continue;const im=l.getFrameData(key);if(im){ctx.globalAlpha=l.opacity??1;PE.utils.drawImageData(ctx,im,0,0,12);}}
      png.push(c.toDataURL());
     }
     return {hairTop:top(h),eyeTop:top(e),eyeOffset:e.placement.y-src.placement.y,lossless:e.width===src.width&&e.height===src.height&&e.data.every((v,i)=>v===src.data[i])};
    });
    stats.push(frames);
   }
   return {source:[src.width,src.height],stats,status,clicked,png};
  });
  assert.deepEqual(result.stats[0],result.stats[1]);assert(result.stats[0].every(f=>f.lossless));
  assert.deepEqual(result.stats[0].map(f=>f.hairTop),[1,1,2,2]);
  assert.deepEqual(result.stats[0].map(f=>f.eyeOffset),row===0?[-1,-1,0,0]:[0,0,1,1]);
  console.log('button',result.status,result.clicked);assert.equal(result.clicked.length,4);assert(result.clicked.every(n=>n>0));assert.deepEqual(errors,[]);
  for(const [i,png] of result.png.entries()){ctx.fillStyle='#302836';ctx.fillText((row===0?'Before':'After')+' / '+(i+1),i*192+7,row*216+16);ctx.drawImage(await loadImage(png),i*192,row*216+24);}
  delete result.png;console.log(row===0?'before':'after',JSON.stringify(result));await page.close();
 }
 fs.writeFileSync(__dirname+'/verified-comparison.png',sheet.toBuffer('image/png'));
 assert.deepEqual(await read(),before);console.log('API unchanged',id,...before);
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

