const fs=require('fs'),zlib=require('zlib'),assert=require('assert');
const D=__dirname,h=fs.readFileSync(D+'/complete.cjs','utf8'),src=fs.readFileSync(D+'/long-table-edge.cjs','utf8');
const png=Function('zlib',h.slice(h.indexOf('function crc('),h.indexOf('function fill('))+';return png;')(zlib);
const decode=Function('zlib','assert',src.slice(src.indexOf('function decode('),src.indexOf('(async()=>'))+';return decode;')(zlib,assert);
(async()=>{
 const r=await fetch('http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118'),raw=await r.text(),p=JSON.parse(raw),si=p.spriteSheets.findIndex(s=>s.name==='洗手池和木桌'),s=p.spriteSheets[si],w=s.frameWidth,H=s.frameHeight;
 fs.writeFileSync(D+'/before-sink-color-fix.json',raw);fs.writeFileSync(D+'/before-sink-color-fix.etag',r.headers.get('etag'));
 const old=JSON.parse(fs.readFileSync(D+'/combined-sink-table-readback.json'));
 for(const l of p.layers.filter(l=>l.sheetIndex===si)){
  const b=decode(l.frameData[si+'_0_0'].dataURL,w,H),prior=old.layers.find(a=>a.sheetIndex===si&&a.name===l.name),ob=decode(prior.frameData[si+'_0_0'].dataURL,w,H),changed=[];
  for(let i=0;i<b.length;i+=4)if(!b.subarray(i,i+4).equals(ob.subarray(i,i+4)))changed.push([i/4%w,Math.floor(i/4/w),[...ob.subarray(i,i+4)],[...b.subarray(i,i+4)]]);
  console.log(l.name,JSON.stringify(changed));
  const scale=24,large=Buffer.alloc(w*H*scale*scale*4);
  for(let y=0;y<H*scale;y++)for(let x=0;x<w*scale;x++){const i=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;b.copy(large,(y*w*scale+x)*4,i,i+4);}
  fs.writeFileSync(D+'/current-'+l.name+'.png',png(large,w*scale,H*scale));
 }
})();
