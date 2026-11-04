const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const {createCanvas,ImageData,Image,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const sharp=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out=__dirname,read=n=>JSON.parse(fs.readFileSync(path.join(out,n))),write=(n,o)=>fs.writeFileSync(path.join(out,n),JSON.stringify(o,null,2)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement(){let c=createCanvas(1,1);c.style={};return c},body:{appendChild(){}}};global.File=class extends Blob{constructor(b,n){super(b);this.name=n}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(let n of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync(path.resolve('js/'+n+'.js'),'utf8'));
const surface=(w=36,h=36)=>{let c=createCanvas(w,h);c.style={};c.getContext('2d').imageSmoothingEnabled=false;return c};
(async()=>{
const candidate=read('candidate.json'),base=read('branch-before-hair.json'),meta=read('meta.json'),reference=read('source-project.json');
assert.deepEqual(candidate.spriteSheets,base.spriteSheets);let unchanged=candidate.layers.slice(2,-2).map(l=>({...l,...(l.parent!=null?{parent:l.parent-2}:{})}));assert.deepEqual(unchanged,base.layers);
assert(candidate.layers.filter(l=>l.name.startsWith('头发 /')).every(l=>l.sheetIndex===8));
for(let l of candidate.layers){if(l.parent!=null)assert(candidate.layers[l.parent]?.isGroup);if(l.name.startsWith('头发 /'))for(let k of Object.keys(l.frameData))assert(/^8_[012]_[0-3]$/.test(k))}
let {project}=await new PE.ExportManager().importProject(new File([JSON.stringify(candidate)],'candidate.json')),cm=new PE.CanvasManager(surface(),project);cm.zoom=1;cm.showGrid=false;cm.offsetX=0;cm.offsetY=0;
let exporter=new PE.ExportManager(project);exporter.init(project,null);let player=new PE.AnimationPlayer();player.canvas=surface();player.ctx=player.canvas.getContext('2d');player.project=project;player.canvasManager=cm;player.sheetIndex=8;player.previewScale=1;
let checks=[],native=[],roots=[];
for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
project.currentSheetIndex=8;project.currentActionIndex=ai;project.currentFrameIndex=fi;let key=`8_${ai}_${fi}`,data=cm.getCompositeImageData(8,ai,fi);assert(data.data.some((v,i)=>i%4===3&&v));
cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36,36).data,data.data,'main canvas mismatch');assert.deepEqual(exporter._getCompositeImageData(8,ai,fi).data,data.data,'export mismatch');player.actionIndex=ai;player.currentFrame=fi;player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,36,36).data,data.data,'preview mismatch');
let f=project.layers.find(l=>l.name==='头发 / 80008 / 前发'),rear=project.layers.filter(l=>l.sheetIndex===8&&l.name.startsWith('头发 / 80010')&&!l.isGroup);
if(ai===2){assert(!f.getFrameData(key).data.some(v=>v));f.visible=false;assert.deepEqual(cm.getCompositeImageData(8,ai,fi).data,data.data);f.visible=true}
for(let l of [f,...rear]){let im=l.getFrameData(key);for(let i=0;i<im.data.length;i+=4){assert([0,255].includes(im.data[i+3]));if(im.data[i+3])assert([119,178,209].includes(im.data[i])&&im.data[i]===im.data[i+1]&&im.data[i]===im.data[i+2])}if(ai!==0)for(let y=0;y<36;y++)for(let x=0;x<18;x++)assert.deepEqual(im.data.subarray((y*36+x)*4,(y*36+x)*4+4),im.data.subarray((y*36+35-x)*4,(y*36+35-x)*4+4),'symmetry mismatch')}
let t=surface();t.getContext('2d').putImageData(data,0,0);native.push({ai,fi,t});checks.push({ai,fi,nonempty:true,mainCanvas:true,preview:true,pngExport:true,backFrontTransparent:ai===2?true:null});
}
// Two bidirectional combinations with the single reference hairstyle; never add that library to the deliverable.
let mix=[];for(let kind of ['新前发配参考后发','参考前发配新后发']){
let p=structuredClone(candidate);if(kind==='新前发配参考后发')for(let name of ['底层后发','侧面后发'])p.layers.find(l=>l.name===`头发 / 80010 / ${name}`).frameData=structuredClone(reference.layers.find(l=>l.sheetIndex===8&&l.name===`头发 / 80009 / ${name}`).frameData);
else p.layers.find(l=>l.name==='头发 / 80008 / 前发').frameData=structuredClone(reference.layers.find(l=>l.sheetIndex===8&&l.name==='头发 / 80011 / 前发').frameData);
let {project:mp}=await new PE.ExportManager().importProject(new File([JSON.stringify(p)],'mix.json')),mc=new PE.CanvasManager(surface(),mp),sheet=surface(864,648),sg=sheet.getContext('2d');
for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){let im=mc.getCompositeImageData(8,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v));let t=surface();t.getContext('2d').putImageData(im,0,0);sg.fillStyle=fi%2?'#35434b':'#d7dbd7';sg.fillRect(fi*216,ai*216,216,216);sg.drawImage(t,fi*216,ai*216,216,216)}fs.writeFileSync(path.join(out,kind+'.png'),sheet.toBuffer('image/png'));mix.push({kind,frames:12,nonempty:true})}
let stack=surface(648,216*4),sg=stack.getContext('2d');for(let fi=0;fi<4;fi++){sg.fillStyle='#d7dbd7';sg.fillRect(0,fi*216,648,216);for(let ai=0;ai<3;ai++)sg.drawImage(native.find(n=>n.ai===ai&&n.fi===fi).t,ai*216,fi*216,216,216)}
let stackdata=stack.getContext('2d').getImageData(0,0,648,864);await sharp(Buffer.from(stackdata.data),{raw:{width:648,height:864,channels:4,pageHeight:216}}).gif({loop:0,delay:project.spriteSheets[8].actions[1].frames.map(f=>f.duration)}).toFile(path.join(out,'待机循环.gif'));let gm=await sharp(path.join(out,'待机循环.gif'),{animated:true}).metadata();assert.equal(gm.pages,4);
let cycle=[];for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){let a=native.find(n=>n.ai===ai&&n.fi===fi).t.getContext('2d').getImageData(0,0,36,36).data,b=native.find(n=>n.ai===ai&&n.fi===(fi+1)%4).t.getContext('2d').getImageData(0,0,36,36).data;let changed=0;for(let i=0;i<a.length;i+=4)if(!a.subarray(i,i+4).every((v,k)=>v===b[i+k]))changed++;cycle.push({ai,from:fi,to:(fi+1)%4,changed})}
const report={projectName:candidate.name,id:meta.id,sourceProjectSHA256:meta.sourceSHA256,candidateSHA256:hash(fs.readFileSync(path.join(out,'candidate.json'))),checks,mix,cycle,unchanged:['body/head/hands in source snapshot','all sprite sheets, original source bytes, action frame counts and timings','no editor code changes','hair created only for 12 idle frames'],palette:['#777777','#B2B2B2','#D1D1D1'],notChecked:['live browser UI; actual engine classes tested offscreen','second existing hairstyle for mix testing unavailable in the assigned reference project','unsaved browser drafts unavailable to API']};write('验证结果.json',report);console.log('VERIFY OK: 12 frames x main/preview/export, palette, symmetry, base unchanged; 24 mix frames, 4 GIF frames');
})().catch(e=>{fs.appendFileSync(path.join(out,'执行记录.txt'),'VERIFY ERROR: '+e.stack+'\n');console.error(e);process.exitCode=1});

