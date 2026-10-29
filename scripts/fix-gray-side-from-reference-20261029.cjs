const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,ImageData,Image,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),out=path.join(root,'发型素材/08-灰色长发-分层试稿/侧面生图修正'),api='http://127.0.0.1:8765/api/project?id=',id='character-gray-long-study-20261029';
fs.mkdirSync(out,{recursive:true});global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={addEventListener(){},createElement(){return Object.assign(createCanvas(1,1),{style:{}});}};global.FileReader=class{async readAsText(blob){this.result=await blob.text();this.onload();}};
for(const name of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'));
function png(data,name,scale=16,bg='#eee8ef'){const tile=createCanvas(data.width,data.height);tile.getContext('2d').putImageData(data,0,0);const c=createCanvas(data.width*scale,data.height*scale),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);}ctx.drawImage(tile,0,0,c.width,c.height);fs.writeFileSync(path.join(out,name),c.toBuffer('image/png'));return c;}
const C={O:[119,119,119,255],S:[178,178,178,255],B:[209,209,209,255]},put=(d,x,y,c)=>d.data.set(c?C[c]:[0,0,0,0],(y*32+x)*4);
function contact(cells,name,columns=4){const size=256,h=286,c=createCanvas(columns*size,Math.ceil(cells.length/columns)*h),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;cells.forEach(([label,d],i)=>{const x=i%columns*size,y=Math.floor(i/columns)*h;ctx.fillStyle=i%2?'#30323b':'#eee8ef';ctx.fillRect(x,y,size,h);ctx.fillStyle=i%2?'#eee8ef':'#45414a';ctx.font='15px Microsoft YaHei';ctx.fillText(label,x+8,y+22);const tile=createCanvas(32,32);tile.getContext('2d').putImageData(d,0,0);ctx.drawImage(tile,x,y+30,size,size);});fs.writeFileSync(path.join(out,name),c.toBuffer('image/png'));}
function breathing(source,fi){const d=new ImageData(32,32),dy=fi>=2?2:0;for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=(y*32+x)*4;if(!source.data[i+3])continue;const yy=y+dy-(dy&&y>=19?1:0)+(fi===1&&y>=19?1:0);assert(yy<32);d.data.set(source.data.slice(i,i+4),(yy*32+x)*4);if(fi===1&&y===18)d.data.set(source.data.slice(i,i+4),((yy+1)*32+x)*4);}return d;}
async function main(){
 if(process.argv.includes('--prepare')){assert(!fs.existsSync(path.join(out,'before.json')),'Preserve prepared snapshot');const r=await fetch(api+id);assert(r.ok);fs.writeFileSync(path.join(out,'before.json'),await r.text());fs.writeFileSync(path.join(out,'etag.txt'),r.headers.get('etag'));}
 const before=JSON.parse(fs.readFileSync(path.join(out,'before.json'),'utf8')),ex=new PE.ExportManager(),{project:p}=await ex.importProject(new Blob([JSON.stringify(before)])),cm=new PE.CanvasManager(document.createElement('canvas'),p);ex.init(p,cm);
 const front=p.layers.find(l=>l.sheetIndex===8&&/08 /.test(l.name)&&l.name.endsWith('前发'));assert(front);
 if(process.argv.includes('--prepare')){
  const savedLayers=p.layers.slice(),source=(await new PE.ExportManager().importProject(new Blob([fs.readFileSync(path.join(root,'发型素材/08-灰色长发-分层试稿/source-main.json'),'utf8')]))).project;
  for(const name of ['眼睛 / 02 青蓝·粉下缘','嘴巴 / 下垂嘴','服装 / 01 深蓝JK / 上衣','服装 / 01 深蓝JK / 百褶裙','服装 / 01 深蓝JK / 红领结']){const old=source.layers.find(l=>l.sheetIndex===8&&l.name===name);assert(old);const l=new PE.Layer(name);l.sheetIndex=8;l.frameData=old.frameData;p.layers.push(l);}
  png(cm.getCompositeImageData(8,0,0,true),'当前侧面-搭配.png');png(cm.getCompositeImageData(8,1,0,true),'已认可正面-搭配.png');
  const artwork=p.layers.filter(l=>l.sheetIndex===8&&/08 /.test(l.name)),visible=artwork.map(l=>l.visible);artwork.forEach(l=>l.visible=false);png(cm.getCompositeImageData(8,0,0,true),'侧面素体-搭配.png');artwork.forEach((l,i)=>l.visible=visible[i]);p.layers=savedLayers;
  png(front.frameData.get('8_0_0'),'原侧面前发.png');
  const references=createCanvas(3*384,384),ctx=references.getContext('2d');ctx.fillStyle='#30323b';ctx.fillRect(0,0,references.width,references.height);ctx.imageSmoothingEnabled=false;
  for(const [index,file,row]of [[0,'p80011',1],[1,'p80011',2],[2,'p80010',2]]){const image=await loadImage('C:/Users/cl/Documents/测试/一些素材/角色衣服/衣服/10/TV/Female/TV_FrontHair1_'+file+'.png');ctx.drawImage(image,0,row*48,48,48,index*384,0,384,384);}
  fs.writeFileSync(path.join(out,'旧项目前发-侧面参考.png'),references.toBuffer('image/png'));return;
 }
 const baseline=JSON.parse(await ex.exportProject(false).text()),frontIndex=p.layers.indexOf(front),original=new ImageData(new Uint8ClampedArray(front.frameData.get('8_0_0').data),32,32),corrected=new ImageData(new Uint8ClampedArray(original.data),32,32);
 // Trace the generated continuous forward sweep; keep the accepted near-side curl pixel for pixel.
 const runs={11:[[16,16],[19,27]],12:[[16,16],[21,28]],13:[[16,16],[23,28]],14:[[25,28]],15:[[26,28]],16:[[26,27]],17:[[27,27]]};
 for(let y=11;y<=23;y++)for(let x=16;x<32;x++)put(corrected,x,y,(runs[y]||[]).some(([a,b])=>x>=a&&x<=b)?'B':null);
 const mask=new Uint8ClampedArray(corrected.data);
 for(let y=11;y<=23;y++)for(let x=16;x<32;x++)if(mask[(y*32+x)*4+3]&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>x+dx>=32||!mask[((y+dy)*32+x+dx)*4+3]))put(corrected,x,y,'O');
 for(const [x,y]of [[20,9],[21,10],[22,10],[23,11],[24,11],[25,12],[26,12],[26,13],[27,14],[27,15]]){const i=(y*32+x)*4;if(corrected.data[i+3]&&corrected.data[i]!==C.O[0])put(corrected,x,y,'S');}
 const source=(await new PE.ExportManager().importProject(new Blob([fs.readFileSync(path.join(root,'发型素材/08-灰色长发-分层试稿/source-main.json'),'utf8')]))).project,eyes=source.layers.find(l=>l.sheetIndex===8&&l.name==='眼睛 / 02 青蓝·粉下缘');assert(eyes);
 const cells=[],bare=[],metrics=[];
 for(let fi=0;fi<4;fi++){
  const key='8_0_'+fi,old=front.frameData.get(key),data=breathing(corrected,fi),eye=eyes.frameData.get(key);assert(eye);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=(y*32+x)*4;if(x<16||y<9)assert.deepEqual(data.data.slice(i,i+4),old.data.slice(i,i+4),'Preserve near-side hair and crown');if(x>=20&&eye.data[i+3])assert.equal(data.data[i+3],0,'Keep the far eye clear');if(data.data[i+3])assert(Object.values(C).some(c=>c.every((v,j)=>v===data.data[i+j])),'Three hair colors only');else assert.equal(data.data[i+3],0);}
  front.frameData.set(key,data);png(data,'front-'+fi+'-32.png',1,null);png(cm.getCompositeImageData(8,0,fi,true),'idle-'+fi+'-32.png',1,null);png(cm.getCompositeImageData(8,0,fi,true),'idle-'+fi+'-放大.png');bare.push(['修正侧面 第'+(fi+1)+'帧',cm.getCompositeImageData(8,0,fi,true)]);
  const normal=cm.getCompositeImageData(8,0,fi);p.currentSheetIndex=8;p.currentActionIndex=0;p.currentFrameIndex=fi;cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,32,32).data,normal.data,'Main canvas');
  const exported=require('./png.cjs').decode(Buffer.from(await (await ex.exportFrameAsBlob(8,0,fi)).arrayBuffer()));assert.deepEqual([...exported.data],[...normal.data],'PNG output');
  const player=Object.create(PE.AnimationPlayer.prototype);Object.assign(player,{canvas:createCanvas(32,32),project:p,canvasManager:cm,sheetIndex:8,actionIndex:0,currentFrame:fi,previewScale:1});player.ctx=player.canvas.getContext('2d');player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,32,32).data,normal.data,'Animation preview');
  metrics.push({fi,duration:p.spriteSheets[8].actions[0].frames[fi].duration,headShift:fi>=2?2:0,tipShift:fi?1:0});
 }
 p.currentSheetIndex=before.currentSheetIndex;p.currentActionIndex=before.currentActionIndex;p.currentFrameIndex=before.currentFrameIndex;
 const exported=JSON.parse(await ex.exportProject(false).text());baseline.layers.forEach((l,i)=>{if(i!==frontIndex)assert.deepEqual(exported.layers[i],l,'Only side front hair may change');else for(const [key,value]of Object.entries(l.frameData))if(!key.startsWith('8_0_'))assert.deepEqual(exported.layers[i].frameData[key],value,'Preserve front/back frames');});
 const candidate={...before,layers:before.layers.map((l,i)=>i!==frontIndex?l:{...l,frameData:{...l.frameData,...Object.fromEntries(Object.entries(exported.layers[i].frameData).filter(([key])=>key.startsWith('8_0_')))}})};
 fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate));contact(bare,'侧面四帧.png');
 const savedLayers=p.layers.slice(),rear=p.layers.find(l=>l.sheetIndex===8&&/08 /.test(l.name)&&l.name.endsWith('后发')),accessory=p.layers.find(l=>l.sheetIndex===8&&/08 /.test(l.name)&&l.name.startsWith('发饰 /'));
 const dressedLayers=[];for(const name of ['眼睛 / 02 青蓝·粉下缘','嘴巴 / 下垂嘴','服装 / 01 深蓝JK / 上衣','服装 / 01 深蓝JK / 百褶裙','服装 / 01 深蓝JK / 红领结']){const old=source.layers.find(l=>l.sheetIndex===8&&l.name===name);assert(old);const copy=new PE.Layer(name);copy.sheetIndex=8;copy.frameData=old.frameData;dressedLayers.push(copy);}
 p.layers=[...savedLayers.filter(l=>l!==front&&l!==accessory),...dressedLayers,front,accessory];
 front.frameData.set('8_0_0',original);const beforeDressed=cm.getCompositeImageData(8,0,0,true);front.frameData.set('8_0_0',corrected);
 for(let fi=0;fi<4;fi++){const data=cm.getCompositeImageData(8,0,fi,true);assert(data.data.some((n,i)=>i%4===3&&n));png(data,'dressed-'+fi+'-32.png',1,null);cells.push(['修正后搭配 第'+(fi+1)+'帧',data]);}
 contact([['修正前',beforeDressed],['生图参考落稿后',cm.getCompositeImageData(8,0,0,true)]],'侧面前后对比.png',2);contact(cells,'侧面搭配四帧.png');p.layers=savedLayers;
 const mixing=[];for(const name of ['头发 / 01 披发 / 后发','头发 / 02 双马尾 / 后发']){const old=source.layers.find(l=>l.sheetIndex===8&&l.name===name);assert(old);const copy=new PE.Layer(name);copy.sheetIndex=8;copy.frameData=old.frameData;const ri=p.layers.indexOf(rear),visible=accessory.visible;p.layers[ri]=copy;accessory.visible=false;for(let fi=0;fi<4;fi++){const data=cm.getCompositeImageData(8,0,fi,true);assert(data.data.some((n,i)=>i%4===3&&n));mixing.push(['新侧面前发＋'+name.split(' / ')[1]+' '+(fi+1),data]);}p.layers[ri]=rear;accessory.visible=visible;}contact(mixing,'侧面混搭检查.png');
 assert.deepEqual(JSON.parse(await ex.exportProject(false).text()),exported,'No test parts saved');
 fs.writeFileSync(path.join(out,'自检.json'),JSON.stringify({metrics,scope:'only 8_0_0 through 8_0_3 of front hair',checks:['generated a new 45-degree reference first','accepted near-side curl and upper crown unchanged','no far-eye occlusion','front/back and all other layers unchanged','four main-canvas/PNG/preview paths agree','dressed and two-rear-hair mixing checked']},null,2));
 if(process.argv.includes('--publish')){const fresh=await fetch(api+id);assert.equal(fresh.headers.get('etag'),fs.readFileSync(path.join(out,'etag.txt'),'utf8'),'Project changed; retain candidate');const saved=await fetch(api+id,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':fresh.headers.get('etag')},body:JSON.stringify(candidate)});assert(saved.ok,'Save '+saved.status+' '+await saved.text());const r=await fetch(api+id);assert(r.ok);assert.deepEqual(await r.json(),candidate,'API readback');fs.writeFileSync(path.join(out,'已保存工程.json'),JSON.stringify(candidate));console.log('Saved and API verified');}
 console.log('Four side front-hair frames verified',out);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
