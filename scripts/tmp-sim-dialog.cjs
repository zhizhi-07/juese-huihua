const fs=require('fs'),vm=require('vm');
const rt='C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
const {createCanvas,Image,ImageData}=require(rt+'@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;
global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}}),addEventListener(){}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
global.crypto=require('crypto').webcrypto;
for(const n of ['core','canvas','export','animation','hair-animation'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'));
const file=process.argv[2], layerName=process.argv[3], dir=process.argv[4]||'down', scope=process.argv[5]||'direction';
(async()=>{
const data=JSON.parse(fs.readFileSync(file,'utf8'));
const model=(await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project;
const H=PE.HairAnimation;
const idleSI=model.spriteSheets.findIndex(s=>s.name==='original32_idle');
const candidates=model.layers.filter(l=>l.sheetIndex===idleSI&&!l.isGroup&&!l.locked&&!l.inheritedBase&&PE.classifyPart(l.name)?.category==='头发'&&(l.parent==null||l.hairAnimation));
console.log('candidates:',candidates.map(l=>j=>j).length,candidates.map(l=>l.name+' vis='+l.visible+' link='+(l.hairAnimationId?'L':(l.hairAnimation?'M':'-'))).join(' | '));
const original=candidates.find(l=>l.name===layerName)||candidates[0];
console.log('chosen:',original.name,'vis',original.visible);
// replicate chooseHair(): work copy
const work=Object.assign(Object.create(model),{layers:model.layers.map(l=>{const copy=Object.assign(Object.create(l),l,{frameData:new Map(l.frameData)});if(l.hairAnimation)copy.hairAnimation=JSON.parse(JSON.stringify(l.hairAnimation));return copy;})});
const source=H.setup(work,work.layers[model.layers.indexOf(original)]);
console.log('entry source:',source.name,'@',model.spriteSheets[source.sheetIndex].name);
const g=source.hairAnimation;
console.log('linked layers in work:',work.layers.filter(l=>l.hairAnimationId===g.id).map(l=>l.name+'@'+model.spriteSheets[l.sheetIndex].name).join(' | '));
// user picks scope + direction and edits params
const s=H.editSettings(g,'original32_idle',dir,scope,work.spriteSheets);
s.ampV=1;s.ampH=1;s.verticalMode='wave';
console.log('after edit dirOverrides:',Object.entries(g.directionOverrides||{}).map(([k,v])=>k+'(V'+v.ampV+'H'+v.ampH+')').join(', '));
// snapshot real project frames for linked layers
const snap=new Map();
for(const l of model.layers) if(l.hairAnimationId===g.id) for(const [k,v] of l.frameData) snap.set(l.name+'|'+k, Buffer.from(v.data.buffer.slice(v.data.byteOffset,v.data.byteOffset+v.data.length)));
let plan=null,err=null;
try{ plan=H.plan(work,source); }catch(e){ err=e.message; }
if(err) console.log('PLAN ERROR:',err);
if(plan){
  console.log('edits',plan.edits.length,'clipped',plan.clipped);
  const byKey=new Map(plan.edits.map(e=>[e.layer.name+'|'+e.key,e]));
  for(const l of model.layers){
    if(l.hairAnimationId!==g.id) continue;
    const si=model.spriteSheets.findIndex(s2=>s2.name===model.spriteSheets[l.sheetIndex].name);
    const sh=model.spriteSheets[l.sheetIndex];
    for(const [ai,a] of sh.actions.entries()){
      let changed=0;
      for(let fi=0;fi<a.frames.length;fi++){
        const key=model.getFrameKey(si,ai,fi);
        const e=byKey.get(l.name+'|'+key); if(!e) continue;
        const old=snap.get(l.name+'|'+key); const now=e.image.data;
        if(old.length!==now.length){changed++;continue;}
        let d=0; for(let i=0;i<now.length;i++) if(old[i]!==now[i]) d++;
        if(d>0) changed++;
      }
      console.log('  ',sh.name,a.direction,'framesChanged',changed+'/'+a.frames.length);
    }
  }
}
})();
