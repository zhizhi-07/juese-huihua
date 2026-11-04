// Refuse to overwrite any code changed again after this repair.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(process.argv[2]||path.join(__dirname,'../../..'));
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'restore-manifest.json'),'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for(const entry of manifest){
  const backup=path.join(__dirname,'before',entry.file),target=path.resolve(root,entry.file);
  if(!target.startsWith(root+path.sep)||hash(backup)!==entry.before)throw Error('Invalid backup or target: '+entry.file);
  const current=hash(target);
  if(current!==entry.before&&current!==entry.after)throw Error('File changed since repair; refusing overwrite: '+target);
}
for(const entry of manifest){
  const target=path.join(root,entry.file);
  fs.copyFileSync(path.join(__dirname,'before',entry.file),target);
  if(hash(target)!==entry.before)throw Error('Restore verification failed: '+target);
}
console.log('Restored and SHA256-verified '+manifest.length+' files in '+root+'; project data untouched.');
