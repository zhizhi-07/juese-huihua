/* Render a project's sheet frames with the editor's layer ordering (PE.getRenderLayers). */
const fs=require('fs');
const path=require('path');
const {decodeToImageData,savePng,createCanvas}=require('./render-tools.cjs');

const projectPath=process.argv[2]||'output/main-before-twin.json';
const sheetIndex=Number(process.argv[3]??1);
const outDir=process.argv[4]||'output/twin-hair/before';
fs.mkdirSync(outDir,{recursive:true});

const p=JSON.parse(fs.readFileSync(projectPath,'utf8'));
const sheet=p.spriteSheets[sheetIndex];

const PART_RULES=require('./part-rules.cjs');
const classifyPart=PART_RULES.classifyPart;

function isLayerInAction(layer,si,ai){
  if(layer.isGroup) return false;
  if(layer.sheetIndex!==si) return false;
  const s=p.spriteSheets[si];
  if(!s) return false;
  const act=s.actions[ai];
  if(!act) return false;
  const keys=Object.keys(layer.frameData||{});
  if(!keys.length) return false;
  return keys.some(k=>k.startsWith(`${si}_${ai}_`));
}
function getRenderLayers(si,ai){
  const filtered=p.layers.filter(l=>isLayerInAction(l,si,ai));
  const layers=filtered.length===p.layers.length?p.layers:filtered;
  const isRear=l=>!l.isGroup&&(l.sheetIndex===undefined||l.sheetIndex===si)&&classifyPart(l.name)?.slot==='后发';
  if(p.spriteSheets[si]?.actions[ai]?.direction!=='up'){
    const rear=layers.filter(isRear),rest=layers.filter(l=>!isRear(l));
    let base=-1;
    for(let i=0;i<rest.length;i++){const l=rest[i];if(!l.isGroup&&/^(head|body|头部|身体)$/.test(l.name)&&(l.sheetIndex===undefined||l.sheetIndex===si))base=i;}
    if(!rear.length||base<0)return layers;
    rest.splice(base+1,0,...rear);return rest;
  }
  const isAccessory=l=>l.sheetIndex===si&&l.name.startsWith('发饰 /');
  return [...layers.filter(l=>!isRear(l)&&!isAccessory(l)),...layers.filter(isRear),...layers.filter(isAccessory)];
}

(async()=>{
  for(const l of p.layers){
    if(!l.frameData) continue;
    for(const [k,v] of Object.entries(l.frameData)){
      if(v&&v.dataURL){ v.__img=await decodeToImageData(v.dataURL); }
    }
  }
  const picks=process.argv[5]?process.argv[5].split(',').map(Number):null;
  for(let ai=0;ai<sheet.actions.length;ai++){
    const a=sheet.actions[ai];
    for(let fi=0;fi<a.frames.length;fi++){
      if(picks&&!picks.includes(fi)) continue;
      const frame=a.frames[fi];
      const c=createCanvas(frame.width,frame.height);
      const ctx=c.getContext('2d');
      for(const l of getRenderLayers(sheetIndex,ai)){
        if(!l.visible) continue;
        const key=`${sheetIndex}_${ai}_${fi}`;
        const fd=l.frameData&&l.frameData[key];
        if(!fd||!fd.__img) continue;
        ctx.globalAlpha=Math.max(0,Math.min(1,l.opacity??1));
        const tmp=createCanvas(fd.__img.width,fd.__img.height);
        tmp.getContext('2d').putImageData(fd.__img,0,0);
        ctx.drawImage(tmp,0,0);
      }
      ctx.globalAlpha=1;
      savePng(c,path.join(outDir,`${sheet.name}-${a.direction}-f${fi}.png`),10);
    }
  }
  console.log('done ->',outDir);
})();
