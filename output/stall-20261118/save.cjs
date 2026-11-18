const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const png=require('../../scripts/png.cjs');
const root=__dirname, url='http://127.0.0.1:8765/api/project?id=scene-e4150351-9254-4d4a-9fad-513ececc9cc0';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const before=JSON.parse(fs.readFileSync(path.join(root,'before.json')));
const names=fs.readdirSync(path.join(root,'out/scenes/stall')).filter(x=>x.endsWith('.png')).sort();
const groups=[['街景背景',1,2],['摊位主体 · 窗洞柜台立柱',3,7],['顶部米色木框牌',8,8],['汉堡霓虹招牌',9,11],['红白蓝遮阳棚',12,14],['店内汉堡海报',15,16],['咖啡机',17,18],['台上汉堡',19,19],['柜台纸袋',20,20],['饮料杯',21,21],['左侧菜单牌',22,23],['右侧菜单牌',24,25],['左侧绿色挂招牌',26,27],['垃圾桶',28,28],['左墙管道',29,29],['右侧邻铺裁边',30,30],['地面',31,31]];
function composite(project){const out=new Uint8Array(64*64*4);for(const l of project.layers){if(l.isGroup||!l.visible||l.parent!=null&&!project.layers[l.parent].visible)continue;const cel=l.frameData?.['0_0_0'];if(!cel)continue;const a=png.decode(Buffer.from(cel.dataURL.split(',')[1],'base64'));assert.equal(a.width,64);assert.equal(a.height,64);for(let i=0;i<out.length;i+=4){if(a.data[i+3]===255)out.set(a.data.subarray(i,i+4),i);else assert.equal(a.data[i+3],0)}}return out}
function upscale(data,n){const out=new Uint8Array(64*n*64*n*4);for(let y=0;y<64*n;y++)for(let x=0;x<64*n;x++){const i=(Math.floor(y/n)*64+Math.floor(x/n))*4;out.set(data.subarray(i,i+4),(y*64*n+x)*4)}return png.encode(64*n,64*n,out)}
async function main(){
  assert.equal(names.length,31);
  for(const l of before.layers)for(const cel of Object.values(l.frameData)){const a=png.decode(Buffer.from(cel.dataURL.split(',')[1],'base64'));assert.equal(a.data.filter((v,i)=>i%4===3&&v!==0).length,0,'Existing art is not blank; stop')}
  const project=structuredClone(before); const manifest=[];
  for(const [name,start,end] of groups){const parent=project.layers.length;project.layers.push({name,sheetIndex:0,isGroup:true,parent:null,depth:0,visible:true,locked:false,opacity:1,frameData:{}});for(let n=start;n<=end;n++){const file=names.find(x=>x.startsWith(String(n).padStart(2,'0')+'-'));assert(file);const b=fs.readFileSync(path.join(root,'out/scenes/stall',file)),im=png.decode(b);assert.equal(im.width,64);assert.equal(im.height,64);project.layers.push({name:file.slice(3,-4),sheetIndex:0,parent,depth:1,visible:true,locked:false,opacity:1,frameData:{'0_0_0':{width:64,height:64,dataURL:'data:image/png;base64,'+b.toString('base64')}}});manifest.push({group:name,layer:file.slice(3,-4),parent,index:project.layers.length-1,opaque:im.data.filter((v,i)=>i%4===3&&v).length,sha256:hash(b)})}}
  project.currentLayerIndex=project.layers.findIndex(l=>l.name==='主招牌边框');
  assert.equal(manifest.length,31);
  for(const item of manifest){assert(item.opaque>0);assert(project.layers[item.parent].isGroup);assert(item.parent<item.index)}
  assert.equal(project.layers.filter(l=>l.isGroup).length,17);
  assert.deepEqual(project.layers.slice(0,before.layers.length),before.layers);
  for(const key of Object.keys(before))if(!['layers','currentLayerIndex'].includes(key))assert.deepEqual(project[key],before[key],key);
  const rendered=composite(project),expected=png.decode(fs.readFileSync(path.join(root,'out/scenes/stall.png')));
  assert.deepEqual(rendered,expected.data,'Grouped project differs from drawing');
  for(const [,start,end] of groups)assert(start<=end);
  const candidate=Buffer.from(JSON.stringify(project)); fs.writeFileSync(path.join(root,'candidate.json'),candidate);
  fs.writeFileSync(path.join(root,'layers.json'),JSON.stringify(manifest,null,2));
  fs.writeFileSync(path.join(root,'preview.png'),upscale(rendered,8));
  fs.writeFileSync(path.join(root,'场景-64x64.png'),png.encode(64,64,rendered));
  if(!process.argv.includes('--save')){console.log('Prepared and verified 17 groups / 31 painting layers.');return}
  const r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':fs.readFileSync(path.join(root,'before-etag.txt'),'utf8')},body:candidate});
  const response=await r.text();fs.writeFileSync(path.join(root,'put-response.txt'),`${r.status}\n${response}`);assert.equal(r.status,200,'Save failed; do not retry blindly');
  const read=await fetch(url);assert.equal(read.status,200);const saved=Buffer.from(await read.arrayBuffer());fs.writeFileSync(path.join(root,'after.json'),saved);fs.writeFileSync(path.join(root,'after-etag.txt'),read.headers.get('etag'));assert.deepEqual(JSON.parse(saved),project);
  const actual=composite(JSON.parse(saved));assert.deepEqual(actual,rendered);fs.writeFileSync(path.join(root,'preview.png'),upscale(actual,8));
  const report={project:'scene-e4150351-9254-4d4a-9fad-513ececc9cc0',dimensions:[64,64],groups:17,newPaintLayers:31,preservedOriginalLayers:3,beforeSha256:hash(fs.readFileSync(path.join(root,'before.json'))),afterSha256:hash(saved),putStatus:r.status,getStatus:read.status,checks:['original layers unchanged','sheet/action/frame metadata unchanged','no placement or resampling','all parent references valid','31 nonempty native pixel layers','readback structurally equals candidate','readback composition pixel-exact equals drawing'],scope:'Only append grouped scene art and select main sign layer; no people, no editor source or other projects modified.'};
  fs.writeFileSync(path.join(root,'verification.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
