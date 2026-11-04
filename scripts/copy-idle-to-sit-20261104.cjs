const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function copyIdleToSit(p){
  const from=p.spriteSheets.findIndex(s=>s.name==='original16_idle'),to=p.spriteSheets.findIndex(s=>s.name==='original16_sit');assert(from>=0&&to>=0);
  const source=structuredClone(p.spriteSheets[from]),old=p.spriteSheets[to],oldLayers=p.layers,selected=oldLayers[p.currentLayerIndex];
  const keep=oldLayers.map((l,i)=>({l,i})).filter(({l})=>l.sheetIndex!==to),mapping=new Map(keep.map(({i},j)=>[i,j]));
  p.layers=keep.map(({l})=>{if(l.parent!=null){assert(mapping.has(l.parent),'another sheet depends on sitting layer');l.parent=mapping.get(l.parent);}return l;});
  const copies=keep.filter(({l})=>l.sheetIndex===from),copiedMap=new Map(copies.map(({i},j)=>[i,p.layers.length+j]));
  for(const {l,i}of copies){
    const c=structuredClone(l);c.sheetIndex=to;c.parent=c.parent==null?c.parent:copiedMap.get(keep[c.parent].i);
    assert(l.parent==null||c.parent!=null,'idle parent must belong to idle');
    c.frameData=Object.fromEntries(Object.entries(c.frameData||{}).map(([k,v])=>{assert(k.startsWith(from+'_'));return [to+k.slice(String(from).length),v];}));p.layers.push(c);
  }
  source.name=old.name;for(const a of source.actions)for(const f of a.frames)f.sheetIndex=to;
  // Explicit origin replaces the previous sitting borders through the version-checked save API.
  source.canvasLayout=source.canvasLayout||{version:1,margin:0,actions:source.actions.map(a=>({name:a.name,direction:a.direction,x:0,y:0,width:a.frames[0].width,height:a.frames[0].height}))};
  p.spriteSheets[to]=source;
  if(selected?.sheetIndex===to)p.currentLayerIndex=p.layers.findIndex(l=>l.sheetIndex===to&&l.name==='绘画图层');
  else p.currentLayerIndex=mapping.get(p.currentLayerIndex)??0;
  return p;
}
function verify(before,after){
  const from=before.spriteSheets.findIndex(s=>s.name==='original16_idle'),to=before.spriteSheets.findIndex(s=>s.name==='original16_sit');
  for(let i=0;i<before.spriteSheets.length;i++)if(i!==to)assert.deepEqual(after.spriteSheets[i],before.spriteSheets[i],'other actions unchanged');
  const source=before.layers.filter(l=>l.sheetIndex===from),target=after.layers.filter(l=>l.sheetIndex===to);assert.equal(source.length,target.length);
  for(let i=0;i<source.length;i++){assert.equal(target[i].name,source[i].name);assert.equal(target[i].visible,source[i].visible);assert.deepEqual(Object.values(target[i].frameData),Object.values(source[i].frameData),'idle pixels copied byte-for-byte');}
  const idle=before.spriteSheets[from],sit=after.spriteSheets[to];assert.equal(sit.imageDataURL,idle.imageDataURL);assert.equal(sit.frameWidth,idle.frameWidth);assert.equal(sit.frameHeight,idle.frameHeight);
  for(let ai=0;ai<idle.actions.length;ai++){assert.equal(sit.actions[ai].direction,idle.actions[ai].direction);assert.equal(sit.actions[ai].frames.length,idle.actions[ai].frames.length);for(let fi=0;fi<idle.actions[ai].frames.length;fi++)assert.deepEqual(sit.actions[ai].frames[fi],{...idle.actions[ai].frames[fi],sheetIndex:to});}
  assert.deepEqual(after.layers.filter(l=>l.sheetIndex!==to),before.layers.filter(l=>l.sheetIndex!==to),'other layer pixels and groups unchanged');
}
async function main(){
  const dir=path.join(root,'备份','20261104-待机三向复制到坐姿-'+Date.now());fs.mkdirSync(dir);
  const url='http://127.0.0.1:8765/api/project?id=main',r=await fetch(url);assert.equal(r.status,200);const raw=Buffer.from(await r.arrayBuffer()),etag=r.headers.get('etag'),before=JSON.parse(raw);
  fs.writeFileSync(path.join(dir,'main-before.json'),raw);const candidate=copyIdleToSit(structuredClone(before));verify(before,candidate);
  const bytes=Buffer.from(JSON.stringify(candidate));fs.writeFileSync(path.join(dir,'candidate.json'),bytes);
  const put=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:bytes}),output=await put.text();fs.writeFileSync(path.join(dir,'save-response.json'),JSON.stringify({status:put.status,body:output},null,2));assert.equal(put.status,200,output);
  const read=await fetch(url),actual=Buffer.from(await read.arrayBuffer());assert.equal(read.status,200);assert.deepEqual(JSON.parse(actual),candidate);verify(before,JSON.parse(actual));
  fs.writeFileSync(path.join(dir,'main-after.json'),actual);
  const template=path.join(root,'assets/builtin/native16-clean.json'),templateBytes=fs.readFileSync(template);fs.writeFileSync(path.join(dir,'template-before.json'),templateBytes);
  const templateBefore=JSON.parse(templateBytes),templateAfter=copyIdleToSit(structuredClone(templateBefore));verify(templateBefore,templateAfter);fs.writeFileSync(template,JSON.stringify(templateAfter));assert.deepEqual(JSON.parse(fs.readFileSync(template)),templateAfter);
  const report={status:'PASS',sourceSHA256:hash(raw),sourceETag:etag,resultSHA256:hash(actual),resultETag:read.headers.get('etag'),directions:['side','down','up'],frames:12,pixelChange:'exact copies of idle PNG data; no drawing or resizing',checks:['other actions unchanged','other layers unchanged','sitting dimensions/frame timing/layers match idle','API readback exact','reset template updated'],backup:dir};
  fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(dir,'恢复说明.md'),'旧坐姿保存在 main-before.json。若要恢复，先备份当前主工程并GET取得当前ETag，明确确认后用旧JSON通过PUT与If-Match保存，禁止覆盖新的未保存草稿。模板旧版在template-before.json。本次未执行恢复。');console.log(JSON.stringify(report));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={copyIdleToSit,verify};
