/* Analyze head anchor per frame so the twin tails can be aligned to each frame. */
const fs=require('fs');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
const vm=require('vm');
for(const n of ['core','canvas','export'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'),{filename:n});

function bounds(data,w,h){
  let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]){if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y;}
  return x1<0?null:{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};
}
(async()=>{
  const file=process.argv[2]||'output/main-before-twin.json';
  const p=(await new PE.ExportManager().importProject(new Blob([fs.readFileSync(file)]))).project;
  for(const [si,s] of p.spriteSheets.entries()){
    for(const [ai,a] of s.actions.entries()){
      const rows=[];
      for(let fi=0;fi<a.frames.length;fi++){
        const key=p.getFrameKey(si,ai,fi);
        const head=p.layers.find(l=>l.name==='head'&&l.sheetIndex===si&&l.getFrameData(key));
        const front=p.layers.find(l=>l.name==='头发 / 初始 / 前发'&&l.sheetIndex===si&&l.getFrameData(key));
        const body=p.layers.find(l=>l.name==='body'&&l.sheetIndex===si&&l.getFrameData(key));
        const cloth=p.layers.find(l=>l.name==='服装 / 衣服'&&l.sheetIndex===si&&l.getFrameData(key));
        const eyes=p.layers.find(l=>l.name==='眼睛'&&l.sheetIndex===si&&l.getFrameData(key));
        const info=im=>{if(!im)return null;const c=createCanvas(im.width,im.height);PE.utils.drawImageData(c.getContext('2d'),im);return bounds(c.getContext('2d').getImageData(0,0,im.width,im.height).data,im.width,im.height);};
        rows.push({fi,frame:a.frames[fi].width+'x'+a.frames[fi].height,head:info(head?.getFrameData(key)),front:info(front?.getFrameData(key)),body:info(body?.getFrameData(key)),cloth:!!cloth?.getFrameData(key),eyes:!!eyes?.getFrameData(key)});
      }
      console.log(`${s.name} / ${a.direction}`);
      for(const r of rows)console.log('  ',JSON.stringify(r));
    }
  }
})().catch(e=>{console.error(e);process.exitCode=1});
