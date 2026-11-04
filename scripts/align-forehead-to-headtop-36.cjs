const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm'),{createCanvas,ImageData,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');global.window=global;global.ImageData=ImageData;vm.runInThisContext(fs.readFileSync('js/core.js','utf8'));
(async()=>{let out=path.resolve('自检记录','发顶齐平与刘海同长-'+Date.now()),url='http://127.0.0.1:8765/api/project?id=character-gold-mix-1793320553623';fs.mkdirSync(out,{recursive:true});let r=await fetch(url);assert(r.ok);let raw=await r.text(),p=JSON.parse(raw);fs.writeFileSync(path.join(out,'before.json'),raw);fs.writeFileSync(path.join(out,'etag.txt'),r.headers.get('etag'));let reference=JSON.parse(fs.readFileSync('自检记录/灰色混搭手绘待机-1793322149718/final-api-readback.json')),golden=JSON.parse(fs.readFileSync('自检记录/灰色混搭手绘待机-1793322149718/before.json')),hair=l=>l.sheetIndex===8&&/^头发 \/ (80009|80011)/.test(l.name),beforeNonHair=JSON.stringify(p.layers.filter(l=>!hair(l))),report=[];
async function read(f){let c=createCanvas(f.width,f.height);c.getContext('2d').drawImage(await loadImage(f.dataURL),0,0);return c.getContext('2d').getImageData(0,0,f.width,f.height)}
function save(im){let c=createCanvas(im.width,im.height);c.getContext('2d').putImageData(im,0,0);return {width:im.width,height:im.height,dataURL:c.toDataURL()}}
for(let layer of p.layers.filter(l=>hair(l)&&!l.isGroup))for(let ai=0;ai<3;ai++){
 let first=`8_${ai}_0`,srcLayer=reference.layers.find(l=>l.name===layer.name);if(!srcLayer?.frameData?.[first])continue;let base=await read(srcLayer.frameData[first]),isFront=layer.name.endsWith('前发'),srcGold=golden.layers.find(l=>l.name===layer.name),gold=srcGold?.frameData?.[first]?await read(srcGold.frameData[first]):null;
 if(!isFront&&gold)for(let y=0;y<32;y++)for(let x=0;x<32;x++){
  let i=(y*32+x)*4;if(!base.data[i+3]||!gold.data[i+3])continue;
  if(y>=12&&(x<8||x>23)){let light=.2126*gold.data[i]+.7152*gold.data[i+1]+.0722*gold.data[i+2],edge=x===0||x===31||y===31||[i-4,i+4,i-128,i+128].some(j=>gold.data[j+3]<128),v=light>=145?209:edge||y>=16&&y<=19?119:178;base.data.set([v,v,v,255],i)}
 }
 let fitted=new ImageData(32,28);
 for(let ty=0;ty<28;ty++)for(let x=0;x<32;x++){
  let sy=ai===0&&isFront?(ty<=9?ty*4/3:12+(ty-9)*1.1):ai===2?ty*21/19:!isFront?ty/.9:ty;
  sy=Math.round(sy);if(sy<0||sy>=32)continue;let sx=ai===0?31-x:x;fitted.data.set(base.data.subarray((sy*32+sx)*4,(sy*32+sx)*4+4),(ty*32+x)*4);
 }
 // Trace the existing back cap/ponytail junction with one-pixel dark ink, not a filled gray silhouette.
 if(ai===2&&!isFront){for(let [x,y]of [[6,12],[6,13],[7,14],[7,15],[8,16],[8,17],[9,18]])for(let xx of [x,31-x]){let i=(y*32+xx)*4;if(fitted.data[i+3])fitted.data.set([119,119,119,255],i)}}
 for(let fi=0;fi<4;fi++){
  let key=`8_${ai}_${fi}`,head=p.layers.find(l=>l.name==='head'&&l.sheetIndex===8&&l.frameData?.[key]);assert(head);let hd=await read(head.frameData[key]),headTop=36;for(let y=0;y<20;y++)for(let x=0;x<36;x++)if(hd.data[(y*36+x)*4+3])headTop=Math.min(headTop,y);
  let im=new ImageData(36,36),breath=fi>=2,cut=ai===2&&!isFront?20:14;
  for(let y=0;y<28;y++)for(let x=0;x<32;x++){
   let i=(y*32+x)*4;if(!fitted.data[i+3]||breath&&y===cut)continue;let nx=x+2,ny=headTop+y-(breath&&y>cut?1:0);
   if(!isFront&&y>=18&&(x<8||x>23))nx+=(x<15.5?1:-1)*[0,1,1,0][fi];
   assert(nx>=0&&nx<36&&ny>=headTop&&ny<36,'Hair cropped or above scalp '+key);im.data.set(fitted.data.subarray(i,i+4),(ny*36+nx)*4);
  }
  let top=36,bottom=-1;for(let y=0;y<36;y++)for(let x=0;x<36;x++)if(im.data[(y*36+x)*4+3]){top=Math.min(top,y);bottom=Math.max(bottom,y)}if(bottom>=0)assert.equal(top,headTop,'Root not flush '+key+' '+layer.name);if(ai===2&&isFront)assert.equal(bottom,-1);layer.frameData[key]=save(im);report.push({key,layer:layer.name,headTop,hairTop:bottom<0?null:top,bottom});
 }
}
assert.equal(JSON.stringify(p.layers.filter(l=>!hair(l))),beforeNonHair);fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));fs.writeFileSync(path.join(out,'对齐测量.json'),JSON.stringify(report,null,2));let c=createCanvas(864,648),g=c.getContext('2d');g.imageSmoothingEnabled=false;for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){let tile=createCanvas(36,36),ctx=tile.getContext('2d');for(let l of PE.getRenderLayers(p,8,ai)){if(l.sheetIndex!==8||l.isGroup||l.visible===false)continue;let par=l.parent,visible=true;while(par!=null){if(!p.layers[par].visible)visible=false;par=p.layers[par].parent}if(visible&&l.frameData?.[`8_${ai}_${fi}`])ctx.drawImage(await loadImage(l.frameData[`8_${ai}_${fi}`].dataURL),0,0)}fs.writeFileSync(path.join(out,`帧-${ai}-${fi}.png`),tile.toBuffer('image/png'));g.fillStyle=fi%2?'#35434b':'#d7dbd7';g.fillRect(fi*216,ai*216,216,216);g.drawImage(tile,fi*216,ai*216,216,216)}fs.writeFileSync(path.join(out,'发顶齐平同长候选.png'),c.toBuffer('image/png'));console.log(out)
})().catch(e=>{console.error(e);process.exitCode=1});
