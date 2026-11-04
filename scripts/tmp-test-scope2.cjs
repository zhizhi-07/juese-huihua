const fs=require('fs'),vm=require('vm');
const rt='C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
const {createCanvas,Image,ImageData}=require(rt+'@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;
global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}}),addEventListener(){}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
global.crypto=require('crypto').webcrypto;
for(const n of ['core','canvas','export','animation','hair-animation'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'));
const file=process.argv[2];
(async()=>{
const data=JSON.parse(fs.readFileSync(file,'utf8'));
const model=(await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project;
const H=PE.HairAnimation;
const master=model.layers.find(l=>l.hairAnimation);
const g=master.hairAnimation;
g.enabled=true;
// find the layer for each sheet
const bySheet=new Map();
for(const l of model.layers) if(l.hairAnimationId===g.id) bySheet.set(model.spriteSheets[l.sheetIndex].name,l);
console.log('layers:',[...bySheet.keys()].join(','));
const idle=model.spriteSheets[master.sheetIndex];
// report offsets present
console.log('offsets sample:',Object.keys(g.offsets).filter(k=>k.includes('/down/')).slice(0,12).map(k=>k+'='+JSON.stringify(g.offsets[k])).join(' '));
// simulate scope=direction on idle/down
const r=H.editSettings(g, idle.name,'down','direction',model.spriteSheets);
r.ampV=0.6;r.ampH=0;
console.log('dirOverrides:',Object.entries(g.directionOverrides).map(([k,v])=>k+':V'+v.ampV+'H'+v.ampH).join(' '));
const plan=H.plan(model,master);
console.log('edits:',plan.edits.length,'clipped',plan.clipped);
// per sheet/direction: does the produced image differ from the untouched source?
const byKey=new Map(plan.edits.map(e=>[e.layer.name+'|'+e.key,e]));
for(const [name,l] of bySheet){
  const si=model.spriteSheets.findIndex(s=>s.name===name);
  const s=model.spriteSheets[si];
  for(const [ai,a] of s.actions.entries()){
    const key0=model.getFrameKey(si,ai,0);
    const e=byKey.get(l.name+'|'+key0);
    let moved='(base frame not regenerated)';
    if(e){ const src=l.getFrameData(key0); const n=e.image;
      let diff=0; const w=Math.min(src.width,n.width);
      for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){const i=(y*src.width+x)*4,j=(y*n.width+x)*4;if(i+3<src.data.length&&(src.data[i+3]!==n.data[j+3]||src.data[i]!==n.data[j]))diff++;}
      moved='diffpx='+diff;
    }
    console.log(' ',name,a.direction,'f0',moved);
  }
}
})();
