const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement(){let c=createCanvas(1,1);c.style={};return c},body:{appendChild(){}}};global.File=class extends Blob{constructor(p,n){super(p);this.name=n}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(let n of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'));
const file=n=>path.join(__dirname,n),p=JSON.parse(fs.readFileSync(file('candidate.json'))),before=JSON.parse(fs.readFileSync(file('before.json'))),idleHair=l=>l.sheetIndex===8&&l.name.startsWith('头发');
(async()=>{
assert.equal(p.layers.length,before.layers.length+4);assert.deepEqual(p.spriteSheets,before.spriteSheets,'Frame sizes or timings changed');
for(let i=0;i<before.layers.length;i++){
 let expected=structuredClone(before.layers[i]),actual=structuredClone(p.layers[i<2?i:i+2]);if(expected.parent!=null&&expected.parent>=2)expected.parent+=2;
 if(idleHair(expected)&&!expected.isGroup){delete expected.frameData;delete actual.frameData}
 assert.deepEqual(actual,expected,'Existing layer changed outside idle hair '+i);
}
for(let k of Object.keys(before))if(!['layers','currentLayerIndex'].includes(k))assert.deepEqual(p[k],before[k]);assert.equal(p.currentLayerIndex,before.currentLayerIndex+2);
let user=p.layers.find(l=>l.sheetIndex===8&&l.name.endsWith('/ 前发')),oldUser=before.layers.find(l=>l.sheetIndex===8&&l.name===user.name);assert.deepEqual(user.frameData['8_1_0'],oldUser.frameData['8_1_0'],'User first frame overwritten');
let {project}=await new PE.ExportManager().importProject(new File([JSON.stringify(p)],'candidate.json')),cm=new PE.CanvasManager(document.createElement('canvas'),project),ex=new PE.ExportManager();ex.init(project,null);cm.zoom=1;cm.showGrid=false;
let checks=[];
for(let si of [8,10])for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
 let key=`${si}_${ai}_${fi}`,size=si===8?36:32;project.currentSheetIndex=si;project.currentActionIndex=ai;project.currentFrameIndex=fi;
 let head=project.layers.find(l=>l.sheetIndex===si&&l.name==='head'&&l.frameData.has(key)).getFrameData(key),top=size;for(let y=0;y<20;y++)for(let x=0;x<size;x++)if(head.data[(y*size+x)*4+3])top=Math.min(top,y);
 for(let l of project.layers.filter(l=>l.sheetIndex===si&&l.name.startsWith('头发')&&!l.isGroup)){
  let im=l.getFrameData(key);assert(im);for(let y=0;y<size;y++)for(let x=0;x<size;x++){let i=(y*size+x)*4;assert([0,255].includes(im.data[i+3]));if(im.data[i+3]){assert(y>=top,'Hair above scalp '+key);assert([119,178,209].includes(im.data[i])&&im.data[i]===im.data[i+1]&&im.data[i]===im.data[i+2])}}
  if(ai===2&&l.name.endsWith('/ 前发'))assert(!im.data.some((v,i)=>i%4===3&&v),'Back front-hair must be empty');
 }
 let image=cm.getCompositeImageData(si,ai,fi);assert(image.data.some((v,i)=>i%4===3&&v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,size,size).data,image.data);assert.deepEqual(ex._getCompositeImageData(si,ai,fi).data,image.data);
 let c=createCanvas(size,size);c.getContext('2d').putImageData(image,0,0);fs.writeFileSync(file(`帧-${si}-${ai}-${fi}.png`),c.toBuffer('image/png'));checks.push({si,ai,fi,headTop:top,size,canvasMatchesExport:true});
}
let report={checks,saved:false,userFrontFirstFramePreserved:true,bodyHeadHandsAndOtherActionsUnchanged:true,oldLayerRelationshipsPreserved:true,sittingProfileSeparate:true,browserTested:false};
if(process.argv.includes('--save')){let url='http://127.0.0.1:8765/api/project?id=character-gold-mix-1793320553623',r=await fetch(url),raw=await r.text();assert(r.ok);assert.equal(r.headers.get('etag'),fs.readFileSync(file('etag.txt'),'utf8'),'Concurrent edit: retain candidate; merge needed');assert.deepEqual(JSON.parse(raw),before);r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':r.headers.get('etag')},body:JSON.stringify(p)});let msg=await r.text();fs.writeFileSync(file('保存响应.txt'),r.status+'\n'+msg);assert(r.ok,msg);r=await fetch(url);raw=await r.text();assert(r.ok);assert.deepEqual(JSON.parse(raw).layers,p.layers);fs.writeFileSync(file('final-api-readback.json'),raw);report.saved=true;report.etag=r.headers.get('etag');report.sha256=crypto.createHash('sha256').update(raw).digest('hex')}
fs.writeFileSync(file('验证结果.json'),JSON.stringify(report,null,2));console.log('PASS: 24 idle/sit frames; user first frame retained; body/head/hands, other actions and frame timings unchanged; main-canvas/export agree; saved='+report.saved);
})().catch(e=>{console.error(e);process.exitCode=1});
