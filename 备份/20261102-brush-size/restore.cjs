const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const target=path.resolve(process.argv[2]||path.join(__dirname,'../..'));
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const before=JSON.parse(fs.readFileSync(path.join(__dirname,'before-sha256.json'),'utf8').replace(/^\uFEFF/,''));
const after=JSON.parse(fs.readFileSync(path.join(__dirname,'after-sha256.json'),'utf8'));
// Preflight every file before writing: never overwrite subsequent source edits.
for(const entry of before){
  const file=path.resolve(target,entry.path);assert(file.startsWith(target+path.sep),'Invalid relative path');
  assert.equal(sha(path.join(__dirname,entry.path)),entry.sha256,'Backup changed: '+entry.path);
  assert([entry.sha256,after.find(e=>e.path===entry.path).sha256].includes(sha(file)),'Source changed since this patch; refusing overwrite: '+entry.path);
}
for(const entry of before)fs.copyFileSync(path.join(__dirname,entry.path),path.join(target,entry.path));
for(const entry of before)assert.equal(sha(path.join(target,entry.path)),entry.sha256);
console.log('RESTORED and SHA256 verified: '+target+' (five source files only; no project data).');
