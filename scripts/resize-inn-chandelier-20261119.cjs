const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),png=require('./png.cjs');
(async()=>{
const url='http://127.0.0.1:8765/api/project?id=scene-inn-20261119',r=await fetch(url);assert(r.ok);const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=structuredClone(p);
const out=path.resolve(__dirname,'../output/chandelier-small-'+Date.now());fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/before.json',raw);fs.writeFileSync(out+'/revision.json',JSON.stringify({etag,sha256:crypto.createHash('sha256').update(raw).digest('hex')}));
const rows=['....DSD....','.....S.....','....DSD....','...DLHLD...','LLLDBGBDLLL','LFL.DLD.LFL','LBL.DHD.LBL','DHD.DBD.DHD','.DHDHCHDHD.','..DHDLDHD..','...DDBDD...','.....D.....'];
const colors={D:'2f3b3d',S:'5c4644',H:'e8cd97',B:'ba9273',G:'e0ac6c',L:'e0ac6c',C:'ba9273',F:'e6dfa1'},w=11,h=12,data=new Uint8Array(w*h*4),palette=new Set(p.palette.map(c=>Buffer.from([c.r,c.g,c.b]).toString('hex')));
rows.forEach((row,y)=>{assert.equal(row.length,w);[...row].forEach((c,x)=>{if(c!=='.'){assert(palette.has(colors[c]));data.set([...Buffer.from(colors[c],'hex'),255],(y*w+x)*4);}});});
const image=png.encode(w,h,data),dataURL='data:image/png;base64,'+image.toString('base64'),si=p.spriteSheets.findIndex(s=>s.name==='双烛黄铜吊灯');assert(si>=0);const s=p.spriteSheets[si];assert.equal(s.actions.length,1);assert.equal(s.actions[0].frames.length,1);Object.assign(s,{frameWidth:w,frameHeight:h,imageDataURL:dataURL});Object.assign(s.actions[0].frames[0],{width:w,height:h});
const layers=p.layers.filter(l=>l.sheetIndex===si);assert.equal(layers.length,1);layers[0].frameData[`${si}_0_0`]={width:w,height:h,dataURL};
for(let i=0;i<p.spriteSheets.length;i++)if(i!==si)assert.deepEqual(p.spriteSheets[i],before.spriteSheets[i]);for(let i=0;i<p.layers.length;i++)if(p.layers[i].sheetIndex!==si)assert.deepEqual(p.layers[i],before.layers[i]);assert.deepEqual(p.sceneAssembly,before.sceneAssembly);
fs.writeFileSync(out+'/chandelier.png',image);fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));const scale=16,preview=new Uint8Array(w*h*scale*scale*4);for(let y=0;y<h*scale;y++)for(let x=0;x<w*scale;x++){const i=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;preview.set(data[i+3]?data.slice(i,i+4):[214,208,176,255],(y*w*scale+x)*4);}fs.writeFileSync(out+'/preview.png',png.encode(w*scale,h*scale,preview));
const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());assert.deepEqual(await(await fetch(url)).json(),p);console.log(JSON.stringify({out,width:w,height:h,verified:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});


