const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),vm=require('vm');
const {createCanvas,ImageData,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const out=path.resolve('自检记录/像素转像素-80008-80010-20261031');
const surf=(w,h)=>{let c=createCanvas(w,h);c.getContext('2d').imageSmoothingEnabled=false;return c};
(async()=>{
let r=await fetch('http://127.0.0.1:8765/api/project?id=character-gold-mix-1793320553623');assert(r.ok);let raw=await r.text(),p=JSON.parse(raw);
fs.writeFileSync(path.join(out,'source-project.json'),raw);fs.writeFileSync(path.join(out,'source-etag.txt'),r.headers.get('etag'));
fs.writeFileSync(path.join(out,'meta.json'),JSON.stringify({id:'character-pixel-mix-'+Date.now(),sourceId:'character-gold-mix-1793320553623',sourceETag:r.headers.get('etag'),sourceSHA256:crypto.createHash('sha256').update(raw).digest('hex')},null,2));
let sources=['TV/Female/TV_FrontHair1_p80008.png','TV/Female/TV_RearHair1_p80010.png','TV/Female/TV_RearHair2_p80010.png','Variation/Female/icon_FrontHair_p80008.png','Variation/Female/icon_RearHair_p80010.png'],manifest=[];
let contact=surf(1200,800),g=contact.getContext('2d');g.fillStyle='#39424e';g.fillRect(0,0,1200,800);g.fillStyle='white';g.font='18px sans-serif';
for(let [i,n]of sources.entries()){let b=fs.readFileSync('C:/Users/Administrator/Desktop/衣服/衣服/10/'+n),f=path.join(out,path.basename(n));fs.writeFileSync(f,b);let im=await loadImage(b);manifest.push({path:n,sha256:crypto.createHash('sha256').update(b).digest('hex'),width:im.width,height:im.height});let x=i<3?i*300:900,y=i<3?0:(i-3)*340;g.fillText(path.basename(n),x+4,y+20);g.drawImage(im,x,y+30,im.width*(i<3?2:4),im.height*(i<3?2:4))}
fs.writeFileSync(path.join(out,'source-manifest.json'),JSON.stringify(manifest,null,2));fs.writeFileSync(path.join(out,'来源放大.png'),contact.toBuffer('image/png'));
global.window=global;global.ImageData=ImageData;vm.runInThisContext(fs.readFileSync('js/core.js','utf8'));
let c=surf(900,450),cg=c.getContext('2d');cg.fillStyle='#d1d9d5';cg.fillRect(0,0,900,450);
let base=require('../../js/character-base.js')(structuredClone(p));fs.writeFileSync(path.join(out,'branch-before-hair.json'),JSON.stringify(base));
for(let ai=0;ai<3;ai++){let key=`8_${ai}_0`,tile=surf(36,36),tg=tile.getContext('2d');for(let l of PE.getRenderLayers(base,8,ai))if(l.sheetIndex===8&&!l.isGroup&&l.visible!==false&&l.frameData?.[key])tg.drawImage(await loadImage(l.frameData[key].dataURL),0,0);cg.drawImage(tile,ai*300,0,288,288);
let head=base.layers.find(l=>l.sheetIndex===8&&l.name==='head'&&l.frameData?.[key]),hc=surf(36,36);hc.getContext('2d').drawImage(await loadImage(head.frameData[key].dataURL),0,0);let d=hc.getContext('2d').getImageData(0,0,36,36).data;console.log('HEAD',ai,p.spriteSheets[8].actions[ai].direction);for(let y=0;y<24;y++)console.log(String(y).padStart(2),Array.from({length:36},(_,x)=>d[(y*36+x)*4+3]?'#':'.').join(''));
}
fs.writeFileSync(path.join(out,'当前素体.png'),c.toBuffer('image/png'));console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
