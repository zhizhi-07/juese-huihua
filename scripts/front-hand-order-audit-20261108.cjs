// 前手置顶：只读审计。对比修改前后的绘制顺序，统计被衣服/眼睛/头发盖住的前手像素，并生成前后对照图。
const fs=require('fs'),path=require('path'),vm=require('vm');
const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;
const canvas=()=>{const c=createCanvas(1,1);c.style={};return c;};
global.document={createElement:canvas,addEventListener(){}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
global.JSZip=require('../js/vendor/jszip.min.js');
for(const n of ['core','canvas','export','animation','wardrobe'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../js',n+'.js'),'utf8'),{filename:n+'.js'});

// 修改前的绘制顺序（原样复制自备份里的 core.js，用于前后对照）。
const oldOrder=(project,sheetIndex,actionIndex)=>{
  const filtered=project.layers.filter(l=>PE.isLayerInAction(project,l,sheetIndex,actionIndex));
  const layers=filtered.length===project.layers.length?project.layers:filtered;
  const isRear=l=>!l.isGroup&&(l.sheetIndex===undefined||l.sheetIndex===sheetIndex)&&PE.classifyPart(l.name)?.slot==='后发';
  if(project.spriteSheets[sheetIndex]?.actions[actionIndex]?.direction!=='up'){
    const rear=layers.filter(isRear),rest=layers.filter(l=>!isRear(l));
    const base=rest.findLastIndex(l=>!l.isGroup&&/^(head|body|头部|身体)$/.test(l.name)&&(l.sheetIndex===undefined||l.sheetIndex===sheetIndex));
    if(!rear.length||base<0)return layers;
    rest.splice(base+1,0,...rear);return rest;
  }
  const isAccessory=l=>l.sheetIndex===sheetIndex&&l.name.startsWith('发饰 /');
  return [...layers.filter(l=>!isRear(l)&&!isAccessory(l)),...layers.filter(isRear),...layers.filter(isAccessory)];
};

const out=path.join(__dirname,'../output/front-hand-order-20261108');
fs.mkdirSync(out,{recursive:true});
const paint=(project,order,key,scale=3)=>{
  const frame=(()=>{const [si,ai,fi]=key.split('_').map(Number);return project.spriteSheets[si].actions[ai].frames[fi];})();
  const c=createCanvas(frame.width*scale,frame.height*scale),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
  for(const layer of order){
    if(!PE.isLayerVisible(project,layer,Number(key.split('_')[0]))||layer.opacity<=0)continue;
    const image=layer.getFrameData(key);if(!image)continue;
    ctx.globalAlpha=layer.opacity??1;PE.utils.drawImageData(ctx,image,0,0,scale);
  }
  return c;
};
async function audit(file){
  const raw=JSON.parse(fs.readFileSync(file,'utf8'));
  const project=await PE.Wardrobe.decode(raw);
  const report={file,sheets:[],frames:0,unchanged:0,changed:[],previouslyCoveredPixels:0,handPixelsNowTop:0,handCoveredAfterFix:0,totalHandPixels:0};
  const strips=[];
  for(let si=0;si<project.spriteSheets.length;si++){
    const sheet=project.spriteSheets[si];if(!PE.isCharacterSheet(sheet))continue;
    report.sheets.push({index:si,name:sheet.name,actions:sheet.actions.map(a=>a.direction)});
    for(let ai=0;ai<sheet.actions.length;ai++)for(let fi=0;fi<sheet.actions[ai].frames.length;fi++){
      const key=project.getFrameKey(si,ai,fi),before=paint(project,oldOrder(project,si,ai),key),after=paint(project,PE.getRenderLayers(project,si,ai),key);
      const b=before.getContext('2d').getImageData(0,0,before.width,before.height),a=after.getContext('2d').getImageData(0,0,after.width,after.height);
      const scale=before.width/sheet.actions[ai].frames[fi].width;
      let diff=0,covered=0;
      const hands=PE.getRenderLayers(project,si,ai).filter(l=>!l.isGroup&&PE.isFrontHandLayer(l)&&(l.sheetIndex===undefined||l.sheetIndex===si)&&PE.isLayerVisible(project,l,si));
      for(let p=0;p<a.data.length;p+=4){
        if(a.data[p]!==b.data[p]||a.data[p+1]!==b.data[p+1]||a.data[p+2]!==b.data[p+2]||a.data[p+3]!==b.data[p+3])diff++;
      }
      for(const layer of hands){
        const image=layer.getFrameData(key);if(!image)continue;
        const r=image.placement;
        if(r){report.skippedPlacement=(report.skippedPlacement||0)+1;continue;}
        for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
          const i=(y*image.width+x)*4;if(image.data[i+3]===0)continue;
          report.totalHandPixels++;
          const px=Math.floor(x*scale),py=Math.floor(y*scale),pi=(py*a.width+px)*4;
          const matches=Math.abs(a.data[pi]-image.data[i])<2&&Math.abs(a.data[pi+1]-image.data[i+1])<2&&Math.abs(a.data[pi+2]-image.data[i+2])<2;
          if(matches)report.handPixelsNowTop++;else report.handCoveredAfterFix++;
          const beforeMatches=Math.abs(b.data[pi]-image.data[i])<2&&Math.abs(b.data[pi+1]-image.data[i+1])<2&&Math.abs(b.data[pi+2]-image.data[i+2])<2;
          if(!beforeMatches)covered++;
        }
      }
      report.frames++;
      if(diff){report.changed.push({si,ai,fi,direction:sheet.actions[ai].direction,differentPixels:diff,handPixelsGainedToTop:covered});
        report.previouslyCoveredPixels+=covered;
        strips.push({label:`${sheet.name} ${sheet.actions[ai].direction} #${fi+1}`,before,after});
      }else report.unchanged++;
    }
  }
  const cols=strips.length?Math.min(4,strips.length):1;
  const w=Math.max(1,...strips.map(s=>s.after.width)),h=Math.max(1,...strips.map(s=>s.after.height));
  const rows=Math.ceil(strips.length/cols);
  const atlas=createCanvas(Math.max(1,cols*(w*2+24)),Math.max(1,rows*(h+34))),ctx=atlas.getContext('2d');
  ctx.fillStyle='#23262b';ctx.fillRect(0,0,atlas.width,atlas.height);ctx.imageSmoothingEnabled=false;
  strips.forEach((s,i)=>{
    const x=(i%cols)*(w*2+24),y=Math.floor(i/cols)*(h+34)+22;
    ctx.fillStyle='#8fb0d8';ctx.font='11px sans-serif';ctx.fillText(s.label,x,y-6);
    ctx.fillStyle='#3a3f46';ctx.fillRect(x,y,s.after.width,s.after.height);
    ctx.drawImage(s.before,x,y);ctx.fillStyle='#e6d9a2';ctx.fillRect(x+s.after.width+4,y,1,s.after.height);
    ctx.drawImage(s.after,x+s.after.width+8,y);
  });
  fs.writeFileSync(path.join(out,path.basename(file,'.json')+'-before-after.png'),atlas.toBuffer('image/png'));
  fs.writeFileSync(path.join(out,path.basename(file,'.json')+'-report.json'),JSON.stringify(report,null,2));
  return report;
}
(async()=>{
  const files=process.argv.slice(2);
  for(const file of files){
    const report=await audit(file);
    console.log(JSON.stringify({file:report.file,sheets:report.sheets.length,frames:report.frames,unchanged:report.unchanged,changedFrames:report.changed.length,previouslyCoveredPixels:report.previouslyCoveredPixels,handPixelsNowTop:report.handPixelsNowTop,handCoveredAfterFix:report.handCoveredAfterFix,totalHandPixels:report.totalHandPixels,skippedPlacement:report.skippedPlacement||0},null,2));
    for(const change of report.changed.slice(0,12))console.log('  ',JSON.stringify(change));
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
