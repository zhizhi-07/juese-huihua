const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={createElement(tag){if(tag!=='canvas')return {click(){},remove(){}};const c=createCanvas(1,1);c.style={};c.toBlob=cb=>cb(new Blob([c.toBuffer('image/png')],{type:'image/png'}));return c;},body:{appendChild(){}}};
const root=path.resolve(__dirname,'..');for(const name of ['core','history','canvas','tools','spritesheet','export','api','aseprite','builtin-packs'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),{filename:name});
vm.runInThisContext(fs.readFileSync(path.join(root,'js/original32.js'),'utf8'));
global.File=class extends Blob{constructor(bytes,name){super(bytes);this.name=name;}};

global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
vm.runInThisContext(fs.readFileSync(path.join(root,'js/eyes32.js'),'utf8'));
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
(async()=>{
 const p=new PE.Project();p.layers=[];const si=await PE.addOriginal32Idle(p),s=p.spriteSheets[si],cm=new PE.CanvasManager(document.createElement('canvas'),p);
 const originals=p.layers.map(l=>({layer:l,frames:[...l.frameData].map(([k,d])=>[k,Buffer.from(d.data)])}));
 const eyes=PE.addReferenceEyes32(p,si);assert(!p.layers.some(l=>l.name.includes('丸子')));assert.equal(eyes.frameData.size,8);assert(!eyes.locked&&!eyes.referenceOnly);
 const preview=createCanvas(672,288),pc=preview.getContext('2d');pc.fillStyle='#e6e9e2';pc.fillRect(0,0,672,288);pc.imageSmoothingEnabled=false;
 const atlas=createCanvas(128,96),ac=atlas.getContext('2d'),order={down:0,side:1,up:2};
 s.actions.forEach((a,ai)=>a.frames.forEach((f,fi)=>{
  const im=cm.getCompositeImageData(si,ai,fi),key=`${si}_${ai}_${fi}`;assert.equal(im.width,32);assert.equal(im.height,32);
  if(a.direction==='up'){assert(!eyes.frameData.has(key));eyes.visible=false;assert.deepEqual(cm.getCompositeImageData(si,ai,fi).data,im.data);eyes.visible=true;}
  else {const eye=eyes.frameData.get(key);let violet=0,black=0,top=32,bottom=-1;for(let k=0;k<eye.data.length;k+=4){if(!eye.data[k+3])continue;const r=eye.data[k],g=eye.data[k+1],b=eye.data[k+2],y=Math.floor(k/4/32);if(r>50&&b>r&&r>g)violet++;if(r===38&&g===35){black++;top=Math.min(top,y);bottom=Math.max(bottom,y);}}assert.equal(violet,12);assert.equal(black,8);assert.equal(bottom-top,1,'dark lashes confined to upper two rows; no lower black dots');}
  const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);ac.drawImage(tile,fi*32,ai*32);if(fi===0)pc.drawImage(tile,order[a.direction]*224,32,224,224);
 }));
 for(const {layer,frames}of originals)for(const[k,data]of frames)assert.deepEqual(Buffer.from(layer.frameData.get(k).data),data,'head, body and hands unchanged');
 const ex=new PE.ExportManager();ex.init(p,cm);const saved=ex.exportProject(false),restored=(await ex.importProject(saved)).project,rc=new PE.CanvasManager(document.createElement('canvas'),restored);
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++)assert.deepEqual(rc.getCompositeImageData(si,ai,fi).data,cm.getCompositeImageData(si,ai,fi).data);
 fs.writeFileSync(path.resolve(root,'../../outputs/原版32x32-紫色眼型-预览.png'),preview.toBuffer('image/png'));
 fs.writeFileSync(path.resolve(root,'../../outputs/原版32x32-紫色眼型-待机图集.png'),atlas.toBuffer('image/png'));
 fs.writeFileSync(path.resolve(root,'../../outputs/原版32x32-紫色眼型-分层工程.json'),Buffer.from(await saved.arrayBuffer()));
 console.log('PASS: 8 eye cels on independent editable layer, vertical violet irises and clean lower edges, no hairstyle, back/head/body/hands preserved, 12-frame JSON roundtrip.');
})().catch(e=>{console.error(e);process.exitCode=1});





