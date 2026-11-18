const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),png=require('../../scripts/png.cjs');
const dir=__dirname,url='http://127.0.0.1:8765/api/project?id=scene-e4150351-9254-4d4a-9fad-513ececc9cc0';
const before=JSON.parse(fs.readFileSync(path.join(dir,'before.json'))),p=structuredClone(before);
assert.equal(p.layers[4].name,'黑色内景 · 后层');assert.equal(p.layers[5].name,'立柱框架 · 中层');
const decode=l=>png.decode(Buffer.from(l.frameData['0_0_0'].dataURL.split(',')[1],'base64')).data;
const beam=decode(before.layers[4]),posts=decode(before.layers[5]),frame=new Uint8Array(posts);
for(let i=0;i<frame.length;i+=4)if(beam[i+3]){assert.equal(frame[i+3],0);frame.set(beam.subarray(i,i+4),i)}
const origin=JSON.parse(fs.readFileSync(path.join(dir,'../stall-20261118/after.json'))),curtainSource=origin.layers.find(l=>l.name==='后墙与窗洞');assert(curtainSource);
const original=decode(curtainSource),curtain=new Uint8Array(original.length);
for(let y=30;y<=38;y++)for(let x=18;x<=55;x++){const i=(y*64+x)*4;assert.equal(original[i+3],255);curtain.set(original.subarray(i,i+4),i)}
function writeLayer(index,name,data){const bytes=png.encode(64,64,data);p.layers[index].name=name;p.layers[index].frameData['0_0_0'].dataURL='data:image/png;base64,'+bytes.toString('base64');fs.writeFileSync(path.join(dir,name+'.png'),bytes)}
writeLayer(4,'黑色幕布 · 后层',curtain);writeLayer(5,'横梁与立柱 · 中层',frame);
assert.equal(p.layers.filter(l=>l.parent===3).length,3);
for(let i=0;i<p.layers.length;i++)if(i!==4&&i!==5)assert.deepEqual(p.layers[i],before.layers[i]);
for(const k of Object.keys(before))if(k!=='layers')assert.deepEqual(p[k],before[k]);
function composite(project){const data=new Uint8Array(64*64*4);for(const l of project.layers){if(l.isGroup||!l.visible||l.parent!=null&&!project.layers[l.parent].visible)continue;if(!l.frameData['0_0_0'])continue;assert.equal(l.opacity,1);const a=decode(l);for(let i=0;i<data.length;i+=4)if(a[i+3]){assert.equal(a[i+3],255);data.set(a.subarray(i,i+4),i)}}return data}
const a=composite(before),b=composite(p);let visibleAdded=0;
for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4;if(Buffer.compare(Buffer.from(a.subarray(i,i+4)),Buffer.from(b.subarray(i,i+4)))){assert(x>=18&&x<=55&&y>=30&&y<=38,'Changed outside curtain');assert.equal(a[i+3],0,'Overwrote existing artwork');assert.equal(b[i+3],255);visibleAdded++}}
assert(visibleAdded>0);assert.deepEqual(decode(p.layers[6]),decode(before.layers[6]));
const bytes=Buffer.from(JSON.stringify(p));fs.writeFileSync(path.join(dir,'candidate.json'),bytes);
function preview(data){const out=new Uint8Array(512*512*4);for(let y=0;y<512;y++)for(let x=0;x<512;x++){const i=(Math.floor(y/8)*64+Math.floor(x/8))*4;out.set(data[i+3]?data.subarray(i,i+4):[238,238,238,255],(y*512+x)*4)}return png.encode(512,512,out)}fs.writeFileSync(path.join(dir,'preview.png'),preview(b));fs.writeFileSync(path.join(dir,'幕布单独预览.png'),preview(curtain));
async function main(){if(!process.argv.includes('--save'))return console.log({prepared:true,curtainPixels:342,visibleAdded,existingArtworkUnchanged:true});const put=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':fs.readFileSync(path.join(dir,'before-etag.txt'),'utf8')},body:bytes});fs.writeFileSync(path.join(dir,'put-response.txt'),put.status+'\n'+await put.text());assert.equal(put.status,200,'Stop and merge conflict');const get=await fetch(url);assert.equal(get.status,200);const saved=Buffer.from(await get.arrayBuffer());fs.writeFileSync(path.join(dir,'after.json'),saved);fs.writeFileSync(path.join(dir,'after-etag.txt'),get.headers.get('etag'));assert.deepEqual(JSON.parse(saved),p);assert.deepEqual(composite(JSON.parse(saved)),b);const hash=b=>crypto.createHash('sha256').update(b).digest('hex');const report={put:200,get:200,bodyLayers:p.layers.filter(l=>l.parent===3).map(l=>l.name),curtainRegion:{x:18,y:30,width:38,height:9},curtainPixels:342,visibleAdded,existingOpaqueArtworkUnchanged:true,counterAndAllOtherLayersUnchanged:true,readbackEqualsCandidate:true,noPeople:true,beforeSha256:hash(fs.readFileSync(path.join(dir,'before.json'))),afterSha256:hash(saved)};fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2));console.log(report)}main().catch(e=>{console.error(e);process.exitCode=1});
