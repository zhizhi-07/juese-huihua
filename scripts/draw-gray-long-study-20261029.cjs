const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,ImageData,Image}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),out=path.join(root,'发型素材/08-灰色长发-分层试稿');
const id='character-gray-long-study-20261029',api='http://127.0.0.1:8765/api/project?id=';
fs.mkdirSync(out,{recursive:true});
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={addEventListener(){},createElement(){return Object.assign(createCanvas(1,1),{style:{}});}};
global.FileReader=class{async readAsText(blob){this.result=await blob.text();this.onload();}};
for(const name of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'));
function png(data,name,scale=1,bg){
 const tile=createCanvas(data.width,data.height);tile.getContext('2d').putImageData(data,0,0);
 const canvas=createCanvas(data.width*scale,data.height*scale),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.drawImage(tile,0,0,canvas.width,canvas.height);
 fs.writeFileSync(path.join(out,name),canvas.toBuffer('image/png'));return canvas;
}
function draw(half,palette){
 assert.equal(half.length,32);const data=new ImageData(32,32);
 half.forEach((row,y)=>{assert.equal(row.length,16,'Row '+y+': '+row);[...row].forEach((code,x)=>{if(code==='.')return;assert(palette[code],code);for(const xx of [x,31-x])data.data.set(palette[code],(y*32+xx)*4);});});return data;
}
function contact(cells,file,columns=3){
 const size=320,canvas=createCanvas(columns*size,Math.ceil(cells.length/columns)*(size+34)),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 cells.forEach(([label,data],i)=>{const x=i%columns*size,y=Math.floor(i/columns)*(size+34);ctx.fillStyle=i%2?'#30323b':'#eee8ef';ctx.fillRect(x,y,size,size+34);ctx.fillStyle=i%2?'#f4eef4':'#45414a';ctx.font='16px Microsoft YaHei';ctx.fillText(label,x+12,y+24);const tile=createCanvas(32,32);tile.getContext('2d').putImageData(data,0,0);ctx.drawImage(tile,x,y+34,size,size);});
 fs.writeFileSync(path.join(out,file),canvas.toBuffer('image/png'));
}
async function main(){
 if(process.argv.includes('--prepare')){
  assert(!fs.existsSync(path.join(out,'source-main.json')),'Source already prepared; preserve snapshot');
  const response=await fetch(api+'main');assert(response.ok,'Read current body: '+response.status);
  const raw=await response.text();fs.writeFileSync(path.join(out,'source-main.json'),raw);fs.writeFileSync(path.join(out,'source-etag.txt'),response.headers.get('etag'));
  const base=require('../js/character-base')(JSON.parse(raw));base.name='灰色长发·分层正面首帧试稿';base.currentSheetIndex=8;base.currentActionIndex=1;base.currentFrameIndex=0;
  fs.writeFileSync(path.join(out,'base-project.json'),JSON.stringify(base));
 }
 const exporter=new PE.ExportManager(),{project:p}=await exporter.importProject(new Blob([fs.readFileSync(path.join(out,'base-project.json'),'utf8')]));
 const cm=new PE.CanvasManager(document.createElement('canvas'),p);exporter.init(p,cm);
 if(process.argv.includes('--prepare')){
  for(const [ai,name]of [[0,'side'],[1,'front'],[2,'back']]){
   png(cm.getCompositeImageData(8,ai,0,true),'base-'+name+'-32.png');png(cm.getCompositeImageData(8,ai,0,true),'base-'+name+'-512.png',16,'#e9e3ea');
  }
  const head=p.layers.find(l=>l.name==='head'&&l.frameData.has('8_1_0')).frameData.get('8_1_0');
  console.log(Array.from({length:26},(_,y)=>String(y).padStart(2,'0')+' '+Array.from({length:32},(_,x)=>head.data[(y*32+x)*4+3]?'#':'.').join('')).join('\n'));
  console.log('Prepared current body',out);return;
 }
 const originals=p.layers.slice(),key='8_1_0',baseline=JSON.parse(await exporter.exportProject(false).text());
 const C={O:[119,119,119,255],S:[178,178,178,255],B:[209,209,209,255],W:[249,247,242,255]};
 const front=draw([
  '...........OOOOO','.........OOBBBBB','.......OOBBBBBBB','......OBBBSBBBBB',
  '.....OBBBSBBBBBB','....OBBBSBBBBBBB','....OBBSBBBBBBBB','...OBBSBBBBBBBBB',
  '...OBBSBBBSBBBBB','...OBSBBBBSBBBBB','...OBSBBBSBBBBBB','...OBSBBBSBBBBBB',
  '...OBSBBOSBBOSBB','...OBSBO.OB.OOOO','...OSBO.........','...OSBO.........',
  '...OSBBO........','....OSBBO.......','....OSBBO.......','.....OSBBO......',
  '.....OSBBBO.....','......OSBBBO....','.......OSBBO....','........OOOO....',
  '................','................','................','................',
  '................','................','................','................'
 ],C);
 const rear=draw([
  '................','...........OOOOO','.........OOBBBBB','.......OOBBBSBBB',
  '......OBBBSOOOOO','.....OBBSOO.....','....OBBSO.......','...OBBSO........',
  '..OBBSO.........','..OBBSO.........','..OBBSO.........','..OBBSO.........',
  '..OBBSO.........','..OBBSO.........','..OBBSO.........','..OBBSO.........',
  '..OBBBSO........','..OBBBSO........','..OBBBBSO.......','..OBBBBSO.......',
  '..OBBBBSO.......','..OBBBBSO.......','..OBBBBSO.......','..OBBBBSO.......',
  '..OBBBBSO.......','..OBBBBSO.......','...OBBBSO.......','...OBBBSO.......',
  '...OBBBSO.......','...OBSBO........','....OOO.........','................'
 ],C);
 const accessory=new ImageData(32,32),bow=['.OO..','OWWO.','OWWWO','.OWSO','..OO.','.OWO.','.OWO.','..O..'];
 bow.forEach((row,y)=>[...row].forEach((code,x)=>{if(code!=='.')for(const xx of [x,31-x])accessory.data.set(C[code],((y+6)*32+xx)*4);}));
 const layers=[['头发 / 08 灰色直长发 / 后发',rear],['头发 / 08 碎齐刘海与内弯鬓发 / 前发',front],['发饰 / 08 白色侧蝴蝶结',accessory]].map(([name,data])=>{const l=new PE.Layer(name);l.sheetIndex=8;l.frameData.set(key,data);return l;});
 for(let fi=0;fi<p.spriteSheets[8].actions[2].frames.length;fi++)layers[1].frameData.set('8_2_'+fi,new ImageData(32,32));
 for(const l of p.layers)if(l.parent!=null)l.parent++;
 p.layers.unshift(layers[0]);p.layers.push(layers[1],layers[2]);p.currentLayerIndex=p.layers.indexOf(layers[1]);p.currentSheetIndex=8;p.currentActionIndex=1;p.currentFrameIndex=0;
 const composite=()=>cm.getCompositeImageData(8,1,0,true),full=composite();
 assert(full.data.some((v,i)=>i%4===3&&v===255),'Composite cannot be empty');
 png(full,'正面试稿-32.png');png(full,'正面试稿-浅底.png',16,'#eee8ef');png(full,'正面试稿-深底.png',16,'#30323b');
 for(const [i,name]of ['后发','前发','蝴蝶结'].entries())png([rear,front,accessory][i],name+'-32.png');
 layers[2].visible=false;const noBow=composite();layers[0].visible=false;const frontOnly=composite();layers[0].visible=true;layers[1].visible=false;const rearOnly=composite();layers[1].visible=true;layers[2].visible=true;
 contact([['完整搭配',full],['前发：刘海＋内弯鬓发',frontOnly],['后发：脑后连接＋直长发',rearOnly],['前发独立透明图',front],['后发独立透明图',rear],['蝴蝶结独立透明图',accessory]],'分层检查.png');
 png(noBow,'不戴蝴蝶结.png',16,'#eee8ef');
 for(const data of [front,rear,accessory])for(let i=3;i<data.data.length;i+=4)assert(data.data[i]===0||data.data[i]===255,'Opaque pixels only');
 for(const l of [layers[0],layers[1]])for(let i=0;i<l.frameData.get(key).data.length;i+=4){const pixel=[...l.frameData.get(key).data.slice(i,i+4)];assert(!pixel[3]||[C.O,C.S,C.B].some(c=>c.every((n,i)=>n===pixel[i])),'Hair palette');}
 for(let fi=0;fi<p.spriteSheets[8].actions[2].frames.length;fi++){
  assert(layers[1].frameData.get('8_2_'+fi).data.every(v=>v===0));
  const before=cm.getCompositeImageData(8,2,fi,true);layers[1].visible=false;assert.deepEqual(cm.getCompositeImageData(8,2,fi,true).data,before.data);layers[1].visible=true;
 }
 p.currentActionIndex=1;p.currentFrameIndex=0;cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,32,32).data,cm.getCompositeImageData(8,1,0).data,'Main canvas');
 const decoded=require('./png.cjs').decode(Buffer.from(await (await exporter.exportFrameAsBlob(8,1,0)).arrayBuffer()));assert.deepEqual([...decoded.data],[...cm.getCompositeImageData(8,1,0).data],'PNG export');
 const player=Object.create(PE.AnimationPlayer.prototype);Object.assign(player,{canvas:createCanvas(32,32),project:p,canvasManager:cm,sheetIndex:8,actionIndex:1,currentFrame:0,previewScale:1});player.ctx=player.canvas.getContext('2d');player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,32,32).data,cm.getCompositeImageData(8,1,0).data,'Animation preview');
 const normalized=JSON.parse(await exporter.exportProject(false).text()),baseRaw=JSON.parse(fs.readFileSync(path.join(out,'base-project.json'),'utf8'));
 assert.equal(normalized.layers.length,baseline.layers.length+3);originals.forEach((layer,i)=>{assert.deepEqual(normalized.layers[i+1],{...baseline.layers[i],parent:baseline.layers[i].parent==null?baseline.layers[i].parent:baseline.layers[i].parent+1},'Base layer unchanged: '+layer.name);});
 const candidate={...baseRaw,currentLayerIndex:p.currentLayerIndex,layers:[normalized.layers[0],...baseRaw.layers.map(l=>({...l,parent:l.parent==null?l.parent:l.parent+1})),...normalized.layers.slice(-2)]};
 fs.writeFileSync(path.join(out,'分层工程.json'),JSON.stringify(candidate));
 const source=(await new PE.ExportManager().importProject(new Blob([fs.readFileSync(path.join(out,'source-main.json'),'utf8')]))).project;
 const cells=[];
 for(const [slot,targets]of [['后发',['头发 / 01 披发 / 后发','头发 / 02 双马尾 / 后发']],['前发',['头发 / 01 斜刘海 / 前发','头发 / 02 齐刘海 / 前发']]])for(const name of targets){
  const sourceLayer=source.layers.find(l=>l.sheetIndex===8&&l.name===name);assert(sourceLayer?.frameData.has(key),name);
  const old=new PE.Layer(name);old.sheetIndex=8;old.frameData.set(key,sourceLayer.frameData.get(key));
  const savedLayers=p.layers.slice();layers[0].visible=slot!=='后发';layers[1].visible=slot!=='前发';layers[2].visible=false;
  if(slot==='后发')p.layers.unshift(old);else p.layers.push(old);
  const image=composite();assert(image.data.some((n,i)=>i%4===3&&n));cells.push([slot==='后发'?'新前发＋'+name.split(' / ')[1]:'新后发＋'+name.split(' / ')[1],image]);p.layers=savedLayers;
 }
 layers[0].visible=layers[1].visible=layers[2].visible=true;contact(cells,'混搭检查.png',2);
 const savedLayers=p.layers.slice();
 for(const name of ['眼睛 / 02 青蓝·粉下缘','嘴巴 / 下垂嘴','服装 / 01 深蓝JK / 上衣','服装 / 01 深蓝JK / 百褶裙','服装 / 01 深蓝JK / 红领结']){
  const l=source.layers.find(l=>l.sheetIndex===8&&l.name===name);assert(l?.frameData.has(key),name);const copy=new PE.Layer(name);copy.sheetIndex=8;copy.frameData.set(key,l.frameData.get(key));p.layers.push(copy);
 }
 const dressed=composite();png(dressed,'五官服装搭配检查.png',16,'#eee8ef');p.layers=savedLayers;
 assert.deepEqual(JSON.parse(await exporter.exportProject(false).text()),normalized,'Test copies must not enter candidate');
 fs.writeFileSync(path.join(out,'自检.json'),JSON.stringify({scope:'待机正面首帧；背面前发帧全透明，其他方向和动画未绘制',checks:['source body/head/hands unchanged','front and rear independent','opaque limited-palette pixels','all back front-hair frames transparent','back composite unchanged by front-hair toggle','main canvas / PNG / preview agree','two-way mixing with two existing parts per slot','no old wardrobe copied into candidate']},null,2));
 if(process.argv.includes('--publish')){
  const main=await fetch(api+'main');assert.equal(main.headers.get('etag'),fs.readFileSync(path.join(out,'source-etag.txt'),'utf8'),'Current body changed; preserve candidate');
  let existing=await fetch(api+id);
  if(existing.status===404){const created=await fetch(api+id,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':'none'},body:JSON.stringify(baseRaw)});assert(created.ok,'Create base: '+created.status);existing=await fetch(api+id);}
  assert(existing.ok);const before=await existing.text(),branch=JSON.parse(before);
  assert.equal(branch.name,baseRaw.name);assert(branch.layers.every(l=>l.isGroup||/^(body|head|身体|头部)$/.test(l.name)||require('../js/character-base').isHand(l)),'Branch already contains artwork; do not overwrite user edits');
  fs.writeFileSync(path.join(out,'branch-before.json'),before);fs.writeFileSync(path.join(out,'branch-etag.txt'),existing.headers.get('etag'));
  const submitted={...branch,currentSheetIndex:8,currentActionIndex:1,currentFrameIndex:0,currentLayerIndex:branch.layers.length+1,layers:[normalized.layers[0],...branch.layers.map(l=>({...l,parent:l.parent==null?l.parent:l.parent+1})),...normalized.layers.slice(-2)]};
  const expected=require('../js/character-sync')(structuredClone(submitted),JSON.parse(fs.readFileSync(path.join(out,'source-main.json'),'utf8')));
  const saved=await fetch(api+id,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':existing.headers.get('etag')},body:JSON.stringify(submitted)});assert(saved.ok,'Publish: '+saved.status+' '+await saved.text());
  const readback=await fetch(api+id);assert(readback.ok);const actual=await readback.json();assert.deepEqual(actual,expected,'API readback');
  const {project:verified}=await new PE.ExportManager().importProject(new Blob([JSON.stringify(actual)])),actualCanvas=new PE.CanvasManager(document.createElement('canvas'),verified);
  assert.deepEqual(actualCanvas.getCompositeImageData(8,1,0,true).data,full.data,'Saved project renders the approved local pixels');
  fs.writeFileSync(path.join(out,'分层工程.json'),JSON.stringify(actual));
  console.log('Saved and API verified',id);
 }
 console.log('Verified native first-frame trial',out);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
