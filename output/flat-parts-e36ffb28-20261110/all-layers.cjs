const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;Object.assign(global,{Image,ImageData,FileReader:class{async readAsText(b){this.result=await b.text();this.onload();}},document:{createElement(){return createCanvas(1,1);}}});
for(const n of ['core','export'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
(async()=>{
 const url='http://localhost:8765/api/project?id=draft-conflict-1794277219868-e36ffb28',r=await fetch(url);assert(r.ok);
 const bytes=Buffer.from(await r.arrayBuffer()),etag=r.headers.get('etag'),hash=crypto.createHash('sha256').update(bytes).digest('hex');
 const {project:p}=await new PE.ExportManager().importProject(new Blob([bytes]));
 const labels={'body':'身体','head':'头部','hand':'前手','hand 2':'后手','hand 描边':'前手描边','hand 2 描边':'后手描边','head 描边':'头部描边','body 描边':'身体描边'};
 const acts={walk:'行走',idle:'待机',pickup:'拾取',sit:'坐姿'},dirs={side:'侧面',down:'正面',up:'背面'},rows=[];
 for(const [si,s] of p.spriteSheets.entries())for(const [ai,a] of s.actions.entries()){
  const action=acts[s.name.slice('original16_'.length)];assert(action);
  const perFrame=a.frames.map((_,fi)=>PE.getRenderLayers(p,si,ai).filter(l=>PE.isLayerVisible(p,l,si)&&l.opacity>0&&l.getFrameData(p.getFrameKey(si,ai,fi))?.data.some((v,i)=>i%4===3&&v)).map(l=>labels[l.name]||l.name));
  const groups=new Map();
  for(const [fi,layers] of perFrame.entries()){const key=JSON.stringify(layers);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(fi+1);}
  rows.push({action,dir:dirs[a.direction],groups:[...groups].map(([layers,frames])=>({layers:JSON.parse(layers),frames}))});
 }
 const again=await fetch(url);assert(again.ok);assert.equal(again.headers.get('etag'),etag);assert.deepEqual(Buffer.from(await again.arrayBuffer()),bytes);
 fs.writeFileSync(path.join(__dirname,'layer-order-all.json'),JSON.stringify({url,etag,hash,rows},null,2));
 console.log(rows.map(r=>r.action+' '+r.dir+': '+r.groups.map(g=>g.frames.join(',')+' '+g.layers.join(' → ')).join(' / ')).join('\n'));
})().catch(e=>{console.error(e);process.exitCode=1});
