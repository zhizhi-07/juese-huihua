const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),vm=require('vm');
const root=path.resolve(__dirname,'../..'),png=require('../png.cjs');
const runtime='C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
const {createCanvas,Image,ImageData}=require(runtime+'@napi-rs/canvas'),sharp=require(runtime+'sharp');
const origin='draft-user-canvas-merged-1793608789349-dbd059d3',base='http://127.0.0.1:8765/api/project?id=';
const latest=path.join(__dirname,'latest.txt'),clothName='服装 / 衣服-小黄鸭';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
const color=(im,x,y)=>x>=0&&y>=0&&x<im.width&&y<im.height?Array.from(im.data.subarray((y*im.width+x)*4,(y*im.width+x)*4+4)):[0,0,0,0];
const opaque=(im,x,y)=>color(im,x,y)[3]!==0;
const edge=c=>c[3]&&Math.max(...c.slice(0,3))<110;
function bounds(im){let x=im.width,y=im.height,r=-1,b=-1,n=0;for(let yy=0;yy<im.height;yy++)for(let xx=0;xx<im.width;xx++)if(opaque(im,xx,yy)){x=Math.min(x,xx);y=Math.min(y,yy);r=Math.max(r,xx);b=Math.max(b,yy);n++;}assert(n);return {x,y,r,b,w:r-x+1,h:b-y+1,n};}
const cel=(p,si,ai,fi,name)=>p.layers.find(l=>l.sheetIndex===si&&l.name===name&&l.frameData?.[`${si}_${ai}_${fi}`])?.frameData[`${si}_${ai}_${fi}`];
const saveJSON=(out,name,obj)=>fs.writeFileSync(path.join(out,name),JSON.stringify(obj,null,2));
async function read(id){const r=await fetch(base+id);assert(r.ok,'GET '+id+' '+r.status);const text=await r.text();return {p:JSON.parse(text),text,etag:r.headers.get('etag')};}
async function put(id,p,etag){const r=await fetch(base+id,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});const text=await r.text();assert(r.ok,'PUT '+r.status+' '+text);console.log('PUT',id,r.status,text);return r;}
function bodyInfo(im){const b=bounds(im),rows=[];for(let y=b.y;y<=b.b;y++){let xs=[];for(let x=0;x<im.width;x++)if(opaque(im,x,y))xs.push(x);rows[y]={l:Math.min(...xs),r:Math.max(...xs),n:xs.length};}const top=rows.findIndex(r=>r?.n>=10);assert(top>=0);const l=rows[top+1].l,shoulderR=rows[top+1].r,cx=(l+shoulderR)/2,feet=[-1,-1];for(let y=top;y<=b.b;y++)for(let x=0;x<im.width;x++)if(opaque(im,x,y)&&!edge(color(im,x,y)))feet[x<cx?0:1]=Math.max(feet[x<cx?0:1],y);assert(feet.every(y=>y>=top));return {...b,top,l,shoulderR,cx,rows,feet};}
function palettePoint(im,predicate){for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(predicate(color(im,x,y)))return [x,y];throw Error('缺少所需源颜色');}
function torsoRows(src,info,count){
  if(count<=0)return [];
  const rows=Array.from({length:info.b-3-(info.top+3)+1},(_,i)=>info.top+3+i);
  assert(rows.length>0);
  const modal=Array.from({length:info.w},(_,i)=>{const counts=new Map();for(const y of rows){let c=color(src,info.x+i,y).join(',');counts.set(c,(counts.get(c)||0)+1);}return [...counts].sort((a,b)=>b[1]-a[1])[0][0];});
  const energy=y=>modal.reduce((n,c,i)=>n+(i>=3&&i<info.w-2&&color(src,info.x+i,y).join(',')!==c?1:0),0);
  while(rows.length>count){let candidates=rows.map((y,i)=>({i,e:energy(y)})).filter(o=>o.i!==rows.length-1);if(!candidates.length)break;candidates.sort((a,b)=>a.e-b.e||b.i-a.i);rows.splice(candidates[0].i,1);}
  while(rows.length<count){let candidates=rows.map((y,i)=>({i,e:energy(y)})).filter(o=>o.i!==rows.length-1);candidates.sort((a,b)=>a.e-b.e||b.i-a.i);const i=candidates[0]?.i??0;rows.splice(i,0,rows[i]);}
  return rows;
}
// shortcut: this template is for the current compact short-top/short-skirt/one-row-shoe body; other silhouettes need their own template.
function makeMap(source,sourceBody,targetBody,dir,action){
  const sb=bodyInfo(sourceBody),tb=bodyInfo(targetBody),w=targetBody.width,h=targetBody.height;
  const samples=Array(w*h).fill(null),white=palettePoint(source,c=>c[3]&&c[0]===255&&c[1]===255&&c[2]===255),outline=palettePoint(source,edge);
  function set(x,y,sx,sy,part){assert(Number.isInteger(x)&&Number.isInteger(y)&&Number.isInteger(sx)&&Number.isInteger(sy));if(x<0||y<0||x>=w||y>=h)return;if(opaque(source,sx,sy))samples[y*w+x]=[sx,sy,part];}
  function solid(x,y,point,part){set(x,y,...point,part);}
  const dx=tb.l-sb.l,dy=tb.top-sb.top;
  const rowDX=y=>{const r=tb.rows[y];return action==='sit'||!r?dx:Math.round((r.l+r.r)/2-sb.cx);};
  // The user's complete collar and any pixels above the shoulder are copied, not resized or cleaned up.
  for(let y=0;y<sb.top+3;y++)for(let x=0;x<source.width;x++)if(opaque(source,x,y))set(x+(y<sb.top?dx:rowDX(y+dy)),y+dy,x,y,'collar');
  if(action==='sit'){
    const ground=tb.b,hem=ground-1,rows=torsoRows(source,sb,Math.max(0,hem-1-(tb.top+3)));
    for(let y=tb.top+3;y<=ground;y++)for(let x=tb.x;x<=tb.r;x++){
      if(!opaque(targetBody,x,y))continue;
      const sx=x-dx;
      if(y===ground)solid(x,y,outline,'seat-contact');
      else if(y===hem)set(x,y,sx,sb.b-1,'skirt');
      else if(y===hem-1)set(x,y,sx,sb.b-2,'hem');
      else set(x,y,sx,rows[y-tb.top-3]??sb.b-3,'torso');
    }
    if(dir!=='up')for(let y=ground-5;y<=ground;y++)for(let x=tb.x;x<=tb.r;x++){
      const sole=dir==='down'?(x<=tb.l+5||x>=tb.l+8):x>=tb.l+5;
      if(!sole||!opaque(targetBody,x,y))continue;
      solid(x,y,edge(color(targetBody,x,y))?outline:white,'shoe');
    }
  }else{
    const rowMaps=tb.feet.map(foot=>torsoRows(source,sb,Math.max(0,foot-3-(tb.top+3)+1)));
    for(let y=tb.top+3;y<=tb.b;y++)for(let x=tb.x;x<=tb.r;x++){
      const half=x<tb.cx?0:1,foot=tb.feet[half],raw=color(targetBody,x,y);
      const sx=x-rowDX(y);
      if(!raw[3])continue;
      if(y>=foot){
        if(edge(raw)){const sc=color(source,sx,sb.b);solid(x,y,edge(sc)?[sx,sb.b]:outline,'shoe');}
        else solid(x,y,white,'shoe');
      }else if(y<foot-2){
        const sy=rowMaps[half][y-tb.top-3];
        if(edge(raw))solid(x,y,outline,'torso');else if(sy!==undefined)set(x,y,Math.max(sb.x+1,Math.min(sb.r-1,sx)),sy,'torso');
      }
    }
    // The short skirt has its own one-row fabric strip and gold seam, not the body's leg-gap alpha mask.
    for(let half=0;half<2;half++){
      const foot=tb.feet[half],shoeRow=tb.rows[foot],left=half===0?shoeRow.l:Math.floor(tb.cx)+1,right=half===0?Math.floor(tb.cx):shoeRow.r;
      for(let x=left;x<=right;x++){
        const sx=Math.max(sb.x+1,Math.min(sb.r-1,x-dx));
        if(edge(color(targetBody,x,foot-1)))solid(x,foot-1,outline,'skirt');else set(x,foot-1,sx,sb.b-1,'skirt');
        if(edge(color(targetBody,x,foot-2)))solid(x,foot-2,outline,'hem');else set(x,foot-2,sx,sb.b-2,'hem');
      }
    }
    // A raised shoe can occlude the lower collar; its own contour, not a whole-body clip, determines the overlap.
    for(let half=0;half<2;half++)if(tb.feet[half]<=tb.top+4)for(let y=tb.top+3;y<=tb.feet[half];y++)for(let x=tb.x;x<=tb.r;x++)if((x<tb.cx?0:1)===half&&opaque(targetBody,x,y))solid(x,y,edge(color(targetBody,x,y))?outline:white,'shoe');
  }
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const s=samples[y*w+x];if(s)assert(opaque(source,s[0],s[1]));}
  return {width:w,height:h,sourceDirection:dir,samples,anchors:{source:sb,target:tb}};
}
function applyMap(src,map){const im={width:map.width,height:map.height,data:new Uint8Array(map.width*map.height*4)};map.samples.forEach((s,i)=>{if(s)im.data.set(color(src,s[0],s[1]),i*4);});assert(bounds(im).n);return im;}
const encode=im=>({width:im.width,height:im.height,dataURL:'data:image/png;base64,'+png.encode(im.width,im.height,im.data).toString('base64')});
async function prepare(){
  const source=await read(origin),stamp=Date.now(),out=path.join(root,'自检记录',`小黄鸭三首帧自动同步测试-20261103-${stamp}`);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(latest,out);
  fs.writeFileSync(path.join(out,'source-original.json'),source.text);
  const id='outfit-duck-three-source-test-'+stamp,sourceIndices=[8,7,9,10,11],p=structuredClone(source.p);
  p.name='小黄鸭｜三张待机自动同步测试（无手）';p.spriteSheets=sourceIndices.map((old,si)=>{const s=structuredClone(source.p.spriteSheets[old]);s.actions.forEach(a=>a.frames.forEach(f=>f.sheetIndex=si));return s;});p.layers=[];
  for(let si=0;si<sourceIndices.length;si++){
    const old=sourceIndices[si];
    for(const l of source.p.layers.filter(l=>l.sheetIndex===old&&['body','head'].includes(l.name)&&!l.isGroup)){
      const n=structuredClone(l);n.sheetIndex=si;n.parent=null;n.depth=0;n.locked=true;n.visible=true;n.frameData={};for(const [k,f]of Object.entries(l.frameData)){const [s,a,fi]=k.split('_').map(Number);if(s===old)n.frameData[`${si}_${a}_${fi}`]=structuredClone(f);}p.layers.push(n);
    }
    const l=structuredClone(source.p.layers.find(l=>l.sheetIndex===old&&l.name===clothName));assert(l);l.sheetIndex=si;l.parent=null;l.depth=0;l.visible=true;l.locked=false;l.frameData={};
    if(si===0)for(let ai=0;ai<3;ai++)l.frameData[`0_${ai}_0`]=structuredClone(cel(source.p,old,ai,0,clothName));
    p.layers.push(l);
  }
  p.currentSheetIndex=0;p.currentActionIndex=1;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.findIndex(l=>l.sheetIndex===0&&l.name===clothName);
  const meta={id,origin,sourceSHA256:hash(source.text),sourceETag:source.etag,sourceIndices,url:'http://localhost:8765/index.html?project='+id};saveJSON(out,'manifest.json',meta);saveJSON(out,'baseline-three-only.json',p);
  assert.equal(p.layers.filter(l=>l.name===clothName).reduce((n,l)=>n+Object.keys(l.frameData).length,0),3);assert(!p.layers.some(l=>/hand|头发|前发|后发|眼睛/.test(l.name)));
  const check=await fetch(base+id);assert.equal(check.status,404);await put(id,p,'none');const back=await read(id);assert.deepEqual(back.p,p);fs.writeFileSync(path.join(out,'baseline-api.json'),back.text);meta.testETag=back.etag;saveJSON(out,'manifest.json',meta);console.log('CREATED',meta.url,'OUTPUT',out);
}
function generate(baseline){
  const p=structuredClone(baseline),sources={};for(let ai=0;ai<3;ai++){const dir=p.spriteSheets[0].actions[ai].direction;sources[dir]={frame:cel(p,0,ai,0,clothName),image:decode(cel(p,0,ai,0,clothName)),body:decode(cel(p,0,ai,0,'body'))};}
  const maps={},changes=[];
  for(let si=0;si<p.spriteSheets.length;si++)for(let ai=0;ai<p.spriteSheets[si].actions.length;ai++)for(let fi=0;fi<p.spriteSheets[si].actions[ai].frames.length;fi++){
    if(si===0&&fi===0)continue;
    const s=p.spriteSheets[si],dir=s.actions[ai].direction,key=`${si}_${ai}_${fi}`,src=sources[dir],body=decode(cel(p,si,ai,fi,'body'));
    const map=makeMap(src.image,src.body,body,dir,s.name.replace('original32_','')),im=applyMap(src.image,map),layer=p.layers.find(l=>l.sheetIndex===si&&l.name===clothName);
    layer.frameData[key]=encode(im);maps[key]=map;changes.push(key);
    const allowed=new Set();for(let i=0;i<src.image.data.length;i+=4)if(src.image.data[i+3])allowed.add(Array.from(src.image.data.slice(i,i+4)).join(','));
    for(let i=0;i<im.data.length;i+=4){assert(im.data[i+3]===0||im.data[i+3]===255);if(im.data[i+3])assert(allowed.has(Array.from(im.data.slice(i,i+4)).join(',')));}
    const soleColors=map.samples.filter(s=>s?.[2]==='shoe').map(s=>color(src.image,s[0],s[1]));assert(soleColors.every(c=>edge(c)||(c[0]===255&&c[1]===255&&c[2]===255)),'鞋不得被素体阴影染灰');
    for(let y=map.anchors.target.top+3;y<body.height;y++)for(let x=0;x<body.width;x++)if(opaque(body,x,y)&&!edge(color(body,x,y)))assert(opaque(im,x,y),key+` 衣片连接不可露出皮肤 (${x},${y})`);
  }
  return {p,maps,changes,sources};
}
function verifyScope(before,p){assert.deepEqual(p.spriteSheets,before.spriteSheets);p.layers.forEach((l,i)=>{if(l.name!==clothName)assert.deepEqual(l,before.layers[i]);});for(let ai=0;ai<3;ai++)assert.deepEqual(cel(p,0,ai,0,clothName),cel(before,0,ai,0,clothName));}
function initPE(){global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));}
async function render(out,data,label,garmentName=clothName){
  initPE();const {project:p}=await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)])),cm=new PE.CanvasManager(document.createElement('canvas'),p),ex=new PE.ExportManager();ex.project=p;ex.canvasManager=cm;
  const report={checked:0,sheets:[]};
  for(let si=0;si<p.spriteSheets.length;si++){
    const s=p.spriteSheets[si],cols=Math.max(...s.actions.map(a=>a.frames.length)),w=192,h=192,c=createCanvas(cols*w,s.actions.length*h),g=c.getContext('2d'),clothCanvas=createCanvas(cols*w,s.actions.length*h),cg=clothCanvas.getContext('2d'),contrast=createCanvas(c.width,c.height),gg2=contrast.getContext('2d'),clothContrast=createCanvas(c.width,c.height),cg2=clothContrast.getContext('2d');for(const ctx of [g,cg,gg2,cg2])ctx.imageSmoothingEnabled=false;
    for(let ai=0;ai<s.actions.length;ai++){
      const gifFrames=[],delays=[];let gifW,gifH;
      for(let fi=0;fi<s.actions[ai].frames.length;fi++){
        p.currentSheetIndex=si;p.currentActionIndex=ai;p.currentFrameIndex=fi;
        const frame=s.actions[ai].frames[fi],im=cm.getCompositeImageData(si,ai,fi,true,1);assert(bounds(im).n);cm.zoom=1;cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,im.width,im.height).data,im.data,'主画布合成一致');
        const buf=Buffer.from(await(await ex.exportFrameAsBlob(si,ai,fi)).arrayBuffer()),exported=png.decode(buf);assert.deepEqual(Array.from(exported.data),Array.from(im.data),'PNG导出一致');
        const tile=createCanvas(im.width,im.height);tile.getContext('2d').putImageData(im,0,0);const garment=cel(data,si,ai,fi,garmentName);const ct=createCanvas(frame.width,frame.height);if(garment){const d=decode(garment);ct.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(d.data),d.width,d.height),0,0);}
        for(const ctx of [g,cg]){ctx.fillStyle=ai%2?'#292b36':'#ddd5ed';ctx.fillRect(fi*w,ai*h,w,h);ctx.fillStyle=ai%2?'#fff':'#222';ctx.font='12px sans-serif';ctx.fillText(`${s.name.replace('original32_','')} ${s.actions[ai].direction} ${fi+1}`,fi*w+5,ai*h+184);}
        g.drawImage(tile,fi*w+6,ai*h+4,im.width*4,im.height*4);g.drawImage(tile,fi*w+155,ai*h+140,im.width,im.height);cg.drawImage(ct,fi*w+6,ai*h+4,frame.width*4,frame.height*4);cg.drawImage(ct,fi*w+155,ai*h+140,frame.width,frame.height);
        for(const [ctx,img]of [[gg2,tile],[cg2,ct]]){ctx.fillStyle=ai%2?'#ddd5ed':'#292b36';ctx.fillRect(fi*w,ai*h,w,h);ctx.drawImage(img,fi*w+6,ai*h+4,img.width*4,img.height*4);ctx.drawImage(img,fi*w+155,ai*h+140,img.width,img.height);ctx.fillStyle=ai%2?'#222':'#fff';ctx.font='12px sans-serif';ctx.fillText(`${s.name.replace('original32_','')} ${s.actions[ai].direction} ${fi+1}`,fi*w+5,ai*h+184);}
        const gc=createCanvas(im.width*6,im.height*6),gg=gc.getContext('2d');gg.imageSmoothingEnabled=false;gg.fillStyle='#ddd5ed';gg.fillRect(0,0,gc.width,gc.height);gg.drawImage(tile,0,0,gc.width,gc.height);gifFrames.push(gc.getContext('2d').getImageData(0,0,gc.width,gc.height).data);gifW=gc.width;gifH=gc.height;delays.push(Math.max(10,Math.round((frame.duration||100)/10)*10));report.checked++;
      }
      if(label!=='baseline'){const name=`${label}-${s.name.replace('original32_','')}-${s.actions[ai].direction}.gif`;await sharp(Buffer.concat(gifFrames.map(b=>Buffer.from(b))),{raw:{width:gifW,height:gifH*gifFrames.length,channels:4,pageHeight:gifH}}).gif({delay:delays,loop:0,dither:0,keepDuplicateFrames:true}).toFile(path.join(out,name));const m=await sharp(path.join(out,name),{animated:true}).metadata();assert.equal(m.pages,gifFrames.length);assert.deepEqual(m.delay,delays);}
    }
    fs.writeFileSync(path.join(out,`${label}-${s.name.replace('original32_','')}-合成.png`),c.toBuffer('image/png'));fs.writeFileSync(path.join(out,`${label}-${s.name.replace('original32_','')}-衣服单层.png`),clothCanvas.toBuffer('image/png'));fs.writeFileSync(path.join(out,`${label}-${s.name.replace('original32_','')}-合成反底.png`),contrast.toBuffer('image/png'));fs.writeFileSync(path.join(out,`${label}-${s.name.replace('original32_','')}-衣服反底.png`),clothContrast.toBuffer('image/png'));report.sheets.push(s.name);
  }
  assert.equal(report.checked,70);return report;
}
async function build(out){
  const baseline=JSON.parse(fs.readFileSync(path.join(out,'baseline-three-only.json'))),result=generate(baseline);verifyScope(baseline,result.p);assert.equal(result.changes.length,67);
  const poisoned=structuredClone(baseline);for(let si=0;si<poisoned.spriteSheets.length;si++)for(let ai=0;ai<poisoned.spriteSheets[si].actions.length;ai++)for(let fi=0;fi<poisoned.spriteSheets[si].actions[ai].frames.length;fi++)if(si!==0||fi!==0)poisoned.layers.find(l=>l.sheetIndex===si&&l.name===clothName).frameData[`${si}_${ai}_${fi}`]={poison:true};assert.deepEqual(generate(poisoned).p,result.p,'生成不依赖已有其他服装帧');
  for(let ai=0;ai<2;ai++){let fixed;for(let fi=0;fi<4;fi++){const m=result.maps[`3_${ai}_${fi}`],sole=m.samples.map((s,i)=>s?.[2]==='shoe'?[i,...s.slice(0,2)]:null).filter(Boolean);if(fixed)assert.deepEqual(sole,fixed,'坐姿呼吸不得移动鞋底');else fixed=sole;}}
  const source=JSON.parse(fs.readFileSync(path.join(out,'source-original.json'))),sources=Object.fromEntries(Object.entries(result.sources).map(([dir,v])=>[dir,v.frame]));saveJSON(out,'input-three-frames.json',sources);saveJSON(out,'pixel-map.json',result.maps);saveJSON(out,'candidate.json',result.p);saveJSON(out,'changes.json',{generated67:result.changes,protectedFirst3:Object.keys(sources)});
  const reverted=structuredClone(result.p);reverted.layers.forEach((l,i)=>{if(l.name===clothName)l.frameData=structuredClone(baseline.layers[i].frameData);});assert.deepEqual(reverted,baseline);saveJSON(out,'restore-extra-copy.json',reverted);
  const before=await render(out,baseline,'baseline'),after=await render(out,result.p,'candidate');saveJSON(out,'verification.json',{sourceOnlyThreeClothingCels:true,generated:67,total:70,firstThreeExact:true,sourceRGBOnly:true,whiteShoeInteriors:true,bodyHeadAndFramesMetadataUnchanged:true,existingOtherClothingCelsNotRead:true,restoreExtraCopyExact:true,before,after,browserChecked:false,visualReviewPending:true});
  const meta=JSON.parse(fs.readFileSync(path.join(out,'manifest.json')));fs.writeFileSync(path.join(out,'说明与恢复.md'),`# 小黄鸭三张待机同步测试\n\n测试工程：${meta.url}\n\n只用原工程待机正/侧/背第一帧，其他67帧由当前素体分区像素对应图生成；没有把原工程的其他服装帧复制进结果。无手、无头发或编辑器代码修改。\n\n这是当前小黄鸭短上衣/短裙/单行鞋的模板原型，不是任意衣型的通用模型；没有接入编辑器一键按钮。所有源颜色不变，坐姿鞋底使用源白色，不从皮肤阴影生成灰鞋。\n\n原工程 SHA256：${meta.sourceSHA256}。source-original.json为只读源备份；baseline-three-only.json为独立测试工程的三源初始状态；candidate.json为同步结果；pixel-map.json为可复用的源像素对应表；verification.json为测试记录。\n\n恢复仅作用于独立测试工程：用 baseline-three-only.json 恢复衣服层的frameData，不动素体；restore-extra-copy.json已在额外副本断言验证。在线恢复前先GET并比较后续修改，带当前ETag的If-Match保存，不能强盖用户修改。原工程不需恢复，因为本测试从未PUT原工程。\n`);console.log('BUILT',out,after);
}
async function publish(out){const meta=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'))),candidate=JSON.parse(fs.readFileSync(path.join(out,'candidate.json'))),baseline=JSON.parse(fs.readFileSync(path.join(out,'baseline-three-only.json'))),before=await read(meta.id);assert.deepEqual(before.p,baseline,'独立测试工程已有修改，停止覆盖');assert.equal(before.etag,meta.testETag);await put(meta.id,candidate,meta.testETag);const back=await read(meta.id);assert.deepEqual(back.p,candidate);fs.writeFileSync(path.join(out,'api-readback.json'),back.text);const original=await read(origin),unchanged=hash(original.text)===meta.sourceSHA256;assert(unchanged,'源工程本次期间发生变化，不能声称逐字节未变');const verification=JSON.parse(fs.readFileSync(path.join(out,'verification.json')));Object.assign(verification,{published:true,apiReadbackExact:true,originalSHA256StillExact:unchanged,publishedETag:back.etag});saveJSON(out,'verification.json',verification);console.log('PUBLISHED',meta.url,'original SHA256 unchanged; 70 cels exact API readback');}
module.exports={render,decode,encode,applyMap,bodyInfo,makeMap};
if(require.main===module)(async()=>{const mode=process.argv[2]||'prepare';if(mode==='prepare')await prepare();else{const out=fs.readFileSync(latest,'utf8');if(mode==='build')await build(out);else if(mode==='publish')await publish(out);else throw Error('unknown mode');}})().catch(e=>{console.error(e);process.exitCode=1});
