const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),png=require('../../scripts/png.cjs');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const dir=__dirname,hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const before=fs.readFileSync(path.join(dir,'reference-before.json')),meta=JSON.parse(fs.readFileSync(path.join(dir,'reference-meta.json'))),old=JSON.parse(before),p=structuredClone(old);
 assert.equal(hash(before),meta.sha256);
 const bytes=fs.readFileSync(path.join(dir,'out/sprites/地毯.png')),im=png.decode(bytes);assert.equal(im.width,32);assert.equal(im.height,24);
 let count=0;const colors=new Set();for(let i=0;i<im.data.length;i+=4){assert([0,255].includes(im.data[i+3]));if(im.data[i+3]){count++;colors.add('#'+Buffer.from(im.data.subarray(i,i+3)).toString('hex'));}}
 assert(count>400&&count<600);assert.equal(im.data[3],0);
 const url='data:image/png;base64,'+bytes.toString('base64'),si=p.spriteSheets.length;
 p.spriteSheets.push({name:'地毯 · 陶红菱纹 32×24',frameWidth:32,frameHeight:24,columns:1,rows:1,spacingX:0,spacingY:0,offsetX:0,offsetY:0,fps:8,imageDataURL:url,actions:[{name:'画面',direction:'none',frames:[{sheetIndex:si,sourceX:0,sourceY:0,width:32,height:24,locked:false,lockedRegions:[],status:'completed',duration:100,notes:'匹配当前便利店素材单像素风格：陶红毯面、米色包边、薄荷绿菱纹、两侧流苏；透明底。'}]}]});
 p.layers.push({sheetIndex:si,parent:null,name:'地毯 · 毯身包边与织纹',visible:true,locked:false,opacity:1,frameData:{[`${si}_0_0`]:{width:32,height:24,dataURL:url}}});
 p.currentSheetIndex=si;p.currentActionIndex=0;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.length-1;
 const restored=structuredClone(p);restored.spriteSheets.pop();restored.layers.pop();for(let k of ['currentSheetIndex','currentActionIndex','currentFrameIndex','currentLayerIndex'])restored[k]=old[k];assert.deepEqual(restored,old);
 fs.writeFileSync(path.join(dir,'candidate.json'),JSON.stringify(p));fs.copyFileSync(path.join(dir,'out/sprites/地毯.png'),path.join(dir,'地毯-32x24.png'));
 const image=await loadImage(bytes),c=createCanvas(384,288),ctx=c.getContext('2d');for(let y=0;y<288;y+=12)for(let x=0;x<384;x+=12){ctx.fillStyle=((x+y)/12)%2?'#e0ddd6':'#efede7';ctx.fillRect(x,y,12,12);}ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,384,288);fs.writeFileSync(path.join(dir,'地毯-预览.png'),c.toBuffer('image/png'));
 const verification={prepared:true,sourceId:meta.id,sourceETag:meta.etag,sourceSHA256:meta.sha256,appendedSheet:si,sheetCountBefore:old.spriteSheets.length,sheetCountAfter:p.spriteSheets.length,layerCountBefore:old.layers.length,layerCountAfter:p.layers.length,width:32,height:24,opaquePixels:count,colors:[...colors],allOldContentUnchanged:true,candidateSHA256:hash(fs.readFileSync(path.join(dir,'candidate.json')))};
 fs.writeFileSync(path.join(dir,'verification-prepared.json'),JSON.stringify(verification,null,2));console.log(JSON.stringify(verification));
})();
