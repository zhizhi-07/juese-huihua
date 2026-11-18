const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),png=require('../../scripts/png.cjs');
const dir=__dirname,url='http://127.0.0.1:8765/api/project?id=scene-e4150351-9254-4d4a-9fad-513ececc9cc0';
const before=JSON.parse(fs.readFileSync(path.join(dir,'before.json'))),p=structuredClone(before),source=before.layers[4];
assert.equal(source.name,'柜台与立柱');assert.equal(source.parent,3);assert.equal(before.layers[3].name,'摊位主体');
assert.deepEqual(Object.keys(source.frameData),['0_0_0']);
const cel=source.frameData['0_0_0'];assert(!cel.placement);const im=png.decode(Buffer.from(cel.dataURL.split(',')[1],'base64'));assert.equal(im.width,64);assert.equal(im.height,64);
const parts=Array.from({length:3},()=>new Uint8Array(im.data.length)),counts=[0,0,0];
for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4;if(!im.data[i+3])continue;
  // Keep the counter outline in front; only the window/fascia's dark pixels are backdrop.
  const rear=y<=29||(y<=38&&x>=18&&x<=55);
  const post=y>=30&&y<=41&&((x>=15&&x<=17)||(x>=56&&x<=58));
  const part=rear?0:post?1:2;parts[part].set(im.data.subarray(i,i+4),i);counts[part]++;
}
const names=['黑色内景 · 后层','立柱框架 · 中层','柜台前沿 · 前层'];
const layers=parts.map((data,i)=>{assert(counts[i]>0);const bytes=png.encode(64,64,data);fs.writeFileSync(path.join(dir,names[i]+'.png'),bytes);const l=structuredClone(source);l.name=names[i];l.frameData['0_0_0']={...cel,dataURL:'data:image/png;base64,'+bytes.toString('base64')};return l});
const reunited=new Uint8Array(im.data.length);for(let i=0;i<im.data.length;i+=4){let n=0;for(const data of parts)if(data[i+3]){n++;reunited.set(data.subarray(i,i+4),i)}assert(n<=1)}assert.deepEqual(reunited,im.data,'Split changed the user drawing');
p.layers.splice(4,1,...layers);
for(let i=7;i<p.layers.length;i++){const l=p.layers[i];if(l.parent>=5)l.parent+=2;if(i===7){assert.equal(l.name,'侧边垃圾桶');assert.equal(l.visible,false);l.parent=null;l.depth=0}}
if(p.currentLayerIndex>=5)p.currentLayerIndex+=2;
assert.equal(p.layers.filter(l=>l.parent===3).length,3);
for(let old=0;old<before.layers.length;old++){if(old===4)continue;const next=structuredClone(p.layers[old<4?old:old+2]),expected=structuredClone(before.layers[old]);if(old===5){expected.parent=null;expected.depth=0}else if(expected.parent>=5)expected.parent+=2;assert.deepEqual(next,expected,`Unexpected change to old layer ${old}`)}
for(const k of Object.keys(before))if(!['layers','currentLayerIndex'].includes(k))assert.deepEqual(p[k],before[k],k);
function composite(project){const data=new Uint8Array(64*64*4);for(const l of project.layers){if(l.isGroup||!l.visible||l.parent!=null&&!project.layers[l.parent].visible)continue;const c=l.frameData['0_0_0'];if(!c)continue;assert(!c.placement);const a=png.decode(Buffer.from(c.dataURL.split(',')[1],'base64'));for(let i=0;i<data.length;i+=4)if(a.data[i+3]){assert.equal(a.data[i+3],255);assert.equal(l.opacity,1);data.set(a.data.subarray(i,i+4),i)}}return data}
const combined=composite(p);assert.deepEqual(combined,composite(before),'Scene appearance changed');
const bytes=Buffer.from(JSON.stringify(p));fs.writeFileSync(path.join(dir,'candidate.json'),bytes);
function preview(data,w,h){const out=new Uint8Array(w*8*h*8*4);for(let y=0;y<h*8;y++)for(let x=0;x<w*8;x++){const i=(Math.floor(y/8)*w+Math.floor(x/8))*4;out.set(data[i+3]?data.subarray(i,i+4):[238,238,238,255],(y*w*8+x)*4)}return png.encode(w*8,h*8,out)}
fs.writeFileSync(path.join(dir,'preview.png'),preview(combined,64,64));
const sheet=new Uint8Array(64*3*64*4);for(let k=0;k<3;k++)for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4;sheet.set(parts[k].subarray(i,i+4),(y*192+k*64+x)*4)}fs.writeFileSync(path.join(dir,'三层拆分预览.png'),preview(sheet,192,64));
async function main(){if(!process.argv.includes('--save'))return console.log({prepared:true,threeLayers:names,pixels:counts,bodyPixelExact:true,scenePixelExact:true});
 const put=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':fs.readFileSync(path.join(dir,'before-etag.txt'),'utf8')},body:bytes});fs.writeFileSync(path.join(dir,'put-response.txt'),put.status+'\n'+await put.text());assert.equal(put.status,200,'Conflict: stop; do not blindly retry');
 const get=await fetch(url);assert.equal(get.status,200);const saved=Buffer.from(await get.arrayBuffer());fs.writeFileSync(path.join(dir,'after.json'),saved);fs.writeFileSync(path.join(dir,'after-etag.txt'),get.headers.get('etag'));assert.deepEqual(JSON.parse(saved),p);assert.deepEqual(composite(JSON.parse(saved)),combined);
 const report={put:200,get:200,bodyLayers:names,pixelCounts:counts,bodyCompositeUnchanged:true,sceneCompositeUnchanged:true,otherArtworkUnchanged:true,userVisibilityAndMetadataPreserved:true,noPersonAdded:true,beforeSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,'before.json'))).digest('hex'),afterSha256:crypto.createHash('sha256').update(saved).digest('hex')};fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2));console.log(report)}
main().catch(e=>{console.error(e);process.exitCode=1});
