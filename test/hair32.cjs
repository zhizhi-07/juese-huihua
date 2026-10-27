const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={createElement(tag){if(tag!=='canvas')return {click(){},remove(){}};const c=createCanvas(1,1);c.style={};c.toBlob=cb=>cb(new Blob([c.toBuffer('image/png')],{type:'image/png'}));return c;},body:{appendChild(){}}};
const root=path.resolve(__dirname,'..');for(const name of ['core','history','canvas','tools','spritesheet','export','api','aseprite','builtin-packs'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),{filename:name});
vm.runInThisContext(fs.readFileSync(path.join(root,'js/original32.js'),'utf8'));
global.File=class extends Blob{constructor(bytes,name){super(bytes);this.name=name;}};
vm.runInThisContext(fs.readFileSync(path.join(root,'js/hairstyle32.js'),'utf8'));
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
(async()=>{
 const project=new PE.Project();project.layers=[];const si=await PE.addOriginal32Idle(project),sheet=project.spriteSheets[si],cm=new PE.CanvasManager(document.createElement('canvas'),project);
 const snapshot=project.layers.filter(l=>l.sheetIndex===si).map(l=>({layer:l,data:[...l.frameData].map(([k,v])=>[k,Buffer.from(v.data)])}));
 const hair=PE.addDoubleBuns32(project,si);assert.equal(hair.frameData.size,12);assert(!hair.referenceOnly&&!hair.locked);
 const preview=createCanvas(672,288),pc=preview.getContext('2d');pc.fillStyle='#e6e9e2';pc.fillRect(0,0,672,288);pc.imageSmoothingEnabled=false;
 const atlas=createCanvas(128,96),ac=atlas.getContext('2d');const order={down:0,side:1,up:2};let eyes=0;
 sheet.actions.forEach((a,ai)=>a.frames.forEach((frame,fi)=>{
  const im=cm.getCompositeImageData(si,ai,fi);assert.equal(im.width,32);assert.equal(im.height,32);
  hair.visible=false;assert.deepEqual(cm.getCompositeImageData(si,ai,fi).data,frame.originalPixels.data);hair.visible=true;
  const head=project.layers.find(l=>l.sheetIndex===si&&l.name==='head'&&l.frameData.has(`${si}_${ai}_${fi}`)).frameData.get(`${si}_${ai}_${fi}`);
  let x0=32,y0=32,x1=-1;for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(head.data[(y*32+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);}
  if(a.direction!=='up')for(let y=y0+12;y<=y0+15;y++)for(let x=x0+4;x<=x1-4;x++){const p=(y*32+x)*4;if(head.data[p+3]&&head.data[p]<80&&head.data[p+1]<100){assert.deepEqual(im.data.subarray(p,p+4),head.data.subarray(p,p+4),'eyes remain visible');eyes++;}}
  const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);ac.drawImage(tile,fi*32,ai*32);if(fi===0)pc.drawImage(tile,order[a.direction]*224,32,224,224);
 }));
 assert(eyes>0);for(const {layer,data}of snapshot)for(const[k,bytes]of data)assert.deepEqual(Buffer.from(layer.frameData.get(k).data),bytes,'base and hands unchanged');
 const ex=new PE.ExportManager();ex.init(project,cm);const saved=ex.exportProject(false),restored=(await ex.importProject(saved)).project,rc=new PE.CanvasManager(document.createElement('canvas'),restored);
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++)assert.deepEqual(rc.getCompositeImageData(si,ai,fi).data,cm.getCompositeImageData(si,ai,fi).data);
 fs.writeFileSync(path.resolve(root,'../../outputs/原版32x32-双丸子头-三方向.png'),preview.toBuffer('image/png'));
 fs.writeFileSync(path.resolve(root,'../../outputs/原版32x32-双丸子头-待机图集.png'),atlas.toBuffer('image/png'));
 fs.writeFileSync(path.resolve(root,'../../outputs/原版32x32-双丸子头-分层工程.json'),Buffer.from(await saved.arrayBuffer()));
 console.log('PASS: 12 native 32x32 hair frames, three views, visible eyes, unchanged original body and hands, independent hair visibility, layered JSON roundtrip.');
})().catch(e=>{console.error(e);process.exitCode=1});

