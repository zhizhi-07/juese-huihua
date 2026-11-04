const fs=require('fs'),assert=require('assert/strict'),vm=require('vm'),png=require('./png.cjs');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const out=fs.readFileSync('自检记录/撤回头顶一格最新路径.txt','utf8'),before=JSON.parse(fs.readFileSync(out+'/before.json')),meta=JSON.parse(fs.readFileSync(out+'/metadata.json')),next=structuredClone(before);
const addedDir=fs.readFileSync('自检记录/俯视加一格最新路径.txt','utf8'),original=JSON.parse(fs.readFileSync(addedDir+'/before.json')),records=JSON.parse(fs.readFileSync(addedDir+'/pixel-diff.json'));
const dec=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64')),pixel=(d,x,y)=>Array.from(d.data.slice((y*d.width+x)*4,(y*d.width+x)*4+4));
const anchorLayer=original.layers.findIndex(l=>l.name==='head'&&l.frameData['8_1_0']),a=dec(original.layers[anchorLayer].frameData['8_1_0']),b=dec(original.layers[anchorLayer].frameData['8_1_1']),anchorPixels=[];
for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++)if(JSON.stringify(pixel(a,x,y))!==JSON.stringify(pixel(b,x,y)))anchorPixels.push({x,y,before:pixel(b,x,y),after:pixel(a,x,y)});
assert.equal(anchorPixels.length,20);records.push({layer:anchorLayer,key:'8_1_0',pixels:anchorPixels});assert.equal(records.length,70);
const changes=[],already=[];
for(const record of records){
 const l=next.layers.find(l=>l.name==='head'&&l.frameData[record.key]);assert(l,record.key);const oldFrame=original.layers[record.layer].frameData[record.key],d=dec(l.frameData[record.key]);assert.equal(d.width,oldFrame.width);assert.equal(d.height,oldFrame.height);
 const changed=[];
 for(const p of record.pixels){
  const current=pixel(d,p.x,p.y);if(JSON.stringify(current)===JSON.stringify(p.before)){already.push({key:record.key,x:p.x,y:p.y});continue;}
  // The later side-forehead shading becomes the outline again when the added row is removed.
  const boundaryShadow=record.key.startsWith('8_0_')&&JSON.stringify(current)==='[224,197,180,255]'&&JSON.stringify(p.before)==='[70,70,94,255]'&&JSON.stringify(p.after)==='[254,237,225,255]';
  assert(JSON.stringify(current)===JSON.stringify(p.after)||boundaryShadow,record.key+' crown changed again; do not overwrite');
  d.data.set(p.before,(p.y*d.width+p.x)*4);changed.push({x:p.x,y:p.y,before:current,after:p.before,boundaryShadow});
 }
 if(changed.length){l.frameData[record.key].dataURL='data:image/png;base64,'+png.encode(d.width,d.height,d.data).toString('base64');changes.push({layer:next.layers.indexOf(l),key:record.key,pixels:changed});}
 const restored=dec(l.frameData[record.key]);for(const p of record.pixels)assert.deepEqual(pixel(restored,p.x,p.y),p.before);
}
const recovered=structuredClone(next);for(const c of changes)recovered.layers[c.layer].frameData[c.key]=structuredClone(before.layers[c.layer].frameData[c.key]);assert.deepEqual(recovered,before,'all non-crown data including sleep body must remain unchanged');
fs.writeFileSync(out+'/restore-extra-copy.json',JSON.stringify(recovered));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-extra-copy.json')),before);
fs.writeFileSync(out+'/candidate.json',JSON.stringify(next));fs.writeFileSync(out+'/pixel-diff.json',JSON.stringify(changes,null,2));fs.writeFileSync(out+'/already-restored.json',JSON.stringify(already,null,2));

