const h=require('./render.cjs'),{fs,path,png,load,sheet}=h,assert=require('assert/strict');
const out=__dirname,before=JSON.parse(fs.readFileSync(path.join(out,'original.json'),'utf8')),p=structuredClone(before),idle=p.layers.find(l=>l.sheetIndex===8&&l.name.startsWith('服装 /')),ids=[7,9,11],newLayers=[],placements=[];
const decode=fd=>png.decode(Buffer.from(fd.dataURL.split(',')[1],'base64'));
for(let si of ids){let s=p.spriteSheets[si],layer={sheetIndex:si,isGroup:false,parent:null,depth:0,referenceOnly:false,name:idle.name,visible:true,locked:false,opacity:1,frameData:{}};
for(let a=0;a<s.actions.length;a++)for(let f=0;f<s.actions[a].frames.length;f++){
let key=`${si}_${a}_${f}`,body=p.layers.find(l=>l.sheetIndex===si&&l.name==='body'&&l.frameData[key]),im=decode(body.frameData[key]),rows=[];
for(let y=0;y<im.height;y++){let xs=[];for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3])xs.push(x);if(xs.length>=8)rows.push({y,left:xs[0],right:xs.at(-1),count:xs.length});}assert(rows.length);
let top=rows[0].y,bottom=rows.at(-1).y,srcF=bottom-top+1<=8?2:0,srcA=s.actions[a].direction==='side'?0:s.actions[a].direction==='up'?2:1,src=decode(idle.frameData[`8_${srcA}_${srcF}`]),srcTop=srcF===2?26:24,srcWaist=srcF===2?29:28,srcFloor=33,waist=bottom-(srcFloor-srcWaist),torsoCenter=(rows[0].left+rows[0].right)/2,d=new Uint8Array(im.width*im.height*4);
const copy=(x,y,sx,sy)=>{let at=(sy*36+Math.max(11,Math.min(24,sx)))*4;assert(src.data[at+3]===255,'Source transparent '+key+' '+sx+','+sy);d.set(src.data.subarray(at,at+4),(y*im.width+x)*4)};
for(let row of rows){let y=row.y;if(y<top)continue;let sy=y>=waist?srcWaist+y-waist:srcTop+Math.min(srcWaist-srcTop-1,Math.max(0,y-top));
// Copy shirt and trouser patches; only their position follows the existing body/legs.
for(let x=row.left;x<=row.right;x++){if(!im.data[(y*im.width+x)*4+3])continue;let sx;
if(y>waist&&row.count<=10){let right=(row.left+row.right)/2>=torsoCenter;sx=(right?18:11)+(x-row.left);sx=Math.min(right?24:17,sx);}
else if(y>waist){let mid=(row.left+row.right)/2;sx=x<=mid?11+x-row.left:24-(row.right-x);sx=x<=mid?Math.min(17,sx):Math.max(18,sx);}
else sx=11+x-row.left;
copy(x,y,sx,sy);}}
// Rear hair may expose one neck row; reuse the confirmed white rear-collar strip there.
if(srcA===2){let raw=load(before),comp=h.render(raw,si,a,f).getContext('2d').getImageData(0,0,im.width,im.height).data,neck=top-1,ls=rows[0].left,rs=rows[0].right;let leak=false;for(let x=ls;x<=rs;x++){let i=(neck*im.width+x)*4;if(comp[i]===254&&comp[i+1]===237||comp[i]===224&&comp[i+1]===197)leak=true;}if(leak){let strip=decode(idle.frameData['8_2_2']);for(let x=ls;x<=rs;x++){let sx=Math.max(11,Math.min(24,11+x-ls)),i=(25*36+sx)*4;d.set(strip.data.subarray(i,i+4),(neck*im.width+x)*4)}}}
layer.frameData[key]={width:im.width,height:im.height,dataURL:'data:image/png;base64,'+png.encode(im.width,im.height,d).toString('base64')};placements.push({key,source:`8_${srcA}_${srcF}`,top,waist,bottom,bodyOnly:true});}
newLayers.push(layer);}
const old=[...p.layers],near=old.filter(l=>ids.includes(l.sheetIndex)&&l.name==='hand'),lastBase=Math.max(...old.map((l,i)=>ids.includes(l.sheetIndex)&&['head','body','hand','hand 2'].includes(l.name)?i:-1));p.layers=old.filter(l=>!near.includes(l));let at=p.layers.findIndex(l=>old.indexOf(l)>lastBase);p.layers.splice(at,0,...newLayers,...near);let map=old.map(l=>p.layers.indexOf(l));for(let l of p.layers)if(l.parent!=null)l.parent=map[l.parent];p.currentLayerIndex=map[p.currentLayerIndex];
for(let i=0;i<before.layers.length;i++){let b=structuredClone(before.layers[i]);if(b.parent!=null)b.parent=map[b.parent];assert.deepEqual(p.layers[map[i]],b)}assert.deepEqual(p.spriteSheets,before.spriteSheets);assert.equal(p.layers.length,before.layers.length+3);
fs.writeFileSync(path.join(out,'original-index-map.json'),JSON.stringify(map));fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));fs.writeFileSync(path.join(out,'复制位置记录.json'),JSON.stringify(placements,null,2));let q=load(p);for(let si of ids)sheet(q,si,path.join(out,`睡衣-${si}-全部帧.png`));for(let l of q.layers)if(l.name.startsWith('头发 /'))l.visible=false;for(let si of ids)sheet(q,si,path.join(out,`无遮发-${si}.png`));console.log('Copied confirmed idle outfit to 46 frames; no new palette or hand pixels.');
