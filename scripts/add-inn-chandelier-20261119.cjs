const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),png=require('./png.cjs');
(async()=>{
const url='http://127.0.0.1:8765/api/project?id=scene-inn-20261119',res=await fetch(url),raw=await res.text();assert(res.ok);
const before=JSON.parse(raw),p=structuredClone(before),etag=res.headers.get('etag');
const out=path.resolve(__dirname,'../output/chandelier-'+Date.now());fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'before.json'),raw);fs.writeFileSync(path.join(out,'revision.json'),JSON.stringify({etag,sha256:crypto.createHash('sha256').update(raw).digest('hex')}));
const w=23,h=27,data=new Uint8Array(w*h*4);
const colors={D:'2f3b3d',S:'57483b',B:'9e7a36',G:'ba9745',L:'e0ac6c',H:'e8cd97',F:'e6dfa1',W:'ebf0ee'};
function rect(x,y,a,b,c){const rgb=Buffer.from(colors[c],'hex');for(let yy=y;yy<y+b;yy++)for(let xx=x;xx<x+a;xx++){assert(xx>=0&&xx<w&&yy>=0&&yy<h);data.set([...rgb,255],(yy*w+xx)*4);}}
// Stepped iron silhouette, matching the reference's central cup and two rising arms.
rect(8,0,7,2,'D');rect(10,2,3,3,'D');rect(11,1,1,4,'S');
rect(8,5,7,2,'D');rect(6,7,11,5,'D');rect(8,7,7,5,'B');rect(9,7,5,2,'H');rect(9,9,5,2,'L');rect(10,11,3,2,'G');
rect(8,12,2,7,'D');rect(13,12,2,7,'D');rect(10,12,3,11,'B');rect(11,12,1,8,'L');
for(const x of [2,18]){rect(x,12,3,3,'L');rect(x,12,2,2,'F');rect(x+1,12,1,1,'W');rect(x,15,3,4,'G');rect(x,15,2,3,'H');}
rect(0,17,2,2,'D');rect(4,17,2,2,'D');rect(17,17,2,2,'D');rect(21,17,2,2,'D');
rect(2,19,2,2,'D');rect(6,19,3,2,'D');rect(14,19,3,2,'D');rect(19,19,2,2,'D');
rect(4,21,2,2,'D');rect(17,21,2,2,'D');rect(6,23,4,2,'D');rect(13,23,4,2,'D');rect(10,25,3,2,'D');
rect(4,19,2,2,'H');rect(6,21,2,2,'H');rect(8,21,2,2,'B');
rect(17,19,2,2,'H');rect(15,21,2,2,'H');rect(13,21,2,2,'B');
rect(8,19,7,2,'G');rect(9,19,5,1,'H');rect(10,21,3,4,'G');rect(11,21,1,3,'H');
const palette=new Set(p.palette.map(c=>Buffer.from([c.r,c.g,c.b]).toString('hex')));for(let i=0;i<data.length;i+=4)if(data[i+3])assert(palette.has(Buffer.from(data.slice(i,i+3)).toString('hex')));
const image=png.encode(w,h,data),dataURL='data:image/png;base64,'+image.toString('base64'),si=p.spriteSheets.length,name='双烛黄铜吊灯';assert(!p.spriteSheets.some(s=>s.name===name));
p.spriteSheets.push({name,frameWidth:w,frameHeight:h,columns:1,rows:1,spacingX:0,spacingY:0,offsetX:0,offsetY:0,fps:8,imageDataURL:dataURL,actions:[{name,direction:'',frames:[{sheetIndex:si,sourceX:0,sourceY:0,width:w,height:h,locked:false,lockedRegions:[],status:'completed',duration:0,notes:''}]}]});
p.layers.push({sheetIndex:si,parent:null,name,visible:true,locked:false,opacity:1,frameData:{[`${si}_0_0`]:{width:w,height:h,dataURL}}});
Object.assign(p,{currentSheetIndex:si,currentActionIndex:0,currentFrameIndex:0,currentLayerIndex:p.layers.length-1});
assert.deepEqual(p.spriteSheets.slice(0,si),before.spriteSheets);assert.deepEqual(p.layers.slice(0,-1),before.layers);assert.deepEqual(p.sceneAssembly,before.sceneAssembly);
fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));fs.writeFileSync(path.join(out,'chandelier.png'),image);
const scale=12,preview=new Uint8Array(w*h*scale*scale*4);for(let y=0;y<h*scale;y++)for(let x=0;x<w*scale;x++){let src=(Math.floor(y/scale)*w+Math.floor(x/scale))*4,dst=(y*w*scale+x)*4;preview.set(data[src+3]?data.slice(src,src+4):[214,208,176,255],dst);}fs.writeFileSync(path.join(out,'preview.png'),png.encode(w*scale,h*scale,preview));
if(process.argv.includes('--save')){const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());const check=await(await fetch(url)).json();assert.deepEqual(check,p);fs.writeFileSync(path.join(out,'verified.json'),JSON.stringify(check));}
console.log(JSON.stringify({out,width:w,height:h,colors:Object.values(colors),saved:process.argv.includes('--save')}));
})().catch(e=>{console.error(e);process.exitCode=1;});
