const {chromium}=require('playwright'),fs=require('node:fs'),{createHash}=require('node:crypto');
(async()=>{
 const id='draft-conflict-1794277219868-e36ffb28',url='http://127.0.0.1:8765', endpoint=url+'/api/project?id='+id;
 const r=await fetch(endpoint),raw=Buffer.from(await r.arrayBuffer());fs.writeFileSync(__dirname+'/project-before.json',raw);
 console.log('API',r.headers.get('etag'),createHash('sha256').update(raw).digest('hex'));
 const b=await chromium.launch({channel:'msedge',headless:true});
 try{const page=await b.newPage();
 await page.route('**/api/**',r=>r.request().method()==='GET'?r.continue():r.abort());
 await page.goto(url+'/?project='+id);await page.waitForFunction(()=>PE.app?.persistence?.ready);
 const data=await page.evaluate(async()=>{
 const p=PE.app.project, H=PE.HairAnimation, hs=p.layers.find(l=>l.visible&&l.hairAnimation&&!l.hairAnimation.part),es=p.layers.find(l=>l.visible&&l.hairAnimation?.part==='eyes');
 const sit=p.spriteSheets.findIndex(s=>s.name==='original16_sit'),idle=hs.sheetIndex,ia=p.spriteSheets[idle].actions.findIndex(a=>a.direction==='side');
 const targets=[hs,es].map(l=>p.layers.find(t=>t.hairAnimationId===l.hairAnimationId&&t.sheetIndex===sit)),head=(si,ai,fi)=>p.layers.find(l=>l.name==='head'&&PE.isLayerInAction(p,l,si,ai)&&l.getFrameData(p.getFrameKey(si,ai,fi)));
 const bounds=(im)=>{const r=im.placement||{x:0,y:0,w:im.width,h:im.height},xs=[],ys=[];for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3]){xs.push(x);ys.push(y);}return [r.x+Math.min(...xs)*r.w/im.width,r.y+Math.min(...ys)*r.h/im.height,r.x+(1+Math.max(...xs))*r.w/im.width,r.y+(1+Math.max(...ys))*r.h/im.height];};
 const trace=(im,shift=0)=>{if(!im)return null;const b=bounds(im);return {b,shift,placement:im.placement||null};};
 const detail={idle:[head(idle,ia,0),hs,es].map(l=>[l.name,trace(l.getFrameData(p.getFrameKey(idle,ia,0)))]),stored:[],planned:[],offsets:H.calibrate(p,hs),settings:[hs.hairAnimation,es.hairAnimation].map(g=>({offsets:Object.fromEntries(Object.entries(g.offsets).filter(([k])=>k.includes('_sit'))),enabled:g.enabled,preserved:g.preserved}))};
 const plans=[H.plan(p,hs),H.plan(p,es)],s=p.spriteSheets[sit],a=s.actions[0];
 for(const [fi]of a.frames.entries()){const k=p.getFrameKey(sit,0,fi);detail.stored.push([head(sit,0,fi),...targets].map(l=>trace(l.getFrameData(k))));detail.planned.push(plans.map((plan,i)=>trace(plan.edits.find(e=>e.layer===targets[i]&&e.key===k).image)));}
 const eyeSources=p.layers.filter(l=>l.hairAnimation?.part==='eyes'); const canvas=document.createElement('canvas');canvas.width=800;canvas.height=620;const ctx=canvas.getContext('2d');ctx.fillStyle='#eee8f3';ctx.fillRect(0,0,800,620);ctx.font='15px sans-serif';
 const col=[[0,0,'Current sync'],[1,-1,'Hair down 1 / eye up 1'],[1,-2,'Hair down 1 / eye up 2'],[1,-3,'Hair down 1 / eye up 3']];
 for(const [ci,[dh,de,label]]of col.entries()){
   ctx.fillStyle='#302b37';ctx.fillText(label,ci*200+6,20);
   for(const [row,eye] of eyeSources.entries()){ const fi=0,eyeLayer=p.layers.find(l=>l.sheetIndex===sit&&l.hairAnimationId===eye.hairAnimationId),ep=H.plan(p,eye);
     const k=p.getFrameKey(sit,0,fi),dx=ci*200+18,dy=32+row*193;ctx.fillStyle='#302b37';ctx.fillText(eye.name,dx,dy+178);
     ctx.fillStyle='#ddd1ef';ctx.fillRect(dx,dy,160,160);
     for(const l of PE.getRenderLayers(p,sit,0)){
       const index=[targets[0],eyeLayer].indexOf(l);if(index<0&&(!PE.isLayerVisible(p,l,sit)||l.isGroup))continue;
       const im=index<0?l.getFrameData(k):(index===1?ep:plans[0]).edits.find(e=>e.layer===l&&e.key===k)?.image||l.getFrameData(k);if(!im)continue;
       ctx.globalAlpha=l.opacity??1;PE.utils.drawImageData(ctx,im,dx,dy+(index===0?dh:index===1?de:0)*10,10);
     }
     ctx.globalAlpha=1;
   }
 }
 return {detail,png:canvas.toDataURL()};
 });
 fs.writeFileSync(__dirname+'/eye-types.png',Buffer.from(data.png.split(',')[1],'base64'));
 fs.writeFileSync(__dirname+'/geometry.json',JSON.stringify(data.detail,null,2));console.log(JSON.stringify({...data.detail,offsets:Object.fromEntries(Object.entries(data.detail.offsets).filter(([k])=>k.includes('_sit')))}));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});


