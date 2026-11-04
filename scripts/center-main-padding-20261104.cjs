// Adjust the current saved main only; keep one translation throughout each action.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),png=require('./png.cjs'),{move}=require('../js/character-canvas.cjs');
const {createCanvas,loadImage,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.document={addEventListener(){},createElement(){return createCanvas(1,1);}};
for(const file of ['core.js','hair-animation.js'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',file),'utf8'));
const base='http://127.0.0.1:8765',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const decode=c=>png.decode(Buffer.from(c.dataURL.split(',')[1],'base64'));
const url=c=>'data:image/png;base64,'+png.encode(c.width,c.height,c.data).toString('base64');
function pixels(c,dx=0,dy=0){
  const im=decode(c),r=c.placement||{x:0,y:0,w:im.width,h:im.height},out=[];
  assert.equal(im.width,c.width);assert.equal(im.height,c.height);
  for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){
    const i=(y*im.width+x)*4;if(im.data[i+3])out.push([r.x+x*r.w/im.width+dx,r.y+y*r.h/im.height+dy,...im.data.slice(i,i+4)]);
  }
  return out.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
}
function bounds(p,si,ai,frameIndex=null){
  const b=[Infinity,Infinity,-Infinity,-Infinity],a=p.spriteSheets[si].actions[ai];
  for(const l of PE.getRenderLayers(p,si,ai))if(PE.isLayerVisible(p,l,si)&&l.opacity!==0)for(const fi of frameIndex===null?a.frames.map((_,i)=>i):[frameIndex]){
    const c=l.frameData?.[`${si}_${ai}_${fi}`];if(!c)continue;
    const im=decode(c),r=c.placement||{x:0,y:0,w:im.width,h:im.height};
    for(const [x,y]of pixels(c)){b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x+r.w/im.width);b[3]=Math.max(b[3],y+r.h/im.height);}
  }
  assert(b.every(Number.isFinite),'action has no visible pixels');
  return [Math.floor(b[0]),Math.floor(b[1]),Math.ceil(b[2]),Math.ceil(b[3])];
}
function model(p){
  p=structuredClone(p);p.getFrameKey=(si,ai,fi)=>`${si}_${ai}_${fi}`;
  for(const l of p.layers)l.getFrameData=k=>{const c=l.frameData?.[k];if(!c)return null;const im=decode(c),d=new ImageData(new Uint8ClampedArray(im.data),im.width,im.height);if(c.placement)d.placement={...c.placement};return d;};
  return p;
}
function verify(before,after,plans){
  assert.equal(after.layers.length,before.layers.length);assert.equal(after.spriteSheets.length,4);
  PE.HairAnimation.validate(after);
  let frames=0,cels=0;
  for(const [si,s]of before.spriteSheets.entries())for(const [ai,a]of s.actions.entries()){
    const t=plans[si][ai],b=bounds(after,si,ai);
    assert.deepEqual([b[0],b[1],t.width-b[2],t.height-b[3]],[5,2,5,2]);
    for(const [fi,f]of a.frames.entries()){
      frames++;const next=after.spriteSheets[si].actions[ai].frames[fi];
      const unchanged=x=>{const y={...x};for(const k of ['width','height','sourceX','sourceY','lockedRegions'])delete y[k];return y;};
      assert.deepEqual(unchanged(next),unchanged(f));
      assert.deepEqual(next.lockedRegions,(f.lockedRegions||[]).map(r=>({...r,x:r.x+t.dx,y:r.y+t.dy})));
    }
  }
  for(const [li,l]of before.layers.entries()){
    const next=after.layers[li],meta=x=>{const y={...x};delete y.frameData;delete y.hairAnimation;return y;};
    assert.deepEqual(meta(l),meta(next));assert.deepEqual(Object.keys(l.frameData||{}),Object.keys(next.frameData||{}));
    for(const [key,c]of Object.entries(l.frameData||{})){
      const [si,ai]=key.split('_').map(Number),t=plans[si][ai];cels++;
      assert.deepEqual(pixels(next.frameData[key]),pixels(c,t.dx,t.dy),'painted pixels changed: '+li+'/'+key);
      if(c.placement){assert.equal(next.frameData[key].dataURL,c.dataURL);assert.deepEqual(next.frameData[key].placement,{...c.placement,x:c.placement.x+t.dx,y:c.placement.y+t.dy});}
    }
  }
  const original=model(before),result=model(after);let generated=0;
  for(const l of original.layers.filter(l=>l.hairAnimation)){
    const next=result.layers[original.layers.indexOf(l)],first=PE.HairAnimation.plan(original,l),second=PE.HairAnimation.plan(result,next);
    assert.equal(first.edits.length,second.edits.length);
    for(const [i,e]of first.edits.entries()){
      const [si,ai]=e.key.split('_').map(Number),t=plans[si][ai],f=second.edits[i];assert.equal(e.key,f.key);
      const cel=im=>({width:im.width,height:im.height,dataURL:url(im),...(im.placement?{placement:im.placement}:{})});
      assert.deepEqual(pixels(cel(f.image)),pixels(cel(e.image),t.dx,t.dy),'hair follow alignment changed');generated++;
    }
  }
  return {frames,cels,generatedHairFrames:generated,paintedPixelsUnchanged:true,allActionMargins:[5,2,5,2],timingAndLayersUnchanged:true};
}
async function composite(p,si,ai,fi){
  const f=p.spriteSheets[si].actions[ai].frames[fi],c=createCanvas(f.width,f.height),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
  for(const l of PE.getRenderLayers(p,si,ai))if(PE.isLayerVisible(p,l,si)){
    const d=l.frameData?.[`${si}_${ai}_${fi}`];if(!d)continue;const im=await loadImage(d.dataURL),r=d.placement||{x:0,y:0,w:im.width,h:im.height};ctx.globalAlpha=l.opacity??1;ctx.drawImage(im,r.x,r.y,r.w,r.h);
  }
  return c;
}
async function contact(p,file){
  const c=createCanvas(8*180,12*180),ctx=c.getContext('2d');ctx.fillStyle='#e7eceb';ctx.fillRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;
  for(const [si,s]of p.spriteSheets.entries())for(const [ai,a]of s.actions.entries())for(let fi=0;fi<a.frames.length;fi++){
    const im=await composite(p,si,ai,fi),scale=4,x=fi*180+8,y=(si*3+ai)*180+32;
    ctx.fillStyle='#253248';ctx.font='12px sans-serif';ctx.fillText(`${s.name.slice(11)} ${a.direction} ${fi+1} ${im.width}x${im.height}`,x,y-12);
    for(let yy=0;yy<im.height;yy++)for(let xx=0;xx<im.width;xx++){ctx.fillStyle=(xx+yy)%2?'#d0d7d9':'#f5f7f8';ctx.fillRect(x+xx*scale,y+yy*scale,scale,scale);}
    ctx.drawImage(im,x,y,im.width*scale,im.height*scale);ctx.strokeStyle='#687487';ctx.strokeRect(x-.5,y-.5,im.width*scale+1,im.height*scale+1);
  }
  fs.writeFileSync(file,c.toBuffer('image/png'));
}
async function main(){
  const mode=process.argv[2]||'prepare',dir=process.argv[3]?path.resolve(process.argv[3]):path.join(root,'output','center-main-padding-20261104-'+Date.now());fs.mkdirSync(dir,{recursive:true});
  const log=[];async function request(route,options={}){const r=await fetch(base+route,options);log.push({method:options.method||'GET',route,status:r.status,etag:r.headers.get('etag')});return r;}
  if(mode==='save'){
    const report=JSON.parse(fs.readFileSync(path.join(dir,'report.json'))),before=JSON.parse(fs.readFileSync(path.join(dir,'main-before.json'))),candidate=JSON.parse(fs.readFileSync(path.join(dir,'candidate.json')));
    const check=verify(before,candidate,report.plans);assert.equal(sha(JSON.stringify(candidate)),report.candidateSHA256);
    const r=await request('/api/project?id=main',{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':report.sourceETag},body:JSON.stringify(candidate)});
    const response=await r.text();fs.writeFileSync(path.join(dir,'save-response.json'),response);assert.equal(r.status,200,'save stopped; never retry with a new ETag: '+response);
    const read=await request('/api/project?id=main');assert.equal(read.status,200);const raw=Buffer.from(await read.arrayBuffer());fs.writeFileSync(path.join(dir,'main-readback.json'),raw);const saved=JSON.parse(raw);assert.deepEqual(saved,candidate);verify(before,saved,report.plans);
    await contact(saved,path.join(dir,'after-readback.png'));
    fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify({...check,readbackETag:read.headers.get('etag'),readbackSHA256:sha(raw),requests:log},null,2));console.log(JSON.stringify({saved:true,dir,...check}));return;
  }
  assert.equal(mode,'prepare');const list=await request('/api/projects');assert.equal(list.status,200);fs.writeFileSync(path.join(dir,'projects.json'),await list.text());
  const r=await request('/api/project?id=main');assert.equal(r.status,200);const raw=Buffer.from(await r.arrayBuffer());fs.writeFileSync(path.join(dir,'main-before.json'),raw);
  const before=JSON.parse(raw),p=structuredClone(before),plans=[];
  assert.deepEqual(p.spriteSheets.map(s=>s.name),['original16_walk','original16_idle','original16_pickup','original16_sit']);
  for(const [si,s]of p.spriteSheets.entries()){
    plans[si]=s.actions.map((a,ai)=>{const b=bounds(before,si,ai);return {direction:a.direction,beforeBounds:b,dx:5-b[0],dy:2-b[1],width:b[2]-b[0]+10,height:b[3]-b[1]+4};});
    const layouts=plans[si].map((t,ai)=>({name:s.actions[ai].name,direction:t.direction,x:(s.canvasLayout?.actions[ai]?.x||0)+t.dx,y:(s.canvasLayout?.actions[ai]?.y||0)+t.dy,width:t.width,height:t.height}));
    const width=Math.max(...layouts.map(l=>l.width)),height=Math.max(...layouts.map(l=>l.height)),columns=Math.max(...s.actions.map(a=>a.frames.length)),atlas=createCanvas(width*columns,height*s.actions.length),ctx=atlas.getContext('2d');ctx.imageSmoothingEnabled=false;
    const source=s.imageDataURL?await loadImage(s.imageDataURL):null;
    for(const [ai,a]of s.actions.entries())for(const [fi,f]of a.frames.entries()){
      const key=`${si}_${ai}_${fi}`,t=plans[si][ai];
      for(const l of p.layers)if(l.frameData?.[key])l.frameData[key]=move(l.frameData[key],t.width,t.height,t.dx,t.dy,{preserveOffCanvas:true});
      if(source){const cell=createCanvas(f.width,f.height);cell.getContext('2d').drawImage(source,f.sourceX,f.sourceY,f.width,f.height,0,0,f.width,f.height);const moved=move({width:f.width,height:f.height,dataURL:cell.toDataURL('image/png')},t.width,t.height,t.dx,t.dy);ctx.drawImage(await loadImage(moved.dataURL),fi*width,ai*height);}
      Object.assign(f,{width:t.width,height:t.height,sourceX:fi*width,sourceY:ai*height,lockedRegions:(f.lockedRegions||[]).map(r=>({...r,x:r.x+t.dx,y:r.y+t.dy}))});
    }
    Object.assign(s,{frameWidth:width,frameHeight:height,columns,rows:s.actions.length,spacingX:0,spacingY:0,offsetX:0,offsetY:0,imageDataURL:atlas.toDataURL('image/png'),canvasLayout:{version:1,margin:2,marginX:5,marginY:2,actions:layouts}});
  }
  for(const l of p.layers.filter(l=>l.hairAnimation)){
    const g=l.hairAnimation,idle=p.spriteSheets[l.sheetIndex];
    for(const v of [g.params,...Object.values(g.overrides),...Object.values(g.directionOverrides||{})])for(const k of ['masks','protectedMasks','stitch','trajectories'])assert.equal(Object.keys(v[k]||{}).length,0,'non-empty source-local brushes require separate translation');
    for(const [key,offset]of Object.entries(g.offsets)){
      const [name,direction]=key.split('/'),si=p.spriteSheets.findIndex(s=>s.name===name),ai=p.spriteSheets[si].actions.findIndex(a=>a.direction===direction),bi=idle.actions.findIndex(a=>a.direction===direction),t=plans[si][ai],b=plans[l.sheetIndex][bi];offset.x+=t.dx-b.dx;offset.y+=t.dy-b.dy;
    }
  }
  const check=verify(before,p,plans);fs.writeFileSync(path.join(dir,'candidate.json'),JSON.stringify(p));
  await contact(before,path.join(dir,'before.png'));await contact(p,path.join(dir,'after-candidate.png'));
  fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify({sourceSHA256:sha(raw),sourceETag:r.headers.get('etag'),candidateSHA256:sha(JSON.stringify(p)),plans,check,requests:log},null,2));
  fs.writeFileSync(path.join(dir,'恢复说明.txt'),'原始备份：main-before.json（原始响应；SHA256 和 ETag 见 report.json）。\n恢复前先 GET /api/project?id=main，确认没有后续修改；使用当前 ETag、X-Pixel-Editor: 1 和 Content-Type: application/json，以 PUT 提交备份。遇到 409 停止，不能盲目重传。恢复后回读，与备份逐字段比较。当前浏览器草稿不在此备份中，不得刷新或覆盖未保存草稿。\n');
  console.log(JSON.stringify({prepared:true,dir,...check,sizes:plans.map(a=>a.map(t=>`${t.direction}:${t.width}x${t.height}`))}));
}
module.exports={bounds,pixels,model,contact,decode,url,sha,composite};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
