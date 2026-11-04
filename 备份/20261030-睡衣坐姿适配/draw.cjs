const h=require('./render.cjs'),{fs,path,createCanvas}=h,assert=require('assert/strict'),png=require('../../scripts/png.cjs');
(async()=>{
const out=__dirname,before=JSON.parse(fs.readFileSync(path.join(out,'concurrent.json'),'utf8')),p=structuredClone(before),si=p.spriteSheets.findIndex(s=>s.name==='original32_sit');assert.equal(si,10);
const C={O:[120,132,153,255],B:[185,204,227,255],L:[206,222,239,255],S:[156,177,205,255],D:[139,158,187,255],W:[249,249,250,255],F:[223,229,240,255]};
let outfit={sheetIndex:si,isGroup:false,parent:null,depth:0,referenceOnly:false,name:'服装 / 01 浅蓝雪花绒领睡衣',visible:true,locked:false,opacity:1,frameData:{}};
for(let a=0;a<3;a++)for(let f=0;f<4;f++){
let key=`${si}_${a}_${f}`,body=p.layers.find(l=>l.sheetIndex===si&&l.name==='body'&&l.frameData[key]),im=png.decode(Buffer.from(body.frameData[key].dataURL.split(',')[1],'base64')),d=new Uint8Array(32*32*4),top=24+(f>=2?1:0),waist=a===2?28:26;
const has=(x,y)=>x>=0&&x<32&&y>=top&&y<32&&im.data[(y*32+x)*4+3]>0,px=(x,y,c)=>{if(has(x,y))d.set(C[c],(y*32+x)*4)},row=(y,l,r,c)=>{for(let x=l;x<=r;x++)px(x,y,c)};
for(let y=top;y<32;y++)for(let x=0;x<32;x++)if(has(x,y)){
let edge=!has(x-1,y)||!has(x+1,y),c=edge?'O':'B';if(!edge&&x===10)c='L';if(!edge&&x===21)c='S';if(y===waist&&!edge)c='S';if(y===31)c=edge?'O':'S';px(x,y,c)}
if(a===1){
// Front: shirt ends above bent legs; the two lower blocks face the viewer as soles.
row(top,11,14,'W');row(top,15,16,'F');row(top,17,20,'W');row(top+1,13,18,'F');
for(let y=top+2;y<=26;y++)px(16,y,'F');
for(let y=27;y<=31;y++){px(15,y,'O');px(16,y,'O');}
for(let y=28;y<=30;y++){row(y,9,14,'F');row(y,17,22,'F');if(y<30){px(10,y,'W');px(18,y,'W');}}
row(27,10,13,'B');row(27,18,21,'B');px(11,27,'W');px(20,27,'W');
}
if(a===2){
// Rear: lower mass is the seated hip, not shoes; keep a blue seat and a small center fold.
row(top,12,19,'F');row(top+1,13,18,'W');row(28,10,21,'S');for(let y=29;y<=31;y++){px(15,y,'S');px(16,y,'D');}px(12,27,'W');px(20,27,'W');px(12,29,'F');px(19,30,'F');
}
if(a===0){
// Side: right-offset front opening, side panel, bent thigh and forward-facing foot end.
for(let y=top;y<=27;y++){for(let x=11;x<=14;x++)if(has(x,y))px(x,y,'S');px(15,y,'D');}
row(top,14,17,'F');row(top+1,16,19,'W');px(20,top+1,'F');if(top+2<=27)px(20,top+2,'F');
row(27,19,23,'B');row(28,19,23,'L');row(29,17,21,'S');
for(let y=28;y<=30;y++){row(y,23,24,'F');if(y===29)px(23,y,'W');}px(20,28,'W');px(12,top+2,'F');
}
if(a===2&&f>=2)for(let x=9;x<=22;x++)d.set(C[x===9||x===22?'O':'F'],(24*32+x)*4);
for(let y=0;y<32;y++)for(let x=0;x<32;x++){let i=(y*32+x)*4;if(d[i+3])assert(has(x,y)||(a===2&&f>=2&&y===24&&x>=9&&x<=22),'Paint outside body/into hands');}
outfit.frameData[key]={width:32,height:32,dataURL:'data:image/png;base64,'+png.encode(32,32,d).toString('base64')};
}
// Insert before the original near-side hand; do not move front/rear hands or change their visibility.
let insert=p.layers.findIndex(l=>l.sheetIndex===si&&l.name==='hand'&&l.frameData['10_0_0']);assert(insert>0);p.layers.splice(insert,0,outfit);for(let l of p.layers)if(l.parent>=insert)l.parent++;if(p.currentLayerIndex>=insert)p.currentLayerIndex++;
for(let i=0;i<before.layers.length;i++){let b=structuredClone(before.layers[i]);if(b.parent>=insert)b.parent++;assert.deepEqual(p.layers[i>=insert?i+1:i],b)}assert.deepEqual(p.spriteSheets,before.spriteSheets);assert.equal(p.layers.length,before.layers.length+1);
fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));let q=await h.load(p);h.sheet(q,path.join(out,'睡衣坐姿-全部帧.png'));let hero=createCanvas(576,192),g=hero.getContext('2d');g.imageSmoothingEnabled=false;for(let [i,a]of [1,0,2].entries()){g.fillStyle='#eee6ef';g.fillRect(i*192,0,192,192);g.drawImage(h.render(q,a,0),i*192,0,192,192)}fs.writeFileSync(path.join(out,'睡衣坐姿-三方向.png'),hero.toBuffer('image/png'));
for(let l of q.layers)if(l.name.startsWith('头发 /'))l.visible=false;h.sheet(q,path.join(out,'睡衣坐姿-无遮发.png'));console.log('Candidate: sitting-only, original pose masks, no hand painting or metadata changes beyond insertion indexing.');
})().catch(e=>{console.error(e);process.exitCode=1});
