const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={createElement(tag){if(tag!=='canvas')return {click(){},remove(){}};const c=createCanvas(1,1);c.style={};c.toBlob=cb=>cb(new Blob([c.toBuffer('image/png')],{type:'image/png'}));return c;},body:{appendChild(){}}};
const root=path.resolve(__dirname,'..');for(const name of ['core','history','canvas','tools','spritesheet','export','api','aseprite','builtin-packs'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),{filename:name});
async function main(){
 const project=new PE.Project();project.layers=[];let handFrames=0;
 for(const pack of PE_BUILTIN_PACKS){const bytes=Buffer.from(pack.base64,'base64');assert.deepEqual(bytes,fs.readFileSync(path.join(root,'assets/builtin',pack.name)));const f=new Blob([bytes]);f.name=pack.name;await PE.importAseprite(f,project);}
 assert.equal(project.spriteSheets.length,6);assert.equal(project.spriteSheets.reduce((n,s)=>n+s.getTotalFrames(),0),102);
 const history=new PE.HistoryManager(),cm=new PE.CanvasManager(document.createElement('canvas'),project),tool=new PE.ToolManager();tool.init(project,cm,history);PE.app={project,history,canvasManager:cm,toolManager:tool};
 for(let si=0;si<6;si++){
  project.selectFrame(si,1,0);const key=project.getFrameKey();const all=cm.getCompositeImageData(),hidden=cm.getCompositeImageData(si,1,0,false);assert.notDeepEqual(hidden.data,all.data,'hand switch affects only preview');
  for(let li=0;li<project.layers.length;li++){
   const l=project.layers[li];if(!PE.isHandLayer(l)||l.sheetIndex!==si)continue;
   assert(l.referenceOnly && l.locked);const snapshot=[...l.frameData].map(([k,d])=>[k,Buffer.from(d.data)]);handFrames+=snapshot.length;
   assert.equal(pixelAPI.setLayerLocked(li,false).success,false);
   assert.equal(pixelAPI.setLayerOpacity(li,.5).success,false);
   assert.equal(pixelAPI.setLayerVisibility(li,false).success,false);
   assert.equal(pixelAPI.removeLayer(li).success,false);
   // Defense in depth: accidental changes to the lock flag still cannot paint hands.
   l.locked=false;assert.equal(l.setPixel(key,0,0,255,0,0,255),false);
   assert.equal(tool.drawPixel(li,key,0,0,255,0,0,255).success,false);
   assert.equal(tool.drawPixels(li,key,[{x:0,y:0,r:255,g:0,b:0,a:255}]).modifiedCount,0);
   assert.equal(pixelAPI.setPixels(li,si,1,0,[{x:0,y:0,r:255,g:0,b:0,a:255}]).modifiedPixels,0);
   assert.equal(pixelAPI.fillArea(li,si,1,0,0,0,255,0,0).success,false);
   assert.equal(pixelAPI.moveRegion(li,si,1,0,0,0,2,2,3,3).success,false);
   for(const[k,bytes]of snapshot)assert.deepEqual(Buffer.from(l.getFrameData(k).data),bytes);
   l.locked=true;
  }
  assert.deepEqual(cm.getCompositeImageData().data,all.data,'preview does not change canonical export');
  const index=project.layers.findIndex(l=>l.sheetIndex===si&&!l.isGroup&&!l.referenceOnly&&l.name.includes('衣服'));
  project.currentLayerIndex=index;assert.equal(pixelAPI.fillArea(index,si,1,0,0,0,231,155,181).success,true,'normal agent fill still works');history.undo(project);
 }
 console.log('PASS: 6 embedded files match originals; 102 frames loaded; '+handFrames+' hand cels protected against drawing, erase/fill/move, unlock and deletion.');
 console.log('PASS: preview excludes hands without changing export pixels; normal clothing fill and undo remain functional.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
