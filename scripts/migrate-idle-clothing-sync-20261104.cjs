const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const api='http://127.0.0.1:8765/api/project?id=main';
async function main(){
  await(await fetch('http://127.0.0.1:8765/api/projects')).json();
  const r=await fetch(api);assert(r.ok);const raw=await r.text(),before=JSON.parse(raw),p=structuredClone(before);
  const dir=path.resolve(__dirname,'../output/idle-clothing-sync-migration-'+Date.now());fs.mkdirSync(dir);
  fs.writeFileSync(dir+'/before.json',raw);fs.writeFileSync(dir+'/meta.json',JSON.stringify({etag:r.headers.get('etag'),sha256:crypto.createHash('sha256').update(raw).digest('hex')}));
  const owners=p.layers.filter(l=>l.clothingSync);assert.equal(owners.length,1);const source=owners[0],g=source.clothingSync;
  assert.equal(p.spriteSheets[source.sheetIndex].name,'original16_idle');
  const removed=g.preserved.filter(k=>k.startsWith(source.sheetIndex+'_'));
  g.preserved=g.preserved.filter(k=>!removed.includes(k));
  const check=structuredClone(p);check.layers[p.layers.indexOf(source)].clothingSync.preserved=before.layers[p.layers.indexOf(source)].clothingSync.preserved;assert.deepEqual(check,before,'only preservation flags may change');
  fs.writeFileSync(dir+'/candidate.json',JSON.stringify(p));
  const put=await fetch(api,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':r.headers.get('etag')},body:JSON.stringify(p)});
  assert(put.ok,`save ${put.status}; candidate kept; no retry: ${await put.text()}`);
  const read=await fetch(api),saved=await read.text();assert(read.ok);assert.deepEqual(JSON.parse(saved),p);
  fs.writeFileSync(dir+'/after.json',saved);fs.writeFileSync(dir+'/checks.json',JSON.stringify({removed,pixelsUnchanged:true,readbackExact:true},null,2));
  console.log(JSON.stringify({dir,removed,pixelsUnchanged:true,readbackExact:true}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
