const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {fixture,raster,pixels}=require('./eye-sync.cjs');
if(process.env.EYE_SOURCE)vm.runInThisContext(fs.readFileSync(process.env.EYE_SOURCE,'utf8'));
const H=PE.HairAnimation,names=['浇水','镐','斧头','锄头','镰刀','种植','钓鱼-甩竿','钓鱼-持竿','钓鱼-收线','钓鱼-上鱼'];
function addActions(p){
 for(const name of names){const si=p.spriteSheets.length,s=new PE.SpriteSheet(name);s.actions=['down','side','up'].map(dir=>{const a=new PE.Action(dir,dir);a.frames=[0,1].map(()=>new PE.Frame(0,0,0,16,16));return a;});p.spriteSheets.push(s);
 const head=new PE.Layer('head');head.sheetIndex=si;head.locked=true;p.layers.push(head);
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<2;fi++){const im=new ImageData(16,16);for(let y=2;y<5;y++)for(let x=5;x<8;x++)im.data.set([254,237,225,255],(y*16+x)*4);head.frameData.set(`${si}_${ai}_${fi}`,im);}}
}
(async()=>{
 for(const existing of [false,true]){
  const {p,eyes,app}=fixture();if(existing)H.sync(app,{live:true});const id=eyes.hairAnimation?.id;addActions(p);
  const before=p.layers.slice(),base=JSON.stringify(p.layers.filter(l=>l.name==='head').map(l=>[...l.frameData]));
  H.sync(app,{live:true});if(id)assert.equal(eyes.hairAnimation.id,id,'keep existing association and master');
  for(const name of names){const si=p.spriteSheets.findIndex(s=>s.name===name),layer=p.layers.find(l=>l.sheetIndex===si&&l.hairAnimationId===eyes.hairAnimation.id);assert(layer,`${name}: eyes must be linked`);
   for(let ai=0;ai<2;ai++)for(let fi=0;fi<2;fi++)assert.deepEqual(raster(layer.getFrameData(`${si}_${ai}_${fi}`)),raster(pixels(5,6)),`${name}: correct head displacement`);
   assert(!layer.getFrameData(`${si}_2_0`),'no rear eyes');}
  assert.equal(JSON.stringify(p.layers.filter(l=>l.name==='head').map(l=>[...l.frameData])),base,'no body/head edits');
  const count=p.layers.length;H.sync(app);assert.equal(p.layers.length,count,'repeat sync does not duplicate layers');app.history.undo(p);app.history.undo(p);assert.deepEqual(p.layers,before,'undo removes only newly linked layers');app.history.redo(p);
  const ex=new PE.ExportManager();ex.project=p;const reopened=(await ex.importProject(ex.exportProject(false))).project;H.refresh(reopened,true);assert.equal(reopened.layers.filter(l=>l.hairAnimationId===eyes.hairAnimation.id).length,14,'save/reopen keeps all 14 active action groups');
 }
 console.log('PASS eyes all actions: ten tool/fishing actions; new and legacy associations; exact offsets; no rear eyes; stable repeat; undo/redo; save/reopen; unchanged heads.');
})().catch(e=>{console.error(e);process.exitCode=1;});
