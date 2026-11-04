const fs=require('fs'),vm=require('vm');
const rt='C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
const {createCanvas,Image,ImageData}=require(rt+'@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;
global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}}),addEventListener(){}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
global.crypto=require('crypto').webcrypto;
for(const n of ['core','canvas','export','animation','hair-animation'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'));
const file=process.argv[2];
const AMPV=Number(process.argv[3]||1), AMPH=Number(process.argv[4]||1);
(async()=>{
const data=JSON.parse(fs.readFileSync(file,'utf8'));
const model=(await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project;
const H=PE.HairAnimation;
const master=model.layers.find(l=>l.hairAnimation);
const g=master.hairAnimation;
g.enabled=true;
const idle=model.spriteSheets[master.sheetIndex];
const r=H.editSettings(g, idle.name,'down','direction',model.spriteSheets);
r.ampV=AMPV;r.ampH=AMPH;r.verticalMode='wave';
console.log('dirOverrides:',Object.entries(g.directionOverrides).map(([k,v])=>k+':V'+v.ampV+'H'+v.ampH).join(' '));
// snapshot original frames of linked layers
const orig=new Map();
for(const l of model.layers) if(l.hairAnimationId===g.id) for(const [k,v] of l.frameData) orig.set(l.name+'|'+k, Buffer.from(v.data.buffer.slice(v.data.byteOffset,v.data.byteOffset+v.data.length)));
const plan=H.plan(model,master);
const byKey=new Map(plan.edits.map(e=>[e.layer.name+'|'+e.key,e]));
console.log('edits',plan.edits.length,'clipped',plan.clipped);
for(const l of model.layers){
  if(l.hairAnimationId!==g.id) continue;
  const si=model.spriteSheets.findIndex(s=>s.name===model.spriteSheets[l.sheetIndex].name);
  const s=model.spriteSheets[l.sheetIndex];
  for(const [ai,a] of s.actions.entries()){
    const out=[];
    for(let fi=0;fi<a.frames.length;fi++){
      const key=model.getFrameKey(si,ai,fi);
      const e=byKey.get(l.name+'|'+key);
      if(!e){out.push(fi+':BASE');continue;}
      const src=orig.get(l.name+'|'+key); const n=e.image.data;
      // compare alpha masks pixel by pixel in target space (ignore placement offsets)
      let diff=0;
      const pw=e.image.placement?e.image.placement.x:0, ph=e.image.placement?e.image.placement.y:0;
      const srcW=src.length/4>0?Math.sqrt(src.length/4):0;
      out.push(fi+':'+e.image.width+'x'+e.image.height+'p('+pw+','+ph+')');
    }
    console.log(' ',s.name,a.direction,out.join(' '));
  }
}
})();
