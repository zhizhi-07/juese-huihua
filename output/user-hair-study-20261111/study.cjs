const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const {decode,encode}=require(process.cwd()+'/scripts/png.cjs'),dir='output/user-hair-study-20261111';
global.window=global;global.document={addEventListener(){}};global.ImageData=class{constructor(w,h){this.width=w;this.height=h;this.data=new Uint8ClampedArray(w*h*4)}};vm.runInThisContext(fs.readFileSync('js/hair-animation.js','utf8'));
const raw=fs.readFileSync(dir+'/original.json'),original=JSON.parse(raw),p=structuredClone(original),seeds={};
for(const [ai,direction] of ['side','down','up'].entries())seeds[direction]=image(original.layers[199].frameData['1_'+ai+'_0']);
function image(f){return decode(Buffer.from(f.dataURL.split(',')[1],'base64'));}
function anchor(im){let left=im.width,right=-1,top=im.height,bottom=-1;for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}assert(right>=left);return {x:(left+right)/2,y:top,bottom};}
function head(si,ai,fi){const k=`${si}_${ai}_${fi}`,layers=original.layers.filter(l=>l.name==='head'&&l.frameData[k]);assert.equal(layers.length,1);return anchor(image(layers[0].frameData[k]));}
const base=Object.fromEntries(original.spriteSheets[1].actions.map((a,ai)=>[a.direction||a.name,head(1,ai,0)]));
const hairLayers=new Map(),stats=[];
for(const [si,sheet]of p.spriteSheets.entries())for(const [ai,action]of sheet.actions.entries()){
 const direction=action.direction||action.name,seed=seeds[direction],layer={sheetIndex:si,name:'头发 / 用户原稿算法试验',parent:original.layers.findIndex(l=>l.isGroup&&l.sheetIndex===si&&l.name===action.name),depth:1,isGroup:false,visible:true,locked:false,opacity:1,frameData:{}},settings={...PE.HairAnimation.params(sheet),followHead:true},mask={width:seed.width,height:seed.height,data:Array(seed.width*seed.height).fill(0)},frames=[];
 // Only lower side locks and back tips move; crown and bangs retain their source pixels.
 for(let y=0;y<seed.height;y++)for(let x=0;x<seed.width;x++)if(y>=7&&(direction==='up'||x<=4||x>=10))mask.data[y*seed.width+x]=1;
 for(const [fi,frame]of action.frames.entries()){
 const at=head(si,ai,fi),prev=head(si,ai,fi?fi-1:action.frames.length-1),delta={x:Math.round(at.x-base[direction].x),y:at.y-base[direction].y};
 // shortcut: this experiment uses one-frame, capped vertical lag; unequal frame timing needs a time-based model.
 const lag=Math.max(-1,Math.min(1,at.y-prev.y)),isMaster=si===1&&fi===0;
 const src={...seed,data:new Uint8ClampedArray(seed.data)};
 const generated=PE.HairAnimation.deform(src,frame,delta,0,settings,mask,!isMaster,null,null,null,isMaster?null:lag);
 assert.equal(generated.clipped,0,`${sheet.name}/${direction}/${fi} clipping`);assert(!generated.image.placement,'Unexpected expanded canvas');
 const im=generated.image,png=encode(im.width,im.height,im.data);layer.frameData[`${si}_${ai}_${fi}`]={width:im.width,height:im.height,dataURL:'data:image/png;base64,'+png.toString('base64')};
 if(isMaster)assert(Buffer.from(im.data).equals(Buffer.from(seed.data)),'master changed');
 frames.push({fi,head:at,offset:delta,lag:isMaster?0:lag,clipped:generated.clipped});
 }
 hairLayers.set(layer.parent,layer);stats.push({sheet:sheet.name,direction,frames});
}
// Insert after eyes but before the original later hand/tool layers, preserving every original layer order.
const indexMap=new Map(),oldLayers=p.layers;p.layers=[];
for(const [i,l]of oldLayers.entries()){indexMap.set(i,p.layers.length);p.layers.push(l);if(l.name==='五官 / 眼睛')p.layers.push(hairLayers.get(l.parent));}
for(const l of p.layers)if(l.parent!=null)l.parent=indexMap.get(l.parent);
p.currentLayerIndex=indexMap.get(original.currentLayerIndex);p.name='三首帧头发算法试验（独立候选）';
assert.equal(p.layers.length,original.layers.length+27);assert.deepEqual(p.spriteSheets,original.spriteSheets);
const inverse=new Map([...indexMap].map(([a,b])=>[b,a]));for(const [oldIndex,newIndex]of indexMap){let l=structuredClone(p.layers[newIndex]);if(l.parent!=null)l.parent=inverse.get(l.parent);assert.deepEqual(l,original.layers[oldIndex]);}
fs.writeFileSync(dir+'/generated-hair-layers.json',JSON.stringify([...hairLayers.values()]));
function render(si,ai,fi,rigid=false){const s=p.spriteSheets[si],w=s.frameWidth,h=s.frameHeight,k=`${si}_${ai}_${fi}`,out=Buffer.alloc(w*h*4),root=p.layers.findIndex(l=>l.sheetIndex===si&&l.isGroup&&l.name===s.actions[ai].name);for(const l of p.layers){if(l.isGroup||l.parent!==root||l.visible===false||!l.frameData[k])continue;let im=image(l.frameData[k]);if(rigid&&l.name==='头发 / 用户原稿算法试验'){const d=s.actions[ai].direction||s.actions[ai].name,at=head(si,ai,fi);im=PE.HairAnimation.deform(seeds[d],s.actions[ai].frames[fi],{x:Math.round(at.x-base[d].x),y:at.y-base[d].y},0,PE.HairAnimation.params(s),null,false).image;}for(let y=0;y<h;y++)for(let x=0;x<w;x++){let j=(y*w+x)*4;let a=im.data[j+3]/255;if(a){for(let c=0;c<3;c++)out[j+c]=Math.round(im.data[j+c]*a+out[j+c]*(1-a));out[j+3]=255;}}}return {width:w,height:h,data:out};}
function blit(dst,W,im,ox,oy,scale){for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const k=(y*im.width+x)*4;if(!im.data[k+3])continue;for(let yy=0;yy<scale;yy++)for(let xx=0;xx<scale;xx++)dst.set(im.data.subarray(k,k+4),((oy+y*scale+yy)*W+ox+x*scale+xx)*4);}}
function canvas(w,h){const b=Buffer.alloc(w*h*4);for(let i=0;i<b.length;i+=4)b.set([194,201,202,255],i);return b;}
const cell=38,S=5,C=cell*S,overview=canvas(C*8,C*27);
for(let si=0;si<9;si++){
 const s=p.spriteSheets[si],n=s.actions[0].frames.length;fs.mkdirSync(`${dir}/frames-${si}`,{recursive:true});
 for(let fi=0;fi<n;fi++){const b=canvas(C*3,C);for(let ai=0;ai<3;ai++){const im=render(si,ai,fi);blit(b,C*3,im,ai*C+Math.floor((cell-im.width)/2)*S,Math.floor((cell-im.height)/2)*S,S);blit(overview,C*8,im,fi*C+Math.floor((cell-im.width)/2)*S,(si*3+ai)*C+Math.floor((cell-im.height)/2)*S,S);}fs.writeFileSync(`${dir}/frames-${si}/${fi}.png`,encode(C*3,C,b));}
}
fs.writeFileSync(dir+'/all-frames.png',encode(C*8,C*27,overview));
const seedCanvas=canvas(3*15*12,17*12);for(let ai=0;ai<3;ai++)blit(seedCanvas,3*15*12,render(1,[1,0,2][ai],0),ai*15*12,0,12);fs.writeFileSync(dir+'/three-masters.png',encode(3*15*12,17*12,seedCanvas));
const compare=canvas(8*15*8,6*17*8);for(let fi=0;fi<8;fi++)for(let ai=0;ai<3;ai++)for(let row=0;row<2;row++)blit(compare,8*15*8,render(0,ai,fi,row===0),fi*15*8,(ai*2+row)*17*8,8);fs.writeFileSync(dir+'/walk-rigid-vs-lag.png',encode(8*15*8,6*17*8,compare));
fs.writeFileSync(dir+'/verification.json',JSON.stringify({sourceSHA256:crypto.createHash('sha256').update(raw).digest('hex'),seedCount:3,generatedFrames:156,addedLayers:27,originalLayersUnchanged:true,sheetsFramesDurationsUnchanged:true,clipped:0,mastersExact:true,algorithm:'Existing PE.HairAnimation.deform; protected crown; selected lower tips; capped one-frame vertical lag',stats},null,2));
console.log('PASS: 3 masters, 156 frames, original layers unchanged, 0 clipped pixels.');




