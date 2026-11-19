const fs=require('fs'),zlib=require('zlib'),assert=require('assert');
const D=__dirname,W=40,H=36;
const helper=fs.readFileSync(D+'/complete.cjs','utf8');
const png=Function('zlib','W','H',helper.slice(helper.indexOf('function crc('),helper.indexOf('function fill('))+';return png;')(zlib,W,H);
function decode(uri){const b=Buffer.from(uri.split(',')[1],'base64'),parts=[];for(let n=8;n<b.length;){const length=b.readUInt32BE(n);if(b.toString('ascii',n+4,n+8)==='IDAT')parts.push(b.subarray(n+8,n+8+length));n+=length+12;}const rows=zlib.inflateSync(Buffer.concat(parts)),pixels=Buffer.alloc(W*H*4);for(let y=0;y<H;y++){const filter=rows[y*(W*4+1)];for(let x=0;x<W*4;x++){const n=y*W*4+x,a=x>=4?pixels[n-4]:0,b=y?pixels[n-W*4]:0,c=y&&x>=4?pixels[n-W*4-4]:0;let v=0;if(filter===1)v=a;if(filter===2)v=b;if(filter===3)v=Math.floor((a+b)/2);if(filter===4){const q=a+b-c,A=Math.abs(q-a),B=Math.abs(q-b),C=Math.abs(q-c);v=A<=B&&A<=C?a:B<=C?b:c;}pixels[n]=(rows[y*(W*4+1)+1+x]+v)&255;}}return pixels;}


(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url),raw=await r.text(),p=JSON.parse(raw);
 fs.writeFileSync(D+'/before-pot-scene.json',raw);fs.writeFileSync(D+'/before-pot-scene.etag',r.headers.get('etag'));
 assert(!p.spriteSheets.some(s=>s.name==='锅'));
 const si=p.spriteSheets.length,body=decode(p.layers.find(l=>l.name==='锅').frameData['0_0_0'].dataURL),soup=Buffer.alloc(W*H*4);
 // Only the warm interior belongs to the soup; preserve the metal rim and handles.
 for(let y=15;y<=20;y++)for(let x=5;x<=17;x++){const n=(y*W+x)*4;if(body[n+3]&&body[n]>body[n+1]*1.12&&body[n]>body[n+2]*1.12){body.copy(soup,n,n,n+4);body.fill(0,n,n+4);}}
 assert(soup.some((v,n)=>n%4===3&&v));
 function crop(b){const out=Buffer.alloc(24*32*4);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const X=x+1,Y=y+5;if(X<24&&Y<32)b.copy(out,(Y*24+X)*4,(y*W+x)*4,(y*W+x)*4+4);}return out;}
 const pot=crop(body),base=crop(soup),uri=b=>'data:image/png;base64,'+png(b,24,32).toString('base64');
 const names=['原汤','番茄汤','牛肉汤','菌菇汤'],layers=['锅体','汤底','烟雾'].map(name=>({sheetIndex:si,parent:null,name,visible:true,locked:false,opacity:1,frameData:{}})),actions=[];
 function pixel(b,x,y,c){const n=(y*24+x)*4;if(x>=0&&x<24&&y>=0&&y<32&&base[n+3])b.set([...c,255],n);}
 const previews=[];
 for(let a=0;a<4;a++){
  const broth=Buffer.from(base);
  if(a)for(let n=0;n<broth.length;n+=4)if(broth[n+3]){const light=base[n]+base[n+1]+base[n+2]>430;broth.set([...(a===1?(light?[226,135,76]:[168,66,45]):a===2?(light?[178,123,69]:[115,70,45]):(light?[215,192,135]:[166,141,93])),255],n);}
  if(a===1){[[10,22],[13,23],[15,21]].forEach(([x,y])=>{pixel(broth,x,y,[241,101,60]);pixel(broth,x+1,y,[191,55,40]);});pixel(broth,12,21,[112,142,65]);}
  if(a===2){[[9,22],[13,21],[14,23]].forEach(([x,y])=>{pixel(broth,x,y,[105,63,44]);pixel(broth,x+1,y,[160,103,68]);pixel(broth,x,y+1,[137,81,52]);});pixel(broth,11,23,[104,136,66]);}
  if(a===3){[[10,21],[14,22],[12,23]].forEach(([x,y])=>{pixel(broth,x,y,[115,91,70]);pixel(broth,x+1,y,[227,211,171]);pixel(broth,x,y+1,[223,202,157]);});}
  const frames=[];
  for(let f=0;f<8;f++){
   const smoke=Buffer.alloc(24*32*4);
   for(let j=0;j<10;j++){
    const age=(j*1.8+f*2.25)%18,y=Math.round(20-age),x=Math.round(12+Math.sin(age*.43-f*Math.PI/4)*1.8),alpha=Math.round(190*Math.min(1,age/3)*Math.min(1,(18-age)/4));
    for(let dy=0;dy<2;dy++)for(let dx=0;dx<3;dx++){const n=((y+dy)*24+x+dx-1)*4;smoke.set([204,216,213,Math.max(smoke[n+3],alpha)],n);}
   }
   const key=si+'_'+a+'_'+f;[pot,broth,smoke].forEach((b,i)=>layers[i].frameData[key]={width:24,height:32,dataURL:uri(b)});
   const composite=Buffer.alloc(24*32*4);for(const b of [pot,broth,smoke])for(let n=0;n<b.length;n+=4){const alpha=b[n+3]/255;if(!alpha)continue;const old=composite[n+3]/255,out=alpha+old*(1-alpha);for(let c=0;c<3;c++)composite[n+c]=Math.round((b[n+c]*alpha+composite[n+c]*old*(1-alpha))/out);composite[n+3]=Math.round(out*255);}
   previews.push(composite);frames.push({sheetIndex:si,sourceX:f*24,sourceY:a*32,width:24,height:32,locked:false,lockedRegions:[],status:'completed',duration:140,notes:names[a]+' · 飘烟 '+(f+1)+'/8'});
  }
  actions.push({name:names[a],direction:'none',frames});
 }
 const atlas=Buffer.alloc(192*128*4);previews.forEach((b,i)=>{for(let y=0;y<32;y++)b.copy(atlas,((Math.floor(i/8)*32+y)*192+i%8*24)*4,y*24*4,(y+1)*24*4);});
 p.spriteSheets.push({name:'锅',frameWidth:24,frameHeight:32,columns:8,rows:4,spacingX:0,spacingY:0,offsetX:0,offsetY:0,fps:7,useFrameDurations:true,imageDataURL:'data:image/png;base64,'+png(atlas,192,128).toString('base64'),actions});
 p.currentSheetIndex=si;p.currentActionIndex=0;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.length;p.layers.push(...layers);
 const before=JSON.parse(raw);assert.deepStrictEqual(p.layers.slice(0,before.layers.length),before.layers);assert.deepStrictEqual(p.spriteSheets.slice(0,si),before.spriteSheets);assert.equal(Object.keys(layers[0].frameData).length,32);assert.equal(new Set(Object.values(layers[2].frameData).map(f=>f.dataURL)).size,8);
 fs.writeFileSync(D+'/pot-animation-contact.png',png(atlas,192,128));fs.writeFileSync(D+'/pot-scene-candidate.json',JSON.stringify(p));
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':r.headers.get('etag')},body:JSON.stringify(p)});assert(saved.ok,await saved.text());const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/pot-scene-readback.json',JSON.stringify(back));console.log('Verified same project; existing scene unchanged; added pot scene, 4 soups, 8 smoke frames each, 3 layers.');
})();
