const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const workspace=path.resolve(__dirname,'../..'),root=path.resolve(process.argv[2]||workspace),manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'))),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
if(root.toLowerCase()!==workspace.toLowerCase()&&!root.toLowerCase().startsWith(workspace.toLowerCase()+path.sep))throw Error('恢复目标必须在当前工作区内');
for(const item of manifest.files){const target=path.resolve(root,item.path);if(!target.toLowerCase().startsWith(root.toLowerCase()+path.sep))throw Error('恢复路径越界');if(hash(fs.readFileSync(target))!==item.afterSHA256)throw Error('文件已有后续修改，停止恢复：'+item.path);if(hash(fs.readFileSync(path.join(__dirname,item.path)))!==item.sha256)throw Error('备份校验失败');}
for(const item of manifest.files)fs.copyFileSync(path.join(__dirname,item.path),path.join(root,item.path));
for(const item of manifest.files)if(hash(fs.readFileSync(path.join(root,item.path)))!==item.sha256)throw Error('恢复后校验失败');
console.log('PASS: original index.html and js/export.js restored; projects and new module files untouched.');
