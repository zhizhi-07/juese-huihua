const fs=require('fs'),path=require('path'),{fixture}=require('../../../test/clothing-sync.cjs');
const {createCanvas}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
(async()=>{const {p,app}=await fixture(),C=PE.ClothingSync,result=C.sync(app),fits=new Map(result.edits.map(e=>[e.key,e.image]));
const cv=createCanvas(870,610),ctx=cv.getContext('2d');ctx.fillStyle='#eee7df';ctx.fillRect(0,0,870,610);
for(let a=0;a<3;a++){
 const direction=p.spriteSheets[2].actions[a].direction;console.log(direction);
 for(let f=1;f<=3;f++){
 const key='2_'+a+'_'+f,b=C.base(p,2,a,f,'body'),h=C.base(p,2,a,f,'head'),hands=['hand 2','hand'].map(n=>C.base(p,2,a,f,n)),c=fits.get(key);
 const rows=[];for(let y=0;y<b.height;y++){let s='',t='';for(let x=0;x<b.width;x++){const i=(y*b.width+x)*4;s+=b.data[i+3]?(b.data[i]===224?'s':'b'):'.';t+=c.data[i+3]?c.data[i].toString(16).padStart(2,'0')+' ':'.. ';}if(/[bs]/.test(s))rows.push(y+' '+s+' '+t.trim())}console.log(key,rows.join('\n'));
 for(let v=0;v<2;v++){
 const ox=(f-1)*290+v*128+16,oy=a*200+38;ctx.font='15px Arial';ctx.fillStyle=f===2?'#903018':'#333';ctx.fillText(direction+' '+(f+1)+' / '+(v?'clothes':'base'),ox,oy-12);
 for(const im of [hands[0],b,h,...(v?[c]:[]),hands[1]])for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const j=(y*im.width+x)*4,[r,g,bl,al]=im.data.subarray(j,j+4);if(al){ctx.fillStyle='rgba('+[r,g,bl,al/255].join()+')';ctx.fillRect(ox+x*6,oy+y*6,6,6)}}
 }
 }
}fs.writeFileSync(path.join(__dirname,'frames.png'),cv.toBuffer('image/png'))})().catch(e=>{console.error(e);process.exitCode=1});
