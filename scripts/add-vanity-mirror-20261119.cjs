const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),png=require('./png.cjs');
(async()=>{
const url='http://127.0.0.1:8765/api/project?id=scene-inn-20261119',r=await fetch(url);assert(r.ok);const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=structuredClone(p),si=p.spriteSheets.findIndex(s=>s.name==='梳妆台·空台子');assert(si>=0);
const out=path.resolve(__dirname,'../output/vanity-mirror-'+Date.now());fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/before.json',raw);fs.writeFileSync(out+'/revision.json',JSON.stringify({etag,sha256:crypto.createHash('sha256').update(raw).digest('hex')}));
const old=png.decode(Buffer.from(p.spriteSheets[si].imageDataURL.split(',')[1],'base64'));assert.equal(old.width,16);assert([9,18].includes(old.height));
const w=16,h=18,data=new Uint8Array(w*h*4);for(let y=0;y<9;y++)data.set(old.data.slice((y+old.height-9)*w*4,(y+old.height-8)*w*4),(y+9)*w*4);
const colors={D:'2f3b3d',W:'80575b',S:'785a55',M:'839ea6',R:'bed4c8',H:'99bab5'},palette=new Set(p.palette.map(c=>Buffer.from([c.r,c.g,c.b]).toString('hex')));
const rows=['.....DDDDDD.....','....DSWWWWSD....','....DWMMMMWD....','...DWMMMMMRWD...','...DWMMMMRRWD...','...DWMMMRRMWD...','...DWMMRRMMWD...','...DWMRRMMRWD...','...DWRMMMRMWD...'];
rows.forEach((row,y)=>{assert.equal(row.length,w);[...row].forEach((c,x)=>{if(c!=='.'){assert(palette.has(colors[c]));data.set([...Buffer.from(colors[c],'hex'),255],(y*w+x)*4);}});});
for(let x=4;x<=11;x++)data.set([...Buffer.from(colors.W,'hex'),255],(9*w+x)*4);
const image=png.encode(w,h,data),dataURL='data:image/png;base64,'+image.toString('base64'),sheet=p.spriteSheets[si];Object.assign(sheet,{frameWidth:w,frameHeight:h,imageDataURL:dataURL});Object.assign(sheet.actions[0].frames[0],{width:w,height:h});const layers=p.layers.filter(l=>l.sheetIndex===si);assert.equal(layers.length,1);layers[0].frameData[`${si}_0_0`]={width:w,height:h,dataURL};
for(let i=0;i<p.spriteSheets.length;i++)if(i!==si)assert.deepEqual(p.spriteSheets[i],before.spriteSheets[i]);for(let i=0;i<p.layers.length;i++)if(p.layers[i].sheetIndex!==si)assert.deepEqual(p.layers[i],before.layers[i]);assert.deepEqual(p.sceneAssembly,before.sceneAssembly);
fs.writeFileSync(out+'/table.png',image);fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));const scale=36,pw=w*scale,ph=h*scale,preview=new Uint8Array(pw*ph*4);for(let y=0;y<ph;y++)for(let x=0;x<pw;x++){const i=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;preview.set(data.slice(i,i+4),(y*pw+x)*4);}fs.writeFileSync(out+'/large-preview.png',png.encode(pw,ph,preview));
if(process.argv.includes('--save')){const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());assert.deepEqual(await(await fetch(url)).json(),p);}
console.log(JSON.stringify({out,width:w,height:h,saved:process.argv.includes('--save')}));
})().catch(e=>{console.error(e);process.exitCode=1;});

