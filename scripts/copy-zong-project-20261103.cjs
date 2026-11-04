const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),vm=require('vm');
const sourceId='character-56620e79-ce79-4fd9-b49c-081f7bc57d67',base='http://127.0.0.1:8765';
const dir=fs.readFileSync('latest-zong-copy-path.txt','utf8'),read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));
const write=(n,p)=>fs.writeFileSync(path.join(dir,n),JSON.stringify(p,null,2));
const parts=new Set(['头发 / 用户 / 后发','前发','服装 / 衣服-小黄鸭','眼睛 / 眼睛']);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const source=read('latest-source.json'),meta=read('latest-source.meta.json');
function prepare(){
  const p=structuredClone(source),sheets=p.spriteSheets.map((s,i)=>s.name.startsWith('original32_')?i:-1).filter(i=>i>=0);
  assert.equal(sheets.length,5);
  const sm=new Map(sheets.map((i,j)=>[i,j])),keep=new Set();
  p.layers.forEach((l,i)=>{if(sm.has(l.sheetIndex)&&!l.isGroup&&(parts.has(l.name)||/^(body|head|hand|hand 2)$/.test(l.name)))keep.add(i);});
  for(const i of keep){let parent=p.layers[i].parent;const seen=new Set([i]);while(parent!=null){assert(!seen.has(parent));seen.add(parent);assert(p.layers[parent]?.isGroup);keep.add(parent);parent=p.layers[parent].parent;}}
  const indices=[...keep].sort((a,b)=>a-b),lm=new Map(indices.map((i,j)=>[i,j]));
  p.spriteSheets=sheets.map(i=>p.spriteSheets[i]);
  p.spriteSheets.forEach((s,si)=>s.actions.forEach(a=>a.frames.forEach(f=>{f.sheetIndex=si;})));
  p.layers=indices.map(i=>{const l=p.layers[i];l.sheetIndex=sm.get(l.sheetIndex);l.parent=l.parent==null?null:lm.get(l.parent);l.frameData=Object.fromEntries(Object.entries(l.frameData||{}).map(([k,d])=>{const [si,ai,fi]=k.split('_').map(Number);assert(sm.has(si));return [`${sm.get(si)}_${ai}_${fi}`,d];}));if(parts.has(l.name))l.visible=true;return l;});
  Object.assign(p,{name:'总',currentSheetIndex:p.spriteSheets.findIndex(s=>s.name==='original32_idle'),currentActionIndex:1,currentFrameIndex:0});
  p.currentLayerIndex=p.layers.findIndex(l=>l.sheetIndex===p.currentSheetIndex&&l.name==='前发');
  assert(p.currentLayerIndex>=0);
  for(const [j,i]of indices.entries()){
    const a=p.layers[j],b=source.layers[i];assert.equal(a.name,b.name);
    for(const [k,d]of Object.entries(b.frameData||{})){const [si,ai,fi]=k.split('_').map(Number);assert.deepEqual(a.frameData[`${sm.get(si)}_${ai}_${fi}`],d,'copied cel must be byte-identical');}
    assert(a.parent==null||p.layers[a.parent].isGroup);
  }
  for(const name of parts){const ls=p.layers.filter(l=>l.name===name);assert.equal(ls.length,5);if(name!=='眼睛 / 眼睛')for(const l of ls)assert.equal(Object.keys(l.frameData).length,p.spriteSheets[l.sheetIndex].actions.reduce((n,a)=>n+a.frames.length,0),'complete part');}
  const plan={id:'draft-zong-'+crypto.randomUUID(),sourceId,sourceRevision:meta.etag,sourceSha256:meta.sha256,sheets,sourceLayers:indices,parts:[...parts],sourceUnchanged:true};
  write('candidate.json',p);write('copy-plan.json',plan);return p;
}
async function qa(p,label){
  const rt='C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
  const {createCanvas,Image,ImageData}=require(rt+'@napi-rs/canvas');
  global.window=global;global.Image=Image;global.ImageData=ImageData;
  global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
  global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
  for(const n of ['core','canvas','export'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'));
  const decode=async raw=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(raw)]))).project;
  const model=await decode(p),original=await decode(source),plan=read('copy-plan.json');
  original.layers.forEach((l,i)=>{if(!plan.sourceLayers.includes(i))l.visible=false;else if(parts.has(l.name))l.visible=true;});
  const cm=new PE.CanvasManager(document.createElement('canvas'),model),old=new PE.CanvasManager(document.createElement('canvas'),original),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
  let checked=0,row=0;const tile=146,rows=model.spriteSheets.reduce((n,s)=>n+s.actions.length,0),sheet=createCanvas(8*tile,rows*tile),ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;
  for(let si=0;si<model.spriteSheets.length;si++){
    const s=model.spriteSheets[si];
    for(let ai=0;ai<s.actions.length;ai++,row++)for(let fi=0;fi<s.actions[ai].frames.length;fi++){
      const f=s.actions[ai].frames[fi];Object.assign(model,{currentSheetIndex:si,currentActionIndex:ai,currentFrameIndex:fi});
      const im=cm.getCompositeImageData(si,ai,fi,true,1);assert(im.data.some((v,i)=>i%4===3&&v),'nonempty composite');
      assert.deepEqual(im.data,old.getCompositeImageData(plan.sheets[si],ai,fi,true,1).data,'source composite unchanged');
      cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,cm.offscreenCanvas.width,cm.offscreenCanvas.height).data,cm.getCompositeImageData(si,ai,fi,true,cm.offscreenCanvas.width/f.width).data,'main render');
      const png=require('./png.cjs'),out=png.decode(Buffer.from(await(await ex.exportFrameAsBlob(si,ai,fi)).arrayBuffer()));assert.deepEqual([...out.data],[...im.data],'PNG export');
      const c=createCanvas(im.width,im.height);c.getContext('2d').putImageData(im,0,0);ctx.fillStyle=(fi%2)?'#252833':'#e5e0ee';ctx.fillRect(fi*tile,row*tile,tile,tile);ctx.drawImage(c,fi*tile+4,row*tile+2,im.width*3,im.height*3);ctx.fillStyle=fi%2?'white':'black';ctx.font='11px sans-serif';ctx.fillText(`${s.name.replace('original32_','')} ${s.actions[ai].direction} ${fi+1}`,fi*tile+4,row*tile+140);
      checked++;
    }
  }
  assert.equal(checked,70);fs.writeFileSync(path.join(dir,label+'-all-frames.png'),sheet.toBuffer('image/png'));
  write(label+'-qa.json',{frames:checked,sourceCompositeIdentical:true,mainRenderAndPngExportIdentical:true,localCanvasCheck:true,browserChecked:false});
  console.log('PASS',label,checked,'frames; source composite, main renderer and PNG export');
}
(async()=>{
  if(process.argv[2]==='publish'){
    const p=read('candidate.json'),plan=read('copy-plan.json'),s=await fetch(base+'/api/project?id='+sourceId),raw=await s.text();assert(s.ok);assert.equal(s.headers.get('etag'),plan.sourceRevision,'source changed; stop instead of using stale copy');assert.equal(hash(raw),plan.sourceSha256);
    const r=await fetch(base+'/api/project?id='+plan.id,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':'none'},body:JSON.stringify(p)});console.log('PUT',r.status,await r.text());assert(r.ok);
    const back=await fetch(base+'/api/project?id='+plan.id),text=await back.text();assert(back.ok);fs.writeFileSync(path.join(dir,'api-readback.json'),text);assert.deepEqual(JSON.parse(text),p);await qa(JSON.parse(text),'readback');
    const after=await fetch(base+'/api/project?id='+sourceId);assert.equal(hash(await after.text()),plan.sourceSha256,'source externally changed');
    const projects=await(await fetch(base+'/api/projects')).json();assert(projects.some(x=>x.id===plan.id&&x.name==='总'));
    write('delivery.json',{id:plan.id,name:'总',file:path.resolve('data/projects/'+plan.id+'.json'),url:base+'/index.html?project='+plan.id,etag:back.headers.get('etag'),sha256:hash(text),sourceUnchanged:true,parts:[...parts],frameCount:70});
    fs.writeFileSync(path.join(dir,'说明.txt'),'新工程“总”从“用户”已保存稿复制。保留小黄鸭衣服、前发、完整用户后发、眼睛及同稿素体，均保留原始像素和已有动作。新工程中四个部件全部显示。未带入隐藏导入参考图、旧豆豆眼和79像素参考动作；未改源工程或编辑器。\n恢复：原工程从未写入，直接打开原工程即可；新工程初始稿见 candidate.json，重写须重新GET目标ETag并使用If-Match，不得覆盖未保存草稿。\n未检查浏览器未保存草稿，未做网页交互测试。');
    console.log(JSON.stringify(read('delivery.json'),null,2));
  }else{await qa(prepare(),'candidate');}
})().catch(e=>{console.error(e);process.exit(1);});
