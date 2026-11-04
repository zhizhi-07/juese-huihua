const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');const {createCanvas,ImageData,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');global.window=global;global.ImageData=ImageData;global.document={addEventListener(){},createElement(){return createCanvas(1,1)}};for(let n of ['core','pixel-import'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'));
(async()=>{const id='character-gold-mix-1793320553623',url='http://127.0.0.1:8765/api/project?id='+id,out=path.resolve('自检记录','灰色混搭手绘待机-'+Date.now());fs.mkdirSync(out,{recursive:true});let res=await fetch(url);assert(res.ok);let raw=await res.text(),p=JSON.parse(raw),etag=res.headers.get('etag');fs.writeFileSync(path.join(out,'before.json'),raw);fs.writeFileSync(path.join(out,'etag.txt'),etag);fs.writeFileSync(path.join(out,'before-sha256.txt'),crypto.createHash('sha256').update(raw).digest('hex'));
const isHair=l=>l.sheetIndex===8&&/^头发 \/ (80009|80011)/.test(l.name),beforeBase=JSON.stringify(p.layers.filter(l=>!isHair(l))),layers=p.layers.filter(l=>isHair(l)&&!l.isGroup),motion=[0,1,1,0],report=[];
for(let layer of layers)for(let ai=0;ai<3;ai++){
 let base=layer.frameData[`8_${ai}_0`];if(!base)continue;let c=createCanvas(32,32),g=c.getContext('2d');g.drawImage(await loadImage(base.dataURL),0,0);let source=PE.hairGrayImage(g.getImageData(0,0,32,32)),isFront=layer.name.endsWith('前发');
 if(isFront&&ai===0){const original=source.data.slice();for(let x=0;x<32;x++){for(let y=24;y<32;y++)source.data.fill(0,(y*32+x)*4,(y*32+x)*4+4);if(x>=15)source.data.set(original.subarray((25*32+x)*4,(25*32+x)*4+4),(23*32+x)*4);else if(x<10)source.data.set(original.subarray((24*32+x)*4,(24*32+x)*4+4),(23*32+x)*4)}}
 for(let fi=0;fi<4;fi++){
  let image=new ImageData(32,32),dy=fi>=2?2:0,shift=motion[fi],key=`8_${ai}_${fi}`;
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
   let i=(y*32+x)*4;if(!source.data[i+3])continue;
   // Draw breathing by deleting one lower-strand row, not by translating the whole hairstyle.
   const cutRow=ai===2&&!isFront?22:17;if(dy&&y===cutRow)continue;let ny=y+(dy?(y<cutRow?2:1):0),nx=x;
   if(isFront&&ai===0&&y>=21&&x>=15)nx+=shift;
   if(isFront&&ai===1&&y>=19&&(x<10||x>21))nx+=(x<15.5?1:-1)*shift;
   if(!isFront&&y>=22&&(x<8||x>23))nx+=(x<15.5?1:-1)*shift;
   assert(nx>=0&&nx<32&&ny>=0&&ny<32,'Cropped strand '+key);
   image.data.set(source.data.subarray(i,i+4),(ny*32+nx)*4);
  }
  if(ai===2&&isFront)assert(!image.data.some(v=>v));for(let i=0;i<image.data.length;i+=4)if(image.data[i+3])assert([119,178,209].includes(image.data[i])&&image.data[i]===image.data[i+1]&&image.data[i]===image.data[i+2]);
  let tile=createCanvas(32,32);tile.getContext('2d').putImageData(image,0,0);layer.frameData[key]={width:32,height:32,dataURL:tile.toDataURL()};report.push({key,layer:layer.name,rootOffset:dy,tipOffset:dy?1:0,curlInward:shift});
 }
}
assert.equal(JSON.stringify(p.layers.filter(l=>!isHair(l))),beforeBase);p.name='人物 · 灰色混搭前80011＋后80009';fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));fs.writeFileSync(path.join(out,'手绘动画与层序.json'),JSON.stringify({motion:report,order:p.layers.map((l,i)=>({i,name:l.name,parent:l.parent,visible:l.visible,sheetIndex:l.sheetIndex})).filter(l=>l.sheetIndex===8),palette:['#777777','#B2B2B2','#D1D1D1'],note:'Frame0 reference retained with a two-pixel side-strand trim; other source columns no longer shuffled. Cap follows head 2px; lower strands follow 1px with 1px inward curl delay.'},null,2));
let preview=createCanvas(768,576),pg=preview.getContext('2d');pg.imageSmoothingEnabled=false;
for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
 let tile=createCanvas(32,32),g=tile.getContext('2d'),key=`8_${ai}_${fi}`;
 for(let l of PE.getRenderLayers(p,8,ai)){if(l.sheetIndex!==8||l.isGroup||l.visible===false)continue;let par=l.parent,visible=true;while(par!=null){if(!p.layers[par].visible)visible=false;par=p.layers[par].parent}if(visible&&l.frameData?.[key])g.drawImage(await loadImage(l.frameData[key].dataURL),0,0)}assert(g.getImageData(0,0,32,32).data.some(v=>v));fs.writeFileSync(path.join(out,`帧-${ai}-${fi}.png`),tile.toBuffer('image/png'));pg.fillStyle=fi%2?'#35434b':'#ccd3cd';pg.fillRect(fi*192,ai*192,192,192);pg.drawImage(tile,fi*192,ai*192,192,192);
}fs.writeFileSync(path.join(out,'灰发全部待机候选.png'),preview.toBuffer('image/png'));console.log(out)
})().catch(e=>{console.error(e);process.exitCode=1});



