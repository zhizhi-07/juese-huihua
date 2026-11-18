const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
(async()=>{
const url='http://localhost:8765',id='draft-conflict-1794277219868-e36ffb28';
const r=await fetch(url+'/api/project?id='+id),etag=r.headers.get('etag'),raw=Buffer.from(await r.arrayBuffer());assert(r.ok);
fs.writeFileSync(__dirname+'/snapshot.json',raw);
console.log(etag,crypto.createHash('sha256').update(raw).digest('hex'));
const b=await chromium.launch({channel:'msedge',headless:true});
try{
const page=await b.newPage({viewport:{width:1450,height:950}});page.on('pageerror',e=>console.log('pageerror',e.message));await page.route('**/api/project?*',r=>r.request().method()==='GET'?r.fulfill({status:200,contentType:'application/json',headers:{ETag:etag},body:raw}):r.abort());
await page.goto(url+'/?project='+id);await page.waitForFunction(()=>PE.app?.persistence?.ready&&PE.app.project.layers.some(l=>l.name.includes('-卷')));
const v=await page.evaluate(async raw=>{
const H=PE.HairAnimation,app=PE.app,{project:p}=await app.exportManager.importProject(new Blob([raw]));
app.project=p; const report=[],out=document.createElement('canvas');out.width=16*4*10;out.height=16*8*10;const ctx=out.getContext('2d');ctx.imageSmoothingEnabled=false;
function raster(im){const c=document.createElement('canvas');c.width=c.height=16;if(im)PE.utils.drawImageData(c.getContext('2d'),im);return c.getContext('2d').getImageData(0,0,16,16).data.join(',');}
function draw(stage){
 let row=stage*4;
 for(const si of [1,0])for(const dir of ['down','side']){
  const ai=p.spriteSheets[si].actions.findIndex(a=>a.direction===dir),layers=PE.getRenderLayers(p,si,ai).filter(l=>PE.isLayerVisible(p,l,si));
  if(!stage)report.push({si,dir,layers:layers.map(l=>l.name)});
  for(let fi=0;fi<4;fi++){
   const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d');x.fillStyle='#eceff7';x.fillRect(0,0,16,16);
   for(const l of layers){const im=l.getFrameData(p.getFrameKey(si,ai,fi));if(im){x.globalAlpha=l.opacity;PE.utils.drawImageData(x,im);}}
   ctx.drawImage(c,fi*160,row*160,160,160);
  }row++;
 }
}
draw(0);
for(const l of p.layers.filter(l=>l.hairAnimation?.live)){
 try{const q=H.plan(p,l),diff=q.edits.filter(e=>raster(e.image)!==raster(e.layer.getFrameData(e.key)));report.push({name:l.name,visible:l.visible,clipped:q.clipped,missing:q.missing,changed:diff.map(e=>e.key)});}catch(e){report.push({name:l.name,error:e.message});}
}
const front=p.layers.find(l=>l.name==='头发 / -卷 / 前发');
const oldBack=p.layers.find(l=>l.sheetIndex===1&&l.name==='头发 / 侧边批发 / 后发');
p.currentSheetIndex=1;p.currentActionIndex=0;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.indexOf(front);
const baseFrames=[front.getFrameData('1_0_0'),front.getFrameData('1_1_0')];
const synced=H.sync(app,{live:true});
if(!front.hairAnimation?.live||baseFrames.some((im,i)=>im!==front.getFrameData('1_'+i+'_0')))throw Error('source changed or live not enabled');
for(const si of [0,1])for(const dir of ['down','side']){
 const ai=p.spriteSheets[si].actions.findIndex(a=>a.direction===dir),t=p.layers.find(l=>l.sheetIndex===si&&l.hairAnimationId===front.hairAnimationId);
 for(let fi=0;fi<p.spriteSheets[si].actions[ai].frames.length;fi++)if(!t.getFrameData(p.getFrameKey(si,ai,fi))?.data.some((x,i)=>i%4===3&&x))throw Error('missing front hair: '+[si,dir,fi]);
}
for(const l of p.layers.filter(l=>l.hairAnimationId===oldBack.hairAnimation.id))l.visible=false;
const refresh={edits:synced.edits.length,originalMasterPreserved:true,frontAndSideWalkAndIdleHaveHair:true,oldBackHiddenInPreviewOnly:true};
draw(1);
return {report,refresh,png:out.toDataURL()};
},raw.toString());
fs.writeFileSync(__dirname+'/workaround.png',Buffer.from(v.png.split(',')[1],'base64'));delete v.png;fs.writeFileSync(__dirname+'/workaround-report.json',JSON.stringify(v,null,2));console.log(JSON.stringify(v));
}finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
