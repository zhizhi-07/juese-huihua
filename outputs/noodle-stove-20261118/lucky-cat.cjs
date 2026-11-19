const fs=require('fs'),zlib=require('zlib'),assert=require('assert');
const D=__dirname,W=40,H=36;
const helper=fs.readFileSync(D+'/complete.cjs','utf8');
const png=Function('zlib','W','H',helper.slice(helper.indexOf('function crc('),helper.indexOf('function fill('))+';return png;')(zlib,W,H);
function decode(uri){const b=Buffer.from(uri.split(',')[1],'base64'),parts=[];for(let n=8;n<b.length;){const length=b.readUInt32BE(n);if(b.toString('ascii',n+4,n+8)==='IDAT')parts.push(b.subarray(n+8,n+8+length));n+=length+12;}const rows=zlib.inflateSync(Buffer.concat(parts)),pixels=Buffer.alloc(W*H*4);for(let y=0;y<H;y++){const filter=rows[y*(W*4+1)];for(let x=0;x<W*4;x++){const n=y*W*4+x,a=x>=4?pixels[n-4]:0,b=y?pixels[n-W*4]:0,c=y&&x>=4?pixels[n-W*4-4]:0;let v=0;if(filter===1)v=a;if(filter===2)v=b;if(filter===3)v=Math.floor((a+b)/2);if(filter===4){const q=a+b-c,A=Math.abs(q-a),B=Math.abs(q-b),C=Math.abs(q-c);v=A<=B&&A<=C?a:B<=C?b:c;}pixels[n]=(rows[y*(W*4+1)+1+x]+v)&255;}}return pixels;}


(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url),raw=await r.text(),p=JSON.parse(raw),before=JSON.parse(raw);
 fs.writeFileSync(D+'/before-lucky-cat.json',raw);fs.writeFileSync(D+'/before-lucky-cat.etag',r.headers.get('etag'));fs.writeFileSync(D+'/before-lucky-cat.sha256',require('crypto').createHash('sha256').update(raw).digest('hex'));
 assert(!p.spriteSheets.some(s=>s.name==='招财猫'));
 // One source pixel per visible reference block; no shelf or surrounding room.
 const rows=[
 'ww...ww.',
 'rrwwwrr.',
 'wwwww w.'.replace(' ', 'w'),
 'wkwwkw.w',
 'wwrwwwww',
 '.rrrrrww',
 'wgYgwwss',
 'wwowww..',
 'woyoww..',
 'wwowww..',
 ];
 const colors={w:[232,232,204],r:[180,91,73],k:[47,59,61],g:[68,126,84],Y:[213,191,88],o:[166,125,65],y:[229,192,111],s:[180,155,126]};
 const width=10,height=12,body=Buffer.alloc(width*height*4),outline=Buffer.alloc(width*height*4);
 rows.forEach((row,y)=>[...row].forEach((c,x)=>{if(colors[c])body.set([...colors[c],255],((y+1)*width+x+1)*4);}));
 // Four-neighbor border completes every exposed edge while retaining the square pixel silhouette.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const n=(y*width+x)*4;if(body[n+3])continue;
  if([[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(([X,Y])=>X>=0&&X<width&&Y>=0&&Y<height&&body[(Y*width+X)*4+3]))outline.set([47,59,61,255],n);
 }
 const all=Buffer.from(outline);for(let n=0;n<body.length;n+=4)if(body[n+3])body.copy(all,n,n,n+4);
 const si=p.spriteSheets.length,uri=b=>'data:image/png;base64,'+png(b,width,height).toString('base64');
 p.spriteSheets.push({name:'招财猫',frameWidth:width,frameHeight:height,columns:1,rows:1,spacingX:0,spacingY:0,offsetX:0,offsetY:0,fps:8,imageDataURL:uri(all),actions:[{name:'招财猫',direction:'',frames:[{sheetIndex:si,sourceX:0,sourceY:0,width,height,locked:false,lockedRegions:[],status:'completed',duration:0,notes:'按参考临摹；奶白猫、红耳与围巾、绿金铃铛、金色钱币；补全单像素描边，紧贴画布。'}]}]});
 p.currentSheetIndex=si;p.currentActionIndex=0;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.length+1;
 for(const [name,b] of [['招财猫描边',outline],['招财猫',body]])p.layers.push({sheetIndex:si,parent:null,name,visible:true,locked:false,opacity:1,frameData:{[si+'_0_0']:{width,height,dataURL:uri(b)}}});
 assert.deepStrictEqual(p.layers.slice(0,before.layers.length),before.layers);assert.deepStrictEqual(p.spriteSheets.slice(0,si),before.spriteSheets);
 for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++)if(body[(y*width+x)*4+3])for(const [X,Y] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])assert(all[(Y*width+X)*4+3],'Missing outline');
 const scale=32,large=Buffer.alloc(width*height*scale*scale*4);for(let y=0;y<height*scale;y++)for(let x=0;x<width*scale;x++){const n=(Math.floor(y/scale)*width+Math.floor(x/scale))*4;all.copy(large,(y*width*scale+x)*4,n,n+4);}fs.writeFileSync(D+'/lucky-cat-preview.png',png(large,width*scale,height*scale));fs.writeFileSync(D+'/lucky-cat.png',png(all,width,height));
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':r.headers.get('etag')},body:JSON.stringify(p)});assert(saved.ok,await saved.text());const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/lucky-cat-readback.json',JSON.stringify(back));console.log('Verified new lucky cat scene in same project; 10x12 tight canvas, complete #2f3b3d outline, existing scenes unchanged.');
})();
