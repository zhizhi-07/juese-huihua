const {read,load,save,pic,createCanvas}=require('./helpers.cjs');
(async()=>{
 const j=read('before.json'),[p,cm]=await load(j);
 const c=createCanvas(6*140,6*141),ctx=c.getContext('2d');ctx.fillStyle='#b8c8c3';ctx.fillRect(0,0,c.width,c.height);
 const palette={'46465e':'#','feede1':'o','e0c5b4':'s'};
 const range=im=>{const points=[];for(let i=0;i<im.data.length;i+=4)if(im.data[i+3])points.push([i/4%im.width,Math.floor(i/4/im.width),Buffer.from(im.data.slice(i,i+3)).toString('hex')]);return points};
 for(const [row,s] of [1,15].entries())for(let a=0;a<3;a++){
 const layers=PE.getRenderLayers(p,s,a).filter(l=>['hand','hand 2','body','head','vfx'].includes(l.name));
 for(let f=0;f<j.spriteSheets[s].actions[a].frames.length;f++){
 const key=[s,a,f].join('_');const im=cm.getCompositeImageData(s,a,f);
 pic(ctx,im,f*140,(row*3+a)*141,8);
 console.log(key,layers.filter(l=>PE.isHandLayer(l)||l.name==='vfx').map(l=>[l.name,range(l.getFrameData(key)).map(([x,y,k])=>[x,y,palette[k]??k].join(',')).join(' ')]));
 if(f===0){const base=cm.getCompositeImageData(s,a,f,false);let grid=Array.from({length:17},()=>Array(17).fill('.'));for(const [x,y,k]of range(base))grid[y][x]=palette[k]??'+';for(const layer of layers.filter(PE.isHandLayer))for(const [x,y,k]of range(layer.getFrameData(key)))grid[y][x]=layer.name==='hand'?'H':'h';console.log('    01234567890123456\n'+grid.map((line,y)=>String(y).padStart(2)+'  '+line.join('')).join('\n'));}
 }
 }
 save('before-preview.png',c.toBuffer('image/png'));
})().catch(e=>{console.error(e);process.exitCode=1});
