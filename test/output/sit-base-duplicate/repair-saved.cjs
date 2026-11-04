const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,Image,ImageData}=require('@napi-rs/canvas');
const out=__dirname,root=path.resolve(out,'../../..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const changes=[{layer:221,key:'10_0_0',direction:'down'},{layer:226,key:'10_1_0',direction:'side'}];
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
global.window=global;global.Image=Image;global.ImageData=ImageData;
global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
global.FileReader=class{async readAsText(file){this.result=await file.text();this.onload();}};
async function main(){
  const beforeRaw=fs.readFileSync(path.join(out,'main-before.json'),'utf8'),before=JSON.parse(beforeRaw),after=structuredClone(before);
  for(const c of changes){const l=after.layers[c.layer];assert.equal(l.name,'body');assert.equal(l.sheetIndex,10);assert.equal(after.layers[l.parent].name,c.direction);assert(l.frameData[c.key]);delete l.frameData[c.key];}
  const restored=structuredClone(after);for(const c of changes)restored.layers[c.layer].frameData[c.key]=before.layers[c.layer].frameData[c.key];assert.deepEqual(restored,before);
  const candidate=JSON.stringify(after);fs.writeFileSync(path.join(out,'candidate.json'),candidate);
  vm.runInThisContext(fs.readFileSync(path.join(out,'before/core.js'),'utf8'));
  for(const name of ['canvas','export'])vm.runInThisContext(read('js/'+name+'.js'));
  const exporter=new PE.ExportManager(),oldModel=(await exporter.importProject(new Blob([beforeRaw]))).project;
  const cm=new PE.CanvasManager(document.createElement('canvas'),oldModel),oldPixels=new Map();
  oldModel.spriteSheets.forEach((s,si)=>s.actions.forEach((a,ai)=>a.frames.forEach((_,fi)=>oldPixels.set(`${si}_${ai}_${fi}`,cm.getCompositeImageData(si,ai,fi)))));
  vm.runInThisContext(read('js/core.js'));
  const model=(await new PE.ExportManager().importProject(new Blob([candidate]))).project;
  const fixed=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.init(model,fixed);
  const differences=[],atlas=createCanvas(1024,400),ctx=atlas.getContext('2d');ctx.imageSmoothingEnabled=false;
  for(const [key,old]of oldPixels){
    const [si,ai,fi]=key.split('_').map(Number),d=fixed.getCompositeImageData(si,ai,fi);assert.deepEqual(ex._getCompositeImageData(si,ai,fi,1).data,d.data);
    if(!Buffer.from(d.data).equals(Buffer.from(old.data))){assert(changes.some(c=>c.key===key),'unexpected render change: '+key);differences.push(key);}
    if(si!==10||ai>1||fi!==0)continue;
    for(const [column,data]of [[0,old],[1,d]]){const x=ai*512+column*256,c=createCanvas(data.width,data.height);c.getContext('2d').putImageData(data,0,0);ctx.fillStyle='#d6d0d9';ctx.fillRect(x,0,256,400);ctx.fillStyle='#222';ctx.font='16px sans-serif';ctx.fillText(model.spriteSheets[si].actions[ai].direction+(column?' AFTER':' BEFORE'),x+8,24);ctx.drawImage(c,x,40,256,256);const count=(column?model:oldModel).layers.filter(l=>!l.isGroup&&l.name==='body'&&l.sheetIndex===10&&[...l.frameData.keys()].some(k=>k.startsWith(`10_${ai}_`))).length;ctx.fillText('Stored body entries: '+count,x+8,330);}
  }
  for(let ai=0;ai<3;ai++){
    const layers=PE.getRenderLayers(model,10,ai).filter(l=>l.name==='body'&&l.frameData.has(`10_${ai}_0`));assert.equal(layers.length,1);
  }
  fs.writeFileSync(path.join(out,'before-after.png'),atlas.toBuffer('image/png'));
  const verification={changes:changes.map(c=>({...c,layerName:before.layers[c.layer].name})),onlyTwoForeignCelsRemoved:true,allOtherDataExact:true,allHairAndOtherProjectsUntouched:true,framesChecked:oldPixels.size,canvasEqualsExport:true,renderDifferences:differences,beforeSha256:sha(beforeRaw),candidateSha256:sha(candidate)};
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(verification,null,2));
  if(process.argv.includes('--save')){
    const current=await fetch('http://127.0.0.1:8765/api/project?id=main'),raw=await current.text();assert.equal(current.status,200);assert.equal(raw,beforeRaw,'main changed since inspection; keep candidate, do not overwrite');
    const headers={'X-Pixel-Editor':'1','Content-Type':'application/json','If-Match':current.headers.get('etag')};
    const saved=await fetch('http://127.0.0.1:8765/api/project?id=main',{method:'PUT',headers,body:candidate}),result=await saved.text();
    fs.writeFileSync(path.join(out,'save-response.json'),JSON.stringify({method:'PUT',path:'/api/project?id=main',headers,status:saved.status,body:result,etag:saved.headers.get('etag')},null,2));assert.equal(saved.status,200,result);
    const r=await fetch('http://127.0.0.1:8765/api/project?id=main'),actual=await r.text();assert.equal(r.status,200);assert.deepEqual(JSON.parse(actual),after);
    fs.writeFileSync(path.join(out,'main-after.json'),actual);verification.saved=true;verification.savedEtag=r.headers.get('etag');verification.savedSha256=sha(actual);fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(verification,null,2));
  }
  console.log(JSON.stringify(verification,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
