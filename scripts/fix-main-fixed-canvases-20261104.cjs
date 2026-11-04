// Undo only the recorded per-frame translations, retaining the latest saved artwork.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {bounds,contact,sha}=require('./center-main-padding-20261104.cjs'),{verify}=require('./center-main-each-frame-20261104.cjs'),{move}=require('../js/character-canvas.cjs');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),dir=path.resolve(process.argv[3]),base='http://127.0.0.1:8765';assert.equal(process.argv[4],'3');
function check(before,p,plans){
  const result=verify(before,p,plans,{fixedCanvas:true});
  for(const [si,s]of p.spriteSheets.entries())for(const [ai,a]of s.actions.entries()){
    const layout=s.canvasLayout.actions[ai],b=bounds(p,si,ai),m=[b[0],b[1],s.frameWidth-b[2],s.frameHeight-b[3]];
    assert(Math.abs(m[0]-m[2])<=1&&Math.abs(m[1]-m[3])<=1,'whole action not centered');assert(!layout.frames,'per-frame origins must be removed');
    for(const [fi,f]of a.frames.entries()){
      const old=before.spriteSheets[si].canvasLayout.actions[ai].frames?.[fi]||before.spriteSheets[si].canvasLayout.actions[ai],t=plans[si][ai][fi];
      assert.equal(old.x+t.dx,layout.x);assert.equal(old.y+t.dy,layout.y);
      assert.deepEqual([f.width,f.height],[s.frameWidth,s.frameHeight]);
    }
  }
  return {...result,perActionFixedOriginsVerified:true,sizes:p.spriteSheets.map(s=>({name:s.name,width:s.frameWidth,height:s.frameHeight}))};
}
async function run(){
  fs.mkdirSync(dir,{recursive:true});const requests=[];async function req(route,options={}){const r=await fetch(base+route,options);requests.push({method:options.method||'GET',route,status:r.status,etag:r.headers.get('etag')});return r;}
  if(process.argv[2]==='save'){
    const report=JSON.parse(fs.readFileSync(path.join(dir,'report.json'))),before=JSON.parse(fs.readFileSync(path.join(dir,'main-before.json'))),candidate=JSON.parse(fs.readFileSync(path.join(dir,'candidate.json')));
    assert.equal(sha(fs.readFileSync(path.join(dir,'main-before.json'))),report.sourceSHA256);assert.equal(sha(JSON.stringify(candidate)),report.candidateSHA256);check(before,candidate,report.plans);
    const r=await req('/api/project?id=main',{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':report.sourceETag},body:JSON.stringify(candidate)}),response=await r.text();fs.writeFileSync(path.join(dir,'save-response.json'),response);assert.equal(r.status,200,'stop, never retry an old candidate using a new ETag: '+response);
    const read=await req('/api/project?id=main');assert.equal(read.status,200);const raw=Buffer.from(await read.arrayBuffer()),p=JSON.parse(raw);fs.writeFileSync(path.join(dir,'main-readback.json'),raw);assert.deepEqual(p,candidate);
    const result=check(before,p,report.plans);await contact(p,path.join(dir,'after-readback.png'));fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify({...result,readbackSHA256:sha(raw),readbackETag:read.headers.get('etag'),requests},null,2));
    const {margins,...summary}=result;console.log(JSON.stringify({saved:true,dir,...summary}));return;
  }
  assert.equal(process.argv[2],'prepare');const list=await req('/api/projects');assert.equal(list.status,200);fs.writeFileSync(path.join(dir,'projects.json'),await list.text());
  const r=await req('/api/project?id=main');assert.equal(r.status,200);const raw=Buffer.from(await r.arrayBuffer());fs.writeFileSync(path.join(dir,'main-before.json'),raw);
  const before=JSON.parse(raw),p=structuredClone(before),plans=[];assert.deepEqual(p.spriteSheets.map(s=>s.name),['original16_walk','original16_idle','original16_pickup','original16_sit']);
  for(const [si,s]of p.spriteSheets.entries()){
    const normalized=s.actions.map((a,ai)=>{
      const old=s.canvasLayout.actions[ai],origins=a.frames.map((_,fi)=>old.frames?.[fi]||old),boxes=origins.map((o,fi)=>{assert([o.x,o.y].every(Number.isSafeInteger));const b=bounds(before,si,ai,fi);return [b[0]-o.x,b[1]-o.y,b[2]-o.x,b[3]-o.y];});
      return {origins,left:Math.min(...boxes.map(b=>b[0])),top:Math.min(...boxes.map(b=>b[1])),right:Math.max(...boxes.map(b=>b[2])),bottom:Math.max(...boxes.map(b=>b[3]))};
    });
    const width=Math.max(...normalized.map(b=>b.right-b.left))+6,height=Math.max(...normalized.map(b=>b.bottom-b.top))+4,columns=Math.max(...s.actions.map(a=>a.frames.length));
    const layouts=normalized.map((b,ai)=>({name:s.actions[ai].name,direction:s.actions[ai].direction,x:Math.floor((width-b.right+b.left)/2)-b.left,y:Math.floor((height-b.bottom+b.top)/2)-b.top,width,height}));
    plans[si]=s.actions.map((a,ai)=>a.frames.map((f,fi)=>({dx:layouts[ai].x-normalized[ai].origins[fi].x,dy:layouts[ai].y-normalized[ai].origins[fi].y,width,height})));
    const atlas=createCanvas(width*columns,height*s.actions.length),ctx=atlas.getContext('2d'),source=await loadImage(s.imageDataURL);ctx.imageSmoothingEnabled=false;
    for(const [ai,a]of s.actions.entries())for(const [fi,f]of a.frames.entries()){
      const t=plans[si][ai][fi],key=`${si}_${ai}_${fi}`;
      for(const l of p.layers)if(l.frameData?.[key])l.frameData[key]=move(l.frameData[key],width,height,t.dx,t.dy,{preserveOffCanvas:true});
      const c=createCanvas(f.width,f.height);c.getContext('2d').drawImage(source,f.sourceX,f.sourceY,f.width,f.height,0,0,f.width,f.height);
      const moved=move({width:f.width,height:f.height,dataURL:c.toDataURL('image/png')},width,height,t.dx,t.dy);ctx.drawImage(await loadImage(moved.dataURL),fi*width,ai*height);
      Object.assign(f,{width,height,sourceX:fi*width,sourceY:ai*height,lockedRegions:(f.lockedRegions||[]).map(r=>({...r,x:r.x+t.dx,y:r.y+t.dy}))});
    }
    Object.assign(s,{frameWidth:width,frameHeight:height,columns,rows:s.actions.length,spacingX:0,spacingY:0,offsetX:0,offsetY:0,imageDataURL:atlas.toDataURL('image/png'),canvasLayout:{version:1,margin:2,marginX:3,marginY:2,actions:layouts}});
  }
  for(const l of p.layers.filter(l=>l.hairAnimation)){
    const g=l.hairAnimation,idle=p.spriteSheets[l.sheetIndex];
    for(const v of [g.params,...Object.values(g.overrides),...Object.values(g.directionOverrides||{})])for(const k of ['masks','protectedMasks','stitch','trajectories'])assert.equal(Object.keys(v[k]||{}).length,0,'source-local brushes require separate translation');
    for(const [key,o]of Object.entries(g.offsets)){
      const [name,direction,index]=key.split('/'),si=p.spriteSheets.findIndex(s=>s.name===name),ai=p.spriteSheets[si].actions.findIndex(a=>a.direction===direction),bi=idle.actions.findIndex(a=>a.direction===direction),t=plans[si][ai][Number(index)],b=plans[l.sheetIndex][bi][0];o.x+=t.dx-b.dx;o.y+=t.dy-b.dy;
    }
  }
  const result=check(before,p,plans);fs.writeFileSync(path.join(dir,'candidate.json'),JSON.stringify(p));await contact(before,path.join(dir,'before.png'));await contact(p,path.join(dir,'after-candidate.png'));
  fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify({sourceSHA256:sha(raw),sourceETag:r.headers.get('etag'),candidateSHA256:sha(JSON.stringify(p)),plans,result,requests},null,2));
  fs.writeFileSync(path.join(dir,'恢复说明.txt'),'本次基于最新主工程，仅撤销先前记录的逐帧平移，恢复动作内统一坐标原点与固定画布；保留当前像素、图层、时长和绘画修改，不回滚旧素材。每个动作三个方向和全部帧使用相同尺寸。最小左右留白3、上下2；较窄帧允许留白更多。\n原始响应 main-before.json，SHA256 和 ETag 见 report.json。需要撤回本次修正时，GET /api/project?id=main 确认无后续编辑，再用该 ETag、X-Pixel-Editor: 1、Content-Type: application/json，PUT 此备份。409 停止，不能盲目重传。恢复后回读逐字段比较。浏览器未保存草稿未操作。\n');
  const {margins,...summary}=result;console.log(JSON.stringify({prepared:true,dir,...summary}));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
