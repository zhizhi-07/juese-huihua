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
const idleSI=model.spriteSheets.findIndex(s=>s.name==='original32_idle');
const candidates=model.layers.filter(l=>l.sheetIndex===idleSI&&!l.isGroup&&!l.locked&&!l.inheritedBase&&PE.classifyPart(l.name)?.category==='头发'&&(l.parent==null||l.hairAnimation));
console.log('idle sheet index',idleSI);
for(const l of candidates){
  const st=l.hairAnimation;
  console.log(' candidate:',JSON.stringify(l.name),'vis',l.visible,'linked',!!l.hairAnimationId,'master',!!st,
    st?('enabled='+st.enabled+' dirOverrideKeys='+Object.keys(st.directionOverrides||{}).length):'');
}
// pick the visible unlinked one named 前发 (typical user pick)
const pick=candidates.find(l=>l.name==='前发')||candidates.find(l=>l.visible)||candidates[0];
console.log('\nPICK:',pick.name);
// faithful chooseHair()
const work=Object.assign(Object.create(model),{layers:model.layers.map(l=>{const copy=Object.assign(Object.create(l),l,{frameData:new Map(l.frameData)});if(l.hairAnimation)copy.hairAnimation=JSON.parse(JSON.stringify(l.hairAnimation));return copy;})});
const source=H.setup(work,work.layers[model.layers.indexOf(pick)]);
console.log('setup ->',source.name,'@',model.spriteSheets[source.sheetIndex].name,'master?',!!source.hairAnimation);
const g=source.hairAnimation;
console.log('linked group:',work.layers.filter(l=>l.hairAnimationId===g.id).map(l=>l.name+'@'+model.spriteSheets[l.sheetIndex].name).join(' | '));
console.log('enabled',g.enabled,'live',g.live);

// simulate: scope=direction, action=待机, direction=正面(down), user types ampV=1.2
const actionSheet='original32_idle', dir='down';
const v=H.editSettings(g,actionSheet,dir,'direction',work.spriteSheets);
v.ampV=1.2;v.ampH=0;v.verticalMode='wave';
console.log('\ndirectionOverrides now:');
for(const [k,val] of Object.entries(g.directionOverrides||{})) console.log('   ',k,'V'+val.ampV,'H'+val.ampH);
const plan=H.plan(work,source);
console.log('edits',plan.edits.length,'clipped',plan.clipped);
const byKey=new Map(plan.edits.map(e=>[e.layer.name+'|'+e.key,e]));
// compare each generated image against the CURRENT stored frame of the same layer/key
for(const l of work.layers){
  if(l.hairAnimationId!==g.id) continue;
  const si=l.sheetIndex, sh=model.spriteSheets[si];
  for(const [ai,a] of sh.actions.entries()){
    const out=[];
    for(let fi=0;fi<a.frames.length;fi++){
      const key=model.getFrameKey(si,ai,fi);
      const e=byKey.get(l.name+'|'+key);
      if(!e){out.push(fi+':skip');continue;}
      const cur=l.getFrameData(key);
      const srcPx=e.image.data;
      let nonEmpty=0; for(let i=3;i<srcPx.length;i+=4) if(srcPx[i]) nonEmpty++;
      let diff=0;
      if(cur){const w=Math.min(cur.width,e.image.width),h=Math.min(cur.height,e.image.height);
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*cur.width+x)*4,j=(y*e.image.width+x)*4;if(cur.data[i+3]!==srcPx[j+3])diff++;}}
      out.push(fi+':px'+nonEmpty+'/d'+diff);
    }
    console.log('  ',sh.name,a.direction,out.join(' '));
  }
}
})();
