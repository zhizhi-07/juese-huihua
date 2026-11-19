const fs=require('fs'),zlib=require('zlib'),assert=require('assert');
const D=__dirname,src=fs.readFileSync(D+'/../noodle-stove-20261118/long-table-edge.cjs','utf8');
const decode=Function('zlib','assert',src.slice(src.indexOf('function decode('),src.indexOf('(async()=>'))+';return decode;')(zlib,assert);
(async()=>{
 const r=await fetch('http://127.0.0.1:8765/api/project?id=scene-inn-20261119'),raw=await r.text(),p=JSON.parse(raw),si=p.spriteSheets.findIndex(s=>s.name==='沙发'),l=p.layers.find(l=>l.sheetIndex===si);
 for(let a=0;a<2;a++){
  const b=decode(l.frameData[si+'_'+a+'_0'].dataURL,32,21),map=new Map();console.log(a===0?'FRONT':'BACK');
  for(let y=0;y<21;y++){let line='';for(let x=0;x<32;x++){const n=(y*32+x)*4,c=b.subarray(n,n+3).toString('hex');if(b[n+3])map.set(c,(map.get(c)||0)+1);line+=!b[n+3]?'.':c==='2f3b3d'?'#':'o';}console.log(y,line);}
  console.log([...map]);
 }
})();
