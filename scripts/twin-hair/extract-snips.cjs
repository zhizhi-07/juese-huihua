/* Extract the PNG payload embedded in a Windows snipping-tool .sp1 capture. */
const fs=require('fs'),path=require('path');
const dir='C:/Users/Administrator/Desktop/截图软件/history/snip';
const out='C:/Users/Administrator/AppData/Local/Temp/snips';
fs.mkdirSync(out,{recursive:true});
const files=fs.readdirSync(dir).sort();
for(const name of files){
  const b=fs.readFileSync(path.join(dir,name));
  const idx=b.indexOf(Buffer.from([0x89,0x50,0x4e,0x47]));
  if(idx<0){console.log(name,'no png');continue;}
  // find IEND
  const end=b.indexOf(Buffer.from('IEND'),idx);
  if(end<0){console.log(name,'no IEND');continue;}
  const png=b.slice(idx,end+8);
  const target=path.join(out,name.replace(/\.sp1$/,'.png'));
  fs.writeFileSync(target,png);
  console.log(name,'->',target,png.length);
}
