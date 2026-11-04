const fs=require('fs'),assert=require('assert/strict'),vm=require('vm'),png=require('./png.cjs');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const out=fs.readFileSync('自检记录/睡觉素体长度最新路径.txt','utf8'),before=JSON.parse(fs.readFileSync(out+'/before.json')),meta=JSON.parse(fs.readFileSync(out+'/metadata.json')),next=structuredClone(before);
const dec=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64')),enc=d=>'data:image/png;base64,'+png.encode(d.width,d.height,d.data).toString('base64');
const layer=(p,si,name,key)=>p.layers.find(l=>l.sheetIndex===si&&l.name===name&&l.frameData[key]);
function move(d,width,height,dx,dy){const t={width,height,data:Buffer.alloc(width*height*4)};for(let y=0;y<d.height;y++)for(let x=0;x<d.width;x++){const i=(y*d.width+x)*4;if(d.data[i+3]){assert(x+dx>=0&&x+dx<width&&y+dy>=0&&y+dy<height);t.data.set(d.data.slice(i,i+4),((y+dy)*width+x+dx)*4);}}return t;}
function bounds(d){const pts=[];for(let y=0;y<d.height;y++)for(let x=0;x<d.width;x++)if(d.data[(y*d.width+x)*4+3])pts.push([x,y]);assert(pts.length);return {top:Math.min(...pts.map(p=>p[1])),bottom:Math.max(...pts.map(p=>p[1]))};}
const changes=[],measurements=[];
for(let fi=0;fi<4;fi++){
 const ik='8_1_'+fi,sk='11_0_'+fi,ih=dec(layer(before,8,'head',ik).frameData[ik]),sh=dec(layer(before,11,'head',sk).frameData[sk]);
 assert.deepEqual(Array.from(move(ih,sh.width,sh.height,3,2).data),Array.from(sh.data),'sleep head is exactly idle head with canvas offset');
 const ib=dec(layer(before,8,'body',ik).frameData[ik]),sb=dec(layer(before,11,'body',sk).frameData[sk]),body=move(ib,sb.width,sb.height,3,2);
 const idleHeight=bounds(ib).bottom-bounds(ih).top+1,oldHeight=bounds(sb).bottom-bounds(sh).top+1,newHeight=bounds(body).bottom-bounds(sh).top+1;
 assert.equal(oldHeight,idleHeight+2);assert.equal(newHeight,idleHeight);
 const target=layer(next,11,'body',sk),li=next.layers.indexOf(target);target.frameData[sk].dataURL=enc(body);changes.push({layer:li,key:sk,method:'current idle body translated +3,+2 for existing sleep canvas'});
 const hand=layer(next,11,'hand',sk),hi=next.layers.indexOf(hand),hd=dec(hand.frameData[sk]),moved=move(hd,hd.width,hd.height,0,-2);hand.frameData[sk].dataURL=enc(moved);changes.push({layer:hi,key:sk,method:'same sleep hand pixels translated 0,-2'});
 assert.equal(bounds(moved).bottom,bounds(body).bottom-1);
 measurements.push({frame:fi,idleHeight,oldSleepHeight:oldHeight,newSleepHeight:newHeight,footY:bounds(body).bottom,headUnchanged:true});
}
assert.equal(changes.length,8);assert(measurements.every(m=>m.footY===33));
const restore=structuredClone(next);for(const c of changes)restore.layers[c.layer].frameData[c.key]=structuredClone(before.layers[c.layer].frameData[c.key]);assert.deepEqual(restore,before,'only sleep body and hands may change');
fs.writeFileSync(out+'/restore-extra-copy.json',JSON.stringify(restore));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-extra-copy.json')),before);
const diffs=[];for(const c of changes){const a=dec(before.layers[c.layer].frameData[c.key]),b=dec(next.layers[c.layer].frameData[c.key]),pixels=[];for(let i=0;i<a.data.length;i+=4)if(!Buffer.from(a.data.slice(i,i+4)).equals(Buffer.from(b.data.slice(i,i+4))))pixels.push({x:i/4%a.width,y:Math.floor(i/4/a.width),before:Array.from(a.data.slice(i,i+4)),after:Array.from(b.data.slice(i,i+4))});diffs.push({...c,pixels});}
fs.writeFileSync(out+'/pixel-diff.json',JSON.stringify(diffs,null,2));fs.writeFileSync(out+'/candidate.json',JSON.stringify(next));
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'));
(async()=>{
 if(process.argv[2]==='publish'){
  const url='http://127.0.0.1:8765/api/project?id=main',r=await fetch(url);assert(r.ok);assert.deepEqual(await r.json(),before,'new user save detected; do not overwrite');assert.equal(r.headers.get('etag'),meta.etag);
  const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(next)}),response=await saved.text();fs.writeFileSync(out+'/save-response.txt',saved.status+'\n'+response);assert(saved.ok,response);
  const read=await fetch(url);assert(read.ok);const raw=await read.text();assert.deepEqual(JSON.parse(raw),next);fs.writeFileSync(out+'/api-readback.json',raw);console.log('PASS saved; API readback exactly matches');return;
 }
 const cv=createCanvas(720,6*180),ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;let checks=0;
 for(let mode=0;mode<2;mode++)for(let state=0;state<3;state++){
  const si=state===0?8:11,ai=state===0?1:0,model=(await new PE.ExportManager().importProject(new Blob([JSON.stringify(state===2?next:before)]))).project;
  for(const l of model.layers)if(l.sheetIndex===si){if(/头发|发饰|服装/.test(l.name))l.visible=mode===1&&l.name.startsWith('头发 / 02 ');}
  const cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;const player=new PE.AnimationPlayer();player.init(document.createElement('canvas'),model,cm);player.previewScale=1;
  for(let fi=0;fi<4;fi++){
   model.currentSheetIndex=si;model.currentActionIndex=ai;model.currentFrameIndex=fi;const im=cm.getCompositeImageData(si,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v));
   cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,im.width,im.height).data,im.data);player.sheetIndex=si;player.actionIndex=ai;player.currentFrame=fi;player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,im.width,im.height).data,im.data);
   const b=Buffer.from(await(await ex.exportFrameAsBlob(si,ai,fi)).arrayBuffer());assert.deepEqual(Array.from(png.decode(b).data),Array.from(im.data));checks++;
   const tile=createCanvas(im.width,im.height);tile.getContext('2d').putImageData(im,0,0);const x=fi*180,y=(mode*3+state)*180;ctx.fillStyle=state===1?'#37333f':'#e7e3e8';ctx.fillRect(x,y,180,180);ctx.fillStyle=state===1?'#fff':'#333';ctx.font='12px sans-serif';ctx.fillText(`${['IDLE','SLEEP BEFORE','SLEEP AFTER'][state]} ${fi+1}`,x+4,y+15);
   // Align heads in this comparison; the sleep canvas has +3,+2 transparent offset.
   ctx.drawImage(tile,x+5-(si===11?9:0),y+20-(si===11?6:0),im.width*3,im.height*3);ctx.drawImage(tile,x+135,y+135);
  }
 }
 fs.writeFileSync(out+'/待机-睡觉原版-睡觉修正.png',cv.toBuffer('image/png'));
 fs.writeFileSync(out+'/verification.json',JSON.stringify({measurements,changedCels:8,onlySleepBodyAndHandsChanged:true,headEyesHairAndAllOtherActionsUnchanged:true,dimensionsFrameCountTimingVisibilityUnchanged:true,renderPreviewPNGChecks:checks,restoreExtraCopyVerified:true,browserChecked:false},null,2));console.log('PASS',checks,'render/preview/PNG comparisons',JSON.stringify(measurements),out);
})().catch(e=>{console.error(e);process.exitCode=1});
