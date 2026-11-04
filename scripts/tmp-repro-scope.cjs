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
const idle=model.spriteSheets[master.sheetIndex];
// Reproduce the dialog: scope = 全部动作+当前方向, action=待机, direction=正面(down)
const r=H.editSettings(g, idle.name,'down','direction',model.spriteSheets);
r.ampV=1;r.ampH=0;r.verticalMode='wave';
console.log('=== directionOverrides after edit');
for(const [k,v] of Object.entries(g.directionOverrides)) console.log('  ',k,'V'+v.ampV,'H'+v.ampH,'traj',!!v.trajectories, Object.keys(v.masks||{}));
// Instrument settingsFor
const origSettingsFor=H.settingsFor;
const used=[];
H.settingsFor=(gg,sheet,direction)=>{const v=origSettingsFor(gg,sheet,direction);used.push(sheet+'/'+direction+' -> V'+v.ampV+'H'+v.ampH);return v;};
const plan=H.plan(model,master);
H.settingsFor=origSettingsFor;
console.log('=== settings actually used in plan');
console.log([...new Set(used)].join('\n'));
// pixel comparison: plan with ampV=1 vs ampV=0 for each sheet/direction
const g2=JSON.parse(JSON.stringify(g));
const plan0=(()=>{const save=g.directionOverrides;g.directionOverrides={};const p=H.plan(model,master);g.directionOverrides=save;return p;})();
const keyOf=(layer,si,ai,fi)=>layer.name+'|'+model.getFrameKey(si,ai,fi);
const m1=new Map(plan.edits.map(e=>[keyOf(e.layer,model.layers.indexOf(e.layer),0,0),e]));
const m0=new Map(plan0.edits.map(e=>[e.layer.name+'|'+e.key,e]));
for(const l of model.layers){
  if(l.hairAnimationId!==g.id) continue;
  const si=l.sheetIndex,s=model.spriteSheets[si];
  for(const [ai,a] of s.actions.entries()){
    let changedFrames=0,maxDiff=0;
    for(let fi=0;fi<a.frames.length;fi++){
      const key=model.getFrameKey(si,ai,fi);
      const e1=plan.edits.find(e=>e.layer===l&&e.key===key);
      const e0=plan0.edits.find(e=>e.layer===l&&e.key===key);
      if(!e1||!e0) continue;
      const A=e1.image,B=e0.image;
      let d=0;
      if(A.width===B.width&&A.height===B.height){for(let i=0;i<A.data.length;i+=4) if(A.data[i]!==B.data[i]||A.data[i+3]!==B.data[i+3]) d++;}
      else d=999;
      if(d>0) changedFrames++;
      maxDiff=Math.max(maxDiff,d);
    }
    console.log(' ',s.name,a.direction,'framesChangedByAmpV:',changedFrames+'/'+a.frames.length,'maxDiffPx',maxDiff);
  }
}
})();
