const fs=require('fs'),zlib=require('zlib'),assert=require('assert');
const D=__dirname,W=40,H=36;
const helper=fs.readFileSync(D+'/complete.cjs','utf8');
const png=Function('zlib','W','H',helper.slice(helper.indexOf('function crc('),helper.indexOf('function fill('))+';return png;')(zlib,W,H);
function decode(uri){const b=Buffer.from(uri.split(',')[1],'base64'),parts=[];for(let n=8;n<b.length;){const length=b.readUInt32BE(n);if(b.toString('ascii',n+4,n+8)==='IDAT')parts.push(b.subarray(n+8,n+8+length));n+=length+12;}const rows=zlib.inflateSync(Buffer.concat(parts)),pixels=Buffer.alloc(W*H*4);for(let y=0;y<H;y++){const filter=rows[y*(W*4+1)];for(let x=0;x<W*4;x++){const n=y*W*4+x,a=x>=4?pixels[n-4]:0,b=y?pixels[n-W*4]:0,c=y&&x>=4?pixels[n-W*4-4]:0;let v=0;if(filter===1)v=a;if(filter===2)v=b;if(filter===3)v=Math.floor((a+b)/2);if(filter===4){const q=a+b-c,A=Math.abs(q-a),B=Math.abs(q-b),C=Math.abs(q-c);v=A<=B&&A<=C?a:B<=C?b:c;}pixels[n]=(rows[y*(W*4+1)+1+x]+v)&255;}}return pixels;}



(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url),raw=await r.text(),p=JSON.parse(raw),old=JSON.parse(fs.readFileSync(D+'/boiling-readback.json'));
 fs.writeFileSync(D+'/before-sync-first-puffs.json',raw);fs.writeFileSync(D+'/before-sync-first-puffs.etag',r.headers.get('etag'));fs.writeFileSync(D+'/before-sync-first-puffs.sha256',require('crypto').createHash('sha256').update(raw).digest('hex'));
 const si=p.spriteSheets.findIndex(s=>s.name==='锅'),sheet=p.spriteSheets[si];assert(si>=0);
 const helper=fs.readFileSync(D+'/clean-smoke.cjs','utf8'),dec=Function('require','__dirname',helper.slice(0,helper.indexOf('(async()=>')).replace('W=40,H=36','W=24,H=32')+';return decode;')(require,D),uri=b=>'data:image/png;base64,'+png(b,24,32).toString('base64');
 const changes=[];
 for(const l of p.layers.filter(l=>l.sheetIndex===si&&l.name!=='烟雾')){
  const prior=old.layers.find(o=>o.name===l.name&&o.sheetIndex===si);assert(prior);
  for(let a=0;a<4;a++){
   const key=si+'_'+a+'_0',b=dec(l.frameData[key].dataURL),o=dec(prior.frameData[key].dataURL),delta=[];
   for(let n=0;n<b.length;n+=4)if(!b.subarray(n,n+4).equals(o.subarray(n,n+4)))delta.push(n);
   if(!delta.length)continue;changes.push({layer:l.name,flavor:sheet.actions[a].name,pixels:delta.length});
   for(let target=0;target<4;target++){
    if(l.name!=='锅体'&&target!==a)continue;
    for(let f=target===a?1:0;f<8;f++){
     const k=si+'_'+target+'_'+f,out=dec(l.frameData[k].dataURL);for(const n of delta)b.copy(out,n,n,n+4);l.frameData[k].dataURL=uri(out);
    }
   }
  }
 }
 const steam=p.layers.find(l=>l.sheetIndex===si&&l.name==='烟雾');
 for(let a=0;a<4;a++){
  sheet.actions[a].direction='';
  for(let f=0;f<8;f++){
   const b=Buffer.alloc(24*32*4);
   // Three separate wisps with clear air gaps; each rises and drifts before fading.
   for(let j=0;j<3;j++){
    const age=(j*6+f*2.25)%18,y=Math.round(19-age),x=Math.round(12+Math.sin(age*.45-f*Math.PI/4)*1.5),alpha=Math.round(205*Math.min(1,age/2)*Math.min(1,(18-age)/3));
    [[0,0],[1,0],[-1,1],[0,1],[1,1],[0,2]].forEach(([dx,dy])=>{const n=((y+dy)*24+x+dx)*4;b.set([206,218,214,alpha],n);});
   }
   steam.frameData[si+'_'+a+'_'+f].dataURL=uri(b);
  }
 }
 const atlas=Buffer.alloc(192*128*4);
 for(let a=0;a<4;a++)for(let f=0;f<8;f++){
  const out=Buffer.alloc(24*32*4),key=si+'_'+a+'_'+f;
  for(const l of p.layers.filter(l=>l.sheetIndex===si)){
   const b=dec(l.frameData[key].dataURL);for(let n=0;n<b.length;n+=4){const alpha=b[n+3]/255;if(!alpha)continue;const prev=out[n+3]/255,total=alpha+prev*(1-alpha);for(let c=0;c<3;c++)out[n+c]=Math.round((b[n+c]*alpha+out[n+c]*prev*(1-alpha))/total);out[n+3]=Math.round(total*255);}
  }
  for(let y=0;y<32;y++)out.copy(atlas,((a*32+y)*192+f*24)*4,y*24*4,(y+1)*24*4);
 }
 sheet.imageDataURL='data:image/png;base64,'+png(atlas,192,128).toString('base64');fs.writeFileSync(D+'/puffs-contact.png',png(atlas,192,128));
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':r.headers.get('etag')},body:JSON.stringify(p)});assert(saved.ok,await saved.text());const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/puffs-readback.json',JSON.stringify(back));console.log(JSON.stringify({synced:changes,flavors:sheet.actions.map(a=>a.name),smokeFrames:8}));
})();
