const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {makeMap,applyMap,decode,encode,bodyInfo,render}=require('../duck-three-source-test-20261103/run.cjs');
const runtime='C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
const {createCanvas,ImageData,GlobalFonts}=require(runtime+'@napi-rs/canvas');GlobalFonts.registerFromPath('C:/Windows/Fonts/msyh.ttc','Microsoft YaHei');
const root=path.resolve(__dirname,'../..'),latest=path.join(__dirname,'latest.txt'),origin='outfit-duck-three-source-test-1793668316419';
const api='http://127.0.0.1:8765/api/project?id=',clothName='服装 / 衣服-小黄鸭',shadowName='阴影实验 / 素体暗面→黄色布料（可关闭）';
const light=[254,237,225,255],yellow=[251,207,78,255],gold=[187,146,21,255],same=(a,b)=>a.every((v,i)=>v===b[i]);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),json=(out,n,v)=>fs.writeFileSync(path.join(out,n),JSON.stringify(v,null,2));
const cel=(p,si,ai,fi,name)=>p.layers.find(l=>l.sheetIndex===si&&l.name===name&&l.frameData?.[`${si}_${ai}_${fi}`])?.frameData[`${si}_${ai}_${fi}`];
const pixel=(im,x,y)=>x<0||y<0||x>=im.width||y>=im.height?[0,0,0,0]:Array.from(im.data.slice((y*im.width+x)*4,(y*im.width+x)*4+4));
const border=c=>c[3]&&Math.max(...c.slice(0,3))<110;
async function get(id){const r=await fetch(api+id);assert(r.ok,'GET '+r.status);const text=await r.text();return {p:JSON.parse(text),text,etag:r.headers.get('etag')};}
async function put(id,p,etag){const r=await fetch(api+id,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)}),text=await r.text();console.log('PUT',id,r.status,text);assert(r.ok,text);return get(id);}
function identityMap(image,body,dir){const b=bodyInfo(body);return {width:image.width,height:image.height,sourceDirection:dir,samples:Array.from({length:image.width*image.height},(_,i)=>{if(!image.data[i*4+3])return null;const x=i%image.width,y=Math.floor(i/image.width),part=y<b.top+3?'collar':y>=b.b?'shoe':y===b.b-1?'skirt':y===b.b-2?'hem':'torso';return [x,y,part];})};}
function bodyClasses(body){
  const b=bodyInfo(body),mask=new Uint8Array(body.width*body.height),counts={empty:0,outline:0,light:0,neckShadow:0,surfaceShadow:0,lowerDepth:0},names=Object.keys(counts);
  for(let y=0;y<body.height;y++)for(let x=0;x<body.width;x++){const c=pixel(body,x,y),id=!c[3]?0:border(c)?1:same(c,light)?2:y<b.top+2?3:y>=b.b-5?5:4;mask[y*body.width+x]=id;counts[names[id]]++;}
  return {mask,counts};
}
// shortcut: this experiment binds only the existing yellow/gold fabric ramp; skirt folds and white shoe shading are not inferred from leg colors.
function shade(cloth,body,map,ramps=[{light:yellow,shadow:gold}]){
  const {mask,counts}=bodyClasses(body),overlay={width:cloth.width,height:cloth.height,data:new Uint8Array(cloth.data.length)},baked={...cloth,data:new Uint8Array(cloth.data)},changed=[];
  assert.equal(cloth.width,body.width);assert.equal(cloth.height,body.height);
  for(let i=0;i<mask.length;i++){
    const part=map.samples[i]?.[2];if(mask[i]<3||!['collar','torso'].includes(part))continue;
    const before=Array.from(cloth.data.slice(i*4,i*4+4)),ramp=ramps.find(r=>same(before,r.light));if(!ramp)continue;
    overlay.data.set(ramp.shadow,i*4);baked.data.set(ramp.shadow,i*4);changed.push({x:i%cloth.width,y:Math.floor(i/cloth.width),part,bodyClass:mask[i],before,after:ramp.shadow});
  }
  return {overlay,baked,mask,counts,changed};
}
function geometry(source){
  const p=structuredClone(source),maps={},sources={};for(let ai=0;ai<3;ai++){const dir=p.spriteSheets[0].actions[ai].direction;sources[dir]={cloth:decode(cel(p,0,ai,0,clothName)),body:decode(cel(p,0,ai,0,'body'))};}
  for(let si=0;si<5;si++)for(let ai=0;ai<p.spriteSheets[si].actions.length;ai++)for(let fi=0;fi<p.spriteSheets[si].actions[ai].frames.length;fi++){
    const key=`${si}_${ai}_${fi}`,s=p.spriteSheets[si],dir=s.actions[ai].direction,body=decode(cel(p,si,ai,fi,'body')),src=sources[dir];
    if(si===0&&fi===0){maps[key]=identityMap(src.cloth,body,dir);continue;}
    const map=makeMap(src.cloth,src.body,body,dir,s.name.replace('original32_',''));p.layers.find(l=>l.sheetIndex===si&&l.name===clothName).frameData[key]=encode(applyMap(src.cloth,map));maps[key]=map;
  }
  return {p,maps};
}
function experiment(base){
  const {p:control,maps}=geometry(base),layered=structuredClone(control),baked=structuredClone(control),records=[],classes={};
  for(let si=0;si<5;si++)layered.layers.push({sheetIndex:si,parent:null,depth:0,name:shadowName,visible:true,locked:false,opacity:1,frameData:{}});
  for(let si=0;si<5;si++)for(let ai=0;ai<control.spriteSheets[si].actions.length;ai++)for(let fi=0;fi<control.spriteSheets[si].actions[ai].frames.length;fi++){
    const key=`${si}_${ai}_${fi}`,body=decode(cel(control,si,ai,fi,'body')),cloth=decode(cel(control,si,ai,fi,clothName)),result=shade(cloth,body,maps[key]);
    layered.layers.find(l=>l.sheetIndex===si&&l.name===shadowName).frameData[key]=encode(result.overlay);baked.layers.find(l=>l.sheetIndex===si&&l.name===clothName).frameData[key]=encode(result.baked);records.push({key,counts:result.counts,changes:result.changed});classes[key]=Array.from(result.mask);
    const flat={...body,data:new Uint8Array(body.data)};for(let i=0;i<flat.data.length;i+=4)if(flat.data[i+3]&&!border(Array.from(flat.data.slice(i,i+4))))flat.data.set(light,i);
    assert.equal(shade(cloth,flat,maps[key]).changed.length,0,'同轮廓去掉素体阴影后，新增阴影必须消失');
    for(let i=0;i<cloth.data.length;i+=4){assert.equal(result.baked.data[i+3],cloth.data[i+3]);if(!same(Array.from(cloth.data.slice(i,i+4)),yellow))assert.deepEqual(Array.from(result.baked.data.slice(i,i+4)),Array.from(cloth.data.slice(i,i+4)),'领口装饰、裙鞋、描边不得重配色');}
  }
  assert(records.reduce((n,r)=>n+r.changes.length,0)>0);
  const key='1_0_0',body=decode(cel(control,1,0,0,'body')),cloth=decode(cel(control,1,0,0,clothName)),b=bodyInfo(body),mirrored={...body,data:new Uint8Array(body.data)};
  for(let y=b.top+2;y<=b.b;y++)for(let x=b.x;x<=b.r;x++){const c=pixel(body,x,y);if(!c[3]||border(c))continue;const other=pixel(body,Math.round(2*b.cx-x),y);mirrored.data.set(other[3]&&!border(other)&&!same(other,light)?[224,197,180,255]:light,(y*body.width+x)*4);}
  const a=shade(cloth,body,maps[key]),m=shade(cloth,mirrored,maps[key]);assert.notDeepEqual(Array.from(a.overlay.data),Array.from(m.overlay.data),'同轮廓只移动暗面，布料阴影应跟着变化');
  return {control,layered,baked,maps,records,classes,causal:{flatMaskAddsZeroShadows:true,mirroredShadowChangesClothing:true,example:key,originalShadowPixels:a.changed.length,mirroredShadowPixels:m.changed.length}};
}
async function prepare(){
  const source=await get(origin),stamp=Date.now(),out=path.join(root,'自检记录',`小黄鸭素体阴影驱动实验-20261103-${stamp}`);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(latest,out);fs.writeFileSync(path.join(out,'source-original.json'),source.text);
  const p=structuredClone(source.p);assert.equal(p.spriteSheets[0].name,'original32_idle');p.name='小黄鸭｜素体阴影驱动对照实验（无手）';p.layers=p.layers.filter(l=>['body','head',clothName].includes(l.name));
  for(const l of p.layers)if(l.name===clothName){l.visible=true;l.locked=false;for(const key of Object.keys(l.frameData))if(l.sheetIndex!==0||!key.endsWith('_0'))delete l.frameData[key];}
  assert.equal(p.layers.filter(l=>l.name===clothName).reduce((n,l)=>n+Object.keys(l.frameData).length,0),3);assert(!p.layers.some(l=>/hand|头发|前发|后发/.test(l.name)));
  p.currentSheetIndex=1;p.currentActionIndex=0;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.findIndex(l=>l.sheetIndex===1&&l.name===clothName);
  const id='outfit-duck-body-shadow-test-'+stamp,meta={id,origin,sourceETag:source.etag,sourceSHA256:hash(source.text),url:'http://localhost:8765/index.html?project='+id};json(out,'manifest.json',meta);json(out,'baseline-three-only.json',p);
  const r=await fetch(api+id);assert.equal(r.status,404);const saved=await put(id,p,'none');assert.deepEqual(saved.p,p);meta.testETag=saved.etag;json(out,'manifest.json',meta);console.log('CREATED',meta.url,'OUTPUT',out);
}
async function layeredEquivalence(layered,baked){
  const a=(await new PE.ExportManager().importProject(new Blob([JSON.stringify(layered)]))).project,b=(await new PE.ExportManager().importProject(new Blob([JSON.stringify(baked)]))).project,ac=new PE.CanvasManager(document.createElement('canvas'),a),bc=new PE.CanvasManager(document.createElement('canvas'),b);let n=0;
  for(let si=0;si<5;si++)for(let ai=0;ai<a.spriteSheets[si].actions.length;ai++)for(let fi=0;fi<a.spriteSheets[si].actions[ai].frames.length;fi++){assert.deepEqual(ac.getCompositeImageData(si,ai,fi,true,1).data,bc.getCompositeImageData(si,ai,fi,true,1).data,'分层工程与烘焙预览必须逐像素相同');n++;}return n;
}
function drawCompare(out,r,garment=clothName){
  const examples=[['0_0_0','侧面待机首帧'],['1_0_0','侧面行走1'],['1_0_1','侧面行走2'],['1_1_1','正面行走2'],['2_0_2','侧面拾取3'],['3_0_0','侧面坐姿1']],w=264,h=150,c=createCanvas(4*w,examples.length*h+38),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#e4dfee';g.fillRect(0,0,c.width,c.height);g.fillStyle='#24243b';g.font='17px Microsoft YaHei';['素体：实际明暗','素体阴影分区','仅位置同步（对照）','阴影驱动（实验）'].forEach((t,i)=>g.fillText(t,i*w+12,26));
  const colors=[[0,0,0,0],[70,70,94,255],[244,224,209,255],[151,95,171,255],[98,108,170,255],[65,133,150,255]];
  for(let row=0;row<examples.length;row++){
    const [key,label]=examples[row],[si,ai,fi]=key.split('_').map(Number),body=decode(cel(r.control,si,ai,fi,'body')),b=bodyInfo(body),mask={width:body.width,height:body.height,data:new Uint8Array(body.data.length)};r.classes[key].forEach((id,i)=>mask.data.set(colors[id],i*4));
    const images=[body,mask,decode(cel(r.control,si,ai,fi,garment)),decode(cel(r.baked,si,ai,fi,garment))],y=38+row*h;
    images.forEach((im,col)=>{const t=createCanvas(im.width,im.height);t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(im.data),im.width,im.height),0,0);g.fillStyle=row%2?'#2b2b38':'#eeeaf2';g.fillRect(col*w,y,w,h);g.drawImage(t,b.x-2,b.top-3,b.w+4,b.h+5,col*w+28,y+5,(b.w+4)*7,(b.h+5)*7);g.drawImage(t,b.x-2,b.top-3,b.w+4,b.h+5,col*w+225,y+75,b.w+4,b.h+5);g.fillStyle=row%2?'#fff':'#24243b';g.font='13px Microsoft YaHei';g.fillText(label,col*w+10,y+h-12);});
  }
  fs.writeFileSync(path.join(out,'素体-阴影分区-旧同步-新阴影对照.png'),c.toBuffer('image/png'));
}
async function build(out){
  const base=JSON.parse(fs.readFileSync(path.join(out,'baseline-three-only.json'))),r=experiment(base);assert.deepEqual(r.layered.spriteSheets,base.spriteSheets);r.layered.layers.forEach((l,i)=>{if(['body','head'].includes(l.name))assert.deepEqual(l,base.layers[i]);});for(let ai=0;ai<3;ai++)assert.deepEqual(cel(r.layered,0,ai,0,clothName),cel(base,0,ai,0,clothName));
  const poisoned=structuredClone(base);for(let si=0;si<5;si++)for(let ai=0;ai<base.spriteSheets[si].actions.length;ai++)for(let fi=0;fi<base.spriteSheets[si].actions[ai].frames.length;fi++)if(si!==0||fi!==0)poisoned.layers.find(l=>l.sheetIndex===si&&l.name===clothName).frameData[`${si}_${ai}_${fi}`]={poison:true};assert.deepEqual(experiment(poisoned).layered,r.layered,'旧衣服动作不能参与生成');
  json(out,'candidate.json',r.layered);json(out,'control-geometry-only.json',r.control);json(out,'preview-baked-only.json',r.baked);json(out,'shadow-mask-classes.json',r.classes);json(out,'changes.json',r.records);json(out,'causal-tests.json',r.causal);json(out,'pixel-map.json',r.maps);
  const restore=structuredClone(r.layered);restore.layers=restore.layers.filter(l=>l.name!==shadowName);restore.layers.forEach((l,i)=>{if(l.name===clothName)l.frameData=structuredClone(base.layers[i].frameData);});assert.deepEqual(restore,base);json(out,'restore-extra-copy.json',restore);
  const before=await render(out,r.control,'baseline',clothName),after=await render(out,r.baked,'candidate',clothName),equivalent=await layeredEquivalence(r.layered,r.baked),disabled=structuredClone(r.layered);disabled.layers.filter(l=>l.name===shadowName).forEach(l=>l.visible=false);const toggledOff=await layeredEquivalence(disabled,r.control);drawCompare(out,r);
  for(let ai=0;ai<3;ai++)for(const [a,b]of [[0,1],[2,3]])assert.deepEqual(cel(r.layered,0,ai,a,shadowName),cel(r.layered,0,ai,b,shadowName),'同姿势相邻待机帧不应有阴影闪烁');
  const changes=r.records.reduce((n,x)=>n+x.changes.length,0),changedFrames=r.records.filter(x=>x.changes.length).length;json(out,'verification.json',{sourceClothingFrames:3,total:70,generatedOtherFrames:67,firstThreeBaseCelsExact:true,lightingAlsoAppliedConsistentlyToSourcePoses:true,nonDestructiveShadowOverlayLayers:5,changedPixels:changes,changedFrames,sourceExistingYellowGoldRampOnly:true,otherClothingColorsAndAlphaExact:true,bodyHeadMetadataAndTimingsExact:true,existingOtherClothingFramesNotRead:true,whiteShoesAndSkirtExcludedFromBodyLegShadows:true,causalTests:r.causal,restoreExtraCopyExact:true,before,after,layeredAndBakedEquivalentFrames:equivalent,toggleOffMatchesControlFrames:toggledOff,idleSamePoseAdjacentShadowLayersExact:true,browserChecked:false,visualReviewPending:true,limitations:['仅实验黄色布料的明暗，白领/裙片/鞋仍保留原画','几何分区仍是当前短衣裙素体模板，不宣称全自动理解任何服装','上衣新增投影和自带金黄细节可能同色，需要视觉复核']});console.log('BUILT',out,`shadow changes=${changes}; affectedFrames=${changedFrames}; equivalent=${equivalent}; toggle-off=${toggledOff}`);
}
async function publish(out){const meta=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'))),base=JSON.parse(fs.readFileSync(path.join(out,'baseline-three-only.json'))),candidate=JSON.parse(fs.readFileSync(path.join(out,'candidate.json'))),current=await get(meta.id);assert.deepEqual(current.p,base,'测试工程已被修改，停止覆盖');assert.equal(current.etag,meta.testETag);const saved=await put(meta.id,candidate,current.etag);assert.deepEqual(saved.p,candidate);fs.writeFileSync(path.join(out,'api-readback.json'),saved.text);const source=await get(origin);assert.equal(hash(source.text),meta.sourceSHA256,'原工程在实验期间发生变化');const v=JSON.parse(fs.readFileSync(path.join(out,'verification.json')));Object.assign(v,{published:true,apiReadbackExact:true,sourceProjectSHA256StillExact:true,publishedETag:saved.etag});json(out,'verification.json',v);fs.writeFileSync(path.join(out,'说明与恢复.md'),`# 小黄鸭素体阴影驱动实验\n\n工程：${meta.url}\n\n只读取待机正/侧/背首帧的衣服，全部动作素体的轮廓和实际明暗。旧小黄鸭其他服装动作不作为标准答案。黄色布料以当前源稿已有黄色/金黄两级响应素体暗面；不复制肤色。\n\n本体三张首帧逐字节保留。每个动作表新增可关闭的“${shadowName}”层，三首帧也使用同样照明，避免相同姿势前后亮度闪烁。隐藏此层即可查看仅位置同步的对照。仅阴影层新增像素，本体配色不被不可逆改写。\n\n这轮只验证黄色布料。白色领口、裙片和白鞋均不强套皮肤/腿部阴影；裙片的折叠、其他材质和完整色阶仍待测试。不是完成版。\n\ncausal-tests.json记录：同轮廓清除素体暗面后新增阴影消失；同轮廓仅镜像暗面后布料阴影改变。verification.json包含70帧主画布/导出检查及分层工程和烘焙预览的等价检查。\n\n原工程SHA256：${meta.sourceSHA256}。source-original.json为原工程备份；baseline-three-only.json为新测试工程初始状态；control-geometry-only.json为无新阴影的对照；candidate.json为实际分层结果；preview-baked-only.json仅供成图核验，不作为发布工程。\n\n恢复：要关闭实验只需隐藏对应“阴影实验”层。要撤回全部生成，在本独立测试工程中移除这些新阴影层，并按baseline-three-only.json恢复服装frameData。restore-extra-copy.json已在额外副本验证与初始状态完全一致。在线恢复必须GET并比较后续改动、带ETag条件保存，不能强盖用户草稿。原工程没有写入，无需恢复。\n\n未改编辑器代码、手、头发或其他用户绘画层，未操作或刷新浏览器。\n`);console.log('PUBLISHED',meta.url);}
module.exports={shade,bodyClasses,identityMap,layeredEquivalence,drawCompare};
if(require.main===module)(async()=>{const mode=process.argv[2]||'prepare';if(mode==='prepare')await prepare();else{const out=fs.readFileSync(latest,'utf8');if(mode==='build')await build(out);else if(mode==='publish')await publish(out);else throw Error(mode);}})().catch(e=>{console.error(e);process.exitCode=1});
