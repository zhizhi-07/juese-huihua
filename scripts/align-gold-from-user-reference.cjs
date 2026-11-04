const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm'),crypto=require('crypto');
const {createCanvas,ImageData,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');global.window=global;global.ImageData=ImageData;vm.runInThisContext(fs.readFileSync('js/core.js','utf8'));
(async()=>{
const id='character-gold-mix-1793320553623',url='http://127.0.0.1:8765/api/project?id='+id,out=path.resolve('自检记录','金发按参考对齐-'+Date.now());fs.mkdirSync(out,{recursive:true});let r=await fetch(url);assert(r.ok);let raw=await r.text(),p=JSON.parse(raw),etag=r.headers.get('etag');fs.writeFileSync(path.join(out,'before.json'),raw);fs.writeFileSync(path.join(out,'etag.txt'),etag);
function pixels(c){return c.getContext('2d').getImageData(0,0,c.width,c.height)}
function surface(w,h){let c=createCanvas(w,h);c.getContext('2d').imageSmoothingEnabled=false;return c}
function removeBlack(c){let im=pixels(c),removed=0;for(let i=0;i<im.data.length;i+=4){let a=im.data.subarray(i,i+4),hi=Math.max(...a.subarray(0,3)),lo=Math.min(...a.subarray(0,3));if(a[3]&&hi<115&&hi-lo<20){im.data.fill(0,i,i+4);removed++}}c.getContext('2d').putImageData(im,0,0);return removed}
let refs=[];for(let name of ['codex-clipboard-9a692d1e-37d2-47ab-b661-d5a7ff0dc498.png','codex-clipboard-2e9fe18e-5c27-451b-b321-8441ebc20d3a.png']){let f='C:/Users/ADMINI~1/AppData/Local/Temp/'+name,im=await loadImage(f),c=surface(im.width,im.height);c.getContext('2d').drawImage(im,0,0);let removed=removeBlack(c);assert(removed>0);refs.push(c);fs.writeFileSync(path.join(out,`参考透明-${refs.length}.png`),c.toBuffer('image/png'))}
let names=['TV_FrontHair1_p80011.png','TV_RearHair1_p80009.png','TV_RearHair2_p80009.png'],src='C:/Users/Administrator/Desktop/衣服/衣服/10/TV/Female/',ims=[];for(let n of names){let b=fs.readFileSync(src+n);ims.push(await loadImage(b));fs.appendFileSync(path.join(out,'source-sha256.txt'),n+' '+crypto.createHash('sha256').update(b).digest('hex')+'\n')}
function crop(im,col,row){let c=surface(48,48);c.getContext('2d').drawImage(im,col*48,row*48,48,48,0,0,48,48);return c}
function bounds(d,y0=0,y1=d.height){let xs=[],ys=[];for(let y=y0;y<y1;y++)for(let x=0;x<d.width;x++)if(d.data[(y*d.width+x)*4+3]){xs.push(x);ys.push(y)}return xs.length?{x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys)}:null}
let hair=p.layers.filter(l=>l.sheetIndex===8&&/^头发 \/ (80009|80011) \//.test(l.name)),rear=hair.find(l=>l.name.endsWith('后发')),front=hair.find(l=>l.name.endsWith('前发'));assert(front&&rear);
let metrics=[];
for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
 let key=`8_${ai}_${fi}`,head=p.layers.find(l=>l.sheetIndex===8&&l.name==='head'&&l.frameData?.[key]);assert(head);let hi=await loadImage(head.frameData[key].dataURL),hc=surface(32,32);hc.getContext('2d').drawImage(hi,0,0);let hb=bounds(pixels(hc),0,13),headY=hb.y0,center=(hb.x0+hb.x1)/2,dy=headY-2,col=[1,2,1,0][fi],dir=p.spriteSheets[8].actions[ai].direction;
 for(let layer of [rear,front]){
 let isFront=layer===front,c=surface(32,32),g=c.getContext('2d');
 if(dir==='side'){
  // Both supplied Variation thumbnails are the actual three-quarter side, not TV's 90-degree profile.
  let ref=refs[isFront?1:0],refPixels=pixels(ref),scale=.67,refRoot=31.5,refTop=isFront?5:3;
  let result=g.createImageData(32,32);
  let tv0=pixels(crop(ims[2],1,0)),tv=pixels(crop(ims[2],col,0));
  function tailSpan(im,y,left){let xs=[];for(let x=0;x<48;x++)if((left?x<23+col-1:x>=23+col-1)&&im.data[(y*48+x)*4+3])xs.push(x-(col-1));return xs.length?[Math.min(...xs),Math.max(...xs)]:null}
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
   let sx=(x-center)/scale+refRoot,sy=(y-(headY-2))/scale+refTop;
   if(!isFront&&sy>=25){let syTV=Math.min(36,Math.max(23,Math.round(23+(sy-25)*13/21))),left=sx<31.5;
    let a=[];for(let xx=0;xx<48;xx++)if((left?xx<23:xx>=23)&&tv0.data[(syTV*48+xx)*4+3])a.push(xx);
    let b=tailSpan(tv,syTV+(col===1?0:1),left);if(a.length&&b){let shift=(b[0]+b[1]-Math.min(...a)-Math.max(...a))/2;sx-=shift*Math.min(1,(sy-25)/8)}
   }
   sx=Math.round(sx);sy=Math.round(sy);if(sx>=0&&sx<64&&sy>=0&&sy<64)result.data.set(refPixels.data.subarray((sy*64+sx)*4,(sy*64+sx)*4+4),(y*32+x)*4)
  }
  g.putImageData(result,0,0);
 }else if(!(dir==='up'&&isFront)){
  let im=isFront?ims[0]:ims[dir==='up'?1:2],tile=crop(im,col,dir==='up'?3:0),d=pixels(tile),b=bounds(d),sourceCenter=23+(col-1),scaleX=isFront?.94:.83,scaleY=isFront?.78:.78;
  g.drawImage(tile,center-sourceCenter*scaleX,headY-2-b.y0*scaleY,48*scaleX,48*scaleY);
 }
 layer.frameData[key]={width:32,height:32,dataURL:c.toDataURL()};let d=pixels(c);assert([...d.data].every((v,i)=>i%4!==3||v===0||v===255));if(dir==='up'&&isFront)assert(!d.data.some(v=>v));metrics.push({key,layer:layer.name,head:hb,hair:bounds(d),col});
 }
}
// Keep source back-of-head and front hair slots independent; posterior scalp overlays skin in this imported set.
let old=p.layers.slice(),parents=new Map(old.map(l=>[l,l.parent==null?null:old[l.parent]]));p.layers=[...old.filter(l=>!hair.includes(l)),rear,front];for(let l of p.layers)if(l.parent!=null)l.parent=p.layers.indexOf(parents.get(l));p.currentLayerIndex=p.layers.length-1;
fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify(metrics,null,2));
let preview=surface(768,576),pg=preview.getContext('2d'),audit=surface(768,576),ag=audit.getContext('2d');
for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
 let key=`8_${ai}_${fi}`,c=surface(32,32),g=c.getContext('2d'),headc=surface(32,32),hg=headc.getContext('2d');
 for(let l of PE.getRenderLayers(p,8,ai)){if(l.isGroup||l.sheetIndex!==8||l.visible===false)continue;let par=l.parent,visible=true;while(par!=null){if(p.layers[par].visible===false)visible=false;par=p.layers[par].parent}let f=l.frameData?.[key];if(visible&&f){g.drawImage(await loadImage(f.dataURL),0,0);if(l.name==='head')hg.drawImage(await loadImage(f.dataURL),0,0)}}
 assert(pixels(c).data.some(v=>v));fs.writeFileSync(path.join(out,`帧-${ai}-${fi}.png`),c.toBuffer('image/png'));pg.fillStyle=fi%2?'#35434b':'#ccd3cd';pg.fillRect(fi*192,ai*192,192,192);pg.drawImage(c,fi*192,ai*192,192,192);
 let d=pixels(headc);for(let i=0;i<d.data.length;i+=4)if(d.data[i+3])d.data.set([255,60,140,255],i);hg.putImageData(d,0,0);hg.drawImage(await loadImage(rear.frameData[key].dataURL),0,0);hg.drawImage(await loadImage(front.frameData[key].dataURL),0,0);ag.fillStyle='#b4c3ce';ag.fillRect(fi*192,ai*192,192,192);ag.drawImage(headc,fi*192,ai*192,192,192);
}
fs.writeFileSync(path.join(out,'全部待机候选.png'),preview.toBuffer('image/png'));fs.writeFileSync(path.join(out,'头部粉色对齐检查.png'),audit.toBuffer('image/png'));console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
