const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/wardrobe-furniture'),qa=path.join(root,'自检记录/20261031-衣柜测试家具');
global.window=global;global.document={createElement:()=>createCanvas(1,1)};
vm.runInThisContext(fs.readFileSync(path.join(root,'js/wardrobe-furniture.js'),'utf8'));
(async()=>{
  fs.mkdirSync(out,{recursive:true});fs.mkdirSync(qa,{recursive:true});
  const F=PE.WardrobeFurniture,preview=createCanvas(640,384),ctx=preview.getContext('2d');ctx.imageSmoothingEnabled=false;
  const checks=[];
  for(const [i,f]of F.layout.entries()){
    const s=F.sprite(f),c=createCanvas(s.rear.width,s.rear.height),x=c.getContext('2d');x.drawImage(s.rear,0,0);x.drawImage(s.front,0,0);
    const d=x.getImageData(0,0,c.width,c.height);assert(d.data.every((v,j)=>j%4!==3||v===0||v===255));assert.equal(d.data[3],0);assert(d.data.some((v,j)=>j%4===3&&v===255));
    fs.writeFileSync(path.join(out,f.name+'.png'),c.toBuffer('image/png'));
    for(let row=0;row<2;row++){
      const bx=i<4?i*112:464,by=row*192;ctx.fillStyle=row?'#303b3e':'#eee6d4';ctx.fillRect(bx,by,i<4?112:176,192);
      ctx.drawImage(c,bx+(i<4?8:8),by+(i<4?36:12),c.width*4,c.height*4);
      ctx.fillStyle=row?'#eee6d4':'#46504b';ctx.font='12px sans-serif';ctx.fillText(f.name,bx+5,by+178);
    }
    checks.push({name:f.name,width:c.width,height:c.height,hardAlpha:true});
  }
  // The bed needs its full height; show it separately rather than shrinking the drawing pixels.
  const bed=F.sprite(F.layout[4]),b=createCanvas(320,300),bx=b.getContext('2d');bx.imageSmoothingEnabled=false;
  for(const [i,color]of ['#eee6d4','#303b3e'].entries()){bx.fillStyle=color;bx.fillRect(i*160,0,160,300);bx.drawImage(bed.rear,i*160,12,160,264);bx.drawImage(bed.front,i*160,12,160,264);}
  fs.writeFileSync(path.join(qa,'木床-浅深底4倍.png'),b.toBuffer('image/png'));
  // Rebuild a clean combined preview with the same 4x pixel scale for every item.
  const sheet=createCanvas(640,640),sc=sheet.getContext('2d');sc.imageSmoothingEnabled=false;
  for(let row=0;row<2;row++){sc.fillStyle=row?'#303b3e':'#eee6d4';sc.fillRect(0,row*320,640,320);for(const [i,f]of F.layout.entries()){const s=F.sprite(f),x=i<4?i*112+8:472,y=row*320+(i<4?74:12);sc.drawImage(s.rear,x,y,s.rear.width*4,s.rear.height*4);sc.drawImage(s.front,x,y,s.front.width*4,s.front.height*4);sc.fillStyle=row?'#eee6d4':'#46504b';sc.font='12px sans-serif';sc.fillText(f.name,i<4?i*112+4:468,row*320+298);}}
  fs.writeFileSync(path.join(out,'家具预览4倍.png'),sheet.toBuffer('image/png'));
  const ref=await loadImage(process.argv[2]||'C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-1d98d05c-49a3-4cc2-ba15-0c734227c58c.png'),compare=createCanvas(720,360),cc=compare.getContext('2d');cc.imageSmoothingEnabled=false;cc.fillStyle='#eee6d4';cc.fillRect(0,0,720,360);cc.drawImage(ref,72,110,40,70,0,0,160,280);
  for(const [i,f]of F.layout.entries()){const s=F.sprite(f),x=i<4?176+i*96:560,y=i<4?70:8;cc.drawImage(s.rear,x,y,s.rear.width*4,s.rear.height*4);cc.drawImage(s.front,x,y,s.front.width*4,s.front.height*4);}
  cc.fillStyle='#46504b';cc.font='16px sans-serif';cc.fillText('左：用户参考椅子局部　右：新增家具（均 4×，无平滑）',8,330);
  fs.writeFileSync(path.join(qa,'参考同倍率对照.png'),compare.toBuffer('image/png'));
  assert(F.blocked(48,112));assert(!F.blocked(160,144));assert.equal(F.nearest({x:48,y:134},'chair').id,'chair-down');assert.equal(F.nearest({x:248,y:150}).id,'bed');
  fs.writeFileSync(path.join(qa,'素材检查.json'),JSON.stringify(checks,null,2));console.log('PASS: 4 chair directions + bed; transparent native PNGs; hard alpha; collision and proximity self-check.');
})().catch(e=>{console.error(e);process.exitCode=1;});
