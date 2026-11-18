const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm');
const {createCanvas,ImageData,Image}=require('@napi-rs/canvas');
const {isBody,isHand}=require('../../js/character-base.js');
const png=require('../../scripts/png.cjs');
const primary='draft-conflict-1794271316087-dc54567c',donor='draft-conflict-1793762650078-819fdffe';
const id='character-ff47ea32-14f3-4489-aec3-3c1797b97955',name='人物分支 · 衣服发型眼睛';
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const n of ['core','canvas','export','hair-animation','clothing-sync'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'),{filename:n});
const port=process.argv[2]||'8765',dir=path.join(__dirname,process.argv[3]||'live'),base='http://127.0.0.1:'+port+'/api';
const write=(n,b)=>fs.writeFileSync(path.join(dir,n),b),json=(n,o)=>write(n,JSON.stringify(o,null,2)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const project=(id,extra='')=>base+'/project?id='+id+extra;
async function get(id){
  const r=await fetch(project(id)),raw=Buffer.from(await r.arrayBuffer()),etag=r.headers.get('etag');
  assert.equal(r.status,200,raw.toString());assert.equal(etag,'"'+hash(raw)+'"');
  return {raw,p:JSON.parse(raw),etag};
}
async function put(id,data,etag,extra=''){
  const r=await fetch(project(id,extra),{method:'PUT',headers:{'If-Match':etag,'X-Pixel-Editor':'1','Content-Type':'application/json'},body:JSON.stringify(data)});
  const result={status:r.status,etag:r.headers.get('etag'),body:await r.text()};
  console.log('PUT',id,result);return result;
}
const tag=l=>{const i=PE.classifyPart(l.name);return i?.slot==='眼睛'?'眼睛':i?.category;};
function addAssets(branch,source){
  const map=new Map(),addresses=new Set(),counts={},skipped=[],refs=[];
  for(const [si,s] of source.spriteSheets.entries()){
    const ti=branch.spriteSheets.findIndex(t=>t.name===s.name);
    if(ti<0)continue;
    const target=branch.spriteSheets[ti];
    for(const [ai,a]of s.actions.entries()){
      const ta=target.actions.findIndex(t=>t.name===a.name&&t.direction===a.direction);
      if(ta<0)continue;
      assert.deepEqual([s.canvasLayout?.actions[ai]?.x??0,s.canvasLayout?.actions[ai]?.y??0],[target.canvasLayout?.actions[ta]?.x??0,target.canvasLayout?.actions[ta]?.y??0]);
      a.frames.forEach((f,fi)=>{
        assert.deepEqual([f.width,f.height],[target.actions[ta].frames[fi]?.width,target.actions[ta].frames[fi]?.height]);
        map.set([si,ai,fi].join('_'),[ti,ta,fi].join('_'));addresses.add([s.name,a.direction,fi].join('/'));
      });
    }
  }
  for(const [index,l] of source.layers.entries()){
    if(l.isGroup||isBody(l)||isHand(l)||!['头发','衣服','眼睛'].includes(tag(l)))continue;
    const entries=Object.entries(l.frameData||{}),keys=Object.fromEntries(entries.filter(([k])=>map.has(k)).map(([k])=>[k,map.get(k)]));
    const data=Object.fromEntries(Object.entries(keys).map(([k,v])=>[v,l.frameData[k]]));
    if(Object.keys(data).length<entries.length)skipped.push({layer:l.name,frames:entries.filter(([k])=>!map.has(k)).map(([k])=>k)});
    if(!Object.keys(data).length)continue;
    const copy={...structuredClone(l),sheetIndex:Number(Object.keys(data)[0].split('_')[0]),frameData:data};
    if(l.parent!=null){
      const g=source.layers[l.parent];assert(g?.isGroup);
      copy.parent=branch.layers.findIndex(b=>b.isGroup&&b.sheetIndex===copy.sheetIndex&&b.name===g.name);
      assert(copy.parent>=0);
    }
    if(copy.hairAnimation){
      const h=copy.hairAnimation;
      h.offsets=Object.fromEntries(Object.entries(h.offsets).filter(([k])=>addresses.has(k)));
      if(h.preserved)h.preserved=h.preserved.filter(k=>addresses.has(k));
      if(h.directionOverrides)h.directionOverrides=Object.fromEntries(Object.entries(h.directionOverrides).filter(([k])=>addresses.has(k+'/0')));
    }
    if(copy.clothingSync)for(const key of ['preserved','sitMasters'])if(copy.clothingSync[key])copy.clothingSync[key]=copy.clothingSync[key].filter(k=>map.has(k)).map(k=>map.get(k));
    const total=counts[tag(l)]??={layers:0,frames:0};total.layers++;total.frames+=Object.keys(data).length;
    refs.push({sourceLayer:index,branchLayer:branch.layers.length,keys});branch.layers.push(copy);
  }
  const selected=refs.map(r=>r.branchLayer).find(i=>branch.layers[i].sheetIndex===branch.currentSheetIndex&&branch.layers[i].visible);
  if(selected!=null)branch.currentLayerIndex=selected;
  return {counts,skipped,refs};
}
async function validate(branch,source,base,record){
  assert.deepEqual(branch.spriteSheets,base.spriteSheets.slice(0,4));
  assert.deepEqual(branch.spriteSheets[3].actions.map(a=>a.direction),['side']);
  const roots=base.layers.filter(l=>l.sheetIndex<4&&(isBody(l)||isHand(l))),inherited=branch.layers.filter(l=>isBody(l)||isHand(l));
  assert.equal(inherited.length,roots.length);
  for(const l of inherited){
    const r=roots.find(b=>b.name===l.name&&b.sheetIndex===l.sheetIndex&&Object.keys(b.frameData).some(k=>Object.hasOwn(l.frameData,k)));
    assert(r,l.name);assert.deepEqual(l.frameData,r.frameData);assert.equal(l.visible,r.visible);assert(l.locked&&l.inheritedBase);
  }
  for(const {sourceLayer,branchLayer,keys}of record.refs){
    const l=branch.layers[branchLayer],r=source.layers[sourceLayer];assert.equal(l.name,r.name);assert.equal(l.visible,r.visible);assert(!l.inheritedBase);
    for(const [oldKey,newKey] of Object.entries(keys))assert.deepEqual(l.frameData[newKey],r.frameData[oldKey]);
  }
  const model=(await new PE.ExportManager().importProject(new Blob([JSON.stringify(branch)]))).project;
  PE.HairAnimation.validate(model);PE.ClothingSync.validate(model);
  return model;
}
function preview(model){
  const c=createCanvas(680,720),ctx=c.getContext('2d'),cm=new PE.CanvasManager(document.createElement('canvas'),model);
  ctx.fillStyle='#e5e9f0';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#303a49';ctx.font='16px sans-serif';
  for(const [si,s]of model.spriteSheets.entries()){
    const ai=s.actions.findIndex(a=>a.direction==='side');ctx.fillText(['Walk','Idle','Pickup','Sit'][si],12,si*180+18);
    for(let fi=0;fi<4;fi++){
      const im=cm.getCompositeImageData(si,ai,fi,true,2),canvas=createCanvas(im.width,im.height);
      canvas.getContext('2d').putImageData(im,0,0);ctx.imageSmoothingEnabled=false;
      const f=s.actions[ai].frames[fi],scale=Math.min(8,144/Math.max(f.width,f.height));
      ctx.drawImage(canvas,12+fi*168,si*180+26,f.width*scale,f.height*scale);
    }
  }
  write('preview.png',c.toBuffer('image/png'));
}
async function run(){
  fs.mkdirSync(dir,{recursive:true});
  const index=await fetch(base+'/projects');assert.equal(index.status,200);const list=await index.json();
  assert(list.some(p=>p.id===primary)&&list.some(p=>p.id===donor));
  const status=await(await fetch(base+'/status')).json();assert.equal(status.characterBaseProjectId,primary);
  const a=await get(primary),b=await get(donor),m=await get('main');
  const old=await Promise.all(list.filter(x=>x.id.startsWith('character-')&&x.id!==id).map(async x=>({id:x.id,...await get(x.id)})));
  for(const [n,r] of [['primary',a],['donor',b],['legacy-main',m],...old.map(x=>[x.id,x])]){
    write(n+'-before.json',r.raw);json(n+'-revision.json',{etag:r.etag,sha256:hash(r.raw)});
  }
  assert(!list.some(x=>x.id===id),'branch exists; do not overwrite');
  const payload={...a.p,name},query='&baseRevision='+encodeURIComponent(a.etag);
  const created=await put(id,payload,'none',query);assert.equal(created.status,200,created.body);
  const start=await get(id);write('new-base.json',start.raw);
  const merged=structuredClone(start.p),record=addAssets(merged,b.p);
  await validate(merged,b.p,a.p,record);
  json('migration.json',record);write('candidate.json',JSON.stringify(merged));
  const saved=await put(id,merged,start.etag);assert.equal(saved.status,200,saved.body);
  const verified=await get(id);assert.deepEqual(verified.p,merged);
  preview(await validate(verified.p,b.p,a.p,record));write('verified.json',verified.raw);
  assert.equal((await get(primary)).etag,a.etag);assert.equal((await get(donor)).etag,b.etag);assert.equal((await get('main')).etag,m.etag);
  const audit={id,created,saved,verified:{etag:verified.etag,sha256:hash(verified.raw)},counts:record.counts,existingBranchesRead:old.length,baseAndDonorUnchanged:true};
  if(port!=='8765'){
    assert.equal((await put('character-stale',payload,'none','&baseRevision=bad')).status,409);
    const edit=structuredClone(a.p),cel=edit.layers.find(l=>l.name==='body'&&l.frameData?.['3_0_0']).frameData['3_0_0'];
    const image=png.decode(Buffer.from(cel.dataURL.split(',')[1],'base64'));
    image.data.set([254,237,225,255],0);cel.dataURL='data:image/png;base64,'+png.encode(image.width,image.height,image.data).toString('base64');
    assert.equal((await put(primary,edit,a.etag)).status,200);
    const inherited=await get(id);assert.notEqual(inherited.etag,verified.etag);
    const l=inherited.p.layers.find(l=>l.name==='body'&&l.frameData?.['3_0_0']);assert.deepEqual(l.frameData['3_0_0'],cel);assert(l.locked&&l.inheritedBase);
    assert.equal((await put(id,verified.p,verified.etag)).status,409);
    const spoof=structuredClone(inherited.p),locked=spoof.layers.find(x=>x.name==='body'&&x.frameData?.['3_0_0']);
    locked.locked=false;locked.inheritedBase=false;locked.frameData['3_0_0'].dataURL='invalid';
    assert.equal((await put(id,spoof,inherited.etag)).status,200);assert.deepEqual((await get(id)).p,inherited.p);
    for(const x of old){
      const branch=await get(x.id),l=branch.p.layers.find(l=>l.name==='body'&&l.frameData?.['3_0_0']);
      assert(l.locked&&l.inheritedBase);assert.equal(l.frameData['3_0_0'].dataURL,cel.dataURL);
      assert.equal(l.frameData['3_0_0'].placement.x,cel.placement.x+branch.p.spriteSheets[3].canvasLayout.actions[0].x);
    }
    audit.propagationAndProtectedSave=true;
  }
  json('verification.json',audit);console.log(JSON.stringify(audit));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
