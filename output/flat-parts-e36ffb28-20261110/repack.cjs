const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),JSZip=require(path.join(root,'js/vendor/jszip.min.js'));
(async()=>{
 const dir=path.join(root,'导出'),source=path.join(dir,'人物分支-e36ffb28-眼睛前发后发衣服.zip'),dest=path.join(dir,'人物分支-e36ffb28-眼睛前发后发-每款一文件夹.zip');
 const old=await JSZip.loadAsync(fs.readFileSync(source),{checkCRC32:true}),zip=new JSZip();
 const manifest=JSON.parse(await old.file('部件说明.json').async('string')),moves=new Map(),folders=new Set();
 manifest.files=manifest.files.filter(f=>/^(眼睛|前发|后发)-/.test(f.part));
 for(const f of manifest.files){
  const folder=f.part.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_');
  assert(folder&&folder!=='.'&&folder!=='..');
  const original=f.file,next=folder+'/'+original;folders.add(folder);moves.set(original,next);
  zip.file(next,await old.file(original).async('nodebuffer'));f.file=next;
 }
 for(const row of manifest.order)row.backToFront=row.backToFront.filter(l=>moves.has(l.file)).map(l=>({...l,file:moves.get(l.file)}));
 zip.file('部件说明.json',JSON.stringify(manifest,null,2));
 zip.file('使用说明.txt','只收录眼睛、前发和后发，含工程已保存的隐藏备选。每个款式一个文件夹，里面是该款已有的各动作透明 PNG。横向为帧，纵向为方向；尺寸、时长和合成顺序见部件说明.json。\n');
 fs.writeFileSync(dest,await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}),{flag:'wx'});
 const check=await JSZip.loadAsync(fs.readFileSync(dest),{checkCRC32:true});
 assert.equal(Object.values(check.files).filter(f=>f.dir).length,folders.size);
 assert.equal(Object.values(check.files).filter(f=>!f.dir).length,moves.size+2);
 for(const [original,next] of moves)assert.deepEqual(await check.file(next).async('nodebuffer'),await old.file(original).async('nodebuffer'));
 assert(manifest.order.every(row=>row.backToFront.every(l=>check.file(l.file))));
 console.log(JSON.stringify({dest,folders:folders.size,png:moves.size,verified:'CRC and PNG bytes exact; no clothes'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
