/* Render a region 1:1 as a color-exact ASCII map (one char per pixel). */
const fs=require('fs');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
(async()=>{
  const file=process.argv[2];
  const x0=Number(process.argv[3]), y0=Number(process.argv[4]), w=Number(process.argv[5]), h=Number(process.argv[6]);
  const img=await loadImage(fs.readFileSync(file));
  const c=createCanvas(img.width,img.height),x=c.getContext('2d');x.drawImage(img,0,0);
  const d=x.getImageData(0,0,img.width,img.height).data;
  const palette=new Map();
  const label=(r,g,b)=>{
    const k=`${r},${g},${b}`;
    if(!palette.has(k))palette.set(k,'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'[palette.size]);
    return palette.get(k);
  };
  for(let y=y0;y<y0+h;y++){
    let line='';
    for(let xx=x0;xx<x0+w;xx++){
      const i=(y*img.width+xx)*4;
      if(d[i+3]<40){line+='.';continue;}
      line+=label(d[i],d[i+1],d[i+2]);
    }
    console.log(String(y).padStart(4)+' '+line);
  }
  console.log('palette:');
  for(const [k,v] of palette)console.log('  ',v,k);
})().catch(e=>console.error(e.message));
