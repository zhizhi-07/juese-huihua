const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {createCanvas,ImageData,Image,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={createElement(tag){if(tag!=='canvas')return {click(){},remove(){}};const c=createCanvas(1,1);c.style={};c.toBlob=cb=>cb(new Blob([c.toBuffer('image/png')],{type:'image/png'}));return c;},body:{appendChild(){}}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()} };
const root=path.resolve(__dirname,'..');
for(const name of ['core','history','canvas','tools','spritesheet','animation','export','aseprite'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),{filename:name+'.js'});
async function main(){
const source=process.argv[2] || 'C:/Users/Administrator/Desktop/Hana Caraka - Base Character [sample]/Basic';
let total=0;
for(const name of fs.readdirSync(source).filter(n=>n.endsWith('.aseprite'))){
 const bytes=fs.readFileSync(path.join(source,name));const file=new Blob([bytes]);file.name=name;
 const p=new PE.Project(), result=await PE.importAseprite(file,p);p.currentSheetIndex=result.sheetIndex;
 const s=p.getCurrentSheet(),cm=new PE.CanvasManager(document.createElement('canvas'),p);cm.canvas.width=600;cm.canvas.height=500;
 assert.equal(s.actions.length,3);assert(s.actions.every(a=>a.frames.length===bytes.readUInt16LE(6)));
 assert.equal(p.layers.filter(l=>l.isGroup).length,3);
 const pngPath=path.join(source,name.replace('.aseprite','.png'));
 if(fs.existsSync(pngPath)){
  const img=await loadImage(pngPath),cv=createCanvas(img.width,img.height);cv.getContext('2d').drawImage(img,0,0);
  for(let ai=0;ai<3;ai++){
   const row={side:0,down:1,up:2}[s.actions[ai].name];
   for(let fi=0;fi<s.actions[ai].frames.length;fi++)assert.deepEqual(cm.getCompositeImageData(0,ai,fi).data,cv.getContext('2d').getImageData(fi*79,row*79,79,79).data,'matches supplied PNG '+name+' '+ai+'/'+fi);
  }
 }
assert.equal(p.layers.filter(l=>l.name==='head').length,3);
 for(let ai=0;ai<s.actions.length;ai++)for(let fi=0;fi<s.actions[ai].frames.length;fi++){
  const f=s.actions[ai].frames[fi],comp=cm.getCompositeImageData(0,ai,fi);assert.deepEqual(comp.data,f.originalPixels.data);total++;
 }
 const head=p.layers.find(l=>l.name==='head' && l.frameData.has('0_0_0'));assert(head);
 const before=cm.getCompositeImageData().data.slice();head.visible=false;assert.notDeepEqual(cm.getCompositeImageData().data,before);head.visible=true;
 p.currentFrameIndex=1;
 const overlay=p.getCurrentLayer(),idx=p.currentLayerIndex,key=p.getFrameKey();const history=new PE.HistoryManager(),tool=new PE.ToolManager();tool.init(p,cm,history);
 assert(tool.drawPixel(idx,key,0,0,255,0,0,255).success);assert.equal(cm.getCompositeImageData().data[0],255);history.undo(p);assert.equal(cm.getCompositeImageData().data[3],0);history.redo(p);assert.equal(cm.getCompositeImageData().data[3],255);
 p.getCurrentFrame().addLockedRegion(1,1,1,1);assert.equal(tool.drawPixel(idx,key,1,1,0,0,0,255).success,false);
 assert.equal(tool.drawPixel(idx,key,-1,0,0,0,0).success,false);
 const ex=new PE.ExportManager();ex.init(p,cm);const projectBlob=ex.exportProject(false),restored=(await ex.importProject(projectBlob)).project;
 assert.equal(restored.layers.length,p.layers.length);assert.equal(restored.spriteSheets[0].sourceBytes,s.sourceBytes);assert.equal(restored.getCurrentFrame().duration,p.getCurrentFrame().duration);
 const restoredCm=new PE.CanvasManager(document.createElement('canvas'),restored);assert.deepEqual(restoredCm.getCompositeImageData().data,cm.getCompositeImageData().data);
 const frameBlob=await ex.exportFrameAsBlob(0,0,1);assert(frameBlob.size>10);
 // PNG save and decode must retain pixels.
 const img=await loadImage(Buffer.from(await frameBlob.arrayBuffer()));const cv=createCanvas(img.width,img.height);cv.getContext('2d').drawImage(img,0,0);assert.deepEqual(cv.getContext('2d').getImageData(0,0,img.width,img.height).data,cm.getCompositeImageData().data);
 console.log('PASS',name,s.actions.map(a=>a.name).join('/'),s.actions[0].frames.length,'frames; layers, hide, edits, locks, undo/redo, JSON and PNG round trip');
}
const p=new PE.Project(),sheet=new PE.SpriteSheet('png');sheet.imageData=new ImageData(32,16);sheet.frameWidth=16;sheet.frameHeight=16;sheet.columns=2;sheet.rows=1;sheet.imageData.data.set([255,0,0,255],0);p.spriteSheets.push(sheet);new PE.SpriteSheetManager().cutFrames(p,0);assert.equal(sheet.actions[0].frames.length,2);const cm=new PE.CanvasManager(document.createElement('canvas'),p);assert.equal(cm.getCompositeImageData().data[0],255);for(const l of p.layers)l.visible=false;assert.equal(cm.getCompositeImageData().data[3],0);assert.equal(cm.getCompositeWithOriginal().data[3],0);
// Batch importing must not mix layers between sources, even during cross-sheet export.
const m=new PE.Project();for(const n of ['run.aseprite','jump.aseprite']){const b=fs.readFileSync(path.join(source,n));const f=new Blob([b]);f.name=n;await PE.importAseprite(f,m);}m.currentSheetIndex=1;
const mc=new PE.CanvasManager(document.createElement('canvas'),m);
assert.deepEqual(mc.getCompositeImageData(0,1,0).data,m.spriteSheets[0].actions[1].frames[0].originalPixels.data);
const bad=new Uint8Array(128);await assert.rejects(()=>PE.parseAseprite(bad.buffer));
console.log('PASS PNG slicing and all-layers-hidden transparency; malformed source rejection');
console.log('TOTAL',total,'real animation frames verified');
}
main().catch(e=>{console.error(e);process.exitCode=1});


