const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,ImageData,Image}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),out=path.join(root,'发型素材/08-灰色长发-分层试稿/尖发束待机'),api='http://127.0.0.1:8765/api/project?id=',id='character-gray-long-study-20261029';
fs.mkdirSync(out,{recursive:true});global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={addEventListener(){},createElement(){return Object.assign(createCanvas(1,1),{style:{}});}};global.FileReader=class{async readAsText(blob){this.result=await blob.text();this.onload();}};
for(const name of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'));
const C={O:[119,119,119,255],S:[178,178,178,255],B:[209,209,209,255],W:[249,247,242,255]};
function png(data,name,scale=1,bg){const tile=createCanvas(data.width,data.height);tile.getContext('2d').putImageData(data,0,0);const c=createCanvas(data.width*scale,data.height*scale),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);}ctx.drawImage(tile,0,0,c.width,c.height);fs.writeFileSync(path.join(out,name),c.toBuffer('image/png'));return c;}
const codes=data=>Array.from({length:32},(_,y)=>Array.from({length:32},(_,x)=>{const i=(y*32+x)*4;return data.data[i+3]?(Object.entries(C).find(([,c])=>c.every((v,j)=>data.data[i+j]===v))?.[0]||'#'):'.';}).join(''));
const put=(d,x,y,c)=>{assert(x>=0&&x<32&&y>=0&&y<32);d.data.set(c?C[c]:[0,0,0,0],(y*32+x)*4);};
function silhouette(rows){
 assert.equal(rows.length,32);const d=new ImageData(32,32);
 rows.forEach((runs,y)=>{for(let i=0;i<runs.length;i+=2)for(let x=runs[i];x<=runs[i+1];x++)put(d,x,y,'B');});
 const mask=new Uint8ClampedArray(d.data);
 for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(mask[(y*32+x)*4+3]&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>x+dx<0||x+dx>=32||y+dy<0||y+dy>=32||!mask[((y+dy)*32+x+dx)*4+3]))put(d,x,y,'O');return d;
}
function shade(d,points,mirror=false){for(const [x,y]of points)for(const xx of mirror?[x,31-x]:[x]){const i=(y*32+xx)*4;if(d.data[i+3]&&d.data[i]!==C.O[0])put(d,xx,y,'S');}}
function animate(source,dy,fi,kind,ai){
 const d=new ImageData(32,32);
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){
  const i=(y*32+x)*4;if(!source.data[i+3])continue;
  const stretch=fi===1&&kind!=='acc',yy=y+dy-(dy&&kind!=='acc'&&y>=19?1:0)+(stretch&&y>=19?1:0);
  assert(yy<32,'No clipped tips');d.data.set(source.data.slice(i,i+4),(yy*32+x)*4);
  if(stretch&&y===18)d.data.set(source.data.slice(i,i+4),((yy+1)*32+x)*4);
 }return d;
}
function contact(cells,name,columns=4){const size=256,h=286,c=createCanvas(columns*size,Math.ceil(cells.length/columns)*h),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;cells.forEach(([label,data],i)=>{const x=i%columns*size,y=Math.floor(i/columns)*h;ctx.fillStyle=i%2?'#30323b':'#eee8ef';ctx.fillRect(x,y,size,h);ctx.fillStyle=i%2?'#eee8ef':'#45414a';ctx.font='15px Microsoft YaHei';ctx.fillText(label,x+10,y+21);const tile=createCanvas(32,32);tile.getContext('2d').putImageData(data,0,0);ctx.drawImage(tile,x,y+30,size,size);});fs.writeFileSync(path.join(out,name),c.toBuffer('image/png'));}
async function main(){
 if(process.argv.includes('--prepare')){assert(!fs.existsSync(path.join(out,'before.json')),'Snapshot exists');const r=await fetch(api+id);assert(r.ok);fs.writeFileSync(path.join(out,'before.json'),await r.text());fs.writeFileSync(path.join(out,'etag.txt'),r.headers.get('etag'));}
 const before=JSON.parse(fs.readFileSync(path.join(out,'before.json'),'utf8')),ex=new PE.ExportManager(),{project:p}=await ex.importProject(new Blob([JSON.stringify(before)])),cm=new PE.CanvasManager(document.createElement('canvas'),p);ex.init(p,cm);
 const artwork=p.layers.filter(l=>l.sheetIndex===8&&/08 /.test(l.name)),front=artwork.find(l=>l.name.endsWith('前发')),rear=artwork.find(l=>l.name.endsWith('后发')),acc=artwork.find(l=>l.name.startsWith('发饰 /'));
 assert(front&&rear&&acc);const key='8_1_0';
 if(process.argv.includes('--prepare')){
  const old=JSON.parse(fs.readFileSync(path.join(root,'发型素材/08-灰色长发-分层试稿/分层工程.json'),'utf8')),decode=require('./png.cjs').decode;
  for(const l of artwork){const current=l.frameData.get(key),prior=decode(Buffer.from(old.layers.find(o=>o.name===l.name).frameData[key].dataURL.split(',')[1],'base64'));let changes=[];for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=(y*32+x)*4;if(current.data.slice(i,i+4).some((v,j)=>v!==prior.data[i+j]))changes.push([x,y,prior.data[i+3],current.data[i+3]]);}console.log(l.name,'changed pixels',changes.length,JSON.stringify(changes));console.log(codes(current).map((row,y)=>String(y).padStart(2,'0')+' '+row).join('\n'));png(current,l===front?'用户前发.png':l===rear?'用户后发.png':'用户蝴蝶结.png',16,'#30323b');}
  png(cm.getCompositeImageData(8,1,0,true),'用户修改后的正面.png',16,'#eee8ef');
  for(const ai of [0,2]){const head=p.layers.find(l=>l.name==='head'&&l.frameData.has('8_'+ai+'_0')).frameData.get('8_'+ai+'_0');console.log('Head',ai,codes(head).join('\n'));png(cm.getCompositeImageData(8,ai,0,true),ai===0?'侧面素体.png':'背面素体.png',16,'#eee8ef');}
  return;
 }
 const baseline=JSON.parse(await ex.exportProject(false).text()),anchors={front:new ImageData(new Uint8ClampedArray(front.frameData.get(key).data),32,32),rear:new ImageData(new Uint8ClampedArray(rear.frameData.get(key).data),32,32),acc:new ImageData(new Uint8ClampedArray(acc.frameData.get(key).data),32,32)};
 const sharpFront=new ImageData(new Uint8ClampedArray(anchors.front.data),32,32);
 // Keep the user's erased curves empty; finish the retained tips instead of restoring the round ends.
 for(const [x,y]of [[22,23],[23,23],[11,21]])put(sharpFront,x,y,null);
 for(const [x,y]of [[7,20],[10,21],[24,19],[23,20],[21,21]])put(sharpFront,x,y,'O');
 const fringe={11:[[7,24]],12:[[7,7],[9,11],[13,16],[18,21],[23,24]],13:[[10,10],[15,15],[20,20],[24,24]]};
 for(let y=11;y<=13;y++)for(let x=7;x<=24;x++)put(sharpFront,x,y,fringe[y].some(([a,b])=>x>=a&&x<=b)?'B':null);
 const fringeMask=new Uint8ClampedArray(sharpFront.data);
 for(let y=11;y<=13;y++)for(let x=7;x<=24;x++)if(fringeMask[(y*32+x)*4+3]&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!fringeMask[((y+dy)*32+x+dx)*4+3]))put(sharpFront,x,y,'O');
 const old=JSON.parse(fs.readFileSync(path.join(root,'发型素材/08-灰色长发-分层试稿/分层工程.json'),'utf8')),prior=require('./png.cjs').decode(Buffer.from(old.layers.find(l=>l.name===front.name).frameData[key].dataURL.split(',')[1],'base64'));
 const erased=[];for(let i=3;i<prior.data.length;i+=4)if(prior.data[i]&&!anchors.front.data[i]){assert.equal(sharpFront.data[i],0,'Do not restore a user-erased pixel');erased.push((i-3)/4);}
 const sharpRear=new ImageData(new Uint8ClampedArray(anchors.rear.data),32,32);
 for(let y=29;y<=30;y++)for(let x=0;x<32;x++)put(sharpRear,x,y,null);
 for(const [y,runs]of [[29,[4,7,24,27]],[30,[5,5,26,26]]])for(let i=0;i<runs.length;i+=2)for(let x=runs[i];x<=runs[i+1];x++)put(sharpRear,x,y,x===runs[i]||x===runs[i+1]?'O':'B');
 const sideFront=silhouette([
  [11,20],[9,22],[7,24],[6,25],[5,26],[4,27],[4,27],[3,28],
  [3,28],[3,28],[4,28],[4,27],[4,12,15,19,22,26],[4,11,16,19,23,25],[5,11,18,18,24,25],[5,11,25,25],
  [6,12,25,26],[6,13,25,26],[7,14,25,25],[8,15,24,24],[9,15,23,23],[11,15],[13,15],[15,15],
  [],[],[],[],[],[],[],[]
 ]);
 for(let y=0;y<=10;y++)for(let x=0;x<32;x++){const i=(y*32+x)*4;if(sideFront.data[i+3]&&anchors.front.data[i+3])sideFront.data.set(anchors.front.data.slice(i,i+4),i);}
 shade(sideFront,[[11,7],[11,8],[10,9],[10,10],[10,11],[9,12],[9,13],[9,14],[9,15],[10,16],[10,17],[11,18],[12,19],[13,20],[14,21],[18,9],[19,10],[19,11],[24,10],[24,11],[25,16]]);
 const sideRear=silhouette([
  [],[11,20],[9,22],[7,24],[6,10,21,25],[5,8,23,26],[4,7,24,27],[3,7,25,28],
  [2,8,26,28],[2,8,26,28],[2,8,26,28],[2,8,26,28],[2,8,26,28],[2,8,26,28],[2,8,26,28],[2,8,26,28],
  [2,9,26,28],[2,9,26,28],[2,9,26,28],[2,9,26,28],[2,9,26,28],[2,10,26,28],[2,10,26,28],[2,10,26,28],
  [2,10,26,28],[2,10,25,27],[2,9,25,27],[3,9,26,27],[3,8,26,26],[4,7],[6,6],[]
 ]);
 shade(sideRear,[[7,6],[6,7],[5,8],[5,9],[5,10],[4,11],[4,12],[4,13],[6,17],[6,18],[7,19],[7,20],[7,21],[8,22],[8,23],[7,24],[6,25],[6,26],[5,27],[5,28]]);
 const backRear=silhouette([
  [11,20],[9,22],[7,24],[6,25],[5,26],[4,27],[4,27],[3,28],
  [2,29],[2,29],[2,29],[2,29],[2,29],[2,29],[2,29],[2,29],
  [2,29],[2,29],[2,29],[2,29],[2,29],[2,29],[3,28],[3,28],
  [3,28],[4,27],[4,27],[5,26],[5,9,11,20,22,26],[6,8,12,19,23,25],[7,7,13,14,17,18,24,24],[]
 ]);
 shade(backRear,[[13,2],[12,3],[11,4],[10,5],[9,6],[8,7],[8,8],[7,9],[9,12],[8,13],[8,14],[7,15],[7,16],[7,17],[6,18],[7,22],[7,23],[8,24],[8,25],[8,26],[12,23],[12,24],[13,25],[13,26],[13,27]],true);
 const sideAcc=new ImageData(32,32);for(let y=0;y<32;y++)for(let x=0;x<5;x++){const i=(y*32+x)*4;sideAcc.data.set(anchors.acc.data.slice(i,i+4),i);}
 const directionNames=['45度侧面','正面','背面'],sources=[[sideFront,sideRear,sideAcc],[sharpFront,sharpRear,anchors.acc],[new ImageData(32,32),backRear,new ImageData(32,32)]],metrics=[];
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
  const frameKey='8_'+ai+'_'+fi,head=p.layers.find(l=>l.name==='head'&&l.frameData.has(frameKey)).frameData.get(frameKey);let top=32;
  for(let y=0;y<22;y++)for(let x=0;x<32;x++)if(head.data[(y*32+x)*4+3])top=Math.min(top,y);
  const dy=top-2;assert([0,2].includes(dy));
  for(const [index,l,kind]of [[0,front,'front'],[1,rear,'rear'],[2,acc,'acc']])l.frameData.set(frameKey,animate(sources[ai][index],dy,fi,kind,ai));
  metrics.push({ai,fi,headShift:dy,tipShift:dy||fi===1?1:0,duration:p.spriteSheets[8].actions[ai].frames[fi].duration});
 }
 p.name='灰色长发·尖发束待机';p.currentSheetIndex=8;p.currentActionIndex=1;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.indexOf(front);
 const frames=[],parts=[];
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
  const frameKey='8_'+ai+'_'+fi,data=cm.getCompositeImageData(8,ai,fi,true),normal=cm.getCompositeImageData(8,ai,fi);assert(data.data.some((v,i)=>i%4===3&&v),'Nonempty frame');
  frames.push([directionNames[ai]+' 第'+(fi+1)+'帧',data]);png(data,'idle-'+ai+'-'+fi+'.png');
  for(const l of artwork){const pixels=l.frameData.get(frameKey);for(let i=3;i<pixels.data.length;i+=4){assert([0,255].includes(pixels.data[i]),'No translucent edge');if(l!==acc&&pixels.data[i])assert([C.O,C.S,C.B].some(c=>c.every((v,j)=>v===pixels.data[i-3+j])),'Shared hair palette');}png(pixels,(l===front?'front':l===rear?'rear':'acc')+'-'+ai+'-'+fi+'.png');}
  if(ai===2){assert(front.frameData.get(frameKey).data.every(v=>v===0),'All back front-hair pixels transparent');front.visible=false;assert.deepEqual(cm.getCompositeImageData(8,ai,fi,true).data,data.data,'Back unchanged by front toggle');front.visible=true;const head=p.layers.find(l=>l.name==='head'&&l.frameData.has(frameKey)).frameData.get(frameKey);for(let i=3;i<head.data.length;i+=4)if(head.data[i])assert(rear.frameData.get(frameKey).data[i],'No bare scalp at back');}
  p.currentActionIndex=ai;p.currentFrameIndex=fi;cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,32,32).data,normal.data,'Main canvas');
  const exported=require('./png.cjs').decode(Buffer.from(await (await ex.exportFrameAsBlob(8,ai,fi)).arrayBuffer()));assert.deepEqual([...exported.data],[...normal.data],'PNG output');
  const player=Object.create(PE.AnimationPlayer.prototype);Object.assign(player,{canvas:createCanvas(32,32),project:p,canvasManager:cm,sheetIndex:8,actionIndex:ai,currentFrame:fi,previewScale:1});player.ctx=player.canvas.getContext('2d');player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,32,32).data,normal.data,'Animation preview');
  if(fi===0){parts.push([directionNames[ai]+'：组合',data]);for(const l of artwork)parts.push([directionNames[ai]+'：'+(l===front?'前发':l===rear?'后发':'饰品'),l.frameData.get(frameKey)]);}
 }
 p.currentActionIndex=1;p.currentFrameIndex=0;
 contact(frames,'全部12帧.png');contact(parts,'三方向分层.png');contact([['用户擦改原帧',new PE.CanvasManager(document.createElement('canvas'),(await new PE.ExportManager().importProject(new Blob([JSON.stringify(before)]))).project).getCompositeImageData(8,1,0,true)],['收尖后正面',cm.getCompositeImageData(8,1,0,true)]],'用户修改对照.png',2);
 const exported=JSON.parse(await ex.exportProject(false).text()),artIndices=artwork.map(l=>p.layers.indexOf(l));
 baseline.layers.forEach((l,i)=>{if(!artIndices.includes(i))assert.deepEqual(exported.layers[i],l,'Unrelated layer: '+l.name);});assert.deepEqual(exported.spriteSheets,baseline.spriteSheets,'Original actions preserved');
 const candidate={...before,name:p.name,currentSheetIndex:8,currentActionIndex:1,currentFrameIndex:0,currentLayerIndex:p.currentLayerIndex,layers:before.layers.map((l,i)=>artIndices.includes(i)?{...l,frameData:exported.layers[i].frameData}:l)};
 fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate));
 const source=(await new PE.ExportManager().importProject(new Blob([fs.readFileSync(path.join(root,'发型素材/08-灰色长发-分层试稿/source-main.json'),'utf8')]))).project,mixes=[],dressed=[];
 const savedLayers=p.layers.slice(),visibility=artwork.map(l=>l.visible);
 for(const [slot,names]of [['后发',['头发 / 01 披发 / 后发','头发 / 02 双马尾 / 后发']],['前发',['头发 / 01 斜刘海 / 前发','头发 / 02 齐刘海 / 前发']]])for(const name of names){
  const sourceLayer=source.layers.find(l=>l.sheetIndex===8&&l.name===name);assert(sourceLayer);const copy=new PE.Layer(name);copy.sheetIndex=8;copy.frameData=sourceLayer.frameData;
  front.visible=slot!=='前发';rear.visible=slot!=='后发';acc.visible=false;if(slot==='后发')p.layers.unshift(copy);else p.layers.push(copy);
  for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){assert(copy.frameData.has('8_'+ai+'_'+fi));const data=cm.getCompositeImageData(8,ai,fi,true);assert(data.data.some((v,i)=>i%4===3&&v));if(fi===0)mixes.push([directionNames[ai]+'：新'+(slot==='后发'?'前发＋':'后发＋')+name.split(' / ')[1],data]);}
  p.layers=savedLayers.slice();
 }
 artwork.forEach((l,i)=>l.visible=visibility[i]);contact(mixes,'双向混搭.png',3);
 for(const name of ['眼睛 / 02 青蓝·粉下缘','嘴巴 / 下垂嘴','服装 / 01 深蓝JK / 上衣','服装 / 01 深蓝JK / 百褶裙','服装 / 01 深蓝JK / 红领结']){const l=source.layers.find(l=>l.sheetIndex===8&&l.name===name);assert(l);const copy=new PE.Layer(name);copy.sheetIndex=8;copy.frameData=l.frameData;p.layers.push(copy);}
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){const data=cm.getCompositeImageData(8,ai,fi,true);assert(data.data.some((v,i)=>i%4===3&&v));png(data,'dressed-'+ai+'-'+fi+'.png');if(fi===0)dressed.push([directionNames[ai]+'：五官服装仅用于搭配检查',data]);}
 contact(dressed,'五官服装搭配检查.png',3);p.layers=savedLayers;
 assert.deepEqual(JSON.parse(await ex.exportProject(false).text()),exported,'Test parts must not enter project');
 fs.writeFileSync(path.join(out,'自检.json'),JSON.stringify({metrics,preservedUserErasures:erased.length,checks:['all 12 frames have nonempty composites','all back front-hair pixels transparent','back scalp covered by rear hair','body/head/hands and other actions unchanged','main canvas, preview and PNG agree','no user-erased curve restored','48 two-way mixing composites and 12 dressed composites checked']},null,2));
 if(process.argv.includes('--publish')){
  const fresh=await fetch(api+id);assert.equal(fresh.headers.get('etag'),fs.readFileSync(path.join(out,'etag.txt'),'utf8'),'Project changed; retain candidate and merge user changes');
  const saved=await fetch(api+id,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':fresh.headers.get('etag')},body:JSON.stringify(candidate)});assert(saved.ok,'Save: '+saved.status+' '+await saved.text());
  const response=await fetch(api+id);assert(response.ok);const actual=await response.json();assert.deepEqual(actual,candidate,'API readback');fs.writeFileSync(path.join(out,'已保存工程.json'),JSON.stringify(actual));console.log('Saved and API verified',id);
 }
 console.log('12 idle frames ready; user-erased pixels preserved:',erased.length,out);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
