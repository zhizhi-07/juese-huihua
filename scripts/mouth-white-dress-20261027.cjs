const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'自检记录/用户小嘴与白裙待机-20261027'),url='http://127.0.0.1:8765/api/project?id=character-green-flower-idle-20261027';
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;},body:{appendChild(){}}};global.File=class extends Blob{constructor(b,n){super(b);this.name=n;}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const n of ['core','history','canvas','tools','spritesheet','export'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const entry=data=>({width:32,height:32,dataURL:'data:image/png;base64,'+png.encode(32,32,data).toString('base64')});
(async()=>{
 const r=await fetch(url);assert(r.ok);const text=await r.text(),etag=r.headers.get('etag'),before=JSON.parse(text),p=JSON.parse(text);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'before.json'),text);fs.writeFileSync(path.join(out,'etag.txt'),etag);
 const mouth=p.layers.find(l=>l.sheetIndex===8&&l.name==='嘴巴');assert(mouth?.frameData['8_1_1']);const originalMouth=JSON.parse(JSON.stringify(mouth)),src=png.decode(Buffer.from(mouth.frameData['8_1_1'].dataURL.split(',')[1],'base64'));
 const points=[];for(let i=0;i<4096;i+=4)if(src.data[i+3])points.push({x:i/4%32,y:Math.floor(i/128),c:src.data.slice(i,i+4)});assert.equal(points.length,2);
 const dress={sheetIndex:8,isGroup:false,parent:null,depth:0,referenceOnly:false,name:'服装 / 01 简单白色连衣裙',visible:true,locked:false,opacity:1,frameData:{}};
 const W=[247,245,241,255],S=[213,214,224,255],O=[119,119,119,255];
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
  const key=`8_${ai}_${fi}`,head=p.layers.find(l=>l.sheetIndex===8&&l.name==='head'&&l.frameData[key]),hd=png.decode(Buffer.from(head.frameData[key].dataURL.split(',')[1],'base64'));let top=32;for(let y=0;y<24;y++)for(let x=0;x<32;x++)if(hd.data[(y*32+x)*4+3])top=Math.min(top,y);const dy=top-2;
  if(key!=='8_1_1'){const data=new Uint8Array(4096);if(ai!==2)for(const pt of points)data.set(pt.c,((pt.y+dy)*32+pt.x+(ai===0?3:0))*4);mouth.frameData[key]=entry(data);}
  const data=new Uint8Array(4096),low=dy===2,upper=22+dy;
  const rows=low?[[upper,11,22],[25,11,22],[26,11,22],[27,10,23],[28,10,23],[29,9,24]]:[[22,11,22],[23,11,22],[24,11,22],[25,11,22],[26,10,23],[27,10,23],[28,9,24],[29,9,24]];
  for(const [y,left,right]of rows)for(let x=left;x<=right;x++){
   if(y===upper&&ai!==2&&x>=14&&x<=19)continue;
   if(y===upper&&ai===2&&x>=15&&x<=18)continue;
   let c=W;if(x===left||x===right||y===29)c=O;else if((y>=27&&(x===13||x===20))||x===right-1)c=S;
   data.set(c,(y*32+x)*4);
  }
  // Leave protected hands in front of the garment without changing their pixels.
  for(const hand of p.layers.filter(l=>l.sheetIndex===8&&/^hand(?: 2)?$/.test(l.name)&&l.frameData[key])){const im=png.decode(Buffer.from(hand.frameData[key].dataURL.split(',')[1],'base64'));for(let i=0;i<4096;i+=4)if(im.data[i+3])data.fill(0,i,i+4);}
  dress.frameData[key]=entry(data);
 }
 p.layers.push(dress);assert.deepEqual(mouth.frameData['8_1_1'],originalMouth.frameData['8_1_1']);for(let i=0;i<before.layers.length;i++)if(before.layers[i].name!=='嘴巴')assert.deepEqual(p.layers[i],before.layers[i]);assert.deepEqual(p.spriteSheets,before.spriteSheets);
 const ex=new PE.ExportManager(),{project}=await ex.importProject(new File([JSON.stringify(p)],'candidate.json')),cm=new PE.CanvasManager(document.createElement('canvas'),project);ex.project=project;ex.canvasManager=cm;
 const sheet=createCanvas(512,384),ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;project.layers.find(l=>l.sheetIndex===8&&l.name.endsWith('前发')).visible=true;
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){project.currentSheetIndex=8;project.currentActionIndex=ai;project.currentFrameIndex=fi;const im=cm.getCompositeImageData(8,ai,fi);assert(im.data.some(v=>v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,32,32).data,im.data);const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);ctx.fillStyle=ai===1?'#ddd5ed':'#45434b';ctx.fillRect(fi*128,ai*128,128,128);ctx.drawImage(tile,fi*128,ai*128,128,128);}
 fs.writeFileSync(path.join(out,'preview.png'),sheet.toBuffer('image/png'));fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));
 if(process.argv.includes('--publish')){const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,'Save failed '+saved.status);assert.deepEqual(await(await fetch(url)).json(),p);}
 console.log('PASS: user mouth retained and synchronized; independent white dress; all other pixels unchanged.'+(process.argv.includes('--publish')?' Saved and verified.':''));
})().catch(e=>{console.error(e);process.exitCode=1;});
