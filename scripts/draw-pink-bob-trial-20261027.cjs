const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),out=path.join(root,'自检记录/粉色外翻短发试稿-20261027');
const sourceUrl='http://127.0.0.1:8765/api/project?id=character-green-flower-idle-20261027';
const targetUrl='http://127.0.0.1:8765/api/project?id=character-pink-bob-trial-20261027';
fs.mkdirSync(out,{recursive:true});
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;},body:{appendChild(){}}};
global.File=class extends Blob{constructor(parts,name){super(parts);this.name=name;}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const n of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));

const C={O:'#76585d',B:'#f3a9c0',S:'#dc879f'};
function layerImage(kind){
 const c=createCanvas(32,32),x=c.getContext('2d');
 // The supplied 191px image is a 32px sprite enlarged on a 6px grid. These are its recovered cells.
 const ref=[
  '................................','............OOPPPPPO.............','..........OOPPPPPPPPOO...........','.........OPPPPPPPPPPPPO..........',
  '........OPPPPPPPPPPPPPPO.......','.......OPPPPPPPPPPPPPPPPO......','.......OPPPPPPPPPPPPPPPPP......','.......OPPPPPPPPPPPPPPPPP......',
  '......OPPPPPPOPPPPPPPPPPPO.....','......OPPPPPPOPPPPPPPPPPPO.....','.....OPPPPPPOOPPPPPPOPPPPOO....','.....OPPPPPPP.PPPPPPOPPPPPO....',
  '.....OPPPPPO..PPPPPPPPPOPPO....','.....OPPPPO...OPPPP.OO.PPPPO....','.....OPPPPO....OOOO..OPPPPO.....','....OPOPPPOOOO.....OOOPPPOPP....',
  '...OPPOPPPPOOO.PPP.OOPPPPOPPO..','...OP..OPPOPPPP...PPPOPPO..PO...','...OP..POOPO........OPOOP..PO...','....OPPPPPOOOOOPPPOOPOOPOPPO....'
 ];
 for(let py=0;py<ref.length;py++)for(let px=2;px<=16;px++){
  const cell=ref[py][px],hair=(cell==='P'||cell==='O')&&(py<=13||(py<=19&&px<=10));
  const rear=py>=14&&px<=6;if(!hair||rear!==(kind==='rear'))continue;
  x.fillStyle=cell==='O'?C.O:C.B;x.fillRect(px,py,1,1);x.fillRect(33-px,py,1,1);
 }
 return x.getImageData(0,0,32,32);
}

(async()=>{
 const r=await fetch(sourceUrl);assert(r.ok,'Source branch unavailable: '+r.status);const text=await r.text();
 fs.writeFileSync(path.join(out,'source.json'),text);fs.writeFileSync(path.join(out,'source-etag.txt'),r.headers.get('etag')||'');
 const exporter=new PE.ExportManager(),{project}=await exporter.importProject(new File([text],'source.json'));
 const keep=l=>l.isGroup||/^(head|body|hand(?: 2)?|vfx)$/.test(l.name)||l.name==='坐姿 / 手部';
 const old=project.layers,mapping=new Map();old.forEach((l,i)=>{if(keep(l))mapping.set(i,mapping.size);});project.layers=old.filter(keep);
 for(const [oldIndex,newIndex]of mapping){const l=project.layers[newIndex];if(l.parent!=null){assert(mapping.has(l.parent));l.parent=mapping.get(l.parent);}}
 const rear=new PE.Layer('头发 / 06 粉色外翻短发 / 后发'),front=new PE.Layer('头发 / 06 中分长刘海 / 前发');
 for(const l of [rear,front]){l.sheetIndex=8;l.parent=null;l.depth=0;l.visible=true;}
 rear.frameData.set('8_1_0',layerImage('rear'));front.frameData.set('8_1_0',layerImage('front'));
 for(const l of project.layers)if(l.parent!=null)l.parent++;
 project.layers.unshift(rear);project.layers.push(front);project.name='粉色外翻短发·正面首帧试稿';project.currentSheetIndex=8;project.currentActionIndex=1;project.currentFrameIndex=0;project.currentLayerIndex=project.layers.indexOf(front);
 exporter.project=project;const cm=new PE.CanvasManager(document.createElement('canvas'),project);exporter.canvasManager=cm;
 assert.equal(project.layers.filter(l=>/^(头发|发饰|眼睛|嘴巴|服装) \/|^嘴巴$/.test(l.name)).length,2);
 assert(front.frameData.get('8_1_0').data.some((v,i)=>i%4===3&&v));assert(rear.frameData.get('8_1_0').data.some((v,i)=>i%4===3&&v));
 for(const l of [rear,front]){const d=l.frameData.get('8_1_0').data;for(let y=0;y<32;y++)for(let x=2;x<=16;x++)for(let c=0;c<4;c++)assert.equal(d[(y*32+x)*4+c],d[(y*32+33-x)*4+c],l.name+' must be symmetric');}
 const composite=cm.getCompositeImageData(8,1,0);assert(composite.data.some((v,i)=>i%4===3&&v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,32,32).data,composite.data);
 const png=await exporter.exportFrameAsBlob(8,1,0),decoded=require('./png.cjs').decode(Buffer.from(await png.arrayBuffer()));assert.deepEqual(Array.from(decoded.data),Array.from(composite.data));
 const player=Object.create(PE.AnimationPlayer.prototype);Object.assign(player,{canvas:createCanvas(32,32),project,canvasManager:cm,sheetIndex:8,actionIndex:1,currentFrame:0,previewScale:1});player.ctx=player.canvas.getContext('2d');player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,32,32).data,composite.data);
 const preview=createCanvas(768,256),pc=preview.getContext('2d');pc.imageSmoothingEnabled=false;
 for(let i=0;i<3;i++){rear.visible=i!==1;front.visible=i!==2;const im=cm.getCompositeImageData(8,1,0),tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);pc.fillStyle=i===0?'#f4f1f3':i===1?'#40383d':'#f4f1f3';pc.fillRect(i*256,0,256,256);pc.drawImage(tile,i*256,0,256,256);}
 rear.visible=front.visible=true;fs.writeFileSync(path.join(out,'preview.png'),preview.toBuffer('image/png'));
 const candidate=JSON.parse(await exporter.exportProject(false).text());fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate));
 const existing=await fetch(targetUrl),match=existing.ok?existing.headers.get('etag'):'none';
 const saved=await fetch(targetUrl,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':match},body:JSON.stringify(candidate)});assert(saved.ok,'Save failed '+saved.status+': '+await saved.text());
 let back=await fetch(targetUrl);assert(back.ok);let verified=await back.json();
 if(verified.name!==candidate.name||verified.layers.length!==candidate.layers.length){
  const second=await fetch(targetUrl,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':back.headers.get('etag')},body:JSON.stringify(candidate)});
  assert(second.ok,'Versioned save failed '+second.status+': '+await second.text());back=await fetch(targetUrl);verified=await back.json();
 }
 assert.equal(verified.name,candidate.name);assert.equal(verified.layers.length,candidate.layers.length);
 assert(verified.layers.some(l=>l.name===rear.name&&l.frameData['8_1_0']));assert(verified.layers.some(l=>l.name===front.name&&l.frameData['8_1_0']));
 fs.writeFileSync(path.join(out,'saved-etag.txt'),back.headers.get('etag')||'');
 console.log(JSON.stringify({id:'character-pink-bob-trial-20261027',name:candidate.name,layers:candidate.layers.length,preview:path.join(out,'preview.png'),saved:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
