const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),png=require('../png.cjs'),shared=require('../duck-three-source-test-20261103/run.cjs');
const runtime='C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
const {createCanvas,ImageData,GlobalFonts}=require(runtime+'@napi-rs/canvas'),sharp=require(runtime+'sharp');
GlobalFonts.registerFromPath('C:/Windows/Fonts/msyh.ttc','Microsoft YaHei');
const {decode,encode,applyMap,bodyInfo,render}=shared,sourceID='outfit-duck-three-source-test-1793668316419',name='服装 / JK水手服';
const templateDir=fs.readFileSync(path.join(__dirname,'../duck-three-source-test-20261103/latest.txt'),'utf8');
const frozenMaps=JSON.parse(fs.readFileSync(path.join(templateDir,'pixel-map.json'))),oldThree=JSON.parse(fs.readFileSync(path.join(templateDir,'input-three-frames.json')));
const latest=path.join(__dirname,'latest.txt'),api='http://127.0.0.1:8765/api/project?id=';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const json=(out,file,data)=>fs.writeFileSync(path.join(out,file),JSON.stringify(data,null,2));
const cel=(p,si,ai,fi,n)=>p.layers.find(l=>l.sheetIndex===si&&l.name===n&&l.frameData?.[`${si}_${ai}_${fi}`])?.frameData[`${si}_${ai}_${fi}`];
const pixel=(im,x,y)=>Array.from(im.data.subarray((y*im.width+x)*4,(y*im.width+x)*4+4));
async function get(id){const r=await fetch(api+id);assert(r.ok);const text=await r.text();return {p:JSON.parse(text),text,etag:r.headers.get('etag')};}
async function put(id,p,etag){const r=await fetch(api+id,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)}),text=await r.text();console.log('PUT',id,r.status,text);assert(r.ok,text);return get(id);}
function shoeMaterial(source,body){
  const b=bodyInfo(body),points=[];for(let x=b.x;x<=b.r;x++){const half=x<b.cx?0:1,y=b.feet[half],skin=pixel(body,x,y),c=pixel(source,x,y);if(skin[3]&&Math.max(...skin.slice(0,3))>110&&c[3])points.push({x,y,color:c.join(',')});}
  assert(points.length);const counts=new Map();for(const p of points)counts.set(p.color,(counts.get(p.color)||0)+1);const color=[...counts].sort((a,b)=>b[1]-a[1])[0][0];return points.find(p=>p.color===color);
}
function sync(baseline,bind){
  const p=structuredClone(baseline),sources={},materials={},maps={},shoeErrors=[];
  for(let ai=0;ai<3;ai++){const dir=p.spriteSheets[0].actions[ai].direction;sources[dir]=decode(cel(p,0,ai,0,name));const body=decode(cel(p,0,ai,0,'body')),b=bodyInfo(body);materials[dir]={shoe:shoeMaterial(sources[dir],body),outline:{x:b.l,y:b.top+1,color:pixel(sources[dir],b.l,b.top+1).join(',')}};}
  for(const [key,originalMap]of Object.entries(frozenMaps)){
    const dir=originalMap.sourceDirection,source=sources[dir],old=decode(oldThree[dir]),material=materials[dir],m=structuredClone(originalMap);
    // Color bindings are material roles: the old map's white swatch was on its collar, not necessarily on a new outfit's shoe.
    m.samples=m.samples.map(s=>{if(!s||!bind||s[2]==='collar')return s;const c=pixel(old,s[0],s[1]);if(s[2]==='shoe'&&c[0]===255&&c[1]===255&&c[2]===255)return [material.shoe.x,material.shoe.y,s[2]];if(Math.max(...c.slice(0,3))<110)return [material.outline.x,material.outline.y,s[2]];return s;});
    assert.deepEqual(m.samples.map(s=>s?.[2]??null),originalMap.samples.map(s=>s?.[2]??null),'每个目标像素的分区和位置沿用原模板，不为JK逐帧重画');
    const im=applyMap(source,m),[si]=key.split('_').map(Number),l=p.layers.find(l=>l.sheetIndex===si&&l.name===name);l.frameData[key]=encode(im);maps[key]=m;
    const palette=new Set();for(let i=0;i<source.data.length;i+=4)if(source.data[i+3])palette.add(Array.from(source.data.slice(i,i+4)).join(','));
    for(let i=0;i<im.data.length;i+=4)if(im.data[i+3])assert(palette.has(Array.from(im.data.slice(i,i+4)).join(',')));
    originalMap.samples.forEach((s,i)=>{if(!s)return;if(bind&&s[2]!=='collar')assert.equal(im.data[i*4+3],255,key+' 衣片和描边不能因旧取色点透明而消失');if(s[2]!=='shoe')return;const oldC=pixel(old,s[0],s[1]);if(oldC[0]===255&&oldC[1]===255&&oldC[2]===255){const actual=Array.from(im.data.slice(i*4,i*4+4)).join(',');if(actual!==material.shoe.color)shoeErrors.push({key,pixel:i,actual,expected:material.shoe.color});}});
  }
  if(bind)assert.equal(shoeErrors.length,0,'鞋不能误采水手领颜色');
  return {p,maps,materials,shoeErrors};
}
async function prepare(){
  const source=await get(sourceID),stamp=Date.now(),out=path.join(root,'自检记录',`JK三首帧自动同步测试-20261103-${stamp}`);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(latest,out);fs.writeFileSync(path.join(out,'source-duck-original.json'),source.text);
  const template=JSON.parse(fs.readFileSync(path.join(templateDir,'baseline-three-only.json')));
  assert.deepEqual(source.p.spriteSheets,template.spriteSheets,'素体帧结构已变，旧映射需要重新校验');
  const isBase=l=>['body','head'].includes(l.name);
  assert.deepEqual(source.p.layers.filter(isBase).map(l=>[l.sheetIndex,l.name,l.frameData]),template.layers.filter(isBase).map(l=>[l.sheetIndex,l.name,l.frameData]),'素体像素已变，不能盲套旧对应图');
  const p=structuredClone(source.p),sources={};p.name='JK水手服｜三张待机自动同步测试（无手）';p.layers=p.layers.filter(l=>isBase(l)||l.name==='服装 / 衣服-小黄鸭');
  for(const l of p.layers)if(l.name==='服装 / 衣服-小黄鸭'){l.name=name;l.frameData={};l.visible=true;l.locked=false;}
  for(let ai=0;ai<3;ai++){
    const dir=p.spriteSheets[0].actions[ai].direction,asset={down:'front',side:'side',up:'back'}[dir],im=png.decode(fs.readFileSync(path.join(__dirname,'out/sprites/jk-'+asset+'.png'))),body=decode(cel(p,0,ai,0,'body')),b=bodyInfo(body);assert.equal(im.width,14);assert.equal(im.height,10);
    const frame={width:body.width,height:body.height,data:new Uint8Array(body.width*body.height*4)};for(let y=0;y<10;y++)for(let x=0;x<14;x++)frame.data.set(pixel(im,x,y),((y+b.top)*frame.width+x+b.l)*4);
    const f=encode(frame);p.layers.find(l=>l.sheetIndex===0&&l.name===name).frameData[`0_${ai}_0`]=f;sources[dir]=f;
  }
  assert.equal(p.layers.filter(l=>l.name===name).reduce((n,l)=>n+Object.keys(l.frameData).length,0),3);assert(!p.layers.some(l=>/hand|头发|前发|后发/.test(l.name)));
  p.currentSheetIndex=0;p.currentActionIndex=1;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.findIndex(l=>l.sheetIndex===0&&l.name===name);
  p.palette=[...p.palette.slice(0,3),...['34384b','fffaf0','d4dde6','485b7a','34445f','7586a1','be5161','61504b'].map(h=>({r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4),16),a:255}))];
  const id='outfit-jk-three-source-test-'+stamp,meta={id,sourceID,sourceETag:source.etag,sourceSHA256:hash(source.text),geometryTemplateSHA256:hash(fs.readFileSync(path.join(templateDir,'pixel-map.json'))),templateDir,url:'http://localhost:8765/index.html?project='+id};
  json(out,'baseline-three-only.json',p);json(out,'input-three-frames.json',sources);json(out,'manifest.json',meta);
  const absent=await fetch(api+id);assert.equal(absent.status,404);const back=await put(id,p,'none');assert.deepEqual(back.p,p);meta.testETag=back.etag;json(out,'manifest.json',meta);fs.writeFileSync(path.join(out,'baseline-api.json'),back.text);console.log('CREATED',meta.url,'OUTPUT',out);
}
async function overview(out,p){
  const c=createCanvas(672,224),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#e3dfe9';g.fillRect(0,0,c.width,c.height);for(let ai=0;ai<3;ai++){const dir=p.spriteSheets[0].actions[ai].direction,f=decode(cel(p,0,ai,0,name)),b=bodyInfo(decode(cel(p,0,ai,0,'body'))),tile=createCanvas(f.width,f.height);tile.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(f.data),f.width,f.height),0,0);g.drawImage(tile,b.l,b.top,14,10,ai*224+28,24,168,120);g.drawImage(tile,b.l,b.top,14,10,ai*224+105,166,14,10);g.fillStyle='#34384b';g.font='16px Microsoft YaHei';g.fillText({side:'侧面首帧',down:'正面首帧',up:'背面首帧'}[dir],ai*224+72,207);}fs.writeFileSync(path.join(out,'JK-三张待机首帧.png'),c.toBuffer('image/png'));
  const raw=[],si=1,ai=1,a=p.spriteSheets[si].actions[ai],w=192,h=144;for(let fi=0;fi<a.frames.length;fi++){const im=decode(cel(p,si,ai,fi,name)),t=createCanvas(im.width,im.height);t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(im.data),im.width,im.height),0,0);const c=createCanvas(w,h),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#e3dfe9';ctx.fillRect(0,0,w,h);ctx.drawImage(t,4,19,24,18,0,0,w,h);raw.push(Buffer.from(ctx.getImageData(0,0,w,h).data));}await sharp(Buffer.concat(raw),{raw:{width:w,height:h*raw.length,channels:4,pageHeight:h}}).gif({delay:a.frames.map(f=>Math.round(f.duration/10)*10),loop:0,dither:0,keepDuplicateFrames:true}).toFile(path.join(out,'JK-正面行走-衣服.gif'));
}
async function build(out){
  const baseline=JSON.parse(fs.readFileSync(path.join(out,'baseline-three-only.json'))),unbound=sync(baseline,false);assert(unbound.shoeErrors.length>0,'这个跨衣型样例应暴露旧颜色取样点不能直接复用');json(out,'unbound-transfer.json',unbound.p);json(out,'material-binding-before-errors.json',unbound.shoeErrors);
  const start=performance.now(),r=sync(baseline,true),syncMilliseconds=performance.now()-start;assert.equal(Object.keys(r.maps).length,67);
  const poisoned=structuredClone(baseline);for(const [key]of Object.entries(frozenMaps)){const si=+key.split('_')[0];poisoned.layers.find(l=>l.sheetIndex===si&&l.name===name).frameData[key]={poison:'不能读取已有其他帧'};}assert.deepEqual(sync(poisoned,true).p,r.p);
  assert.deepEqual(r.p.spriteSheets,baseline.spriteSheets);r.p.layers.forEach((l,i)=>{if(l.name!==name)assert.deepEqual(l,baseline.layers[i]);});for(let ai=0;ai<3;ai++)assert.deepEqual(cel(r.p,0,ai,0,name),cel(baseline,0,ai,0,name));
  for(let si=0;si<5;si++)for(let ai=0;ai<r.p.spriteSheets[si].actions.length;ai++)for(let fi=0;fi<r.p.spriteSheets[si].actions[ai].frames.length;fi++){const body=decode(cel(r.p,si,ai,fi,'body')),cloth=decode(cel(r.p,si,ai,fi,name));for(let y=0;y<body.height;y++)for(let x=0;x<body.width;x++){const c=pixel(body,x,y);if(c[3]&&Math.max(...c.slice(0,3))>110)assert(pixel(cloth,x,y)[3],'衣片不能露出原素体内部');}}
  for(let ai=0;ai<2;ai++){let fixed;for(let fi=0;fi<4;fi++){const m=r.maps[`3_${ai}_${fi}`],sole=m.samples.map((s,i)=>s?.[2]==='shoe'?[i,...s.slice(0,2)]:null).filter(Boolean);if(fixed)assert.deepEqual(sole,fixed,'坐姿呼吸时鞋底不能漂');else fixed=sole;}}
  const restore=structuredClone(r.p);restore.layers.forEach((l,i)=>{if(l.name===name)l.frameData=structuredClone(baseline.layers[i].frameData);});assert.deepEqual(restore,baseline);json(out,'restore-extra-copy.json',restore);json(out,'candidate.json',r.p);json(out,'bound-pixel-map.json',r.maps);json(out,'material-bindings.json',r.materials);
  const before=await render(out,baseline,'baseline',name),after=await render(out,r.p,'candidate',name);await overview(out,r.p);
  fs.copyFileSync(path.join(__dirname,'art.px.js'),path.join(out,'source-art.px.js'));
  json(out,'verification.json',{sourceClothingFrames:3,generated:67,total:70,firstThreeExact:true,allRGBFromCorrespondingDirectionSource:true,bodyHeadFramesAndTimingsUnchanged:true,geometryTemplateUnchanged:true,geometryTemplateSHA256:hash(fs.readFileSync(path.join(templateDir,'pixel-map.json'))),noJKPerPoseHandPainting:true,noOtherClothingFramesRead:true,oldUnboundShoeErrors:unbound.shoeErrors.length,boundShoeErrors:0,materialRebindingRequired:true,syncMilliseconds,restoreExtraCopyExact:true,before,after,browserChecked:false,visualReviewPending:true});console.log('BUILT',out,`old shoe errors=${unbound.shoeErrors.length}; bound=0; sync=${syncMilliseconds.toFixed(1)}ms`);
}
async function publish(out){const meta=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'))),baseline=JSON.parse(fs.readFileSync(path.join(out,'baseline-three-only.json'))),candidate=JSON.parse(fs.readFileSync(path.join(out,'candidate.json'))),before=await get(meta.id);assert.deepEqual(before.p,baseline,'测试工程有新修改，停止覆盖');assert.equal(before.etag,meta.testETag);const back=await put(meta.id,candidate,meta.testETag);assert.deepEqual(back.p,candidate);fs.writeFileSync(path.join(out,'api-readback.json'),back.text);const source=await get(sourceID);assert.equal(hash(source.text),meta.sourceSHA256,'小黄鸭工程期间已变化');const v=JSON.parse(fs.readFileSync(path.join(out,'verification.json')));Object.assign(v,{published:true,apiReadbackExact:true,sourceDuckSHA256StillExact:true,publishedETag:back.etag});json(out,'verification.json',v);fs.writeFileSync(path.join(out,'说明与恢复.md'),`# JK水手服三首帧自动同步测试\n\n工程：${meta.url}\n\n绘画输入只有待机正/侧/背第一帧，白色水手上衣、海军蓝领片和短褶裙、红领结、棕色便鞋。其余67帧复用小黄鸭的像素位置/分区对应图；未手绘JK的其他动作。\n\n跨衣型测试发现旧地图把鞋白色取样点放在领口，直接换JK会把鞋染成领片蓝色。已按鞋材质从新首帧脚末端绑定鞋色；目标像素占位和分区完全不变。未借用其他JK动作图。\n\n输入：input-three-frames.json、art.px.js；输出：candidate.json；未绑定失败记录：material-binding-before-errors.json；验证：verification.json。同步是本地像素运算，不调用生成模型。\n\n无手部，无头发或编辑器功能修改。小黄鸭源工程SHA256：${meta.sourceSHA256}，交付前GET检查不变。\n\n恢复：baseline-three-only.json为本JK测试工程初始三源状态。只恢复该工程服装层frameData，restore-extra-copy.json已在额外副本验证。在线恢复须先GET比较后续用户修改，再带当前ETag条件保存；不得覆盖用户草稿。小黄鸭工程没有写入，无需恢复。\n\n限度：当前小体型、短上衣/短裙、单行鞋模板；不保证长裙、长靴或任意比例都适配。尚未接编辑器一键按钮，未进行浏览器实测。\n`);console.log('PUBLISHED',meta.url);}
(async()=>{const mode=process.argv[2]||'prepare';if(mode==='prepare')await prepare();else{const out=fs.readFileSync(latest,'utf8');if(mode==='build')await build(out);else if(mode==='publish')await publish(out);else throw Error(mode);}})().catch(e=>{console.error(e);process.exitCode=1});

