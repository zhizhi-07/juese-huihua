const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto'),png=require('./png.cjs');
(async()=>{
await fetch('http://127.0.0.1:8765/api/projects');
const url='http://127.0.0.1:8765/api/project?id=base-outlined-1794365455561',r=await fetch(url);assert(r.ok);const raw=await r.text(),before=JSON.parse(raw),j=structuredClone(before);
const dir=path.resolve('output/outline-826650-'+Date.now());fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'before.json'),raw);fs.writeFileSync(path.join(dir,'read.json'),JSON.stringify({etag:r.headers.get('etag'),sha256:crypto.createHash('sha256').update(raw).digest('hex')}));
function recolor(b){const d=png.decode(b),a=Buffer.from(d.data);let n=0;for(let i=0;i<a.length;i+=4)if(a[i+3]&&a[i]===0&&a[i+1]===0&&a[i+2]===0){a[i]=130;a[i+1]=102;a[i+2]=80;n++;}return {b:n?png.encode(d.width,d.height,a):b,n};}
const changes=[];let count=0;
for(let li=0;li<j.layers.length;li++){const l=j.layers[li];if(!['body','head','hand','hand 2'].includes(l.name))continue;for(const [k,f]of Object.entries(l.frameData||{})){if(!f.dataURL)continue;const x=recolor(Buffer.from(f.dataURL.split(',')[1],'base64'));if(!x.n)continue;f.dataURL='data:image/png;base64,'+x.b.toString('base64');changes.push([li,k]);count+=x.n;}}
assert(count>0);const undo=structuredClone(j);for(const [li,k]of changes)undo.layers[li].frameData[k]=before.layers[li].frameData[k];assert.deepStrictEqual(undo,before);fs.writeFileSync(path.join(dir,'candidate.json'),JSON.stringify(j));
const p=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':r.headers.get('etag')},body:JSON.stringify(j)});const response=await p.text();fs.writeFileSync(path.join(dir,'save.txt'),p.status+'\n'+response);assert(p.ok,response);
const rr=await fetch(url),after=await rr.text();assert.deepStrictEqual(JSON.parse(after),j);fs.writeFileSync(path.join(dir,'after.json'),after);
const root='E:/工作/烟火/素材-美术资产/角色素材/新版',files=[];
function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory()){if(e.name!=='眼睛')walk(f);}else if(e.name.endsWith('.png'))files.push(f);}}
walk(root);let fileCount=0,pixels=0;
for(const f of files){const b=fs.readFileSync(f),x=recolor(b);if(!x.n)continue;const rel=path.relative(root,f),bak=path.join(dir,'E盘原始素材',rel);fs.mkdirSync(path.dirname(bak),{recursive:true});fs.writeFileSync(bak,b);fs.writeFileSync(f,x.b);assert(fs.readFileSync(f).equals(x.b));fileCount++;pixels+=x.n;}
assert(fileCount>0);
fs.writeFileSync(path.join(dir,'验证.json'),JSON.stringify({result:'PASS',color:'#826650',projectPixels:count,exportFiles:fileCount,exportPixels:pixels,otherProjectDataUnchanged:true,etag:rr.headers.get('etag'),restore:'工程恢复前先核对当前ETag等于此处etag，再条件PUT before.json；不一致先合并。E盘原始素材保留同相对路径。'},null,2));console.log(JSON.stringify({dir,count,fileCount,pixels,result:'PASS'}));
})().catch(e=>{console.error(e);process.exit(1)});

