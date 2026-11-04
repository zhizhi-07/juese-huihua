const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm'),png=require('./png.cjs');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const out=fs.readFileSync('自检记录/俯视加一格最新路径.txt','utf8'),before=JSON.parse(fs.readFileSync(out+'/before.json')),meta=JSON.parse(fs.readFileSync(out+'/metadata.json')),next=structuredClone(before);
const dec=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
const pixel=(d,x,y)=>Array.from(d.data.slice((y*d.width+x)*4,(y*d.width+x)*4+4));
const reference=before.layers.find(l=>l.name==='head'&&l.frameData['8_1_0']),anchor=dec(reference.frameData['8_1_0']),oldAnchor=dec(reference.frameData['8_1_1']);
const delta=[];
for(let y=0;y<anchor.height;y++)for(let x=0;x<anchor.width;x++)if(JSON.stringify(pixel(anchor,x,y))!==JSON.stringify(pixel(oldAnchor,x,y)))delta.push({x,y,old:pixel(oldAnchor,x,y),new:pixel(anchor,x,y)});
assert.equal(delta.length,20);
assert(delta.every(p=>p.x>=11&&p.x<=20&&(p.y===3||p.y===4)));
assert(delta.filter(p=>p.y===3).every(p=>p.old[3]===0&&JSON.stringify(p.new)==='[0,0,0,255]'));
assert(delta.filter(p=>p.y===4).every(p=>JSON.stringify(p.old)==='[70,70,94,255]'&&JSON.stringify(p.new)==='[254,237,225,255]'));
const changes=[];
for(let li=0;li<next.layers.length;li++){
 const l=next.layers[li];if(l.name!=='head'||l.sheetIndex<7||l.sheetIndex>11)continue;
 for(const [key,f]of Object.entries(l.frameData)){
  if(key==='8_1_0')continue;
  const d=dec(f);let top=-1,xs=[];
  for(let y=0;y<d.height&&top<0;y++){xs=[];for(let x=0;x<d.width;x++)if(pixel(d,x,y)[3])xs.push(x);if(xs.length)top=y;}
  if(top<0)continue;
  assert(top>0,key);assert.equal(xs.length,12,key+' expected same approved crown width');assert.equal(xs.at(-1)-xs[0],11,key);
  const edits=[];
  for(const p of delta){const x=p.x-10+xs[0],y=p.y-4+top,previous=pixel(d,x,y);if(p.y===3)assert.equal(previous[3],0,key);else assert.deepEqual(previous,p.old,key+' crown has another user edit');d.data.set(p.new,(y*d.width+x)*4);edits.push({x,y,before:previous,after:p.new});}
  f.dataURL='data:image/png;base64,'+png.encode(d.width,d.height,d.data).toString('base64');changes.push({layer:li,key,topBefore:top,topAfter:top-1,pixels:edits});
 }
}
assert.equal(changes.length,69);
assert.deepEqual(next.layers[before.layers.indexOf(reference)].frameData['8_1_0'],reference.frameData['8_1_0']);
const restored=structuredClone(next);for(const c of changes)restored.layers[c.layer].frameData[c.key]=structuredClone(before.layers[c.layer].frameData[c.key]);assert.deepEqual(restored,before);
fs.writeFileSync(out+'/restore-extra-copy.json',JSON.stringify(restored));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-extra-copy.json')),before);
fs.writeFileSync(out+'/candidate.json',JSON.stringify(next));fs.writeFileSync(out+'/pixel-diff.json',JSON.stringify(changes,null,2));
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
 fs.writeFileSync(out+'/verification.json',JSON.stringify({changedFrames:changes.length,changedPixels:changes.length*20,actions:[7,8,9,10,11].map(i=>next.spriteSheets[i].name),sourceFrameUnchanged:true,onlyCrownPixelsChanged:true,otherLayersTimingDimensionsAndOriginalSheetsUnchanged:true,renderPreviewPNGChecks:checks,restoreExtraCopyVerified:true,browserChecked:false},null,2));
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
