const fs = require('fs'), assert = require('assert'), png = require('../../scripts/png.cjs');
const dir = __dirname, W = 18, H = 29;
const before = JSON.parse(fs.readFileSync(dir + '/before-shutdown.json'));
const candidate = structuredClone(before), index = before.spriteSheets.findIndex(s => s.name === '壁炉');
assert(index >= 0);
const sheet = candidate.spriteSheets[index];
const bodyLayer = candidate.layers.find(l => l.sheetIndex === index && l.name === '炉体');
const fireLayer = candidate.layers.find(l => l.sheetIndex === index && l.name === '火焰');
assert(bodyLayer && fireLayer);
const decode = url => png.decode(Buffer.from(url.split(',')[1], 'base64'));
const uri = data => 'data:image/png;base64,' + png.encode(W, H, data).toString('base64');
const bodyURL = bodyLayer.frameData[index + '_0_0'].dataURL;
const body = Buffer.from(decode(bodyURL).data), source = Buffer.from(decode(fireLayer.frameData[index + '_0_0'].dataURL).data);
const colors = fs.readFileSync(dir + '/../inn-fireplace-20261119/otterisk-96.hex', 'utf8').trim().split(/\s+/);
const allowed = new Set(colors);
const sizes = [[10,7],[8,6],[6,5],[4,3],[2,2],[1,1],[0,0]], delays = [120,120,140,140,160,160,400];
const off = sizes.map(([w,h], frame) => {
  if (!frame) return Buffer.from(source);
  const result = Buffer.alloc(W * H * 4), left = Math.round(8.5 - (w - 1) / 2), top = 27 - h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = 4 + Math.min(9, Math.floor((x + 0.5) * 10 / w));
    const sy = 20 + Math.min(6, Math.floor((y + 0.5) * 7 / h));
    const src = (sy * W + sx) * 4, dst = ((top + y) * W + left + x) * 4;
    source.copy(result, dst, src, src + 4);
  }
  if (frame === 4) {
    result.fill(0);
    for (const [x,y,c] of [[9,25,'d48d57'],[8,26,'8a3c24'],[9,26,'d48d57']]) result.set([...c.match(/../g).map(n => parseInt(n,16)),255], (y * W + x) * 4);
  }
  if (frame === 5) result.set([138,60,36,255], (26 * W + 9) * 4);
  return result;
});
const count = p => { let n = 0; for (let i = 3; i < p.length; i += 4) if (p[i]) n++; return n; };
const counts = off.map(count);
assert.deepStrictEqual(off[0], source);
assert(off.at(-1).every(value => value === 0));
assert(counts.every((n,i) => !i || n < counts[i-1]));
for (const pixels of off) for (let i = 0; i < pixels.length; i += 4) if (pixels[i+3]) {
  assert(allowed.has(pixels.subarray(i,i+3).toString('hex')));
  assert.equal(body.subarray(i,i+3).toString('hex'), '5c4644');
}
const on = sheet.actions[0].frames.map((_, i) => Buffer.from(decode(fireLayer.frameData[index + '_0_' + i].dataURL).data));
const originalOffFrame = structuredClone(sheet.actions[1].frames[0]);
sheet.actions[1].frames = off.map((_, i) => ({...structuredClone(originalOffFrame),sourceX:(on.length+i)*W,sourceY:0,duration:delays[i]}));
sheet.columns = on.length + off.length; sheet.rows = 1;
off.forEach((pixels,i) => {
  const key = index + '_1_' + i;
  bodyLayer.frameData[key] = {width:W,height:H,dataURL:bodyURL};
  fireLayer.frameData[key] = {width:W,height:H,dataURL:i ? uri(pixels) : fireLayer.frameData[index + '_0_0'].dataURL};
});
const composite = fire => {
  const result = Buffer.from(body);
  for (let i = 0; i < fire.length; i += 4) if (fire[i+3]) fire.copy(result,i,i,i+4);
  return result;
};
const offComposite = off.map(composite), all = [...on,...off].map(composite);
const atlasW = W * all.length, atlas = Buffer.alloc(atlasW * H * 4);
all.forEach((frame,i) => { for (let y=0;y<H;y++) frame.copy(atlas,(y*atlasW+i*W)*4,y*W*4,(y+1)*W*4); });
sheet.imageDataURL = 'data:image/png;base64,' + png.encode(atlasW,H,atlas).toString('base64');
assert.deepStrictEqual(sheet.actions[0], before.spriteSheets[index].actions[0]);
for (const key of Object.keys(before.layers.find(l=>l.sheetIndex===index&&l.name==='炉体').frameData)) assert.deepStrictEqual(bodyLayer.frameData[key],before.layers.find(l=>l.sheetIndex===index&&l.name==='炉体').frameData[key]);
for (let i=0;i<on.length;i++) assert.deepStrictEqual(fireLayer.frameData[index+'_0_'+i],before.layers.find(l=>l.sheetIndex===index&&l.name==='火焰').frameData[index+'_0_'+i]);
assert.deepStrictEqual(candidate.spriteSheets.filter((_,i)=>i!==index),before.spriteSheets.filter((_,i)=>i!==index));
assert.deepStrictEqual(candidate.layers.filter(l=>l.sheetIndex!==index),before.layers.filter(l=>l.sheetIndex!==index));
function scaled(pixels,w,h,scale) {
  const data=Buffer.alloc(w*h*scale*scale*4);
  for(let y=0;y<h*scale;y++)for(let x=0;x<w*scale;x++){const src=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;pixels.copy(data,(y*w*scale+x)*4,src,src+4);}
  return png.encode(w*scale,h*scale,data);
}
const strip=Buffer.alloc(W*off.length*H*4);
offComposite.forEach((frame,i)=>{for(let y=0;y<H;y++)frame.copy(strip,(y*W*off.length+i*W)*4,y*W*4,(y+1)*W*4);});
fs.writeFileSync(dir+'/shutdown-frames.png',scaled(strip,W*off.length,H,10));
fs.writeFileSync(dir+'/shutdown-atlas.png',png.encode(atlasW,H,atlas));
fs.writeFileSync(dir+'/candidate.json',JSON.stringify(candidate));
// Reset the GIF dictionary before its code width grows; the preview keeps the exact palette.
const scale=12, gifW=W*scale, gifH=H*scale, palette=Buffer.alloc(128*3);
colors.forEach((color,i)=>palette.set(color.match(/../g).map(n=>parseInt(n,16)),(i+1)*3));
const colorIndices=new Map(colors.map((color,i)=>[color,i+1]));
const word=n=>Buffer.from([n&255,n>>8]);
const chunks=[Buffer.from('GIF89a'),word(gifW),word(gifH),Buffer.from([0xf6,0,0]),palette,Buffer.from('21ff0b4e45545343415045322e300301000000','hex')];
offComposite.forEach((pixels,frame)=>{
  const indices=[];
  for(let y=0;y<gifH;y++)for(let x=0;x<gifW;x++){const p=(Math.floor(y/scale)*W+Math.floor(x/scale))*4;indices.push(pixels[p+3]?colorIndices.get(pixels.subarray(p,p+3).toString('hex')):0);}
  assert(indices.every(n=>Number.isInteger(n)));
  const codes=[];for(let i=0;i<indices.length;i+=120)codes.push(128,...indices.slice(i,i+120));codes.push(129);
  chunks.push(Buffer.from([0x21,0xf9,4,9]),word(frame===0?55:frame===off.length-1?100:delays[frame]/10),Buffer.from([0,0,0x2c]),word(0),word(0),word(gifW),word(gifH),Buffer.from([0,7]));
  const data=Buffer.from(codes);for(let i=0;i<data.length;i+=255)chunks.push(Buffer.from([Math.min(255,data.length-i)]),data.subarray(i,i+255));chunks.push(Buffer.from([0]));
});
chunks.push(Buffer.from([0x3b]));
fs.writeFileSync(dir+'/关火预览.gif',Buffer.concat(chunks));
fs.writeFileSync(dir+'/validation.json',JSON.stringify({onlyAsset:'壁炉',onFramesUnchanged:true,bodyUnchanged:true,shutdownFrames:off.length,firePixels:counts,delaysMs:delays,allColorsInOtterisk96:true,otherAssetsUnchanged:true,previewLoopsForReview:true},null,2));
console.log(JSON.stringify({shutdownFrames:off.length,firePixels:counts}));