global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'));
async function load(p){return (await new PE.ExportManager().importProject(new Blob([JSON.stringify(p)]))).project;}
async function verifyAndRender(){
 let checks=0;
 for(let si=7;si<=11;si++){
  const sheet=next.spriteSheets[si],columns=Math.max(...sheet.actions.map(a=>a.frames.length)),cell=150;
  const cv=createCanvas(columns*cell,sheet.actions.length*6*cell),ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;
  for(let mode=0;mode<3;mode++)for(let state=0;state<2;state++){
   const model=await load(state?next:before);
   for(const l of model.layers)if(l.sheetIndex===si){
    if(/服装/.test(l.name))l.visible=mode>=1&&l.name.startsWith('服装 / 01 ');
    if(/头发|发饰/.test(l.name))l.visible=mode===2&&(l.name.startsWith('头发 / 01 ')||l.name.startsWith('发饰 / 01 '));
   }
   const cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
   const player=new PE.AnimationPlayer();player.init(document.createElement('canvas'),model,cm);player.previewScale=1;
   for(let ai=0;ai<sheet.actions.length;ai++)for(let fi=0;fi<sheet.actions[ai].frames.length;fi++){
    model.currentSheetIndex=si;model.currentActionIndex=ai;model.currentFrameIndex=fi;
    const im=cm.getCompositeImageData(si,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v),'empty QA composite');
    cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,im.width,im.height).data,im.data);
    player.sheetIndex=si;player.actionIndex=ai;player.currentFrame=fi;player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,im.width,im.height).data,im.data);
    const b=Buffer.from(await(await ex.exportFrameAsBlob(si,ai,fi)).arrayBuffer());assert.deepEqual(Array.from(png.decode(b).data),Array.from(im.data));checks++;
    const x=fi*cell,y=(ai*6+mode*2+state)*cell,tile=createCanvas(im.width,im.height);tile.getContext('2d').putImageData(im,0,0);
    ctx.fillStyle=state?'#34323f':'#eee9ec';ctx.fillRect(x,y,cell,cell);ctx.fillStyle=state?'#fff':'#333';ctx.font='11px sans-serif';ctx.fillText(`${mode===0?'body':mode===1?'outfit':'hair+outfit'} ${state?'NEW':'OLD'} ${ai}/${fi}`,x+3,y+12);
    ctx.drawImage(tile,x+4,y+17,im.width*3,im.height*3);ctx.drawImage(tile,x+cell-im.width-2,y+cell-im.height-2);
   }
  }
  fs.writeFileSync(out+'/'+sheet.name+'-comparison.png',cv.toBuffer('image/png'));
 }
 fs.writeFileSync(out+'/verification.json',JSON.stringify({changedFrames:changes.length,changedPixels:changes.reduce((n,c)=>n+c.pixels.length,0),actions:[7,8,9,10,11].map(i=>next.spriteSheets[i].name),all70CrownsRestored:true,sleepBodyAndHandsUnchanged:true,onlyCrownPixelsChanged:true,otherLayersTimingDimensionsAndOriginalSheetsUnchanged:true,renderPreviewPNGChecks:checks,restoreExtraCopyVerified:true,browserChecked:false},null,2));
 console.log('PASS',checks,'render/preview/PNG checks;',changes.length,'head frames;',out);
}
(async()=>{
 if(process.argv[2]==='publish'){
  assert.deepEqual(JSON.parse(fs.readFileSync(out+'/candidate.json')),next);
  const url='http://127.0.0.1:8765/api/project?id=main',r=await fetch(url);assert(r.ok);assert.deepEqual(await r.json(),before,'new save detected: do not overwrite');assert.equal(r.headers.get('etag'),meta.etag);
  const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(next)}),response=await saved.text();fs.writeFileSync(out+'/save-response.txt',saved.status+'\n'+response);assert(saved.ok,response);
  const read=await fetch(url);assert(read.ok);const raw=await read.text();assert.deepEqual(JSON.parse(raw),next);fs.writeFileSync(out+'/api-readback.json',raw);console.log('PASS saved and API readback matches');
 }else await verifyAndRender();
})().catch(e=>{console.error(e);process.exitCode=1});
