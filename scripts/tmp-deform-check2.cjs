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
const master=model.layers.find(l=>l.hairAnimation&&l.name.includes('2 / 后发'));
const g=master.hairAnimation;
const idleSI=master.sheetIndex;
const si=model.spriteSheets.findIndex(s=>s.name==='original32_walk');
const l=model.layers.find(x=>x.hairAnimationId===g.id&&x.sheetIndex===si);
const ai=model.spriteSheets[si].actions.findIndex(a=>a.direction==='down');
const key=model.getFrameKey(si,ai,2);
const stored=l.getFrameData(key);
const src=master.getFrameData(model.getFrameKey(idleSI, model.spriteSheets[idleSI].actions.findIndex(a=>a.direction==='down'), 0));
const offset=g.offsets[H.address(model.spriteSheets[si],'down',2)];
for(const [ampV,ampH] of [[0,2],[1,1],[2,2],[0.5,0]]){
  const settings={ampV,ampH,cycles:1,lag:0.6,verticalMode:'wave',masks:{},protectedMasks:{},trajAmp:0.1,trajectories:{},stitch:{}};
  const res=H.deform(src, model.spriteSheets[si].actions[ai].frames[2], offset, Math.PI*2*2/8, settings, null, true);
  let d=0; const A=res.image,B=stored;
  for(let i=0;i<Math.min(A.data.length,B.data.length);i+=4) if(A.data[i]!==B.data[i]||A.data[i+3]!==B.data[i+3]) d++;
  console.log('ampV',ampV,'ampH',ampH,'diffVsStored',d,'size',res.image.width+'x'+res.image.height);
}
})();
