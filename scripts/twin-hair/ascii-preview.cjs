/* Render an image as coarse ASCII so it can be inspected without a display. */
const fs=require('fs');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const chars=' .:-=+*#%@';
(async()=>{
  const file=process.argv[2];
  const cols=Number(process.argv[3]||100), rows=Number(process.argv[4]||40);
  const img=await loadImage(fs.readFileSync(file));
  const c=createCanvas(img.width,img.height),x=c.getContext('2d');
  x.drawImage(img,0,0);
  const d=x.getImageData(0,0,img.width,img.height).data;
  for(let r=0;r<rows;r++){
    let line='';
    for(let q=0;q<cols;q++){
      const x0=Math.floor(q*img.width/cols), x1=Math.floor((q+1)*img.width/cols);
      const y0=Math.floor(r*img.height/rows), y1=Math.floor((r+1)*img.height/rows);
      let sum=0,n=0;
      for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++){const i=(yy*img.width+xx)*4;sum+=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];n++;}
      const lum=n?sum/n:255;
      line+=chars[Math.min(chars.length-1,Math.floor((255-lum)/256*chars.length))];
    }
    console.log(line);
  }
})().catch(e=>{console.error(e.message)});
