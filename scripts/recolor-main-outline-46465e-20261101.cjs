const fs=require('fs'),assert=require('assert/strict'),vm=require('vm'),crypto=require('crypto');
const png=require(process.cwd()+'/scripts/png.cjs');
const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const dir=fs.readFileSync('自检记录/主工程描边46465e最新路径.txt','utf8'),p=JSON.parse(fs.readFileSync(dir+'/before.json','utf8')),c=structuredClone(p),changes=[];
const dec=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
for(let li=0;li<c.layers.length;li++){
 const l=c.layers[li];if(!p.spriteSheets[l.sheetIndex]?.name.startsWith('original32_'))continue;
 for(const [key,f]of Object.entries(l.frameData||{})){
  if(!f.dataURL)continue;const d=dec(f),old=Uint8Array.from(d.data),colors={};
  for(let i=0;i<d.data.length;i+=4){if(!d.data[i+3])continue;const hex=Buffer.from(d.data.slice(i,i+3)).toString('hex');
   if(hex!=='2f3b3d'&&!(l.name.startsWith('眼睛')&&hex==='26232c')&&!(l.name==='眼睛 / 原版豆豆眼·定位'&&hex==='000000'))continue;
   colors[hex]=(colors[hex]||0)+1;d.data.set([70,70,94],i);
  }
  if(!Object.keys(colors).length)continue;
  f.dataURL='data:image/png;base64,'+png.encode(d.width,d.height,d.data).toString('base64');
  const check=dec(f);assert.equal(check.width,d.width);assert.equal(check.height,d.height);assert.deepEqual(check.data,d.data);
  for(let i=0;i<old.length;i+=4){assert.equal(check.data[i+3],old[i+3]);if(check.data[i]!==old[i]||check.data[i+1]!==old[i+1]||check.data[i+2]!==old[i+2])assert.deepEqual(Array.from(check.data.slice(i,i+3)),[70,70,94]);}
  changes.push({li,layer:l.name,sheet:l.sheetIndex,key,colors,pixels:Object.values(colors).reduce((a,b)=>a+b,0)});
 }
}
assert(changes.length);let norm=structuredClone(c);for(const r of changes)norm.layers[r.li].frameData[r.key]=structuredClone(p.layers[r.li].frameData[r.key]);assert.deepEqual(norm,p);
assert(changes.some(r=>r.li===284));assert(changes.every(r=>r.sheet>=7));fs.writeFileSync(dir+'/candidate.json',JSON.stringify(c));
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};for(const n of ['core','canvas','export'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'));
(async()=>{let renderChecks=0,previews=[];for(let si=7;si<12;si++){
 const s=p.spriteSheets[si],cols=Math.max(...s.actions.map(a=>a.frames.length)),tile=88,label=125,cv=createCanvas(label+cols*tile,s.actions.length*6*tile),ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;
 for(let mode=0;mode<3;mode++)for(let v=0;v<2;v++){
  const ex=new PE.ExportManager(),model=(await ex.importProject(new Blob([JSON.stringify(v?c:p)]))).project;ex.project=model;
  if(mode)for(const l of model.layers){if(l.sheetIndex!==si)continue;if(/头发|发饰|服装/.test(l.name))l.visible=mode===2&&!l.name.includes('衣服与发型')&&(/02 双马尾 \/ 后发|02 齐刘海 \/ 前发|02 双马尾 \/ 饰品|服装/.test(l.name));if(l.name.includes('衣服与发型'))l.visible=mode===2;}
  const cm=new PE.CanvasManager(document.createElement('canvas'),model);ex.canvasManager=cm;
  for(let ai=0;ai<s.actions.length;ai++)for(let fi=0;fi<s.actions[ai].frames.length;fi++){
   const d=cm.getCompositeImageData(si,ai,fi,true,1);assert(d.data.some((v,i)=>i%4===3&&v),'Non-empty composite');assert.deepEqual(ex._getCompositeImageData(si,ai,fi,1).data,d.data);
   model.currentSheetIndex=si;model.currentActionIndex=ai;model.currentFrameIndex=fi;cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,d.width,d.height).data,d.data);renderChecks++;
   const t=createCanvas(d.width,d.height);t.getContext('2d').putImageData(d,0,0);const y=(ai*6+mode*2+v)*tile,x=label+fi*tile;ctx.fillStyle=mode===1?'#282835':'#e5dfe8';ctx.fillRect(fi?x:0,y,fi?tile:label+tile,tile);ctx.fillStyle=mode===1?'white':'#222';ctx.font='11px sans-serif';if(!fi)ctx.fillText(s.actions[ai].direction+' '+['saved','nude','outfit'][mode]+' '+(v?'after':'before'),4,y+17);ctx.drawImage(t,x+(tile-d.width*2)/2,y+7,d.width*2,d.height*2);ctx.fillText(String(fi+1),x+3,y+11);
  }
 }
 const out=dir+'/'+s.name+'-before-after.png';fs.writeFileSync(out,cv.toBuffer('image/png'));previews.push(out);
}
const report={sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(dir+'/before.json')).digest('hex'),replacements:changes.reduce((n,r)=>n+r.pixels,0),changedLayerFrames:changes.length,changedLayers:new Set(changes.map(r=>r.li)).size,changes,allOtherPixelsAndMetadataUnchanged:true,originalSourceSheetsUnchanged:true,renderCompositeExportChecks:renderChecks,browserChecked:false,previews};fs.writeFileSync(dir+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({dir,replacements:report.replacements,changedLayerFrames:report.changedLayerFrames,renderChecks,previews},null,2));})().catch(e=>{console.error(e);process.exitCode=1});
