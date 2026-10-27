const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={createElement(tag){if(tag!=='canvas')return {click(){},remove(){}};const c=createCanvas(1,1);c.style={};c.toBlob=cb=>cb(new Blob([c.toBuffer('image/png')],{type:'image/png'}));return c;},body:{appendChild(){}}};
const root=path.resolve(__dirname,'..');for(const name of ['core','history','canvas','tools','spritesheet','export','api','aseprite','builtin-packs'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),{filename:name});
vm.runInThisContext(fs.readFileSync(path.join(root,'js/original32.js'),'utf8'));
global.File=class extends Blob{constructor(bytes,name){super(bytes);this.name=name;}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
(async()=>{
 const project=new PE.Project();project.layers=[];
 const pack=PE_BUILTIN_PACKS.find(p=>p.name==='idle.aseprite');await PE.importAseprite(new File([Buffer.from(pack.base64,'base64')],pack.name),project);
 const original=project.spriteSheets[0],si=await PE.addOriginal32Idle(project),sheet=project.spriteSheets[si],cm=new PE.CanvasManager(document.createElement('canvas'),project);
 assert.equal(sheet.frameWidth,32);assert.equal(sheet.frameHeight,32);assert.equal(sheet.getTotalFrames(),12);assert.equal(original.frameWidth,79);
 const preview=createCanvas(576,240),pc=preview.getContext('2d');pc.fillStyle='#e6e9e2';pc.fillRect(0,0,576,240);pc.imageSmoothingEnabled=false;
 const atlas=createCanvas(128,96),ac=atlas.getContext('2d');
 sheet.actions.forEach((a,ai)=>a.frames.forEach((frame,fi)=>{
  const image=cm.getCompositeImageData(si,ai,fi),source=original.actions[ai].frames[fi];assert.deepEqual(image.data,frame.originalPixels.data);assert.equal(frame.duration,source.duration);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){const from=((24+Math.floor(y/2))*79+31+Math.floor(x/2))*4;assert.deepEqual(image.data.subarray((y*32+x)*4,(y*32+x)*4+4),source.originalPixels.data.subarray(from,from+4),'exact original appearance doubled');}
  const tile=createCanvas(32,32);tile.getContext('2d').putImageData(image,0,0);ac.drawImage(tile,fi*32,ai*32);if(fi===0)pc.drawImage(tile,ai*192,24,192,192);
 }));
 for(const l of project.layers.filter(l=>l.sheetIndex===si&&PE.isHandLayer(l))){assert(l.referenceOnly&&l.locked);assert.equal(l.setPixel(`${si}_0_0`,0,0,255,0,0,255),false);}
 const exporter=new PE.ExportManager();exporter.init(project,cm);const saved=exporter.exportProject(false),restored=(await exporter.importProject(saved)).project,rcm=new PE.CanvasManager(document.createElement('canvas'),restored);
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++)assert.deepEqual(rcm.getCompositeImageData(si,ai,fi).data,cm.getCompositeImageData(si,ai,fi).data);
 fs.writeFileSync(path.resolve(root,'../../outputs/原版32x32-待机-三方向.png'),preview.toBuffer('image/png'));
 fs.writeFileSync(path.resolve(root,'../../outputs/原版32x32-待机-图集.png'),atlas.toBuffer('image/png'));
 fs.writeFileSync(path.resolve(root,'../../outputs/原版32x32-待机-分层工程.json'),Buffer.from(await saved.arrayBuffer()));
 console.log('PASS: original 12 idle frames doubled exactly into 32x32; body 26x30; protected separate hands; original source and timing preserved; PNG and layered project roundtrip pass.');
})().catch(e=>{console.error(e);process.exitCode=1});
