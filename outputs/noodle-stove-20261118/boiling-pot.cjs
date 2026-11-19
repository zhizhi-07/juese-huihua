const fs=require('fs'),zlib=require('zlib'),assert=require('assert');
const D=__dirname,W=40,H=36;
const helper=fs.readFileSync(D+'/complete.cjs','utf8');
const png=Function('zlib','W','H',helper.slice(helper.indexOf('function crc('),helper.indexOf('function fill('))+';return png;')(zlib,W,H);
function decode(uri){const b=Buffer.from(uri.split(',')[1],'base64'),parts=[];for(let n=8;n<b.length;){const length=b.readUInt32BE(n);if(b.toString('ascii',n+4,n+8)==='IDAT')parts.push(b.subarray(n+8,n+8+length));n+=length+12;}const rows=zlib.inflateSync(Buffer.concat(parts)),pixels=Buffer.alloc(W*H*4);for(let y=0;y<H;y++){const filter=rows[y*(W*4+1)];for(let x=0;x<W*4;x++){const n=y*W*4+x,a=x>=4?pixels[n-4]:0,b=y?pixels[n-W*4]:0,c=y&&x>=4?pixels[n-W*4-4]:0;let v=0;if(filter===1)v=a;if(filter===2)v=b;if(filter===3)v=Math.floor((a+b)/2);if(filter===4){const q=a+b-c,A=Math.abs(q-a),B=Math.abs(q-b),C=Math.abs(q-c);v=A<=B&&A<=C?a:B<=C?b:c;}pixels[n]=(rows[y*(W*4+1)+1+x]+v)&255;}}return pixels;}


(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url),raw=await r.text(),p=JSON.parse(raw),si=p.spriteSheets.findIndex(s=>s.name==='锅');assert(si>=0);
 fs.writeFileSync(D+'/before-boiling-pot.json',raw);fs.writeFileSync(D+'/before-boiling-pot.etag',r.headers.get('etag'));
 const sheet=p.spriteSheets[si],pot=p.layers.find(l=>l.sheetIndex===si&&l.name==='锅体'),soup=p.layers.find(l=>l.sheetIndex===si&&l.name==='汤底');assert(pot&&soup);
 // Decode the cropped 24x32 frames through the same PNG filter implementation.
 const helper=fs.readFileSync(D+'/clean-smoke.cjs','utf8');
 const decodeSmall=Function('require','__dirname',helper.slice(0,helper.indexOf('(async()=>')).replace('W=40,H=36','W=24,H=32')+';return decode;')(require,D);
 const uri=b=>'data:image/png;base64,'+png(b,24,32).toString('base64');
 const before=JSON.parse(raw),basePot=decodeSmall(pot.frameData[si+'_0_0'].dataURL);
 // Closed inner bowl behind the removable broth: dark inner walls and a lit metal bottom.
 for(let y=20;y<=25;y++)for(let x=6;x<=16;x++){
  const n=(y*24+x)*4;if(basePot[n+3])continue;
  const depth=y-20,edge=x===6||x===16;
  basePot.set([...(edge?[71,78,83]:depth<2?[80,84,92]:depth<4?[99,103,111]:[127,132,139]),255],n);
 }
 const flavors=[[243,191,125],[255,173,104],[213,166,104],[242,225,176]];
 for(let a=0;a<sheet.actions.length;a++){
  const base=decodeSmall(soup.frameData[si+'_'+a+'_0'].dataURL),mask=Buffer.from(base);
  for(let f=0;f<8;f++){
   const key=si+'_'+a+'_'+f,b=Buffer.from(base),color=flavors[a];
   function dot(x,y,c){const n=(y*24+x)*4;if(x>=0&&x<24&&y>=0&&y<32&&mask[n+3])b.set([...c,255],n);}
   [[10,22,0],[14,23,3],[12,21,5]].forEach(([x,y,offset])=>{
    const phase=(f+offset)%8;
    if(phase===1)dot(x,y,color);
    if(phase===2||phase===3){dot(x,y,color);dot(x+1,y,color);dot(x,y+1,color);}
    if(phase===4){dot(x-1,y,color);dot(x+1,y,color);dot(x,y-1,color);dot(x,y+1,color);}
    if(phase===5){dot(x-1,y,color);dot(x+1,y,color);}
   });
   pot.frameData[key].dataURL=uri(basePot);soup.frameData[key].dataURL=uri(b);
   sheet.actions[a].frames[f].notes=sheet.actions[a].name+' · 沸腾与飘烟 '+(f+1)+'/8';
  }
  assert(new Set(sheet.actions[a].frames.map((_,f)=>soup.frameData[si+'_'+a+'_'+f].dataURL)).size>1);
 }
 const atlas=Buffer.alloc(192*128*4);
 for(let a=0;a<4;a++)for(let f=0;f<8;f++){
  const frame=Buffer.alloc(24*32*4),key=si+'_'+a+'_'+f;
  for(const l of p.layers.filter(l=>l.sheetIndex===si)){
   const b=decodeSmall(l.frameData[key].dataURL);for(let n=0;n<b.length;n+=4){const alpha=b[n+3]/255;if(!alpha)continue;const old=frame[n+3]/255,out=alpha+old*(1-alpha);for(let c=0;c<3;c++)frame[n+c]=Math.round((b[n+c]*alpha+frame[n+c]*old*(1-alpha))/out);frame[n+3]=Math.round(out*255);}
  }
  for(let y=0;y<32;y++)frame.copy(atlas,((a*32+y)*192+f*24)*4,y*24*4,(y+1)*24*4);
 }
 sheet.imageDataURL='data:image/png;base64,'+png(atlas,192,128).toString('base64');
 const empty=Buffer.alloc(24*32*16*16*4);for(let y=0;y<512;y++)for(let x=0;x<384;x++){const n=(Math.floor(y/16)*24+Math.floor(x/16))*4;basePot.copy(empty,(y*384+x)*4,n,n+4);}fs.writeFileSync(D+'/empty-pot-preview.png',png(empty,384,512));fs.writeFileSync(D+'/boiling-contact.png',png(atlas,192,128));
 for(const l of p.layers.filter(l=>l.sheetIndex!==si))assert.deepStrictEqual(l,before.layers.find(b=>b.name===l.name&&b.sheetIndex===l.sheetIndex));
 for(let a=0;a<4;a++)for(let f=0;f<8;f++){const b=decodeSmall(soup.frameData[si+'_'+a+'_'+f].dataURL);for(let n=0;n<b.length;n+=4)if(b[n+3])assert(basePot[n+3],'Empty pot must cover all broth pixels');}
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':r.headers.get('etag')},body:JSON.stringify(p)});assert(saved.ok,await saved.text());const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/boiling-readback.json',JSON.stringify(back));console.log('Verified complete empty pot and animated bubbling for all four broths; existing stove unchanged.');
})();
