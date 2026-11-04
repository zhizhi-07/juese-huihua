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
console.log('master',master.name,'enabled',master.hairAnimation.enabled);
const g=master.hairAnimation;
console.log('before dirOverrides',Object.keys(g.directionOverrides||{}));
// simulate: user picks action=idle, direction=down, scope=direction, and edits ampV
const H2=H;
const idleSheet=model.spriteSheets[master.sheetIndex];
const r=H2.editSettings(g, idleSheet.name, 'down', 'direction', model.spriteSheets);
r.ampV=0.6;r.ampH=0;
console.log('after  dirOverrides',Object.keys(g.directionOverrides||{}));
for(const k of Object.keys(g.directionOverrides)) console.log('   ',k,JSON.stringify({ampV:g.directionOverrides[k].ampV,ampH:g.directionOverrides[k].ampH}));
// now plan and see which frames change per sheet
const before=new Map();
for(const l of model.layers) if(l.hairAnimationId===g.id) for(const [k,v] of l.frameData) before.set(l.name+'|'+k, Buffer.from(v.data.buffer.slice(0)));
H2.applyPlan(H2.plan(model,master));
for(const l of model.layers) if(l.hairAnimationId===g.id) for(const [k,v] of l.frameData){
  const old=before.get(l.name+'|'+k); if(!old) continue;
  const now=Buffer.from(v.data.buffer.slice(0)); let diff=0; for(let i=0;i<now.length;i++) if(now[i]!==old[i]) diff++;
  const si=model.spriteSheets[l.sheetIndex].name;
  const parts=k.split('_'); 
  console.log('  changed?',si,k,'diffbytes',diff);
}
})();
