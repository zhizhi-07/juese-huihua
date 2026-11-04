/* Render the colored band of a screenshot as a color-aware ASCII map. */
const fs=require('fs');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
(async()=>{
  const file=process.argv[2];
  const y0=Number(process.argv[3]), y1=Number(process.argv[4]);
  const cols=Number(process.argv[5]||120);
  const img=await loadImage(fs.readFileSync(file));
  const c=createCanvas(img.width,img.height),x=c.getContext('2d');x.drawImage(img,0,0);
  const d=x.getImageData(0,0,img.width,img.height).data;
  const rows=y1-y0;
  for(let r=0;r<rows;r++){
    let line='';
    for(let q=0;q<cols;q++){
      const x0=Math.floor(q*img.width/cols), x1=Math.floor((q+1)*img.width/cols);
      const yy=y0+r;
      let best=null;
      for(let xx=x0;xx<x1;xx++){
        const i=(yy*img.width+xx)*4,r0=d[i],g=d[i+1],b=d[i+2];
        if(d[i+3]<40)continue;
        const mx=Math.max(r0,g,b),mn=Math.min(r0,g,b);
        const sat=mx?(mx-mn)/mx:0;
        if(sat>0.25&&(!best||sat>best.sat))best={r0,g,b,sat};
      }
      if(!best){line+=' ';continue;}
      const {r0,g,b}=best;
      if(r0>200&&g>200&&b>200)line+='W';
      else if(b>=r0&&b>=g)line+= b>140?'B':(b>70?'b':'#');
      else if(r0>=g&&r0>=b)line+= r0>140?'R':(r0>70?'r':'#');
      else line+= g>140?'G':'g';
    }
    console.log(line);
  }
})().catch(e=>console.error(e.message));
