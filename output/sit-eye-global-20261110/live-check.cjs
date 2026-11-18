const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
require('../../test/eye-sync.cjs');
const api='http://127.0.0.1:8765',H=PE.HairAnimation;
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
(async()=>{
 const html=await (await fetch(api+'/')).text();
 assert(html.includes('js/hair-animation.js?v=sit-eye-sync-20261110'));
 const js=await (await fetch(api+'/js/hair-animation.js?v=sit-eye-sync-20261110')).text();
 assert.equal(sha(js),sha(fs.readFileSync('js/hair-animation.js','utf8')));
 console.log('GET editor HTML and script match deployed code',sha(js));
 for(const id of ['character-ff47ea32-14f3-4489-aec3-3c1797b97955','draft-conflict-1794271316087-dc54567c']){
   const url=api+'/api/project?id='+id,r=await fetch(url);assert.equal(r.status,200);
   const etag=r.headers.get('etag'),blob=await r.blob();
   const {project:p}=await new PE.ExportManager().importProject(blob);
   const si=p.spriteSheets.findIndex(s=>s.name==='original16_sit'),keys=new Set([0,1,2,3].map(i=>si+'_0_'+i));
   for(const l of p.layers.filter(l=>l.hairAnimation?.part==='eyes')){
     const idle=p.spriteSheets[l.sheetIndex],ai=idle.actions.findIndex(a=>a.direction==='side');
     const base=l.getFrameData(p.getFrameKey(l.sheetIndex,ai,0));
     const a=H.plan(p,l,l.hairAnimation,keys);assert.equal(a.edits.length,4);assert.equal(a.clipped,0);
     const offset=a.edits.map(e=>e.image.placement.y-base.placement.y);
     const edited=structuredClone(l.hairAnimation);
     for(let i=0;i<4;i++)edited.offsets['original16_sit/side/'+i].y=20;
     const b=H.plan(p,l,edited,keys);
     assert.deepEqual(a.edits.map(e=>e.image.placement),b.edits.map(e=>e.image.placement));
     console.log(id,l.name,'effective Y:',offset,'saved Y overridden independently of value');
   }
   assert.equal((await fetch(url)).headers.get('etag'),etag);console.log('ETag unchanged:',etag);
 }
})().catch(e=>{console.error(e);process.exitCode=1});
