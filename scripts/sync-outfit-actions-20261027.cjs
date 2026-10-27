const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'自检记录/整套外观同步全部动作-20261027'),url='http://127.0.0.1:8765/api/project?id=character-green-flower-idle-20261027';
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;},body:{appendChild(){}}};global.File=class extends Blob{constructor(b,n){super(b);this.name=n;}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const n of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
function component(im){
 const seen=new Set(),groups=[];for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const start=y*im.width+x;if(!im.data[start*4+3]||seen.has(start))continue;const group=[],todo=[start];seen.add(start);while(todo.length){const i=todo.pop();group.push([i%im.width,Math.floor(i/im.width)]);const xx=i%im.width,yy=Math.floor(i/im.width);for(const [nx,ny]of [[xx-1,yy],[xx+1,yy],[xx,yy-1],[xx,yy+1]])if(nx>=0&&nx<im.width&&ny>=0&&ny<im.height){const n=ny*im.width+nx;if(im.data[n*4+3]&&!seen.has(n)){seen.add(n);todo.push(n);}}}groups.push(group);}
 const pts=groups.sort((a,b)=>b.length-a.length)[0];assert(pts?.length);return {x0:Math.min(...pts.map(p=>p[0])),x1:Math.max(...pts.map(p=>p[0])),y0:Math.min(...pts.map(p=>p[1])),y1:Math.max(...pts.map(p=>p[1])),pts};
}
async function load(p){const ex=new PE.ExportManager(),{project}=await ex.importProject(new File([JSON.stringify(p)],'project.json')),cm=new PE.CanvasManager(document.createElement('canvas'),project);ex.project=project;ex.canvasManager=cm;return {ex,project,cm};}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 if(process.argv.includes('--sit-reference')){
  const currentReference=await fetch('http://127.0.0.1:8765/api/project?id=main');assert(currentReference.ok);const old=await currentReference.json();fs.writeFileSync(path.join(out,'reference-main.json'),JSON.stringify(old));const ref=await load(old),canvas=createCanvas(768,576),cx=canvas.getContext('2d');cx.imageSmoothingEnabled=false;
  for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){const im=ref.cm.getCompositeImageData(10,ai,fi),tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);cx.fillStyle='#ddd5ed';cx.fillRect(fi*192,ai*192,192,192);cx.drawImage(tile,fi*192,ai*192,192,192);}
  fs.writeFileSync(path.join(out,'old-sit-reference.png'),canvas.toBuffer('image/png'));
  console.log(old.layers.filter(l=>l.sheetIndex===10).map(l=>({name:l.name,visible:l.visible,keys:Object.keys(l.frameData)})));return;
 }
 if(process.argv.includes('--publish')){const p=JSON.parse(fs.readFileSync(path.join(out,'candidate.json'),'utf8')),etag=fs.readFileSync(path.join(out,'etag.txt'),'utf8');const r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(r.ok,'Version conflict or save failure '+r.status);assert.deepEqual(await(await fetch(url)).json(),p);console.log('Saved and API readback verified.');return;}
 const r=await fetch(url);assert(r.ok);const text=await r.text(),source=JSON.parse(text);fs.writeFileSync(path.join(out,'before.json'),text);fs.writeFileSync(path.join(out,'etag.txt'),r.headers.get('etag'));
 const base=await load(source),summary=[];
 const sheet=createCanvas(960,5*192),ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;
 for(let si=7;si<12;si++)for(let ai=0;ai<source.spriteSheets[si].actions.length;ai++){
  const f=source.spriteSheets[si].actions[ai].frames[0],tile=createCanvas(f.width,f.height);tile.getContext('2d').putImageData(base.cm.getCompositeImageData(si,ai,0),0,0);ctx.fillStyle='#ddd5ed';ctx.fillRect(ai*192,(si-7)*192,192,192);ctx.drawImage(tile,ai*192,(si-7)*192,192,192);
 }
 fs.writeFileSync(path.join(out,'before-poses.png'),sheet.toBuffer('image/png'));
 if(process.argv.includes('--inspect')){console.log('Snapshot and pose reference rendered.');return;}
 const p=JSON.parse(text),originalLayers=[...p.layers],idle=p.spriteSheets[8],targets=[7,9,10,11];
 const sitReference=JSON.parse(fs.readFileSync(path.join(out,'reference-main.json'),'utf8'));
 const partLayers=source.layers.filter(l=>l.sheetIndex===8&&/^(头发 \/ 04 |眼睛 \/|嘴巴$|发饰 \/|服装 \/)/.test(l.name));assert.equal(partLayers.length,6);
 const image=(si,ai,fi,name)=>{const l=source.layers.find(l=>l.sheetIndex===si&&l.name===name&&l.frameData[`${si}_${ai}_${fi}`]);assert(l,`Missing ${name} ${si}/${ai}/${fi}`);return decode(l.frameData[`${si}_${ai}_${fi}`]);};
 const entry=im=>({width:im.width,height:im.height,dataURL:'data:image/png;base64,'+png.encode(im.width,im.height,im.data).toString('base64')});
 const blank=(w,h)=>({width:w,height:h,data:new Uint8Array(w*h*4)});
 const set=(im,x,y,c)=>{if(x>=0&&y>=0&&x<im.width&&y<im.height)im.data.set(c,(y*im.width+x)*4);};
 const read=(im,x,y)=>x>=0&&y>=0&&x<im.width&&y<im.height?im.data.slice((y*im.width+x)*4,(y*im.width+x)*4+4):new Uint8Array(4);
 const box=im=>{const b=component(im);b.cx=(b.x0+b.x1)/2;return b;};
 function torso(im){const rows=[];for(let y=0;y<im.height;y++){const xs=[];for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3])xs.push(x);if(xs.length>=8)rows.push({y,l:Math.min(...xs),r:Math.max(...xs)});}assert(rows.length);const first=rows.find(v=>v.r-v.l>=11)||rows[0],upper=rows.filter(v=>v.y>=first.y&&v.y<first.y+3);return {top:first.y,bottom:rows.at(-1).y,cx:upper.reduce((s,v)=>s+(v.l+v.r)/2,0)/upper.length,width:Math.round(upper.reduce((s,v)=>s+v.r-v.l+1,0)/upper.length)};}
 function warpHead(src,sh,th,tw,hh,kind,si,phase,bodyFloor){
  const result=blank(tw,hh),dx=Math.round(th.cx-sh.cx),dy=th.y0-sh.y0;
  if(!src.data.some(v=>v))return result;
  let hairBottom=-1;for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++)if(src.data[(y*src.width+x)*4+3])hairBottom=Math.max(hairBottom,y);
  const rear=kind==='rear',hair=rear||kind==='front',bottom=Math.min(hh-2,bodyFloor-2,th.y1+hairBottom-sh.y1);
  for(let y=0;y<hh;y++)for(let x=0;x<tw;x++){
   let sy=y-dy,sx=x-dx;
   if(hair){
    // Compress only the cap when the seated head touches the top of the canvas.
    if(dy<0&&y<6)sy=Math.round(y*(6-dy)/6);
    if(rear&&y>th.y1&&bottom>th.y1)sy=Math.round(sh.y1+(y-th.y1)*(hairBottom-sh.y1)/(bottom-th.y1));
    if(y>bottom)continue;
    if(si===10&&th.x1-th.x0<sh.x1-sh.x0)sx=Math.round(sh.cx+(x-th.cx)*(sh.x1-sh.x0)/(th.x1-th.x0));
   }
   set(result,x,y,read(src,sx,Math.round(sy)));
  }
  return result;
 }
 function outfit(src,sbody,dbody,frame,si,ai,fi){
  const result=blank(frame.width,frame.height),s=torso(sbody),d=torso(dbody),srcHem=s.bottom-2,dstHem=d.bottom-2,srcWaist=s.top===24?26:25,dstWaist=d.top+Math.max(2,Math.round((dstHem-d.top)*.43));
  for(let y=d.top;y<=dstHem;y++){
   const sy=y<=dstWaist?Math.round(s.top+(y-d.top)*(srcWaist-s.top)/Math.max(1,dstWaist-d.top)):Math.round(srcWaist+(y-dstWaist)*(srcHem-srcWaist)/Math.max(1,dstHem-dstWaist));
   for(let x=0;x<result.width;x++){const sx=Math.round(s.cx+(x-d.cx)*s.width/d.width);set(result,x,y,read(src,sx,sy));}
  }
  if(si===10&&ai===0){
   result.data.fill(0);const top=d.top,waist=top+4,hem=d.bottom-2;
   for(let y=top;y<=hem;y++){const left=y<=waist?6:y===hem?8:7,right=y<=waist?19:y===hem?21:22;for(let x=left;x<=right;x++){if(y===top&&x>=12&&x<=16)continue;let c=[247,245,241,255];if(x===left||x===right||y===hem)c=[119,119,119,255];else if(x===9||x===10||y===waist)c=[210,211,222,255];else if(y>waist&&x>=19)c=[179,181,197,255];set(result,x,y,c);}}
  }
  // Ordinary shoes follow each pose's actual feet, not the bottom of a 40px canvas.
  const soleY=d.bottom,legRow=d.bottom-1;let shoePixels=0;
  for(let x=0;x<dbody.width;x++){const c=read(dbody,x,legRow);if(c[3]&&c[0]>150&&c[1]>100){set(result,x,soleY,[43,49,52,255]);shoePixels++;}}
  assert(shoePixels>0,`Missing shoes ${si}/${ai}/${fi}`);
  return result;
 }
 const added=[],rearLayers=[];
 for(const si of targets){const sheet=p.spriteSheets[si],layers=partLayers.map(l=>({...l,sheetIndex:si,parent:null,depth:0,visible:true,frameData:{}}));
  for(let ai=0;ai<sheet.actions.length;ai++)for(let fi=0;fi<sheet.actions[ai].frames.length;fi++){
   const action=sheet.actions[ai],frame=action.frames[fi],direction=action.direction,sourceAi=idle.actions.findIndex(a=>a.direction===direction);assert(sourceAi>=0);
   const th=box(image(si,ai,fi,'head')),targetBody=image(si,ai,fi,'body'),tb=torso(targetBody);
   const low=th.y0-(si===9?Math.min(...sheet.actions[ai].frames.map((_,f)=>box(image(si,ai,f,'head')).y0)):0)>=4;
   const sourceFi=low?(fi%2?2:3):(fi%2?1:0),sh=box(image(8,sourceAi,sourceFi,'head')),sourceKey=`8_${sourceAi}_${sourceFi}`,targetKey=`${si}_${ai}_${fi}`;
   for(let li=0;li<layers.length;li++){
    const l=layers[li],src=decode(partLayers[li].frameData[sourceKey]);let kind=l.name.startsWith('服装 /')?'outfit':l.name.endsWith('后发')?'rear':l.name.endsWith('前发')?'front':l.name.startsWith('眼睛')?'eyes':l.name.startsWith('发饰')?'accessory':'mouth';
    let im=kind==='outfit'?outfit(src,image(8,sourceAi,sourceFi,'body'),targetBody,frame,si,ai,fi):warpHead(src,sh,th,frame.width,frame.height,kind,si,fi,tb.bottom);
    if(si===10){const sourceImage=decode(partLayers[li].frameData[`8_${sourceAi}_0`]);const sit=require('./sitting-outfit-parts-20261027.cjs')({kind,ai,fi,frame,sourceImage,original:source,reference:sitReference,decode});if(sit)im=sit;}
    if(kind==='front'&&direction!=='up'&&th.y0<2&&!(si===10&&ai===0)){
     const hd=image(si,ai,fi,'head');for(let y=th.y0;y<th.y0+8;y++){
      const xs=[];for(let x=0;x<frame.width;x++)if(read(hd,x,y)[3])xs.push(x);if(!xs.length)continue;
      for(const x of xs)if(!read(im,x,y)[3])set(im,x,y,x===xs[0]||x===xs.at(-1)||y===th.y0?[119,119,119,255]:[209,209,209,255]);
     }
    }
    if(si===11&&kind==='eyes'){
     im=blank(frame.width,frame.height);const eyeY=th.y0+14;for(const start of [Math.round(th.cx)-7,Math.round(th.cx)+4]){for(let dx=0;dx<4;dx++)set(im,start+dx,eyeY+(dx===0||dx===3?0:1),[29,22,25,255]);}
    }
    if(direction==='up'&&['eyes','mouth','front','accessory'].includes(kind))assert(!im.data.some(v=>v));
    if(!['eyes','mouth','front','accessory'].includes(kind)||direction!=='up')assert(im.data.some(v=>v),`Blank ${kind} ${targetKey}`);
    l.frameData[targetKey]=entry(im);
   }
   summary.push({sheet:si,direction,frame:fi,head:[th.x0,th.y0,th.x1,th.y1],body:tb,sourceFi,width:frame.width,height:frame.height});
  }
  rearLayers.push(...layers.filter(l=>l.name.endsWith('后发')));added.push(...layers.filter(l=>!l.name.endsWith('后发')).sort((a,b)=>{const order=l=>l.name.startsWith('服装')?0:l.name.startsWith('眼睛')?1:l.name==='嘴巴'?2:l.name.endsWith('前发')?3:4;return order(a)-order(b);}));
 }
 const sitEyes=added.find(l=>l.sheetIndex===10&&l.name.startsWith('眼睛'));
 for(let fi=0;fi<4;fi++){
  const im=decode(sitEyes.frameData[`10_0_${fi}`]);let count=0;for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(im.data[(y*32+x)*4+3]){assert(x>=16&&x<=20,'Sitting profile must show one eye only');count++;}assert(count>0);
 }
 const nearHands=originalLayers.filter(l=>targets.includes(l.sheetIndex)&&l.name==='hand'&&!(l.sheetIndex===10&&Object.keys(l.frameData).some(k=>k.startsWith('10_1_'))));
 p.layers=[...rearLayers,...originalLayers.filter(l=>!nearHands.includes(l)),...added,...nearHands];
 const map=new Map(originalLayers.map((l,i)=>[i,p.layers.indexOf(l)]));for(const l of originalLayers)if(l.parent!=null)l.parent=map.get(l.parent);p.currentLayerIndex=map.get(source.currentLayerIndex);
 for(let i=0;i<source.layers.length;i++){const expected=structuredClone(source.layers[i]);if(expected.parent!=null)expected.parent=map.get(expected.parent);assert.deepEqual(p.layers[map.get(i)],expected);}
 assert.deepEqual(p.spriteSheets,source.spriteSheets);
 const result=await load(p);let framesChecked=0;
 for(const si of [7,8,9,10,11]){
  const sheet=p.spriteSheets[si],count=Math.max(...sheet.actions.map(a=>a.frames.length)),cell=160,canvas=createCanvas(count*cell,sheet.actions.length*cell),cx=canvas.getContext('2d');cx.imageSmoothingEnabled=false;
  for(let ai=0;ai<sheet.actions.length;ai++)for(let fi=0;fi<sheet.actions[ai].frames.length;fi++){
   const im=result.cm.getCompositeImageData(si,ai,fi);assert(im.data.some(v=>v));result.project.currentSheetIndex=si;result.project.currentActionIndex=ai;result.project.currentFrameIndex=fi;result.cm.render();assert.deepEqual(result.cm.offscreenCtx.getImageData(0,0,im.width,im.height).data,im.data);
   if(si===8)assert.deepEqual(im.data,base.cm.getCompositeImageData(8,ai,fi).data,'Idle appearance changed');
   const tile=createCanvas(im.width,im.height);tile.getContext('2d').putImageData(im,0,0);cx.fillStyle=ai===0?'#ddd5ed':'#45434b';cx.fillRect(fi*cell,ai*cell,cell,cell);cx.drawImage(tile,fi*cell,ai*cell,cell,cell);fs.writeFileSync(path.join(out,`${si}-${ai}-${fi}.png`),tile.toBuffer('image/png'));framesChecked++;
   const blob=await result.ex.exportFrameAsBlob(si,ai,fi);assert.deepEqual(Array.from(decode({dataURL:'data:image/png;base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64')}).data),Array.from(im.data));
   const player=Object.create(PE.AnimationPlayer.prototype);Object.assign(player,{canvas:createCanvas(im.width,im.height),project:result.project,canvasManager:result.cm,sheetIndex:si,actionIndex:ai,currentFrame:fi,previewScale:1});player.ctx=player.canvas.getContext('2d');player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,im.width,im.height).data,im.data);
  }
  fs.writeFileSync(path.join(out,`action-${si}.png`),canvas.toBuffer('image/png'));
 }
 fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({newLayers:added.length+rearLayers.length,framesChecked,originalLayersUnchanged:true,idleUnchanged:true}));
})();
