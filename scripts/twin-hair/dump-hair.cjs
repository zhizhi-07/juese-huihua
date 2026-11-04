/* Dump hair layer colors and render composite previews to a temp dir (ASCII path). */
const fs=require('fs'),path=require('path');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
const vm=require('vm');
for(const n of ['core','canvas','export'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'),{filename:n});

const OUT='C:/Users/Administrator/AppData/Local/Temp/twinhair';
fs.mkdirSync(OUT,{recursive:true});

function hex(r,g,b){return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();}
function colorsOf(im){
  const c=createCanvas(im.width,im.height);PE.utils.drawImageData(c.getContext('2d'),im);
  const d=c.getContext('2d').getImageData(0,0,im.width,im.height).data,m=new Map();
  for(let i=0;i<d.length;i+=4)if(d[i+3]>=40){const k=hex(d[i],d[i+1],d[i+2]);m.set(k,(m.get(k)||0)+1);}
  return [...m.entries()].sort((a,b)=>b[1]-a[1]);
}
(async()=>{
  const file=process.argv[2]||'output/main-before-twin.json';
  const p=(await new PE.ExportManager().importProject(new Blob([fs.readFileSync(file)]))).project;
  console.log('=== hair layer colors (first frame of each sheet/action) ===');
  for(const [si,s] of p.spriteSheets.entries()){
    for(const [ai,a] of s.actions.entries()){
      const key=p.getFrameKey(si,ai,0);
      const hair=p.layers.filter(l=>!l.isGroup&&/头发|发饰/.test(l.name)&&l.sheetIndex===si&&l.getFrameData(key));
      if(!hair.length)continue;
      console.log(`${s.name}/${a.direction}`);
      for(const l of hair){
        const im=l.getFrameData(key);
        console.log('   ',JSON.stringify(l.name),'vis='+l.visible,'anim='+(l.hairAnimationId?'y':'n'),colorsOf(im).map(([k,v])=>k+'x'+v).join(' '));
      }
    }
  }
  // Render previews
  for(const [si,s] of p.spriteSheets.entries()){
    for(const [ai,a] of s.actions.entries()){
      for(let fi=0;fi<a.frames.length;fi++){
        const key=p.getFrameKey(si,ai,fi);
        const c=createCanvas(a.frames[fi].width,a.frames[fi].height),ctx=c.getContext('2d');
        for(const l of PE.getRenderLayers(p,si,ai)){
          if(!PE.isLayerVisible(p,l,si))continue;
          const im=l.getFrameData(key);if(!im)continue;
          PE.utils.drawImageData(ctx,im,0,0);
        }
        const sc=8,out=createCanvas(c.width*sc,c.height*sc),octx=out.getContext('2d');
        octx.imageSmoothingEnabled=false;
        octx.fillStyle='#b8c8c3';octx.fillRect(0,0,out.width,out.height);
        octx.drawImage(c,0,0,out.width,out.height);
        fs.writeFileSync(path.join(OUT,`${s.name}-${a.direction}-${fi}.png`),out.toBuffer('image/png'));
      }
    }
  }
  console.log('previews ->',OUT);
})().catch(e=>{console.error(e);process.exitCode=1});
