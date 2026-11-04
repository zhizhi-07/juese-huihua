const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,Image,ImageData,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),backup=path.join(root,'备份/20261031-双工程坐姿首帧同步-1793409880926'),out=path.join(root,'自检记录/双工程坐姿首帧同步-20261031');
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const name of ['core','canvas','export'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'));
const syncBase=require('../js/character-sync.js'),read=(dir,f)=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')),write=(dir,f,value)=>fs.writeFileSync(path.join(dir,f),typeof value==='string'?value:JSON.stringify(value,null,2));
const decode=async data=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project;
function image(d){const c=createCanvas(d.width,d.height);c.getContext('2d').putImageData(d,0,0);return c;}
function encode(d,source){return {...source,width:d.width,height:d.height,dataURL:image(d).toDataURL('image/png'),...(d.placement?{placement:{...d.placement}}:{})};}
function warp(source,dy,cut=Infinity){
  const r=source.placement;if(r){const d=PE.utils.cloneImageData(source);d.placement.y+=dy;return d;}
  const d=new ImageData(source.width,source.height);
  for(let y=0;y<d.height;y++){const sy=y<cut?y-dy:y;if(sy>=0&&sy<source.height)d.data.set(source.data.subarray(sy*source.width*4,(sy+1)*source.width*4),y*d.width*4);}
  return d;
}
function samePixels(a,b){return !!a&&!!b&&a.width===b.width&&a.height===b.height&&JSON.stringify(a.placement)===JSON.stringify(b.placement)&&a.data.every((v,i)=>v===b.data[i]);}
function render(p,ai,fi,mode='actual',scale=10){const visible=p.layers.map(l=>l.visible);p.selectFrame(10,ai,fi);if(mode==='bare')for(const l of p.layers)if(/^(头发|服装) \//.test(l.name))l.visible=false;const cm=new PE.CanvasManager(document.createElement('canvas'),p),d=cm.getCompositeImageData(10,ai,fi,true,scale);p.layers.forEach((l,i)=>l.visible=visible[i]);assert(d.data.some((v,i)=>i%4===3&&v),'No blank QA');return d;}
async function make(base,kind){
  const p=await decode(base),candidate=structuredClone(base),changed=[],si=base.spriteSheets.findIndex(s=>s.name==='original32_sit');assert.equal(si,10);assert.equal(base.spriteSheets[si].actions[0].direction,'side');
  const indices=kind==='主工程'?[227,259,260]:[169,199,200,201];
  for(const li of indices){
    const layer=base.layers[li],source=p.layers[li].getFrameData('10_0_0');assert(source,`${kind}: missing first ${li}`);
    if(kind==='主工程')assert(/^(head|眼睛 \/|嘴巴 \/)/.test(layer.name));else assert(/^(服装|头发|眼睛) \//.test(layer.name)&&!layer.inheritedBase);
    const cut=layer.name==='head'?25:layer.name.startsWith('服装 /')?27:Infinity;
    for(let fi=1;fi<4;fi++){
      const key=`10_0_${fi}`,next=warp(source,fi<2?0:1,cut),before=p.layers[li].getFrameData(key);
      if(samePixels(next,before))continue;
      candidate.layers[li].frameData[key]=fi===1?structuredClone(layer.frameData['10_0_0']):encode(next,layer.frameData[key]||layer.frameData['10_0_0']);changed.push([li,key]);
      if(next.placement)assert.deepEqual(next.data,source.data,'HD source pixels must remain exact');
      if(cut!==Infinity)assert.deepEqual(next.data.subarray(cut*next.width*4),source.data.subarray(cut*source.width*4),'Grounded lower rows exact');
      if(cut===Infinity&&!next.placement){for(let y=next.height-1;y<source.height;y++)assert(source.data.subarray(y*source.width*4,(y+1)*source.width*4).every(v=>v===0),'No hair clipped below canvas');}
    }
  }
  const restored=structuredClone(candidate);for(const[li,key]of changed){if(base.layers[li].frameData[key])restored.layers[li].frameData[key]=base.layers[li].frameData[key];else delete restored.layers[li].frameData[key];}assert.deepEqual(restored,base,'Only authorized future side cels changed');
  for(let li=0;li<base.layers.length;li++)for(const ai of [0,1,2])assert.deepEqual(candidate.layers[li].frameData?.[`10_${ai}_0`],base.layers[li].frameData?.[`10_${ai}_0`],'All sitting first cels preserved');
  return {candidate,changed};
}
async function qa(before,after,dir,kind){
  fs.mkdirSync(dir,{recursive:true});const a=await decode(before),b=await decode(after),sheet=createCanvas(4*320,4*320),c=sheet.getContext('2d');c.imageSmoothingEnabled=false;
  for(let fi=0;fi<4;fi++)for(let mode=0;mode<2;mode++)for(const [row,model]of [[mode*2,a],[mode*2+1,b]]){const d=render(model,0,fi,mode?'bare':'actual');c.fillStyle=mode?'#ded8e9':'#363a44';c.fillRect(fi*320,row*320,320,320);c.drawImage(image(d),fi*320,row*320,320,320);c.fillStyle=mode?'#333':'#fff';c.font='14px sans-serif';c.fillText((model===a?'BEFORE ':'AFTER ')+(mode?'BARE ':'')+'#'+(fi+1),fi*320+4,row*320+15);}
  fs.writeFileSync(path.join(dir,'坐姿侧面四帧-同步前后.png'),sheet.toBuffer('image/png'));assert.deepEqual(render(a,0,0).data,render(b,0,0).data,'First composite exact');
  const all=createCanvas(1280,960),ac=all.getContext('2d');for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){const d=render(b,ai,fi);if(ai!==0)assert.deepEqual(d.data,render(a,ai,fi).data,'Other directions untouched');ac.fillStyle='#ded8e9';ac.fillRect(fi*320,ai*320,320,320);ac.drawImage(image(d),fi*320,ai*320);}fs.writeFileSync(path.join(dir,'坐姿三方向十二帧.png'),all.toBuffer('image/png'));
  const cm=new PE.CanvasManager(document.createElement('canvas'),b),ex=new PE.ExportManager();ex.init(b,cm);
  for(let fi=0;fi<4;fi++){
    b.selectFrame(10,0,fi);cm.canvas.width=cm.canvas.height=384;cm.zoom=12;cm.showGrid=false;cm.centerView();cm.render();const scale=cm.offscreenCanvas.width/32;assert.deepEqual(cm.offscreenCtx.getImageData(0,0,32*scale,32*scale).data,cm.getCompositeImageData(10,0,fi,true,scale).data);
    const buf=Buffer.from(await (await ex.exportFrameAsBlob(10,0,fi)).arrayBuffer()),im=await loadImage(buf),test=createCanvas(im.width,im.height);test.getContext('2d').drawImage(im,0,0);assert.deepEqual(test.getContext('2d').getImageData(0,0,im.width,im.height).data,render(b,0,fi,'actual',im.width/32).data);fs.writeFileSync(path.join(dir,`侧面第${fi+1}帧-透明导出.png`),buf);
  }
  const studio=fs.readFileSync(path.join(root,'js/studio.js'),'utf8'),boundsCode=studio.slice(studio.indexOf('  function bounds(image)'),studio.indexOf('  const frameList=')),start=studio.indexOf('  app.animationPlayer._renderPreviewFrame=function(){'),end=studio.indexOf('  const originalSetTool=',start),app={project:b,canvasManager:cm,animationPlayer:{canvas:createCanvas(144,144),sheetIndex:10,actionIndex:0,currentFrame:0}};vm.runInNewContext(boundsCode+studio.slice(start,end),{app,document,PE});
  const strip=createCanvas(720,144),sc=strip.getContext('2d');let first;
  for(const[n,fi]of [0,1,2,3,0].entries()){app.animationPlayer.currentFrame=fi;app.animationPlayer._renderPreviewFrame();const im=app.animationPlayer.canvas.getContext('2d').getImageData(0,0,144,144);assert(im.data.some((v,i)=>i%4===3&&v));if(n===0)first=im.data.slice();if(n===4)assert.deepEqual(im.data,first);sc.fillStyle='#ded8e9';sc.fillRect(n*144,0,144,144);sc.drawImage(app.animationPlayer.canvas,n*144,0);}fs.writeFileSync(path.join(dir,'坐姿侧面-12341预览.png'),strip.toBuffer('image/png'));
  write(dir,'自检.json',{project:kind,onlySideFrames2to4:true,allFirstCelsAndCompositeExact:true,otherDirectionsAndActionsExact:true,clothingGroundRowsFrom27Exact:true,headLowerRowsFrom25Exact:true,hdSourcePixelsExact:true,mainRenderAndPngMatch:true,actualStudioPreviewFunctionChecked:true,loop12341Exact:true,browserNotRefreshed:true});
}
async function prepareAll(){
  fs.mkdirSync(path.join(out,'主工程'),{recursive:true});fs.mkdirSync(path.join(out,'当前分支'),{recursive:true});
  const main=read(path.join(backup,'主工程'),'original.json'),branch=read(path.join(backup,'当前分支'),'original.json'),m=await make(main,'主工程');write(path.join(out,'主工程'),'candidate.json',m.candidate);write(path.join(out,'主工程'),'修改帧.json',m.changed);await qa(main,m.candidate,path.join(out,'主工程'),'主工程');
  const inherited=syncBase(structuredClone(branch),m.candidate),b=await make(inherited,'当前分支');write(path.join(out,'当前分支'),'预期素体同步后基线.json',inherited);write(path.join(out,'当前分支'),'candidate.json',b.candidate);write(path.join(out,'当前分支'),'修改帧.json',b.changed);await qa(inherited,b.candidate,path.join(out,'当前分支'),'当前分支');
  console.log('PREPARED both sitting side sequences; independent approved first cels exact, feet fixed, source HD eye/fringe preserved. Branch candidate includes only expected shared-base updates plus its own future appearance cels.');
}
async function commitOne(kind,base,meta,candidate){
  const dir=path.join(out,kind),r=await fetch(meta.url);assert(r.ok);assert.equal(r.headers.get('etag'),meta.etag,kind+' changed: stop and merge');assert.deepEqual(await r.json(),base);
  const saved=await fetch(meta.url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(candidate)}),body=await saved.text();write(dir,'保存响应.json',{status:saved.status,etag:saved.headers.get('etag'),body});assert.equal(saved.status,200,body);
  const back=await fetch(meta.url);assert(back.ok);const text=await back.text();assert.deepEqual(JSON.parse(text),candidate);write(dir,'api-readback.json',text);console.log(kind+' SAVED HTTP 200, exact API readback.');
}
async function commit(){
  const mainDir=path.join(backup,'主工程'),branchDir=path.join(backup,'当前分支'),main=read(mainDir,'original.json'),mainCandidate=read(path.join(out,'主工程'),'candidate.json');await commitOne('主工程',main,read(mainDir,'metadata.json'),mainCandidate);
  const initial=read(branchDir,'original.json'),meta=read(branchDir,'metadata.json'),r=await fetch(meta.url);assert(r.ok);const bytes=Buffer.from(await r.arrayBuffer()),fresh=JSON.parse(bytes),expected=read(path.join(out,'当前分支'),'预期素体同步后基线.json');assert.deepEqual(fresh,expected,'Branch changed beyond known main-body propagation: stop and merge');
  fs.writeFileSync(path.join(branchDir,'主工程同步后重新读取.json'),bytes);const latest={...meta,etag:r.headers.get('etag'),sha256:crypto.createHash('sha256').update(bytes).digest('hex')};write(branchDir,'重新读取版本.json',latest);
  const rebuilt=await make(fresh,'当前分支');assert.deepEqual(rebuilt.candidate,read(path.join(out,'当前分支'),'candidate.json'));await commitOne('当前分支',fresh,latest,rebuilt.candidate);
  for(const[kind,baseDir]of [['主工程',mainDir],['当前分支',branchDir]]){const dir=path.join(out,kind),readback=read(dir,'api-readback.json');await qa(kind==='主工程'?main:expected,readback,dir,kind);const first=read(baseDir,'original.json');for(let li=0;li<first.layers.length;li++)for(let ai=0;ai<3;ai++)assert.deepEqual(readback.layers[li].frameData?.[`10_${ai}_0`],first.layers[li].frameData?.[`10_${ai}_0`]);}
  console.log('FINAL QA passed on both API readbacks; both projects retain every original sitting first cel.');
}
async function mergeBranch(){
  const dir=path.join(out,'当前分支'),mainMeta=read(path.join(backup,'主工程'),'metadata.json'),mainResponse=await fetch(mainMeta.url);assert(mainResponse.ok);assert.deepEqual(await mainResponse.json(),read(path.join(out,'主工程'),'candidate.json'),'Main changed after its save; inspect before continuing');
  const meta=read(path.join(backup,'当前分支'),'metadata.json'),r=await fetch(meta.url);assert(r.ok);const bytes=Buffer.from(await r.arrayBuffer()),fresh=JSON.parse(bytes),expected=read(dir,'预期素体同步后基线.json');
  fs.writeFileSync(path.join(backup,'当前分支','合并前最新工程.json'),bytes);const latest={...meta,etag:r.headers.get('etag'),sha256:crypto.createHash('sha256').update(bytes).digest('hex')};write(path.join(backup,'当前分支'),'合并前最新版本.json',latest);
  const preserved=[];for(let i=0;i<fresh.layers.length;i++){const old=expected.layers[i],now=fresh.layers[i];if(!old){preserved.push({addedLayer:i,name:now.name,keys:Object.keys(now.frameData||{})});continue;}for(const key of new Set([...Object.keys(old.frameData||{}),...Object.keys(now.frameData||{})]))if(JSON.stringify(old.frameData?.[key])!==JSON.stringify(now.frameData?.[key]))preserved.push({layer:i,name:now.name,key});}
  for(const li of [169,199,200,201])assert.deepEqual(fresh.layers[li].frameData['10_0_0'],expected.layers[li].frameData['10_0_0'],'Sitting first changed during merge; inspect new appearance');
  const rebuilt=await make(fresh,'当前分支');write(dir,'candidate.json',rebuilt.candidate);write(dir,'修改帧.json',rebuilt.changed);write(dir,'并发修改保留检查.json',{preserved,newFirstSourceUnchanged:true,viewPreserved:[fresh.currentSheetIndex,fresh.currentActionIndex,fresh.currentFrameIndex,fresh.currentLayerIndex],newLayersPreserved:true});
  await qa(fresh,rebuilt.candidate,dir,'当前分支');await commitOne('当前分支',fresh,latest,rebuilt.candidate);
  for(const[kind,baseline]of [['主工程',read(path.join(backup,'主工程'),'original.json')],['当前分支',fresh]]){const result=read(path.join(out,kind),'api-readback.json');await qa(baseline,result,path.join(out,kind),kind);for(let li=0;li<baseline.layers.length;li++)for(const ai of [0,1,2])assert.deepEqual(result.layers[li].frameData?.[`10_${ai}_0`],baseline.layers[li].frameData?.[`10_${ai}_0`]);}
  console.log('FINAL MERGED QA: both saved; concurrent idle-eye pixels, appended layer and view retained; every sitting first cel exact.');
}
(process.argv.includes('--commit-branch')?mergeBranch():process.argv.includes('--commit')?commit():prepareAll()).catch(e=>{console.error(e);process.exitCode=1;});
