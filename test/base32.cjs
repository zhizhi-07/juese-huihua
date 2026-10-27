const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={createElement(tag){if(tag!=='canvas')return {click(){},remove(){}};const c=createCanvas(1,1);c.style={};c.toBlob=cb=>cb(new Blob([c.toBuffer('image/png')],{type:'image/png'}));return c;},body:{appendChild(){}}};
const root=path.resolve(__dirname,'..');for(const name of ['core','history','canvas','tools','spritesheet','export','api','aseprite','builtin-packs'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),{filename:name});
for(const name of ['base32-data','base32'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'));
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
(async()=>{
 const project=new PE.Project();project.layers=[];const si=PE.addBase32Idle(project),sheet=project.spriteSheets[si],cm=new PE.CanvasManager(document.createElement('canvas'),project);
 assert.equal(sheet.frameWidth,32);assert.equal(sheet.frameHeight,64);assert.equal(sheet.getTotalFrames(),16);assert.deepEqual(sheet.actions.map(a=>a.direction),['down','right','up','left']);
 const preview=createCanvas(768,384),pc=preview.getContext('2d');pc.fillStyle='#e6e9e2';pc.fillRect(0,0,768,384);pc.imageSmoothingEnabled=false;
 const out=createCanvas(128,256),oc=out.getContext('2d');
 sheet.actions.forEach((a,ai)=>a.frames.forEach((frame,fi)=>{
  const im=cm.getCompositeImageData(si,ai,fi);assert.deepEqual(im.data,frame.originalPixels.data);assert.notDeepEqual(cm.getCompositeImageData(si,ai,fi,false).data,im.data);
  assert.equal(frame.duration,350);for(let k=0;k<32*4;k++)assert.equal(im.data[(63*32*4)+k],a.frames[0].originalPixels.data[(63*32*4)+k],'ground contact stable');
  for(const l of project.layers.filter(l=>PE.isHandLayer(l))){assert(l.locked&&l.referenceOnly);const hand=l.frameData.get(`${si}_${ai}_${fi}`);assert.deepEqual(hand.data,l.frameData.get(`${si}_${ai}_0`).data,'hands do not deform during breathing');let count=0;for(let k=3;k<hand.data.length;k+=4)if(hand.data[k])count++;assert.equal(count,48,'each hand is a compact rounded 8x8 mask');}
  const tile=createCanvas(32,64);tile.getContext('2d').putImageData(im,0,0);oc.drawImage(tile,fi*32,ai*64);
  if(fi===0)pc.drawImage(tile,ai*192,0,192,384);
 }));
 fs.writeFileSync(path.resolve(root,'../../outputs/32x64-待机-透明图集.png'),out.toBuffer('image/png'));
 fs.writeFileSync(path.resolve(root,'../../outputs/32x64-待机-四方向预览.png'),preview.toBuffer('image/png'));
 const exporter=new PE.ExportManager();exporter.init(project,cm);const saved=exporter.exportProject(false);const restored=(await exporter.importProject(saved)).project;const restoredCanvas=new PE.CanvasManager(document.createElement('canvas'),restored);for(let ai=0;ai<4;ai++)for(let fi=0;fi<4;fi++)assert.deepEqual(restoredCanvas.getCompositeImageData(0,ai,fi).data,sheet.actions[ai].frames[fi].originalPixels.data,'editable project roundtrip');assert(restored.layers.filter(l=>PE.isHandLayer(l)).every(l=>l.referenceOnly&&l.locked));fs.writeFileSync(path.resolve(root,'../../outputs/32x64-待机-分层工程.json'),Buffer.from(await saved.arrayBuffer()));console.log('PASS: 16 frames, 32x64, four directions, fixed feet, separated protected hands, canonical PNG matches layers.');
})().catch(e=>{console.error(e);process.exitCode=1});


