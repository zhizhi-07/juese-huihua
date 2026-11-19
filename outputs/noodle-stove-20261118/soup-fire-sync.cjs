const fs=require('fs'),zlib=require('zlib'),assert=require('assert');
const D=__dirname,W=40,H=36;
const helper=fs.readFileSync(D+'/complete.cjs','utf8');
const png=Function('zlib','W','H',helper.slice(helper.indexOf('function crc('),helper.indexOf('function fill('))+';return png;')(zlib,W,H);
function decode(uri){const b=Buffer.from(uri.split(',')[1],'base64'),parts=[];for(let n=8;n<b.length;){const length=b.readUInt32BE(n);if(b.toString('ascii',n+4,n+8)==='IDAT')parts.push(b.subarray(n+8,n+8+length));n+=length+12;}const rows=zlib.inflateSync(Buffer.concat(parts)),pixels=Buffer.alloc(W*H*4);for(let y=0;y<H;y++){const filter=rows[y*(W*4+1)];for(let x=0;x<W*4;x++){const n=y*W*4+x,a=x>=4?pixels[n-4]:0,b=y?pixels[n-W*4]:0,c=y&&x>=4?pixels[n-W*4-4]:0;let v=0;if(filter===1)v=a;if(filter===2)v=b;if(filter===3)v=Math.floor((a+b)/2);if(filter===4){const q=a+b-c,A=Math.abs(q-a),B=Math.abs(q-b),C=Math.abs(q-c);v=A<=B&&A<=C?a:B<=C?b:c;}pixels[n]=(rows[y*(W*4+1)+1+x]+v)&255;}}return pixels;}


(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url),raw=await r.text(),p=JSON.parse(raw),before=JSON.parse(raw);
 fs.writeFileSync(D+'/before-soup-fire.json',raw);fs.writeFileSync(D+'/before-soup-fire.etag',r.headers.get('etag'));fs.writeFileSync(D+'/before-soup-fire.sha256',require('crypto').createHash('sha256').update(raw).digest('hex'));
 const helper=fs.readFileSync(D+'/clean-smoke.cjs','utf8');
 const small=Function('require','__dirname',helper.slice(0,helper.indexOf('(async()=>')).replace('W=40,H=36','W=24,H=32')+';return decode;')(require,D);
 const si=p.spriteSheets.findIndex(s=>s.name==='锅'),soup=p.layers.find(l=>l.name==='汤底'&&l.sheetIndex===si);assert(soup);
 const originals=[];
 for(let a=0;a<4;a++){
  const first=soup.frameData[si+'_'+a+'_0'];originals.push(first.dataURL);const base=small(first.dataURL);
  for(let f=1;f<8;f++){
   const b=Buffer.from(base),highlight=[[243,191,125],[255,173,104],[213,166,104],[242,225,176]][a];
   function dot(x,y){const n=(y*24+x)*4;if(base[n+3])b.set([...highlight,255],n);}
   [[10,22,0],[14,23,3],[12,21,5]].forEach(([x,y,offset])=>{const phase=(f+offset)%8;if(phase===1)dot(x,y);if(phase===2||phase===3){dot(x,y);dot(x+1,y);dot(x,y+1);}if(phase===4){dot(x-1,y);dot(x+1,y);dot(x,y-1);dot(x,y+1);}if(phase===5){dot(x-1,y);dot(x+1,y);}});
   soup.frameData[si+'_'+a+'_'+f].dataURL='data:image/png;base64,'+png(b,24,32).toString('base64');
  }
 }
 const stove=p.spriteSheets.findIndex(s=>s.name==='灶台'),sheet=p.spriteSheets[stove],action=sheet.actions[0],fire=p.layers.find(l=>l.sheetIndex===stove&&l.name==='火');assert(fire&&action.frames.length===1);
 const patterns=['..r..r.. .rorrro. roryoyor .oyhyyo. .rooor..','....r... .r.ror.. roroyorr .oyhyyo. .rooor..','..r..... .ror.r.. roryror. .oyyhyo. .rooor..','...r.r.. ..roror. roroyorr .oyhyyo. .rooor..','..r..... .ror..r. royorror .oyyhyo. .rooor..','.....r.. ..r.ror. roroyorr .oyhyyo. .rooor..','...r.... .rror.r. royoryor .oyyhyo. .rooor..','..r..r.. .ror.ro. roryoyor .oyhyyo. .rooor..'];
 const colors={r:[177,76,51],o:[226,126,58],y:[247,184,79],h:[255,216,130]};
 for(let f=1;f<8;f++){
  action.frames.push({...structuredClone(action.frames[0]),sourceX:f*40,duration:110,notes:'炉火跳动 '+(f+1)+'/8'});
  for(const l of p.layers.filter(l=>l.sheetIndex===stove))l.frameData[stove+'_0_'+f]=structuredClone(l.frameData[stove+'_0_0']);
  const b=Buffer.alloc(W*H*4);patterns[f].split(' ').forEach((row,y)=>[...row].forEach((c,x)=>{if(colors[c])b.set([...colors[c],255],((29+y)*W+7+x)*4);}));fire.frameData[stove+'_0_'+f].dataURL='data:image/png;base64,'+png(b).toString('base64');
 }
 action.frames[0].duration=110;sheet.fps=9;sheet.useFrameDurations=true;
 function atlas(index,w,h,decodeFrame){const s=p.spriteSheets[index],cols=Math.max(...s.actions.map(a=>a.frames.length)),rows=s.actions.length,out=Buffer.alloc(cols*w*rows*h*4);
  s.actions.forEach((a,ai)=>a.frames.forEach((f,fi)=>{const frame=Buffer.alloc(w*h*4);for(const l of p.layers.filter(l=>l.sheetIndex===index)){const b=decodeFrame(l.frameData[index+'_'+ai+'_'+fi].dataURL);for(let n=0;n<b.length;n+=4){const alpha=b[n+3]/255;if(!alpha)continue;const prev=frame[n+3]/255,total=alpha+prev*(1-alpha);for(let c=0;c<3;c++)frame[n+c]=Math.round((b[n+c]*alpha+frame[n+c]*prev*(1-alpha))/total);frame[n+3]=Math.round(total*255);}}for(let y=0;y<h;y++)frame.copy(out,((ai*h+y)*cols*w+fi*w)*4,y*w*4,(y+1)*w*4);f.sourceX=fi*w;f.sourceY=ai*h;}));
  s.columns=cols;s.rows=rows;s.imageDataURL='data:image/png;base64,'+png(out,cols*w,rows*h).toString('base64');fs.writeFileSync(D+'/soup-fire-'+index+'.png',png(out,cols*w,rows*h));}
 atlas(si,24,32,small);atlas(stove,40,36,decode);
 originals.forEach((value,a)=>assert.equal(soup.frameData[si+'_'+a+'_0'].dataURL,value));
 for(const l of p.layers.filter(l=>l.sheetIndex===si&&l!==soup))assert.deepStrictEqual(l,before.layers.find(o=>o.sheetIndex===si&&o.name===l.name));
 assert.equal(new Set(Object.values(fire.frameData).map(f=>f.dataURL)).size,8);
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':r.headers.get('etag')},body:JSON.stringify(p)});assert(saved.ok,await saved.text());const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/soup-fire-readback.json',JSON.stringify(back));console.log('Verified four first soup frames preserved, later frames synced with bubbling; stove fire has 8 distinct looping frames.');
})();
