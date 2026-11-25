const fs=require('node:fs'),a=require('node:assert/strict'),{createHash}=require('node:crypto');
(async()=>{
const u='http://127.0.0.1:8765/api/project?id=scene-inn-20261119';
const raw=fs.readFileSync('original.json'),p=JSON.parse(raw);
const etag=/^etag:\s*("[a-f0-9]+")/im.exec(fs.readFileSync('headers.txt','utf8'))[1];
const sha256=createHash('sha256').update(raw).digest('hex');
a.equal(etag,JSON.stringify(sha256));fs.writeFileSync('backup-meta.json',JSON.stringify({etag,sha256}));
const colors=new Set(p.palette.map(({r,g,b})=>Buffer.from([r,g,b]).toString('hex')));
for (const [,hex] of fs.readFileSync('plants.px.js','utf8').matchAll(/#([a-f0-9]{6})/g)) a(colors.has(hex),hex);
const count=p.spriteSheets.length,layerCount=p.layers.length;
for(const [file,name,w,h] of [['broadleaf-pot','阔叶盆栽',15,21],['aloe-pot','芦荟盆栽',10,19]]){
  a(!p.spriteSheets.some(s=>s.name===name));
  const png=fs.readFileSync('out/sprites/'+file+'.png');
  const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
  a.deepEqual([width,height],[w,h]);
  const dataURL='data:image/png;base64,'+png.toString('base64'),sheetIndex=p.spriteSheets.length;
  p.spriteSheets.push({name,frameWidth:width,frameHeight:height,columns:1,rows:1,spacingX:0,spacingY:0,offsetX:0,offsetY:0,fps:8,imageDataURL:dataURL,actions:[{name,direction:'',frames:[{sheetIndex,sourceX:0,sourceY:0,width,height,locked:false,lockedRegions:[],status:'completed',duration:0,notes:''}]}]});
  p.layers.push({sheetIndex,parent:null,name,visible:true,locked:false,opacity:1,frameData:{[sheetIndex+'_0_0']:{width,height,dataURL}}});
}
const body=JSON.stringify(p);fs.writeFileSync('candidate.json',body);
let r=await fetch(u,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body});
const result=await r.text();fs.writeFileSync('save-result.txt',r.status+'\n'+result);a(r.ok,result);
r=await fetch(u);a(r.ok);const saved=await r.text();fs.writeFileSync('readback.json',saved);
const q=JSON.parse(saved);a.deepEqual(q,p);
const added=q.spriteSheets.splice(count).map(s=>[s.name,s.frameWidth,s.frameHeight]);q.layers.splice(layerCount);a.deepEqual(q,JSON.parse(raw));
const report={added,otherDataUnchanged:true};fs.writeFileSync('verification.json',JSON.stringify(report,null,2));console.log(report);
})().catch(e=>{console.error(e);process.exitCode=1});
