const assert=require('node:assert/strict'),fs=require('node:fs'),{fixture}=require('../../../test/clothing-sync.cjs');
(async()=>{
  const {p,app}=await fixture(),C=PE.ClothingSync;
  const source=p.layers.find(l=>l.name==='高清 · 衣服'&&l.sheetIndex===1),target=p.layers.find(l=>l.name===source.name&&l.sheetIndex===3);
  const keep=target.getFrameData('3_1_1');assert(keep);
  target.frameData.delete('3_1_2'); // simulate a genuinely unpainted target without modifying the project on disk
  p.currentLayerIndex=p.layers.indexOf(source);
  const first=C.sync(app,{live:true});assert(first.sitPending);assert(!first.edits.some(e=>e.key.startsWith('3_')));
  assert(first.edits.some(e=>e.image.placement&&e.image.width===32),'2× idle output expected');
  p.currentSheetIndex=3;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.indexOf(target);
  const masters=new Map([0,1,2].map(a=>['3_'+a+'_0',target.getFrameData('3_'+a+'_0')]));
  for(let a=0;a<3;a++){
    p.currentActionIndex=a;assert(C.preserve(app));
    const plan=C.plan(p,source);
    assert.equal(plan.sitPending,a<2);assert.equal(plan.edits.some(e=>e.key.startsWith('3_')),a===2);
    assert(!plan.edits.some(e=>masters.has(e.key)));
  }
  const pending=C.refresh(p);assert(pending.some(v=>v.result.edits.some(e=>e.key==='3_1_2')));
  const filled=target.getFrameData('3_1_2');assert(filled?.data.some((v,i)=>i%4===3&&v));assert.deepEqual(filled.placement,{x:0,y:0,w:16,h:16});
  assert.equal(target.getFrameData('3_1_1'),keep);
  for(const [k,im] of masters)assert.equal(target.getFrameData(k),im);
  assert.equal(C.refresh(p).length,0,'live sync must be idempotent');
  const oldSit=target.getFrameData('3_1_0'),sitOnly=new ImageData(new Uint8ClampedArray(oldSit.data),oldSit.width,oldSit.height);
  sitOnly.placement=oldSit.placement;
  for(let i=0;i<sitOnly.data.length;i+=4)if(sitOnly.data[i+3])sitOnly.data.set([12,230,44,255],i);
  target.frameData.set('3_1_0',sitOnly);
  assert(C.refresh(p).some(v=>v.result.edits.some(e=>e.key==='3_1_2')),'seat source edit must invalidate live cache');
  assert(target.getFrameData('3_1_2').data.some((v,i,d)=>i%4===0&&v===12&&d[i+1]===230&&d[i+2]===44),'seated output must use painted seated source, not idle');
  assert(!C.preserve(app));assert(C.plan(p,source).sitPending);
  const ex=new PE.ExportManager();ex.project=p;const saved=(await ex.importProject(ex.exportProject(false))).project;
  assert.equal(saved.layers.find(l=>l.clothingSync).clothingSync.sitMasters.length,2);
  console.log('PASS actual HD project in memory: three confirmations required, no writes to masters/kept frames, missing seated frame at 2×, source edit live, cancellation and persistence.');
})().catch(e=>{console.error(e);process.exitCode=1});


