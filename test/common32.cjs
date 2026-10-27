const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={createElement(tag){if(tag!=='canvas')return {click(){},remove(){}};const c=createCanvas(1,1);c.style={};c.toBlob=cb=>cb(new Blob([c.toBuffer('image/png')],{type:'image/png'}));return c;},body:{appendChild(){}}};
const root=path.resolve(__dirname,'..');for(const name of ['core','history','canvas','tools','spritesheet','export','api','aseprite','builtin-packs'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),{filename:name});
for(const name of ['walk-pack','poses','original32','eyes32'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'));
global.File=class extends Blob{constructor(data,name){super(data);this.name=name;}};
global.FileReader=class{async readAsText(file){this.result=await file.text();this.onload()}};
(async()=>{
 const p=new PE.Project();p.layers=[];
 for(const pack of PE_BUILTIN_PACKS)await PE.importAseprite(new File([Buffer.from(pack.base64,'base64')],pack.name),p);
 const backup=p.layers.map(l=>({layer:l,frames:[...l.frameData].map(([k,d])=>[k,Buffer.from(d.data)])}));
 assert.deepEqual(Buffer.from(PE_BUILTIN_PACKS.find(p=>p.name==='walk.aseprite').base64,'base64'),fs.readFileSync('D:/Backup/Downloads/walk.aseprite'));
 const specifications=[['walk.aseprite','original32_walk',null,null,24],['idle.aseprite','original32_idle',null,null,12],['pick up.aseprite','original32_pickup',null,null,18],['hurt.aseprite','original32_sit','sit',null,12],['death.aseprite','original32_sleep','sleep','down',4]];
 const cm=new PE.CanvasManager(document.createElement('canvas'),p),preview=createCanvas(720,1120),pc=preview.getContext('2d');pc.fillStyle='#e6e9e2';pc.fillRect(0,0,720,1120);pc.imageSmoothingEnabled=false;
 const nativeSnapshots=[];let count=0;
 for(let row=0;row<specifications.length;row++){
  const [pack,name,pose,direction,total]=specifications[row],si=await PE.addOriginal32Action(p,pack,name,pose,direction),s=p.spriteSheets[si],eyes=PE.addReferenceEyes32(p,si);
  assert.equal(s.getTotalFrames(),total);assert.equal(s.frameWidth,pack==='pick up.aseprite'?40:32);
  const canvas=createCanvas(s.columns*s.frameWidth,s.rows*s.frameHeight),ctx=canvas.getContext('2d');
  s.actions.forEach((a,ai)=>a.frames.forEach((frame,fi)=>{
   count++;const key=`${si}_${ai}_${fi}`,im=cm.getCompositeImageData(si,ai,fi);assert.deepEqual([im.width,im.height],[s.frameWidth,s.frameHeight]);
   eyes.visible=false;assert.deepEqual(cm.getCompositeImageData(si,ai,fi).data,frame.originalPixels.data,'body and hands retain every source pixel');eyes.visible=true;
   if(a.direction==='up')assert(!eyes.frameData.has(key));
   else {const eye=eyes.frameData.get(key);let gray=0,white=0,purple=0;for(let k=0;k<eye.data.length;k+=4){if(!eye.data[k+3])continue;const [r,g,b]=eye.data.subarray(k,k+3);if(r===227&&g===227&&b===227)gray++;if(r===255&&g===255&&b===255)white++;if(r===113&&g===88&&b===171)purple++;}if(name==='original32_sleep'){assert.equal(gray+white+purple,0);}else{assert.equal(gray,2);assert.equal(white,4);assert.equal(purple,2);}}
   nativeSnapshots.push({si,ai,fi,data:Buffer.from(im.data)});
   const tile=createCanvas(im.width,im.height);tile.getContext('2d').putImageData(im,0,0);ctx.drawImage(tile,frame.sourceX,frame.sourceY);
   if(fi===0){const col={down:0,side:1,up:2}[a.direction],scale=5;pc.drawImage(tile,col*240+(240-im.width*scale)/2,row*224+16,im.width*scale,im.height*scale);}
  }));
  fs.writeFileSync(path.resolve(root,`../../outputs/${name}-图集.png`),canvas.toBuffer('image/png'));
 }
 assert.equal(count,70);assert.equal(p.spriteSheets.length,12);
 for(const {layer,frames}of backup)for(const[k,data]of frames)assert.deepEqual(Buffer.from(layer.frameData.get(k).data),data,'all seven source backups untouched');
 for(const l of p.layers.filter(l=>PE.isHandLayer(l))){assert(l.referenceOnly&&l.locked);}
 p.currentSheetIndex=p.spriteSheets.findIndex(s=>s.name==='original32_idle');p.currentActionIndex=1;p.currentLayerIndex=p.layers.findIndex(l=>l.sheetIndex===p.currentSheetIndex&&l.name.includes('眼型'));
 p.bgColor='#d4e3ea';p.gridColor='rgba(48,68,62,.2)';const ex=new PE.ExportManager();ex.init(p,cm);const saved=ex.exportProject(false),restored=(await ex.importProject(saved)).project,rc=new PE.CanvasManager(document.createElement('canvas'),restored);
 assert.equal(restored.bgColor,p.bgColor);assert.equal(restored.gridColor,p.gridColor);for(const {si,ai,fi,data}of nativeSnapshots)assert.deepEqual(Buffer.from(rc.getCompositeImageData(si,ai,fi).data),data,'all five actions roundtrip');
 fs.writeFileSync(path.resolve(root,'../../outputs/常用动作-32像素-分层工程.json'),Buffer.from(await saved.arrayBuffer()));
 fs.writeFileSync(path.resolve(root,'../../outputs/常用动作-32像素-预览.png'),preview.toBuffer('image/png'));
 console.log('PASS: 5 active actions / 70 frames; new walk bytes exact; 7 untouched source backups; gray and white eye cells; sleep closed eyes; protected hands; all 70 layered export/import composites match.');
})().catch(e=>{console.error(e);process.exitCode=1});

