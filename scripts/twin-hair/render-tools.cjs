/* Helper: decode a project's layers and render PNGs for inspection. */
const fs=require('fs');
const {createCanvas,ImageData,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

function decodeDataUrl(dataURL){
  const b64=dataURL.split(',')[1];
  const buf=Buffer.from(b64,'base64');
  return buf;
}
async function decodeToImageData(dataURL){
  const img=await loadImage(decodeDataUrl(dataURL));
  const c=createCanvas(img.width,img.height);
  const ctx=c.getContext('2d');
  ctx.drawImage(img,0,0);
  return ctx.getImageData(0,0,img.width,img.height);
}
function savePng(canvas,file,scale=1){
  const out=createCanvas(canvas.width*scale,canvas.height*scale);
  const ctx=out.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#b8c8c3';
  ctx.fillRect(0,0,out.width,out.height);
  ctx.drawImage(canvas,0,0,out.width,out.height);
  fs.writeFileSync(file,out.toBuffer('image/png'));
}
module.exports={decodeDataUrl,decodeToImageData,savePng,createCanvas,ImageData,loadImage};
