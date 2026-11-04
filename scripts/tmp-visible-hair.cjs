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
const hairRe=/前发|后发|刘海|双马尾|披发/;
for(const si of [7,8,9,10,11]){
 const s=model.spriteSheets[si];
 for(const [ai,a] of s.actions.entries()){
  if(a.direction!=='down') continue;
  const key=model.getFrameKey(si,ai,0);
  const vis=model.layers.filter(l=>!l.isGroup&&l.sheetIndex===si&&l.visible);
  const hairVis=vis.filter(l=>hairRe.test(l.name));
  const combVis=vis.filter(l=>/衣服与发型/.test(l.name));
  // does the combined layer contain hair-ish pixels overlapping the separate hair layers?
  let overlap=0,hairPx=0;
  const cvs=createCanvas(64,64),ctx=cvs.getContext('2d');
  for(const l of combVis){const im=l.getFrameData(key);if(im)PE.utils.drawImageData(ctx,im);}
  const comb=ctx.getImageData(0,0,64,64).data;
  const cvs2=createCanvas(64,64),ctx2=cvs2.getContext('2d');
  for(const l of hairVis){const im=l.getFrameData(key);if(im)PE.utils.drawImageData(ctx2,im);}
  const sep=ctx2.getImageData(0,0,64,64).data;
  for(let i=0;i<64*64;i++){const j=i*4;if(sep[j+3])hairPx++;if(sep[j+3]&&comb[j+3])overlap++;}
  console.log(s.name,a.direction,'visible hair layers:',hairVis.map(l=>l.name).join(' | ')||'(none)','| combined:',combVis.map(l=>l.name).join('|')||'(none)','| separateHairPx',hairPx,'overlapWithCombined',overlap);
 }
}
})();
