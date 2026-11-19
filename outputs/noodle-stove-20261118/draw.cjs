const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const W=40,H=36,D=__dirname;
const P={k:'303c3d',d:'626463',s:'898984',m:'a7a89d',l:'c0c0aa',h:'d2d0b7',w:'b18b69',b:'87655b',q:'a37c62',g:'6f8c42',G:'97ac56',v:'b8bf75',r:'ad5640',o:'da8549',y:'efba64',a:'c7d1c8',t:'8d999a',u:'697779'};
const names=['灶台本体','锅','菜板','菜','火'],layers=names.map(()=>Buffer.alloc(W*H*4));
function rect(i,x,y,w,h,c){const rgb=P[c].match(/../g).map(n=>parseInt(n,16));for(let Y=y;Y<y+h;Y++)for(let X=x;X<x+w;X++){assert(X>=0&&X<W&&Y>=0&&Y<H);layers[i].set([...rgb,255],(Y*W+X)*4);}}
function grid(i,x,y,rows){rows.split(' ').forEach((row,Y)=>[...row].forEach((c,X)=>{if(c!=='.')rect(i,x+X,y+Y,1,1,c);}));}
// Native pixel drawing: the reference's long stone stove, including its two fire openings.
rect(0,2,16,36,17,'k');rect(0,3,17,34,15,'l');rect(0,3,25,34,7,'m');rect(0,3,24,34,1,'s');
grid(0,3,17,'mllhll lllhll llhlll');
[[17,18,2,1],[19,17,1,2],[18,20,1,1],[21,21,1,1],[16,23,2,1],[21,24,3,1],[4,26,1,2],[5,28,2,1],[17,26,2,1],[20,28,1,3],[23,27,1,3],[34,25,2,1],[35,27,2,2],[33,30,2,1],[15,30,2,2]].forEach(a=>rect(0,...a,'s'));
grid(0,7,27,'...kkkk... ..kkkkkk.. .kkkkkkkk. kkkkkkkkkk kkkkkkkkkk kkkkkkkkkk');
grid(0,26,27,'..kkkkk.. .ksssss ksqwqbsk kqwqwqbk kbqwqbsk kkkkkkkk');
// The pot includes its contents and steam so the project remains exactly five layers.
grid(1,4,12,'.....kkkk...... ....kaaaak..... ...kattttak.... ..kattrottak... ..ktroryrrtk... kkkroyoorytkkk kktoryoryrtkkk ..kaaaaaaatk... ..kttttttttk... ...kttttttk.... ...kuuuuuuk.... ....kkkkkk.....');
grid(1,9,1,'.....aa ..aaaaa ..aaa.. .aaaa.. ..aaaa. ...aaaa ....aaa ...aaa. ...aa.. ..aaa.. ...aa..');
rect(2,25,17,11,7,'b');rect(2,26,17,9,5,'w');rect(2,26,22,9,1,'q');rect(2,27,18,7,1,'q');rect(2,26,21,9,1,'q');
grid(3,27,17,'......G. ....GGg. ..vGgg.. .GGgg... Ggg..... .g......');
grid(4,9,28,'...r... ..ror.. .royor. royyyor .oyoyo.');
function crc(b){let c=0xffffffff;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(t,b){const tag=Buffer.from(t),n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(b.length);c.writeUInt32BE(crc(Buffer.concat([tag,b])));return Buffer.concat([n,tag,b,c]);}
function png(p,w=W,h=H){const head=Buffer.alloc(13);head.writeUInt32BE(w);head.writeUInt32BE(h,4);head[8]=8;head[9]=6;const rows=[];for(let y=0;y<h;y++)rows.push(Buffer.from([0]),p.subarray(y*w*4,(y+1)*w*4));return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',head),chunk('IDAT',zlib.deflateSync(Buffer.concat(rows))),chunk('IEND',Buffer.alloc(0))]);}
const composite=Buffer.alloc(W*H*4);layers.forEach(p=>{for(let n=0;n<p.length;n+=4)if(p[n+3])p.copy(composite,n,n,n+4);});
const uri=p=>'data:image/png;base64,'+png(p).toString('base64');
const project={version:'1.0',name:'面馆',bgColor:'#2d383a',gridColor:'rgba(48,68,62,.2)',currentSheetIndex:0,currentActionIndex:0,currentFrameIndex:0,currentLayerIndex:0,palette:Object.values(P).map(c=>({r:parseInt(c.slice(0,2),16),g:parseInt(c.slice(2,4),16),b:parseInt(c.slice(4,6),16),a:255})),spriteSheets:[{name:'灶台',frameWidth:W,frameHeight:H,columns:1,rows:1,spacingX:0,spacingY:0,offsetX:0,offsetY:0,fps:8,imageDataURL:uri(composite),actions:[{name:'灶台',direction:'none',frames:[{sheetIndex:0,sourceX:0,sourceY:0,width:W,height:H,locked:false,lockedRegions:[],status:'completed',duration:0,notes:'按用户参考图临摹灶台；五层：灶台本体、锅（含汤与蒸汽）、菜板、菜、火。'}]}]}],layers:names.map((name,i)=>({sheetIndex:0,parent:null,name,visible:true,locked:false,opacity:1,frameData:{'0_0_0':{width:W,height:H,dataURL:uri(layers[i])}}}))};
fs.writeFileSync(D+'/candidate.json',JSON.stringify(project));fs.writeFileSync(D+'/stove.png',png(composite));
const scale=12,preview=Buffer.alloc(W*H*scale*scale*4);for(let y=0;y<H*scale;y++)for(let x=0;x<W*scale;x++){const n=(Math.floor(y/scale)*W+Math.floor(x/scale))*4;composite.copy(preview,(y*W*scale+x)*4,n,n+4);}fs.writeFileSync(D+'/preview.png',png(preview,W*scale,H*scale));
(async()=>{const id='scene-noodle-shop-20261118',url='http://127.0.0.1:8765/api/project?id='+id;const before=await fetch(url);fs.writeFileSync(D+'/before.json',await before.text());fs.writeFileSync(D+'/before.etag',before.headers.get('etag')||'none');assert.equal(before.status,404,'New project must not overwrite an existing project');assert.equal(layers.length,5);layers.forEach(p=>assert(p.some((v,i)=>i%4===3&&v===255)));const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':'none'},body:JSON.stringify(project)});assert(saved.ok,await saved.text());const after=await fetch(url),bytes=await after.text();fs.writeFileSync(D+'/readback.json',bytes);fs.writeFileSync(D+'/readback.etag',after.headers.get('etag'));fs.writeFileSync(D+'/readback.sha256',crypto.createHash('sha256').update(bytes).digest('hex'));assert.deepStrictEqual(JSON.parse(bytes),project);console.log('Verified new project: '+id+'; five layers; 40x36; exact readback.');})();
