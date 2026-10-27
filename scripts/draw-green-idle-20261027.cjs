const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),out=path.join(root,'自检记录/浅绿花饰待机-20261027');
fs.mkdirSync(out,{recursive:true});
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;},body:{appendChild(){}}};
global.File=class extends Blob{constructor(parts,name){super(parts);this.name=name;}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const n of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
async function run(){
 const r=await fetch('http://127.0.0.1:8765/api/project?id=main');assert(r.ok);const text=await r.text();
 fs.writeFileSync(path.join(out,'source.json'),text);fs.writeFileSync(path.join(out,'source-etag.txt'),r.headers.get('etag'));
 const raw=JSON.parse(text),exporter=new PE.ExportManager(),{project}=await exporter.importProject(new File([text],'source.json'));
 exporter.project=project;const baseline=JSON.parse(await exporter.exportProject(false).text());
 const si=8;for(const l of project.layers)if(l.sheetIndex===si&&/^(头发|发饰) \//.test(l.name))l.visible=false;
 const cm=new PE.CanvasManager(document.createElement('canvas'),project),canvas=createCanvas(384,128),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 for(let ai=0;ai<3;ai++){const head=project.layers.find(l=>l.sheetIndex===8&&l.name==='head'&&l.frameData.has(`8_${ai}_0`));
 const c=createCanvas(32,32);c.getContext('2d').putImageData(cm.getCompositeImageData(8,ai,0),0,0);ctx.drawImage(c,ai*128,0,128,128);}
 fs.writeFileSync(path.join(out,'base.png'),canvas.toBuffer('image/png'));
 const palette={O:'#30372e',S:'#8fa66b',G:'#c3dfa1',P:'#c24d91',D:'#713d70',V:'#a75591',Y:'#e7dc87'};
 function draw(ai,fi,kind){
  const c=createCanvas(32,32),cx=c.getContext('2d');
  const head=project.layers.find(l=>l.sheetIndex===8&&l.name==='head'&&l.frameData.has(`8_${ai}_${fi}`)).frameData.get(`8_${ai}_${fi}`);
  let top=32;for(let y=0;y<24;y++)for(let x=0;x<32;x++)if(head.data[(y*32+x)*4+3])top=Math.min(top,y);
  const dy=top-2,tail=fi===2?1:0;
  const rect=(x,y,w,h,color)=>{cx.fillStyle=palette[color]||color;cx.fillRect(x,y+dy,w,h);};
  const poly=(pts,color)=>{for(let y=0;y<30;y++)for(let x=0;x<32;x++){let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a[1]>y+.5)!==(b[1]>y+.5)&&(x+.5<(b[0]-a[0])*(y+.5-a[1])/(b[1]-a[1])+a[0]))inside=!inside;}if(inside)rect(x,y,1,1,color);}};
  if(kind==='rear'){
   poly([[11,1],[23,1],[26,3],[29,7],[29,19],[30,23],[29,27],[26,28],[24,26],[23,27],[10,27],[9,28],[6,27],[5,23],[6,19],[6,7],[9,3]],'O');
   poly([[11,2],[23,2],[26,4],[28,7],[28,20],[29-tail,24],[28-tail,26],[26,27],[25,25],[23,26],[11,26],[9,27],[7+tail,26],[6+tail,23],[7,19],[7,7],[9,4]],'G');
   poly([[7,10],[10,7],[10,20],[12,24],[11,26],[9,25],[9,21],[7,23]],'S');
   poly([[25,6],[28,9],[28,21],[29-tail,24],[28-tail,26],[26,25],[26,21],[24,18]],'S');
   if(ai===2){poly([[13,4],[17,3],[21,4],[23,7],[22,15],[23,21],[21,25],[19,25],[20,20],[20,11],[19,6]],'S');rect(11,23,2,2,'S');}
  }else if(kind==='front'&&ai!==2){
   poly([[11,1],[23,1],[26,3],[29,7],[29,18],[27,22],[24,23],[24,13],[22,12],[21,14],[19,14],[18,11],[16,11],[15,14],[12,14],[11,12],[10,14],[10,23],[7,22],[5,18],[5,8],[8,4]],'O');
   poly([[11,2],[23,2],[26,4],[28,7],[28,18],[26,21],[25,22],[25,12],[22,11],[21,13],[20,13],[19,10],[16,10],[14,13],[12,13],[11,11],[9,13],[9,22],[7,21],[6,18],[6,8],[9,4]],'G');
   // Bang tips use the shared shadow instead of a heavy dark line over the eyes.
   rect(10,10,2,3,'G');rect(12,12,3,2,'G');rect(15,10,2,2,'G');rect(18,10,2,3,'G');rect(20,12,2,2,'G');rect(22,10,3,3,'G');
   poly([[9,5],[11,4],[10,9],[8,13],[8,20],[9,22],[7,21],[6,18],[6,9]],'S');
   rect(12,4,1,1,'S');rect(17,3,1,1,'S');rect(23,5,1,2,'S');
   poly([[24,9],[26,10],[26,17],[25,21],[24,22],[24,16],[23,14]],'S');
   if(ai===0){rect(7,11,3,9,'G');rect(8,13,2,7,'S');rect(10,11,3,3,'G');rect(23,11,2,5,'G');}
  }else if(kind==='acc'){
   const side=ai===0;
   for(const x of side?[6,26]:[5,28]){rect(x,7,1,4,'P');rect(x-1,8,1,2,'D');rect(x,11,1,3,'D');rect(x+(x<16?-1:1),13,1,5,'P');rect(x+(x<16?-2:2),14,1,2,'P');}
   const fx=ai===2?8:side?24:25;
   rect(fx-2,7,2,2,'V');rect(fx+1,7,2,2,'V');rect(fx-1,6,2,2,'D');rect(fx-1,9,2,2,'V');rect(fx-2,9,1,1,'D');rect(fx+1,9,2,1,'D');rect(fx,8,1,2,'Y');
   rect(fx,11,1,4,'Y');rect(fx+2,11,1,6,'Y');rect(fx,15,1,2,'S');rect(fx+2,17,1,1,'S');
  }
  const result=cx.getImageData(0,0,32,32);
  if(kind==='front')for(let y=10+dy;y<15+dy;y++)for(let x=10;x<25;x++){const at=(y*32+x)*4;if(result.data[at]===48&&result.data[at+1]===55&&result.data[at+2]===46)result.data.set([143,166,107,255],at);}
  return result;
 }
 const rear=new PE.Layer('头发 / 04 浅绿长披发 / 后发'),front=new PE.Layer('头发 / 04 分束齐刘海 / 前发'),acc=new PE.Layer('发饰 / 04 紫花与粉色垂带');
 for(const l of [rear,front,acc]){l.sheetIndex=8;l.parent=null;l.depth=0;l.visible=true;}
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++)for(const [l,kind]of [[rear,'rear'],[front,'front'],[acc,'acc']])l.frameData.set(`8_${ai}_${fi}`,draw(ai,fi,kind));
 for(const l of project.layers)if(l.parent!=null)l.parent++;
 project.layers.unshift(rear);project.layers.push(front,acc);
 project.name='浅绿长发·紫花粉缎带·待机分支';project.currentSheetIndex=8;project.currentActionIndex=1;project.currentFrameIndex=0;project.currentLayerIndex=project.layers.indexOf(front);
 exporter.project=project;exporter.canvasManager=cm;
 const candidate=JSON.parse(await exporter.exportProject(false).text());
 // All existing pixel data and every other action stay intact in the new branch.
 for(let i=0;i<baseline.layers.length;i++)assert.deepEqual(candidate.layers[i+1].frameData,baseline.layers[i].frameData);
 for(let i=0;i<baseline.layers.length;i++)if(baseline.layers[i].sheetIndex!==8){const before={...baseline.layers[i]},after={...candidate.layers[i+1]};if(before.parent!=null)before.parent++;assert.deepEqual(after,before);}
 assert.equal(front.frameData.get('8_2_0').data.some(v=>v!==0),false);
 const sheet=createCanvas(512,3*128),sc=sheet.getContext('2d');sc.imageSmoothingEnabled=false;
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
  const im=cm.getCompositeImageData(8,ai,fi);assert(im.data.some(v=>v));
  project.currentActionIndex=ai;project.currentFrameIndex=fi;cm.render();
  assert.deepEqual(cm.offscreenCtx.getImageData(0,0,32,32).data,im.data);
  const png=await exporter.exportFrameAsBlob(8,ai,fi),decoded=require('./png.cjs').decode(Buffer.from(await png.arrayBuffer()));assert.deepEqual(Array.from(decoded.data),Array.from(im.data));
  const player=Object.create(PE.AnimationPlayer.prototype);Object.assign(player,{canvas:createCanvas(32,32),project,canvasManager:cm,sheetIndex:8,actionIndex:ai,currentFrame:fi,previewScale:1});player.ctx=player.canvas.getContext('2d');player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,32,32).data,im.data);
  const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);
  sc.fillStyle=ai===1?'#eceee4':'#45434b';sc.fillRect(fi*128,ai*128,128,128);sc.drawImage(tile,fi*128,ai*128,128,128);
  fs.writeFileSync(path.join(out,`idle-${ai}-${fi}.png`),tile.toBuffer('image/png'));
 }
 fs.writeFileSync(path.join(out,'preview.png'),sheet.toBuffer('image/png'));
 const variants=createCanvas(512,128),vc=variants.getContext('2d');vc.imageSmoothingEnabled=false;
 for(let v=0;v<4;v++){
  for(const l of project.layers)if(l.sheetIndex===8&&l.name.startsWith('服装 /'))l.visible=v===1;
  rear.visible=v!==2;acc.visible=v!==2;
  const tile=createCanvas(32,32);tile.getContext('2d').putImageData(cm.getCompositeImageData(8,1,0),0,0);vc.fillStyle=v===3?'#33333d':'#eeeede';vc.fillRect(v*128,0,128,128);vc.drawImage(tile,v*128,0,128,128);
 }
 fs.writeFileSync(path.join(out,'variants.png'),variants.toBuffer('image/png'));
 fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate));
 console.log('Candidate and all 12 idle frames rendered:',out);
 if(process.argv.includes('--publish')){
  const id='character-green-flower-idle-20261027';
  const saved=await fetch('http://127.0.0.1:8765/api/project?id='+id,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':'none'},body:JSON.stringify(candidate)});assert(saved.ok,'Save failed: '+saved.status);
  const back=await fetch('http://127.0.0.1:8765/api/project?id='+id);assert(back.ok);assert.deepEqual(await back.json(),candidate);
  console.log('Saved and verified:',id);
 }
}
run().catch(e=>{console.error(e);process.exitCode=1;});
