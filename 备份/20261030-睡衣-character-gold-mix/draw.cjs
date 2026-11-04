const h=require('./render.cjs'),{fs,path}=h,assert=require('assert/strict'),png=require('../../scripts/png.cjs');
const out=__dirname,before=JSON.parse(fs.readFileSync(path.join(out,'original.json'),'utf8')),p=structuredClone(before);
const C={O:[120,132,153,255],B:[185,204,227,255],L:[206,222,239,255],S:[156,177,205,255],D:[139,158,187,255],W:[249,249,250,255],F:[223,229,240,255]};
const outfit={sheetIndex:8,isGroup:false,parent:null,depth:0,referenceOnly:false,name:'服装 / 01 浅蓝雪花绒领睡衣',visible:true,locked:false,opacity:1,frameData:{}};
for(let a=0;a<3;a++)for(let f=0;f<4;f++){
 const key=`8_${a}_${f}`,d=new Uint8Array(36*36*4),low=f>=2,top=low?26:24,waist=low?29:28;
 const px=(x,y,c)=>{assert(x>=0&&x<36&&y>=0&&y<36);d.set(C[c],(y*36+x)*4)},row=(y,x1,x2,c)=>{for(let x=x1;x<=x2;x++)px(x,y,c)};
 // Shoulder, waist and floor follow separate anchors; pants do not translate with breathing.
 for(let y=top;y<=33;y++)for(let x=11;x<=24;x++){
  let c='B';if(x===11||x===24)c='O';else if(x===12)c=a===0?'D':'S';else if(x===23)c='S';else if(x===13)c='L';
  if(y===waist)c=x===11||x===24?'O':'S';
  if(y>waist&&((a!==0&&(x===17||x===18))||(a===0&&x===18)))c='O';
  if(y===33)c=(x===11||x===24||x===17||x===18)?'O':'F';px(x,y,c);
 }
 // White shawl collar: front U, offset side lapel, short rear collar.
 if(a===1){row(top,13,16,'W');row(top,19,22,'W');row(top,17,18,'F');row(top+1,14,17,'W');row(top+1,18,21,'W');row(top+2,16,19,'F');}
 if(a===0){row(top,15,18,'W');row(top,21,23,'W');row(top+1,16,19,'W');row(top+1,21,22,'W');px(20,top+2,'F');}
 if(a===2){row(top,14,21,'F');row(top+1,15,20,'W');}
 if(a!==2){let seam=a===0?20:18;for(let y=top+3;y<=waist;y++)px(seam,y,'F');if(waist-top>=4)px(seam,waist-1,'W');}
 // Sleeves cover only the upper arm, leaving the original fingertips visible.
 const hands=p.layers.filter(l=>l.sheetIndex===8&&/^hand/.test(l.name)&&l.frameData[key]);
 for(const hand of hands){let im=png.decode(Buffer.from(hand.frameData[key].dataURL.split(',')[1],'base64'));for(let left of [true,false]){
  let pts=[];for(let y=0;y<36;y++)for(let x=0;x<36;x++)if(im.data[(y*36+x)*4+3]&&(left?x<13:x>22))pts.push([x,y]);if(!pts.length)continue;
  let hx=Math.min(...pts.map(v=>v[0])),hr=Math.max(...pts.map(v=>v[0])),hy=Math.min(...pts.map(v=>v[1])),cuff=hy+2;
  let l=left?hx:23,r=left?12:hr;for(let y=top;y<=cuff;y++){let ll=y===top?l+1:l,rr=y===top?r-1:r;for(let x=ll;x<=rr;x++)px(x,y,x===l||x===r?'O':left?'L':'B');}
  // On the crouched half of idle the wrists rise, rather than shifting the whole sleeve down.
  row(cuff,l,r,'F');if(r-l>=3)row(cuff,l+1,r-1,'W');
 }}
 // Sparse snowflakes stay on cloth panels, not on trim or skin.
 const mark=(x,y)=>{if(y>=waist||y<top+2)return;px(x,y,'W');if(y+1<waist){px(x-1,y+1,'F');px(x+1,y+1,'F')}};
 if(a===1){mark(14,top+2);mark(22,top+2);}else if(a===0){mark(15,top+2);mark(23,top+2);}else{mark(14,top+2);mark(21,top+2);}
 for(let x of (a===0?[14,22]:[14,21]))if(waist+1<33)px(x,waist+1,'W');
 outfit.frameData[key]={width:36,height:36,dataURL:'data:image/png;base64,'+png.encode(36,36,d).toString('base64')};
 assert(d.some((v,i)=>i%4===3&&v));for(let i=3;i<d.length;i+=4)assert([0,255].includes(d[i]));
}
const insert=146;p.layers.splice(insert,0,outfit);for(let l of p.layers)if(l.parent>=insert)l.parent++;if(p.currentLayerIndex>=insert)p.currentLayerIndex++;
for(let i=0;i<before.layers.length;i++){const expected=structuredClone(before.layers[i]);if(expected.parent>=insert)expected.parent++;assert.deepEqual(p.layers[i>=insert?i+1:i],expected)}assert.deepEqual(p.spriteSheets,before.spriteSheets);
assert.notDeepEqual(outfit.frameData['8_0_0'],outfit.frameData['8_1_0']);for(let l of p.layers)if(l.parent!=null)assert(p.layers[l.parent].isGroup);
fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));
(async()=>{let q=await h.load(p);h.sheet(q,path.join(out,'睡衣-全部待机.png'));let cloth=q.layers[insert];for(let mode of ['without-hair','clothing-only']){for(let l of q.layers)if(mode==='without-hair'&&l.name.startsWith('头发 /'))l.visible=false;else if(mode==='clothing-only')l.visible=l===cloth;h.sheet(q,path.join(out,mode+'.png'))}console.log('Candidate created; all existing pixels and frame dimensions unchanged.');})();
