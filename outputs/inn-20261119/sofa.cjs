const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,h=fs.readFileSync(D+'/../noodle-stove-20261118/complete.cjs','utf8');
const png=Function('zlib',h.slice(h.indexOf('function crc('),h.indexOf('function fill('))+';return png;')(zlib);
const ref=JSON.parse(fs.readFileSync(D+'/sofa-samples.json','utf8').replace(/^\uFEFF/,''));
const W=32,H=21,K=[47,59,61],palette=[[113,105,69],[101,96,65],[88,82,57],[77,70,52],[65,63,47],[116,109,77]];
const distance=(a,b)=>a.reduce((s,v,i)=>s+(v-b[i])**2,0);
function color(rgb){return Math.max(...rgb)<59?K:palette.reduce((a,b)=>distance(rgb,a)<=distance(rgb,b)?a:b);}
const front=Buffer.alloc(W*H*4),back=Buffer.alloc(W*H*4);
const frontBounds=[[6,25],[5,26],[4,27],[3,28],[3,28],[2,29],[2,29],[1,30],[0,31],[0,31],[0,31],[0,31],[0,31],[0,31],[0,31],[0,31],[1,30],[2,29],[2,29],[3,28]];
for(let y=0;y<21;y++)for(let x=0;x<32;x++){
 const visible=y===20?(x>=3&&x<=4||x>=27&&x<=28):x>=frontBounds[y][0]&&x<=frontBounds[y][1];
 if(!visible)continue;
 // The exposed right cushion supplies the matching left cushion beneath the sitter.
 let sx=y>=2&&y<=18&&x>=5&&x<=14?31-x:x;
 if(y>=11&&y<=16&&x>=6&&x<=15)sx=17+x-6;
 const rgb=ref.front[y*32+sx];let c=color(rgb);
 if(y===0||y===20||y<20&&(x===frontBounds[y][0]||x===frontBounds[y][1]))c=K;
 front.set([...c,255],(y*W+x)*4);
}
for(let y=0;y<14;y++)for(let x=0;x<31;x++){
 let visible;
 if(y===0)visible=x>=2&&x<=4||x>=26&&x<=28;
 else if(y===1)visible=x>=1&&x<=5||x>=25&&x<=29;
 else if(y===2)visible=x>=1&&x<=29;
 else if(y<=10)visible=true;
 else if(y<=12)visible=x>=1&&x<=29;
 else visible=x>=2&&x<=28;
 if(!visible)continue;
 let c=color(ref.back[y*31+x]);
 if(y===0||y===13||y>=3&&y<=10&&(x===0||x===30)||y>=11&&(x===1||x===29))c=K;
 back.set([...c,255],((y+7)*W+x)*4);
}
const images=[front,back];
const uri=b=>'data:image/png;base64,'+png(b,W,H).toString('base64');
for(const [i,name] of ['正面','背面'].entries()){
 const b=images[i],scale=20,large=Buffer.alloc(W*H*scale*scale*4);
 for(let y=0;y<H*scale;y++)for(let x=0;x<W*scale;x++){const n=(Math.floor(y/scale)*W+Math.floor(x/scale))*4;b.copy(large,(y*W*scale+x)*4,n,n+4);}
 fs.writeFileSync(D+'/沙发-'+name+'-preview.png',png(large,W*scale,H*scale));fs.writeFileSync(D+'/沙发-'+name+'.png',png(b,W,H));
}
assert(!front.equals(back));assert(front.some(v=>v!==0)&&back.some(v=>v!==0));
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-inn-20261119',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 const name='沙发',si=p.spriteSheets.length;assert(!p.spriteSheets.some(s=>s.name===name));
 fs.writeFileSync(D+'/before-sofa.json',raw);fs.writeFileSync(D+'/before-sofa.etag',etag);fs.writeFileSync(D+'/before-sofa.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 const atlas=Buffer.concat(images);
 p.spriteSheets.push({name,frameWidth:W,frameHeight:H,columns:1,rows:2,spacingX:0,spacingY:0,offsetX:0,offsetY:0,fps:8,imageDataURL:'data:image/png;base64,'+png(atlas,W,H*2).toString('base64'),actions:['down','up'].map((direction,a)=>({name:a===0?'正面':'背面',direction,frames:[{sheetIndex:si,sourceX:0,sourceY:a*H,width:W,height:H,locked:false,lockedRegions:[],status:'completed',duration:0}]}))});
 const frameData={};images.forEach((b,a)=>frameData[si+'_'+a+'_0']={width:W,height:H,dataURL:uri(b)});
 p.layers.push({sheetIndex:si,parent:null,name:'沙发',visible:true,locked:false,opacity:1,frameData});
 p.currentSheetIndex=si;p.currentActionIndex=0;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.length-1;
 assert.deepStrictEqual(p.spriteSheets.slice(0,si),before.spriteSheets);assert.deepStrictEqual(p.layers.slice(0,before.layers.length),before.layers);assert.deepStrictEqual(p.sceneAssembly,before.sceneAssembly);
 assert.deepStrictEqual(p.spriteSheets[si].actions.map(a=>a.direction),['down','up']);
 fs.writeFileSync(D+'/sofa-candidate.json',JSON.stringify(p));
 if(!process.argv.includes('--save'))return console.log('One sofa material previewed, front/back direction fields down/up; existing materials unchanged.');
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const backRead=await(await fetch(url)).json();assert.deepStrictEqual(backRead,p);fs.writeFileSync(D+'/sofa-readback.json',JSON.stringify(backRead));console.log('Verified sofa in one sheet with front/down and back/up directions; other assets unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
