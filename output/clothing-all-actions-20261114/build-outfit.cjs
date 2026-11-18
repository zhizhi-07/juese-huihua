// 用编辑器自己的代码走一遍「只画待机三面首帧 → 同步衣服全部」：新增衣服源稿并生成全部动作。
// 用法：node build-outfit.cjs [--save]
const fs=require('fs'),vm=require('vm'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const {createCanvas,ImageData,Image,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
const root=path.resolve(__dirname,'../..'),D=__dirname+'/',ID='base-outlined-1794365455561',API='http://127.0.0.1:8765/api/project?id='+ID,SAVE=process.argv.includes('--save');
for(const name of ['core','history','canvas','tools','export','api','frame-tools','hair-animation','clothing-fit','clothing-sync']){if(name==='clothing-fit')PE.ClothingFit=require(root+'/js/clothing-fit.js');else vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),{filename:name});}
const C=PE.ClothingSync,png=require(root+'/scripts/png.cjs');
const NAME='服装 / 毛衣短裤';
const COLORS={G:'#9CC5A1',g:'#7BA586',C:'#F6EFDD',N:'#5B6B9A',n:'#46547E',S:'#8B5E4A'};
// 待机首帧，身体内部 x=6..10，y=11..15
const ART={down:['gCCCg','gGGGg','gGGGg','nNNNn','SS.SS'],side:['ggCCC','gGGGG','gGGGG','nNNNN','SS.SS'],up:['ggggg','gGGGg','gGGGg','nNNNn','SS.SS']};
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const box=c=>c.placement||{x:0,y:0,w:c.width,h:c.height};
const isHand=l=>l.name==='hand'||l.name==='hand 2';
function renderOrder(j,si,ai){
  const dir=j.spriteSheets[si].actions[ai].direction;
  const inAction=l=>{if(l.sheetIndex!==si)return false;if(dir==='up'&&!l.isGroup&&/眼/.test(l.name))return false;if(l.parent==null)return true;const g=j.layers[l.parent];return g.name===dir&&g.visible!==false;};
  const ls=j.layers.filter(l=>!l.isGroup&&inAction(l)&&l.visible!==false),rear=l=>/后发/.test(l.name);
  if(dir==='up')return [...ls.filter(isHand),...ls.filter(l=>!isHand(l)&&!rear(l)),...ls.filter(rear)];
  const rest=ls.filter(l=>!rear(l)),base=rest.findLastIndex(l=>l.name==='head'||l.name==='body');rest.splice(base+1,0,...ls.filter(rear));
  return [...rest.filter(l=>l.name!=='hand'),...rest.filter(l=>l.name==='hand')];
}
async function sheetPreview(j,file,scale,only){
  const rows=[];for(const [si,s] of j.spriteSheets.entries())for(const [ai,a] of s.actions.entries())if(only(s,a))rows.push({si,ai,a});
  const cw=Math.max(...rows.flatMap(r=>r.a.frames.map(f=>f.width))),ch=Math.max(...rows.flatMap(r=>r.a.frames.map(f=>f.height))),cols=Math.max(...rows.map(r=>r.a.frames.length));
  const cv=createCanvas(cols*(cw+1)*scale,rows.length*(ch+1)*scale),cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;cx.fillStyle='#8FA3B8';cx.fillRect(0,0,cv.width,cv.height);
  for(const [ri,{si,ai,a}] of rows.entries())for(const [fi,f] of a.frames.entries()){
    const key=`${si}_${ai}_${fi}`,t=createCanvas(f.width,f.height),tx=t.getContext('2d');tx.imageSmoothingEnabled=false;
    for(const l of renderOrder(j,si,ai)){const c=l.frameData[key];if(!c)continue;const im=await loadImage(c.dataURL),p=box(c);tx.globalAlpha=l.opacity??1;tx.drawImage(im,p.x,p.y,p.w,p.h);}
    cx.fillStyle='#C9D4DF';cx.fillRect(fi*(cw+1)*scale,ri*(ch+1)*scale,f.width*scale,f.height*scale);
    cx.drawImage(t,fi*(cw+1)*scale,ri*(ch+1)*scale,f.width*scale,f.height*scale);}
  fs.writeFileSync(D+file,cv.toBuffer('image/png'));
}
(async()=>{
  const res=await fetch(API);assert(res.ok);const rawBytes=Buffer.from(await res.arrayBuffer()),etag=res.headers.get('etag'),raw=JSON.parse(rawBytes);
  fs.writeFileSync(D+'base-before-outfit.json',rawBytes);fs.writeFileSync(D+'base-before-outfit.meta.json',JSON.stringify({etag,sha256:crypto.createHash('sha256').update(rawBytes).digest('hex'),bytes:rawBytes.length,at:new Date().toISOString()}));
  assert(!raw.layers.some(l=>l.name===NAME),'已存在 '+NAME);
  const p=(await new PE.ExportManager().importProject(new Blob([JSON.stringify(raw)]))).project,history=new PE.HistoryManager(),cm=new PE.CanvasManager(Object.assign(createCanvas(160,160),{style:{}}),p),tools=new PE.ToolManager();
  const old=p.layers.map(l=>({l,frames:new Map(l.frameData)}));
  const idleSI=p.spriteSheets.findIndex(s=>s.name==='original16_idle');
  // 1) 只画待机三面第 1 帧
  const source=new PE.Layer(NAME);source.sheetIndex=idleSI;source.parent=null;p.layers.push(source);
  for(const [ai,a] of p.spriteSheets[idleSI].actions.entries()){const f=a.frames[0],im=new ImageData(f.width,f.height);
    ART[a.direction].forEach((r,y)=>[...r].forEach((c,x)=>{if(c!=='.')im.data.set([...rgb(COLORS[c]),255],((y+11)*f.width+x+6)*4);}));source.frameData.set(`${idleSI}_${ai}_0`,im);}
  PE.autoPlaceLayer(p,p.layers.indexOf(source),{rename:false});
  p.currentSheetIndex=idleSI;p.currentActionIndex=0;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.indexOf(source);tools.init(p,cm,history);
  const app={project:p,history,toolManager:tools,canvasManager:cm,animationPlayer:{pause(){},_renderPreviewFrame(){}},updateAll(){},selectFrame(si,ai,fi){p.currentSheetIndex=si;p.currentActionIndex=ai;p.currentFrameIndex=fi;},persistence:{markDirty(){}}};
  // 2) 等同点击「同步衣服全部」
  const result=C.sync(app,{usePaintedSit:true});C.validate(p);PE.HairAnimation.validate(p);
  const g=source.clothingSync,linked=p.layers.filter(l=>l.clothingSyncId===g.id);
  const total=p.spriteSheets.reduce((n,s)=>n+s.actions.reduce((m,a)=>m+a.frames.length,0),0);
  let filled=0;for(const [si,s] of p.spriteSheets.entries())for(const [ai,a] of s.actions.entries())for(let fi=0;fi<a.frames.length;fi++){const key=`${si}_${ai}_${fi}`,ls=linked.filter(l=>l.getFrameData(key)?.data.some((v,i)=>i%4===3&&v));assert.equal(ls.length,1,'衣服缺帧或重复 '+s.name+' '+key);filled++;}
  assert.equal(filled,total);
  // 再同步一次应当没有新改动（坐姿自动首帧不会被当成手画源稿）
  const again=C.plan(p,source,{usePaintedSit:true});const changed=again.edits.filter(e=>{const [si,ai,fi]=e.key.split('_').map(Number),o=e.layer.getFrameData(e.key);return !(o&&o.width===e.image.width&&o.data.every((v,i)=>v===e.image.data[i]));});
  assert.equal(changed.length,0,'重复同步结果不稳定');assert(!again.sitPending);
  console.log('同步写入',result.edits.length,'帧；衣服覆盖',filled,'/',total,'帧；关联图层',linked.length,'；坐姿自动首帧',g.sitGenerated,'；保留帧',g.preserved.length);
  // 3) 候选稿：未改图层沿用原始字节
  const candidate=structuredClone(raw);candidate.currentLayerIndex=p.layers.indexOf(old[raw.currentLayerIndex].l);
  candidate.layers=p.layers.map(l=>{const o=old.find(v=>v.l===l),index=o?old.indexOf(o):-1,base=o?structuredClone(raw.layers[index]):{sheetIndex:l.sheetIndex,parent:null,...(l.depth!==undefined?{depth:l.depth}:{}),name:l.name,visible:l.visible,locked:l.locked,opacity:l.opacity,frameData:{}};
    if(o){assert.equal(l.visible,raw.layers[index].visible!==false,'原有图层可见性变化 '+l.name);assert.deepEqual([...l.frameData],[...o.frames],'原有图层像素变化 '+l.name);}
    base.parent=l.parent??null;if(l.clothingSync)base.clothingSync=structuredClone(l.clothingSync);if(l.clothingSyncId)base.clothingSyncId=l.clothingSyncId;
    if(!o)for(const [key,im] of l.frameData)base.frameData[key]={width:im.width,height:im.height,...(im.placement?{placement:{...im.placement}}:{}),dataURL:'data:image/png;base64,'+png.encode(im.width,im.height,im.data).toString('base64')};return base;});
  for(const [i,l] of candidate.layers.entries())if(l.parent!=null){assert(candidate.layers[l.parent].isGroup&&candidate.layers[l.parent].sheetIndex===l.sheetIndex,'父级错位 '+i);}
  for(const o of old){const i=p.layers.indexOf(o.l),r=raw.layers[old.indexOf(o)];assert.deepEqual({...candidate.layers[i],parent:0},{...r,parent:0});assert.equal(candidate.layers[i].parent==null?null:candidate.layers[candidate.layers[i].parent].name,r.parent==null?null:raw.layers[r.parent].name);}
  const body=Buffer.from(JSON.stringify(candidate));fs.writeFileSync(D+'base-outfit-candidate.json',body);
  const stamp=Date.now(),groups=[['basic',s=>/^original16_/.test(s.name),10],['tools',s=>['浇水','镐','斧头','锄头','镰刀','种植'].includes(s.name),6],['fishing',s=>/^钓鱼/.test(s.name),4]];
  for(const [n,f,scale] of groups)await sheetPreview(candidate,`outfit-${n}-${stamp}.png`,scale,f);
  console.log('预览',stamp,'新增图层',candidate.layers.length-raw.layers.length,'源稿位置',p.layers.indexOf(source));
  if(!SAVE){console.log('候选稿已生成，未保存');return;}
  const put=await fetch(API,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body});
  console.log('PUT',put.status,await put.text());assert.equal(put.status,200,'保存失败，候选稿保留');
  const back=await fetch(API),backRaw=Buffer.from(await back.arrayBuffer());assert.deepEqual(JSON.parse(backRaw),candidate,'回读与候选稿不一致');assert.deepEqual(JSON.parse(backRaw).spriteSheets,raw.spriteSheets);
  // 回读后的工程能被编辑器正常载入并通过校验
  const q=(await new PE.ExportManager().importProject(new Blob([backRaw]))).project;C.validate(q);PE.HairAnimation.validate(q);
  fs.writeFileSync(D+'base-outfit-saved.meta.json',JSON.stringify({etag:back.headers.get('etag'),sha256:crypto.createHash('sha256').update(backRaw).digest('hex'),bytes:backRaw.length,at:new Date().toISOString()}));
  console.log('回读验证通过',back.headers.get('etag'));
})().catch(e=>{console.error(e);process.exitCode=1;});
