const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test/output/sit-branch-sync-56620e79'),id='character-56620e79-ce79-4fd9-b49c-081f7bc57d67';
const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
global.FileReader=class{async readAsText(file){this.result=await file.text();this.onload();}};
for(const name of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js/'+name+'.js'),'utf8'));
const raw=fs.readFileSync(out+(process.argv.includes('--merge-latest')?'/branch-api-latest.json':'/branch-api-before.json'),'utf8'),before=JSON.parse(raw),main=JSON.parse(fs.readFileSync(out+'/main-api-before.json')),after=structuredClone(before),changes=[];
const si=before.spriteSheets.findIndex(s=>s.name==='original32_sit'),ai=before.spriteSheets[si].actions.findIndex(a=>a.direction==='side'),li=before.layers.findIndex(l=>l.sheetIndex===si&&l.name==='服装 / 衣服-小黄鸭');
assert.equal(si,10);assert.equal(ai,0);assert.equal(li,175);assert.equal(before.spriteSheets[si].actions[ai].frames.length,4);
if(process.argv.includes('--merge-latest')){
  const original=JSON.parse(fs.readFileSync(out+'/branch-api-before.json'));
  for(let fi=0;fi<4;fi++)assert.deepEqual(before.layers[li].frameData[`10_0_${fi}`],original.layers[li].frameData[`10_0_${fi}`],'target cel changed during concurrent save; do not overwrite');
}
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64')),pixel=(im,x,y)=>im.data.subarray((y*im.width+x)*4,(y*im.width+x+1)*4),isEdge=c=>c[0]===70&&c[1]===70&&c[2]===94;
for(let a=0;a<3;a++)for(let fi=0;fi<4;fi++){
  const key=`${si}_${a}_${fi}`,body=before.layers.find(l=>l.name==='body'&&l.sheetIndex===si&&l.frameData[key]),source=main.layers.find(l=>l.name==='body'&&l.sheetIndex===si&&l.frameData[key]);
  assert.deepEqual(body.frameData[key],source.frameData[key],'inherited body must already equal main');
}
for(let fi=0;fi<4;fi++){
  const key=`${si}_${ai}_${fi}`,body=decode(before.layers.find(l=>l.name==='body'&&l.sheetIndex===si&&l.frameData[key]).frameData[key]),old=decode(before.layers[li].frameData[key]),im={width:old.width,height:old.height,data:Buffer.from(old.data)};
  assert.equal(im.width,32);assert.equal(im.height,32);
  // Only the obsolete lower side garment is replaced: folded skirt at left, two white sole faces at right.
  for(let y=26;y<32;y++)for(let x=0;x<32;x++){
    const c=pixel(body,x,y),at=(y*32+x)*4;
    im.data.set(!c[3]?[0,0,0,0]:isEdge(c)?c:x>=15&&y>=27?[255,255,255,255]:[236,236,236,255],at);
  }
  assert(Buffer.from(im.data.subarray(0,26*32*4)).equals(Buffer.from(old.data.subarray(0,26*32*4))),'upper garment is untouched');
  for(const x of [16,21])for(let y=27;y<=30;y++)assert.deepEqual([...pixel(im,x,y)],[255,255,255,255],'both soles are white surfaces, not one-row bands');
  const edits=[];for(let y=26;y<32;y++)for(let x=0;x<32;x++)if(!Buffer.from(pixel(im,x,y)).equals(Buffer.from(pixel(old,x,y))))edits.push({x,y,before:[...pixel(old,x,y)],after:[...pixel(im,x,y)]});
  assert(edits.length);after.layers[li].frameData[key]={...after.layers[li].frameData[key],dataURL:'data:image/png;base64,'+png.encode(32,32,im.data).toString('base64')};changes.push({key,edits});
}
const restored=structuredClone(after);for(const {key}of changes)restored.layers[li].frameData[key]=before.layers[li].frameData[key];assert.deepEqual(restored,before);
fs.writeFileSync(out+'/restore-extra-copy.json',JSON.stringify(restored));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-extra-copy.json')),before);
fs.writeFileSync(out+'/candidate.json',JSON.stringify(after));fs.writeFileSync(out+'/changes.json',JSON.stringify({layer:li,layerName:before.layers[li].name,changes},null,2));
const load=async p=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(p)]))).project;
function bounds(im){let x=im.width,y=im.height,r=-1,b=-1;for(let yy=0;yy<im.height;yy++)for(let xx=0;xx<im.width;xx++)if(im.data[(yy*im.width+xx)*4+3]){x=Math.min(x,xx);y=Math.min(y,yy);r=Math.max(r,xx);b=Math.max(b,yy);}return r<0?null:{x,y,w:r-x+1,h:b-y+1};}
async function verify(p){
  const model=await load(p),cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.init(model,cm);
  const studio=fs.readFileSync(path.join(root,'js/studio.js'),'utf8'),start=studio.indexOf('  app.animationPlayer._renderPreviewFrame=function'),end=studio.indexOf('  const originalSetTool=',start),app={project:model,canvasManager:cm,animationPlayer:new PE.AnimationPlayer()};app.animationPlayer.canvas=createCanvas(144,144);new Function('app','bounds',studio.slice(start,end))(app,bounds);
  let checked=0;for(let a=0;a<3;a++)for(let fi=0;fi<4;fi++){
    model.currentSheetIndex=si;model.currentActionIndex=a;model.currentFrameIndex=fi;
    const im=cm.getCompositeImageData(si,a,fi,true,1);assert(bounds(im));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,32,32).data,im.data,'main canvas');
    const exported=png.decode(Buffer.from(await(await ex.exportFrameAsBlob(si,a,fi)).arrayBuffer()));assert.deepEqual([...exported.data],[...im.data],'PNG export');
    Object.assign(app.animationPlayer,{sheetIndex:si,actionIndex:a,currentFrame:fi});app.animationPlayer._renderPreviewFrame(false);assert(bounds(app.animationPlayer.canvas.getContext('2d').getImageData(0,0,144,144)),'studio preview');checked++;
  }
  return {model,cm,checked};
}
async function contact(){
  const atlas=createCanvas(896,1056),ctx=atlas.getContext('2d');ctx.imageSmoothingEnabled=false;
  for(let row=0;row<6;row++){
    const data=structuredClone(row===0?before:after);
    if(row===2)for(const l of data.layers)if(l.sheetIndex===si&&/前发|后发/.test(l.name))l.visible=false;
    if(row===3)for(let i=0;i<data.layers.length;i++)data.layers[i].visible=!!(i===li||data.layers[i].isGroup);
    if(row===4)for(let i=0;i<data.layers.length;i++)data.layers[i].visible=!!(data.layers[i].isGroup||data.layers[i].name==='body');
    const model=await load(data),cm=new PE.CanvasManager(document.createElement('canvas'),model);
    for(let fi=0;fi<4;fi++){
      const im=cm.getCompositeImageData(si,ai,fi,false,1);assert(bounds(im));const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);
      const x=fi*224,y=row*176;ctx.fillStyle=row===5?'#292735':'#e3dfe8';ctx.fillRect(x,y,224,176);ctx.fillStyle=row===5?'#fff':'#222';ctx.font='12px sans-serif';ctx.fillText(['BEFORE','AFTER','AFTER no hair','AFTER garment','INHERITED BODY','AFTER dark'][row]+' #'+(fi+1),x+5,y+16);ctx.drawImage(tile,x+10,y+25,128,128);ctx.drawImage(tile,x+170,y+85,32,32);
    }
  }
  fs.writeFileSync(out+'/side-before-after.png',atlas.toBuffer('image/png'));
}
(async()=>{
  await verify(before);const result=await verify(after);await contact();
  const verification={projectId:id,baseBodyAlreadyMatchesMain12Frames:true,changedLayer:li,changedKeys:changes.map(c=>c.key),changedPixels:changes.map(c=>c.edits.length),onlySideGarmentRows26to31:true,upperGarmentHairBodyOtherDirectionsAndActionsExact:true,soleFacesWhiteBothFeet:true,restoreExtraCopyExact:true,mainCanvasPNGStudioPreviewChecks:result.checked,browserChecked:false,beforeSHA256:crypto.createHash('sha256').update(raw).digest('hex')};
  if(process.argv.includes('--save')){
    const url='http://127.0.0.1:8765/api/project?id='+id,current=await fetch(url);assert.equal(current.status,200);assert((await current.text())===raw,'branch changed; stop, do not overwrite');
    const r=await fetch(url,{method:'PUT',headers:{'X-Pixel-Editor':'1','Content-Type':'application/json','If-Match':current.headers.get('etag')},body:JSON.stringify(after)}),text=await r.text();fs.writeFileSync(out+'/save-response.json',JSON.stringify({status:r.status,body:text,etag:r.headers.get('etag')},null,2));assert.equal(r.status,200,text);
    const back=await fetch(url),readback=await back.text();assert.equal(back.status,200);assert.deepEqual(JSON.parse(readback),after);await verify(JSON.parse(readback));fs.writeFileSync(out+'/api-readback.json',readback);verification.saved=true;verification.etag=back.headers.get('etag');
  }
  fs.writeFileSync(out+'/verification.json',JSON.stringify(verification,null,2));console.log(JSON.stringify(verification,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
