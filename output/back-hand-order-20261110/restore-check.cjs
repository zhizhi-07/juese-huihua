const {spawnSync}=require('node:child_process'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const out=path.relative(process.cwd(),__dirname).replaceAll('\\','/');
const files=['js/core.js','js/wardrobe.js','test/front-hand-top.cjs'];
const patch=files.map(file=>{
 const backup=out+'/before/'+path.basename(file);
 const p=spawnSync('git',['-c','core.autocrlf=false','diff','--no-index','--',backup,file]);
 assert.equal(p.status,1);
 return p.stdout.toString().replaceAll('a/'+backup,'a/'+file);
}).join('');
fs.writeFileSync(out+'/changes.diff',patch);
const drill=out+'/restore-check';
for(const file of files){fs.mkdirSync(path.dirname(drill+'/'+file),{recursive:true});fs.copyFileSync(file,drill+'/'+file);}
const p=spawnSync('git',['-c','core.autocrlf=false','apply','--reverse','--directory='+drill,out+'/changes.diff'],{stdio:'inherit'});
assert.equal(p.status,0);
for(const file of files)assert.deepEqual(fs.readFileSync(drill+'/'+file),fs.readFileSync(out+'/before/'+path.basename(file)));
console.log('PASS: reverse patch on copies restores all three original files byte for byte.');
