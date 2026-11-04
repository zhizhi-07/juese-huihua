// Strict per-frame margins, not a shared action envelope.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {bounds,pixels,model,contact,decode,url,sha}=require('./center-main-padding-20261104.cjs');
const {move}=require('../js/character-canvas.cjs');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),dir=path.resolve(process.argv[3]||path.join(root,'output','center-main-each-frame-20261104')),base='http://127.0.0.1:8765';
const marginX=Number(process.argv[4]??5);assert([3,4,5].includes(marginX),'expected the requested 3px, 4px or previous 5px margin');
function verify(before,after,plans,{fixedCanvas=false}={}){
  const strip=(o,keys)=>Object.fromEntries(Object.entries(o).filter(([k])=>!keys.includes(k)));
  assert.deepEqual(strip(after,['spriteSheets','layers']),strip(before,['spriteSheets','layers']));
  assert.equal(after.layers.length,before.layers.length);PE.HairAnimation.validate(after);
  const margins=[];let cels=0,generated=0;
  for(const [si,s]of before.spriteSheets.entries()){
    const next=after.spriteSheets[si];assert.deepEqual(strip(next,['frameWidth','frameHeight','columns','rows','spacingX','spacingY','offsetX','offsetY','imageDataURL','canvasLayout','actions']),strip(s,['frameWidth','frameHeight','columns','rows','spacingX','spacingY','offsetX','offsetY','imageDataURL','canvasLayout','actions']));
    for(const [ai,a]of s.actions.entries()){
      assert.deepEqual(strip(next.actions[ai],['frames']),strip(a,['frames']));assert.equal(next.actions[ai].frames.length,a.frames.length);
      for(const [fi,f]of a.frames.entries()){
        const t=plans[si][ai][fi],n=next.actions[ai].frames[fi],b=bounds(after,si,ai,fi),margin=[b[0],b[1],n.width-b[2],n.height-b[3]];
        if(fixedCanvas){assert.equal(n.width,next.frameWidth);assert.equal(n.height,next.frameHeight);assert(margin.every((v,i)=>v>=(i%2?2:marginX)),`${si}/${ai}/${fi} insufficient margin`);}
        else assert.deepEqual(margin,[marginX,2,marginX,2],`${si}/${ai}/${fi} margins`);
        margins.push({sheet:s.name,direction:a.direction,frame:fi+1,width:n.width,height:n.height,left:margin[0],right:margin[2],top:margin[1],bottom:margin[3]});
        assert.deepEqual(strip(n,['width','height','sourceX','sourceY','lockedRegions']),strip(f,['width','height','sourceX','sourceY','lockedRegions']));
        assert.deepEqual(n.lockedRegions,(f.lockedRegions||[]).map(r=>({...r,x:r.x+t.dx,y:r.y+t.dy})));
      }
    }
  }
  for(const [li,l]of before.layers.entries()){
    const n=after.layers[li];assert.deepEqual(strip(n,['frameData','hairAnimation']),strip(l,['frameData','hairAnimation']));assert.deepEqual(Object.keys(n.frameData||{}),Object.keys(l.frameData||{}));
    if(l.hairAnimation)assert.deepEqual(strip(n.hairAnimation,['offsets']),strip(l.hairAnimation,['offsets']));
    for(const [key,c]of Object.entries(l.frameData||{})){
      const [si,ai,fi]=key.split('_').map(Number),t=plans[si][ai][fi],ncel=n.frameData[key];
      assert.deepEqual(pixels(ncel),pixels(c,t.dx,t.dy),`changed pixels: ${li}/${key}`);
      const restored=move(ncel,c.width,c.height,-t.dx,-t.dy,{preserveOffCanvas:true});assert.deepEqual(pixels(restored),pixels(c),'inverse translation on extra copy failed');
      if(c.placement){assert.equal(ncel.dataURL,c.dataURL);assert.deepEqual(ncel.placement,{...c.placement,x:c.placement.x+t.dx,y:c.placement.y+t.dy});}
      else assert(!ncel.placement,'native editable pixels unexpectedly became a placed image');
      cels++;
    }
  }
  const a=model(before),b=model(after);
  for(const source of a.layers.filter(l=>l.hairAnimation)){
    const oldPlan=PE.HairAnimation.plan(a,source),newPlan=PE.HairAnimation.plan(b,b.layers[a.layers.indexOf(source)]);assert.equal(newPlan.edits.length,oldPlan.edits.length);
    for(const [i,e]of oldPlan.edits.entries()){
      const n=newPlan.edits[i],[si,ai,fi]=e.key.split('_').map(Number),t=plans[si][ai][fi],cel=im=>({width:im.width,height:im.height,dataURL:url(im),...(im.placement?{placement:im.placement}:{})});
      assert.equal(n.key,e.key);assert.deepEqual(pixels(cel(n.image)),pixels(cel(e.image),t.dx,t.dy),'hair generation alignment changed');generated++;
    }
  }
  assert.equal(margins.length,66);
  return {frames:margins.length,cels,generatedHairFrames:generated,...(fixedCanvas?{fixedCanvas:true,minimumFrameMargins:[marginX,2,marginX,2]}:{allFrameMargins:[marginX,2,marginX,2]}),paintedPixelsAndTimingUnchanged:true,inverseRestorationPixelsVerified:true,margins};
}
async function run(){
  fs.mkdirSync(dir,{recursive:true});const requests=[];
  async function request(route,options={}){const r=await fetch(base+route,options);requests.push({method:options.method||'GET',route,status:r.status,etag:r.headers.get('etag')});return r;}
  if(process.argv[2]==='save'){
    const report=JSON.parse(fs.readFileSync(path.join(dir,'report.json'))),before=JSON.parse(fs.readFileSync(path.join(dir,'main-before.json'))),candidate=JSON.parse(fs.readFileSync(path.join(dir,'candidate.json')));
    assert.equal(sha(fs.readFileSync(path.join(dir,'main-before.json'))),report.sourceSHA256);assert.equal(sha(JSON.stringify(candidate)),report.candidateSHA256);verify(before,candidate,report.plans);
    const r=await request('/api/project?id=main',{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':report.sourceETag},body:JSON.stringify(candidate)}),response=await r.text();fs.writeFileSync(path.join(dir,'save-response.json'),response);assert.equal(r.status,200,'stop on conflict; do not retry: '+response);
    const read=await request('/api/project?id=main');assert.equal(read.status,200);const raw=Buffer.from(await read.arrayBuffer()),saved=JSON.parse(raw);fs.writeFileSync(path.join(dir,'main-readback.json'),raw);assert.deepEqual(saved,candidate);
    const check=verify(before,saved,report.plans);await contact(saved,path.join(dir,'after-readback.png'));
    fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify({...check,readbackETag:read.headers.get('etag'),readbackSHA256:sha(raw),requests},null,2));
    console.log(JSON.stringify({saved:true,dir,...stripCheck(check)}));return;
  }
  assert.equal(process.argv[2],'prepare');const list=await request('/api/projects');assert.equal(list.status,200);fs.writeFileSync(path.join(dir,'projects.json'),await list.text());
  const r=await request('/api/project?id=main');assert.equal(r.status,200);const raw=Buffer.from(await r.arrayBuffer());fs.writeFileSync(path.join(dir,'main-before.json'),raw);
  const before=JSON.parse(raw),p=structuredClone(before),plans=[];assert.deepEqual(p.spriteSheets.map(s=>s.name),['original16_walk','original16_idle','original16_pickup','original16_sit']);
  for(const [si,s]of p.spriteSheets.entries()){
    plans[si]=s.actions.map((a,ai)=>a.frames.map((f,fi)=>{const b=bounds(before,si,ai,fi);return {beforeBounds:b,dx:marginX-b[0],dy:2-b[1],width:b[2]-b[0]+marginX*2,height:b[3]-b[1]+4};}));
    const layouts=plans[si].map((frames,ai)=>{
      const old=s.canvasLayout?.actions[ai],origins=frames.map((t,fi)=>({x:(old?.frames?.[fi]?.x??old?.x??0)+t.dx,y:(old?.frames?.[fi]?.y??old?.y??0)+t.dy,width:t.width,height:t.height}));
      return {name:s.actions[ai].name,direction:s.actions[ai].direction,x:origins[0].x,y:origins[0].y,width:Math.max(...frames.map(t=>t.width)),height:Math.max(...frames.map(t=>t.height)),frames:origins};
    });
    const width=Math.max(...layouts.map(l=>l.width)),height=Math.max(...layouts.map(l=>l.height)),columns=Math.max(...s.actions.map(a=>a.frames.length)),atlas=createCanvas(width*columns,height*s.actions.length),ctx=atlas.getContext('2d'),source=await loadImage(s.imageDataURL);ctx.imageSmoothingEnabled=false;
    for(const [ai,a]of s.actions.entries())for(const [fi,f]of a.frames.entries()){
      const key=`${si}_${ai}_${fi}`,t=plans[si][ai][fi];
      for(const l of p.layers)if(l.frameData?.[key])l.frameData[key]=move(l.frameData[key],t.width,t.height,t.dx,t.dy,{preserveOffCanvas:true});
      const c=createCanvas(f.width,f.height);c.getContext('2d').drawImage(source,f.sourceX,f.sourceY,f.width,f.height,0,0,f.width,f.height);
      const shifted=move({width:f.width,height:f.height,dataURL:c.toDataURL('image/png')},t.width,t.height,t.dx,t.dy);ctx.drawImage(await loadImage(shifted.dataURL),fi*width,ai*height);
      Object.assign(f,{width:t.width,height:t.height,sourceX:fi*width,sourceY:ai*height,lockedRegions:(f.lockedRegions||[]).map(r=>({...r,x:r.x+t.dx,y:r.y+t.dy}))});
    }
    Object.assign(s,{frameWidth:width,frameHeight:height,columns,rows:s.actions.length,spacingX:0,spacingY:0,offsetX:0,offsetY:0,imageDataURL:atlas.toDataURL('image/png'),canvasLayout:{version:1,margin:2,marginX,marginY:2,actions:layouts}});
  }
  for(const l of p.layers.filter(l=>l.hairAnimation)){
    const g=l.hairAnimation,idle=p.spriteSheets[l.sheetIndex];
    for(const v of [g.params,...Object.values(g.overrides),...Object.values(g.directionOverrides||{})])for(const k of ['masks','protectedMasks','stitch','trajectories'])assert.equal(Object.keys(v[k]||{}).length,0,'source-local brushes require separate translation');
    for(const [key,o]of Object.entries(g.offsets)){
      const [name,direction,index]=key.split('/'),si=p.spriteSheets.findIndex(s=>s.name===name),ai=p.spriteSheets[si].actions.findIndex(a=>a.direction===direction),bi=idle.actions.findIndex(a=>a.direction===direction),t=plans[si][ai][Number(index)],basePlan=plans[l.sheetIndex][bi][0];
      o.x+=t.dx-basePlan.dx;o.y+=t.dy-basePlan.dy;
    }
  }
  const check=verify(before,p,plans);fs.writeFileSync(path.join(dir,'candidate.json'),JSON.stringify(p));await contact(before,path.join(dir,'before.png'));await contact(p,path.join(dir,'after-candidate.png'));
  fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify({sourceETag:r.headers.get('etag'),sourceSHA256:sha(raw),candidateSHA256:sha(JSON.stringify(p)),plans,check,requests},null,2));
  fs.writeFileSync(path.join(dir,'恢复说明.txt'),'main-before.json 是本次开始时 API 原始响应，SHA256 与原 ETag 见 report.json。\n本次逐帧整体平移并改变透明画布，不缩放和重画人物；每帧坐标变换见 plans，每帧原点保存在 canvasLayout.actions[].frames[]。逐帧居中会改变原先相对于画布边界的起伏位置。独立工程和浏览器草稿未操作。\n恢复：先 GET /api/project?id=main，确认没有后续修改，以读取到的 ETag 作为 If-Match，附 X-Pixel-Editor: 1、Content-Type: application/json，PUT 备份。409 必须停止，不盲目重传。恢复后回读，逐字段与备份比对。\n');
  const changedFrames=plans.flatMap((actions,si)=>actions.flatMap((frames,ai)=>frames.filter((t,fi)=>{const f=before.spriteSheets[si].actions[ai].frames[fi];return t.dx||t.dy||t.width!==f.width||t.height!==f.height;}))).length;
  console.log(JSON.stringify({prepared:true,dir,...stripCheck(check),changedFrames}));
}
function stripCheck(check){const {margins,...summary}=check;return summary;}
module.exports={verify};
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
