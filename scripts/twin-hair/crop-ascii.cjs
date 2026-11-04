/* Crop a region of an image, upscale it, and print it as a color-coded ASCII grid. */
const fs=require('fs');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
(async()=>{
  const file=process.argv[2];
  const x0=Number(process.argv[3]), y0=Number(process.argv[4]), w=Number(process.argv[5]), h=Number(process.argv[6]);
  const cols=Number(process.argv[7]||100);
  const img=await loadImage(fs.readFileSync(file));
  const c=createCanvas(img.width,img.height),x=c.getContext('2d');x.drawImage(img,0,0);
  const d=x.getImageData(0,0,img.width,img.height).data;
  const rows=Math.max(1,Math.round(cols*h/w/2));
  console.log(`crop ${x0},${y0} ${w}x${h} -> ${cols}x${rows}`);
  for(let r=0;r<rows;r++){
    let line='';
    for(let q=0;q<cols;q++){
      const sx=x0+Math.floor(q*w/cols), ex=x0+Math.floor((q+1)*w/cols);
      const sy=y0+Math.floor(r*h/rows), ey=y0+Math.floor((r+1)*h/rows);
      let acc=[0,0,0],n=0;
      for(let yy=sy;yy<ey;yy++)for(let xx=sx;xx<ex;xx++){
        const i=(yy*img.width+xx)*4;
        if(d[i+3]<40)continue;
        acc[0]+=d[i];acc[1]+=d[i+1];acc[2]+=d[i+2];n++;
      }
      if(!n){line+=' ';continue;}
      const r0=acc[0]/n,g=acc[1]/n,b=acc[2]/n;
      const mx=Math.max(r0,g,b),mn=Math.min(r0,g,b),sat=mx?(mx-mn)/mx:0;
      if(sat<0.12){ line+= mx>235?' ':(mx>200?'.':(mx>150?'-':(mx>90?'+':'#'))); continue;}
      if(b>=r0&&b>=g)line+= b>150?'B':'b';
      else if(g>=r0)line+= g>150?'G':'g';
      else line+= r0>150?'R':'r';
    }
    console.log(line);
  }
})().catch(e=>console.error(e.message));
