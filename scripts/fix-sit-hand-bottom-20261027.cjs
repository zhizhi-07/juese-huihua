const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),png=require('./png.cjs');
const url='http://127.0.0.1:8765/api/project?id=main';
(async()=>{
 const r=await fetch(url);assert(r.ok);const raw=await r.text(),before=JSON.parse(raw),p=JSON.parse(raw);
 const out=path.resolve(__dirname,'../自检记录/坐姿待机动作匹配-'+Date.now());fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'before.json'),raw);
 const si=p.spriteSheets.findIndex(s=>s.name==='original32_sit');assert(si>=0);let changed=0;
 const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
 for(let li=0;li<p.layers.length;li++){
  const l=p.layers[li];if(l.sheetIndex!==si||!l.visible||!/^hand( 2)?$/.test(l.name))continue;
  for(let ai=0;ai<p.spriteSheets[si].actions.length;ai++){
   const first=l.frameData?.[`${si}_${ai}_0`];if(!first)continue;const im=decode(first);
   if(!im.data.some((v,i)=>i%4===3&&v))continue;
   const idle=p.spriteSheets.findIndex(s=>s.name==='original32_idle');assert(idle>=0);
   const reference=p.layers.find(item=>item.sheetIndex===idle&&item.name==='hand'&&item.frameData?.[`${idle}_${ai}_0`]);assert(reference);
   const top=image=>{for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++)if(image.data[(y*image.width+x)*4+3])return y;throw Error('Empty hand reference');};
   const referenceTop=top(decode(reference.frameData[`${idle}_${ai}_0`]));
   for(const fi of [1,2,3]){
    const shift=top(decode(reference.frameData[`${idle}_${ai}_${fi}`]))-referenceTop,data=new Uint8Array(im.data.length);
    for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){
     const source=(y*im.width+x)*4;if(!im.data[source+3])continue;
     const destinationY=y+shift;assert(destinationY>=0&&destinationY<im.height,'hand would be cropped');
     data.set(im.data.subarray(source,source+4),(destinationY*im.width+x)*4);
    }
    const key=`${si}_${ai}_${fi}`;if(!l.frameData[key])continue;
    l.frameData[key]={...l.frameData[key],dataURL:'data:image/png;base64,'+png.encode(im.width,im.height,data).toString('base64')};
    const actual=decode(l.frameData[key]);assert.deepEqual(actual.data,data);
    assert.equal(actual.data.filter((v,i)=>i%4===3&&v).length,im.data.filter((v,i)=>i%4===3&&v).length,'hand outline pixel count changed');
    changed++;
   }
  }
 }
 assert(changed>0);
 for(let li=0;li<p.layers.length;li++)for(const [k,v]of Object.entries(before.layers[li].frameData||{}))if(JSON.stringify(v)!==JSON.stringify(p.layers[li].frameData[k]))assert(p.layers[li].sheetIndex===si&&/^hand( 2)?$/.test(p.layers[li].name)&&/_[123]$/.test(k));
 assert.deepEqual(p.spriteSheets,before.spriteSheets);fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));
 const save=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':r.headers.get('etag')},body:JSON.stringify(p)});assert(save.ok,'save failed '+save.status);assert.deepEqual(await(await fetch(url)).json(),p);
 console.log(JSON.stringify({changed,backup:out,readback:'exact',motion:'measured from current idle hand frames',bottomOutline:'all hand pixels preserved'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
