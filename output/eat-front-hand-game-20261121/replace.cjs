const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const read=name=>fs.readFileSync(path.join(__dirname,name)),record=(name,value)=>fs.writeFileSync(path.join(__dirname,name),JSON.stringify(value,null,2));
const sha=buf=>createHash('sha256').update(buf).digest('hex');
(async()=>{
 const meta=JSON.parse(read('before.json')),layout=JSON.parse(read('layout.json')),source=read('吃东西.png'),backup=read('before.png');
 const target=path.join('E:/工作/0000-游戏/最后/游戏资产/人物/基础身体/前手','吃东西.png');
 assert.equal(meta.target,target);
 assert.equal(sha(source),layout.sha256);
 assert.equal(sha(backup),meta.targetSHA256);
 const state=await fetch(meta.url,{headers:{'If-None-Match':meta.etag}});assert.equal(state.status,304,'source revision changed');
 const root=path.dirname(path.dirname(target));
 function siblings(){
   return Object.fromEntries(fs.readdirSync(root,{recursive:true,withFileTypes:true})
    .filter(entry=>entry.isFile())
    .map(entry=>path.join(entry.parentPath,entry.name))
    .filter(f=>f!==target).sort().map(f=>[path.relative(root,f),sha(fs.readFileSync(f))]));
 }
 const untouched=siblings();
 const temp=target+'.codex-'+process.pid+'.tmp';
 fs.copyFileSync(path.join(__dirname,'吃东西.png'),temp,fs.constants.COPYFILE_EXCL);
 try{
   assert(fs.readFileSync(target).equals(backup),'destination changed; stopping instead of overwriting');
   fs.renameSync(temp,target);
 }finally{
   if(fs.existsSync(temp))fs.unlinkSync(temp);
 }
 const bytes=fs.readFileSync(target);
 assert(bytes.equals(source));
 assert.deepEqual(siblings(),untouched);
 const restoreCopy=path.join(__dirname,'restore-check.png');
 fs.copyFileSync(target,restoreCopy);
 fs.copyFileSync(path.join(__dirname,'before.png'),restoreCopy);
 assert.equal(sha(fs.readFileSync(restoreCopy)),meta.targetSHA256);
 record('verification.json',{operation:'rename temporary copy onto single existing PNG',target,beforeSHA256:meta.targetSHA256,afterSHA256:sha(bytes),sourceETag:meta.etag,sourceStatus:state.status,width:layout.width,height:layout.height,frames:layout.cells.length,untouchedFiles:Object.keys(untouched).length,restorationVerifiedOnCopy:true});
 console.log('Verified target',target,sha(bytes),Object.keys(untouched).length,'other files unchanged');
})().catch(e=>{console.error(e);process.exitCode=1});
