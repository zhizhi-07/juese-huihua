const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createCanvas,ImageData,Image}=require('@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
const root=path.resolve(__dirname,'..'),original=process.argv.includes('--original');
for(const name of ['core','history','canvas','tools','export','api','frame-tools','hair-animation','wardrobe']){
 const before=path.join(root,'test/output/eye-sync-20261103/before/js',name+'.js');
 vm.runInThisContext(fs.readFileSync(original&&fs.existsSync(before)?before:path.join(root,'js',name+'.js'),'utf8'),{filename:name});
}
const H=PE.HairAnimation;
function pixels(x,y,blink=false){const im=new ImageData(16,16);for(const [dx,dy]of (blink?[[0,1],[1,1],[2,1]]:[[0,0],[0,1],[0,2]]))im.data.set([30,40,50,255],((y+dy)*16+x+dx)*4);return im;}
function raster(im){const c=createCanvas(16,16);if(im)PE.utils.drawImageData(c.getContext('2d'),im);return c.getContext('2d').getImageData(0,0,16,16).data;}
function fixture(){
 const p=new PE.Project();p.layers=[];
 p.spriteSheets=['idle','walk','pickup','sit','sleep'].map((name,si)=>{const s=new PE.SpriteSheet('original32_'+name);s.frameWidth=s.frameHeight=16;s.actions=(name==='sleep'?['down']:['down','side','up']).map(dir=>{const a=new PE.Action(dir,dir);a.frames=[0,1,2,3].map(()=>new PE.Frame(si,0,0,16,16));return a;});return s;});
 for(const [si,s]of p.spriteSheets.entries()){const head=new PE.Layer('head');head.sheetIndex=si;head.locked=true;p.layers.push(head);for(const [ai,a]of s.actions.entries())for(let fi=0;fi<4;fi++){const im=new ImageData(16,16);for(let y=1;y<4;y++)for(let x=3;x<6;x++)im.data.set([250,220,200,255],((y+(fi>=2?2:0))*16+x+(si===1?1:0))*4);head.frameData.set(`${si}_${ai}_${fi}`,im);}}
 const eyes=new PE.Layer('眼睛 / 测试眼型');eyes.sheetIndex=0;
 const walk=new PE.Layer(eyes.name);walk.sheetIndex=1;
 const sleep=new PE.Layer(eyes.name);sleep.sheetIndex=4;sleep.locked=true;sleep.frameData.set('4_0_0',pixels(6,8,true));
 for(const [si,l]of [[0,eyes],[1,walk]])for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++)l.frameData.set(`${si}_${ai}_${fi}`,pixels(3+(si===1?1:0),5+(fi>=2?2:0),ai===0&&fi===1));
 const hair=new PE.Layer('头发 / 不修改 / 前发');hair.sheetIndex=0;hair.frameData.set('0_0_0',pixels(8,2));p.layers.push(eyes,walk,sleep,hair);
 p.currentSheetIndex=p.currentActionIndex=p.currentFrameIndex=0;p.currentLayerIndex=p.layers.indexOf(eyes);
 const history=new PE.HistoryManager(),cm=new PE.CanvasManager(Object.assign(createCanvas(160,160),{style:{}}),p),tools=new PE.ToolManager();tools.init(p,cm,history);
 const app={project:p,history,toolManager:tools,canvasManager:cm,animationPlayer:{pause(){}},updateAll(){},persistence:{markDirty(){}}};
 return {p,eyes,walk,sleep,hair,app};
}
async function main(){
 const {p,eyes,walk,sleep,hair,app}=fixture(),layers=p.layers.slice(),headBytes=p.layers.filter(l=>l.name==='head').map(l=>[...l.frameData.values()].map(im=>[...im.data])),sleepBefore=JSON.stringify([...sleep.frameData]),hairBefore=JSON.stringify([...hair.frameData]);
 const blinkIdle=eyes.getFrameData('0_0_1'),blinkWalk=walk.getFrameData('1_0_1');
 const r=H.sync(app,{live:true});assert.equal(r.edits.length,43);assert.equal(eyes.hairAnimation.part,'eyes');assert(!eyes.hairAnimation.enabled);
 assert.deepEqual(eyes.hairAnimation.preserved,['original32_idle/down/1','original32_walk/down/1']);
 assert.equal(eyes.getFrameData('0_0_1'),blinkIdle);assert.equal(walk.getFrameData('1_0_1'),blinkWalk);
 assert.deepEqual(raster(walk.getFrameData('1_1_2')),raster(pixels(4,7)),'open eyes follow direction and head offsets');
 assert(!sleep.hairAnimationId,'retired sleeping layer is not linked');assert(!Object.keys(eyes.hairAnimation.offsets).some(k=>k.includes('sleep')));
 app.history.undo(p);assert.deepEqual(p.layers,layers);assert(!eyes.hairAnimation);app.history.redo(p);assert(eyes.hairAnimation.live);
 H.install(app);app.toolManager.drawPixel(p.layers.indexOf(eyes),'0_1_0',5,5,90,80,70,255);
 assert.equal(raster(walk.getFrameData('1_1_2'))[(7*16+6)*4],90,'live brush reaches walking eyes');
 assert.equal(eyes.getFrameData('0_0_1'),blinkIdle);assert.equal(walk.getFrameData('1_0_1'),blinkWalk);
 app.history.undo(p);assert.equal(raster(walk.getFrameData('1_1_2'))[(7*16+6)*4],0);app.history.redo(p);assert.equal(raster(walk.getFrameData('1_1_2'))[(7*16+6)*4],90);
 const generated=walk.getFrameData('1_1_2');H.transaction(app,'pause eyes',()=>eyes.hairAnimation.live=false);app.toolManager.drawPixel(p.layers.indexOf(eyes),'0_1_0',7,5,11,22,33,255);assert.equal(walk.getFrameData('1_1_2'),generated);H.sync(app);assert.equal(raster(walk.getFrameData('1_1_2'))[(7*16+8)*4],11);
 H.transaction(app,'opt blink into sync',()=>{eyes.hairAnimation.preserved=eyes.hairAnimation.preserved.filter(k=>k!=='original32_walk/down/1');H.applyPlan(H.plan(p,eyes));});assert.deepEqual(raster(walk.getFrameData('1_0_1')),raster(pixels(4,5)));app.history.undo(p);assert.equal(walk.getFrameData('1_0_1'),blinkWalk);
 const before=JSON.stringify(eyes.hairAnimation),frames=eyes.frameData;p.spriteSheets[3].actions[0].frames[2].locked=true;assert.throws(()=>H.sync(app),/保护/);assert.deepEqual([...eyes.frameData],[...frames]);assert.equal(JSON.stringify(eyes.hairAnimation),before);p.spriteSheets[3].actions[0].frames[2].locked=false;
 const ex=new PE.ExportManager();ex.project=p;const blob=ex.exportProject(false),raw=JSON.parse(await blob.text()),reopened=(await ex.importProject(blob)).project,owner=reopened.layers.find(l=>l.hairAnimation?.part==='eyes');
 assert.deepEqual(owner.hairAnimation,eyes.hairAnimation);H.refresh(reopened,true);
 for(const l of p.layers.filter(l=>l.hairAnimationId))for(const [k,im]of l.frameData){const loaded=reopened.layers.find(v=>v.sheetIndex===l.sheetIndex&&v.hairAnimationId===l.hairAnimationId);assert.deepEqual(raster(loaded.getFrameData(k)),raster(im));}
 for(const mutate of [g=>g.preserved=['original32_idle/down/0'],g=>g.preserved=['bad'],g=>g.enabled=true,g=>g.part='mouth']){const bad=structuredClone(raw);mutate(bad.layers.find(l=>l.hairAnimation).hairAnimation);await assert.rejects(()=>ex.importProject(new Blob([JSON.stringify(bad)])));}
 assert.equal(JSON.stringify([...sleep.frameData]),sleepBefore);assert.equal(JSON.stringify([...hair.frameData]),hairBefore);assert.deepEqual(p.layers.filter(l=>l.name==='head').map(l=>[...l.frameData.values()].map(im=>[...im.data])),headBytes);
 assert(!PE.isEditorSheet({name:'original32_sleep'}));assert(!PE.isEditorSheet({name:'sleep'}));assert(PE.isEditorSheet({name:'original32_sit'}));assert(!('sleep' in PE.Wardrobe.actions));
 const noSource=fixture();noSource.eyes.frameData.delete('0_2_0');H.sync(noSource.app);assert.deepEqual(raster(noSource.walk.getFrameData('1_2_2')),raster(pixels(4,7)),'missing directional master never erases existing eyes');
 console.log('PASS eyes: shared directional sync, calibrated offsets, expression preservation/opt-in, live brush, pause/manual sync, undo/redo, atomic locks, PNG save/reopen, validation, untouched hair/base/sleep and hidden sleep action.');
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={fixture,pixels,raster};
