const h=require('../20261030-睡衣-character-gold-mix/render.cjs'),{fs,path,createCanvas}=h,assert=require('assert/strict'),png=require('../../scripts/png.cjs');
(async()=>{
const out=__dirname,before=JSON.parse(fs.readFileSync(path.join(out,'original.json'),'utf8')),p=structuredClone(before),cloth=p.layers.find(l=>l.sheetIndex===8&&l.name.startsWith('服装 /'));
const C={O:[120,132,153,255],B:[185,204,227,255],L:[206,222,239,255],S:[156,177,205,255],D:[139,158,187,255],W:[249,249,250,255],F:[223,229,240,255]};
for(let a=0;a<3;a++)for(let f=0;f<4;f++){
let key=`8_${a}_${f}`,top=f>=2?26:24,waist=f>=2?29:28,d=new Uint8Array(36*36*4);
const px=(x,y,c)=>{assert(x>=11&&x<=24&&y>=top&&y<=33);d.set(C[c],(y*36+x)*4)},row=(y,l,r,c)=>{for(let x=l;x<=r;x++)px(x,y,c)};
for(let y=top;y<=33;y++)for(let x=11;x<=24;x++){
let c='B';if(x===11||x===24)c='O';else if(x===12||x===23)c='S';else if(x===13)c='L';if(y===waist)c=x===11||x===24?'O':'S';
if(y>waist&&(x===17||x===18))c='O';if(y===33)c=x===11||x===24||x===17||x===18?'O':'F';px(x,y,c)}
if(a===1){row(top,13,16,'W');row(top,17,18,'F');row(top,19,22,'W');row(top+1,14,21,'W');row(top+2,16,19,'F');for(let y=top+3;y<=waist;y++)px(18,y,'F');if(waist-top>3){px(14,top+3,'W');px(22,top+3,'W')}}
if(a===2){row(top,14,21,'F');row(top+1,15,20,'W');if(waist-top>3){px(14,top+3,'W');px(21,top+3,'W')}}
if(a===0){
// Right-facing three-quarter view: broad side panel, narrow front opening, offset collar and legs.
for(let y=top;y<=33;y++)for(let x=12;x<=23;x++){
let c=x<=14?'S':x<=19?'B':'L';if(x===15)c='D';if(y===waist)c=x<=15?'D':'S';
if(y>waist){if(x===21)c='O';if(x===20||x===22)c='S';}
if(y===33)c=x===21?'O':'F';px(x,y,c)}
row(top,17,20,'F');row(top,23,23,'W');row(top+1,18,21,'W');px(23,top+1,'F');row(top+2,20,22,'F');
for(let y=top+3;y<=waist;y++)px(22,y,'F');if(waist-top>3){px(18,top+3,'W');px(13,top+3,'F');}
}
for(let x of a===0?[17,23]:[14,21])if(waist+1<33)px(x,waist+1,'W');
cloth.frameData[key]={width:36,height:36,dataURL:'data:image/png;base64,'+png.encode(36,36,d).toString('base64')};
// No clothing pixels in arm/hand space; sleeves from the rejected pass are removed.
for(let y=0;y<36;y++)for(let x=0;x<36;x++)if(x<11||x>24)assert.equal(d[(y*36+x)*4+3],0);
}
// Preserve complete clothing under occlusion, and keep original near hands in front.
const old=[...p.layers],near=p.layers.filter(l=>l.sheetIndex===8&&l.name==='hand');p.layers=p.layers.filter(l=>!near.includes(l));let pos=p.layers.indexOf(cloth)+1;p.layers.splice(pos,0,...near);const map=old.map(l=>p.layers.indexOf(l));for(let l of p.layers)if(l.parent!=null)l.parent=map[l.parent];p.currentLayerIndex=map[p.currentLayerIndex];
for(let i=0;i<before.layers.length;i++){if(before.layers[i].name===cloth.name)continue;let expected=structuredClone(before.layers[i]);if(expected.parent!=null)expected.parent=map[expected.parent];assert.deepEqual(p.layers[map[i]],expected)}assert.deepEqual(p.spriteSheets,before.spriteSheets);
fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));let q=await h.load(p);h.sheet(q,path.join(out,'修正-所有帧.png'));
let hero=createCanvas(648,216),g=hero.getContext('2d');g.imageSmoothingEnabled=false;for(let [i,a]of [1,0,2].entries()){g.fillStyle='#eee6ef';g.fillRect(i*216,0,216,216);g.drawImage(h.render(q,a,0),i*216,0,216,216)}fs.writeFileSync(path.join(out,'修正-三方向.png'),hero.toBuffer('image/png'));
for(let l of q.layers)if(l.name.startsWith('头发 /'))l.visible=false;h.sheet(q,path.join(out,'修正-无遮发.png'));
console.log('Candidate checked: only outfit changed; hands in front, no sleeve pixels; side panel and front opening offset right.');
})().catch(e=>{console.error(e);process.exitCode=1});
