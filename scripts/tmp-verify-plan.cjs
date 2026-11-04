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
const master=model.layers.find(l=>l.hairAnimation&&l.name.includes('后发'));
const g=master.hairAnimation;
console.log('master',master.name,'enabled',g.enabled,'live',g.live);
// stored frames vs freshly planned frames, per sheet/direction
const plan=H.plan(model,master);
const byKey=new Map(plan.edits.map(e=>[e.layer.name+'|'+e.key,e]));
for(const l of model.layers){
  if(l.hairAnimationId!==g.id) continue;
  const si=l.sheetIndex, sh=model.spriteSheets[si];
  for(const [ai,a] of sh.actions.entries()){
    const rows=[];
    for(let fi=0;fi<a.frames.length;fi++){
      const key=model.getFrameKey(si,ai,fi);
      const stored=l.getFrameData(key);
      const e=byKey.get(l.name+'|'+key);
      if(!e){rows.push(fi+':BASE');continue;}
      const A=e.image,B=stored;
      if(!B){rows.push(fi+':new');continue;}
      const w=Math.min(A.width,B.width),h=Math.min(A.height,B.height);
      let d=0; for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*B.width+x)*4,j=(y*A.width+x)*4;if(A.data[j+3]!==B.data[i+3])d++;}
      rows.push(fi+':d'+d);
    }
    console.log('  ',sh.name,a.direction,'vis='+l.visible,rows.join(' '));
  }
}
})();
