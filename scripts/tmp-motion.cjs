const fs=require('fs');
const png=require('../scripts/png.cjs');
const file=process.argv[2];
const j=JSON.parse(fs.readFileSync(file,'utf8'));
const ss=j.spriteSheets;
const groups=new Map();
for(const l of j.layers) if(l.hairAnimationId){ if(!groups.has(l.hairAnimationId))groups.set(l.hairAnimationId,l); }
for(const m of j.layers.filter(l=>l.hairAnimation)){
  const g=m.hairAnimation;
  console.log('== MASTER',m.name,'enabled',g.enabled,'live',g.live);
  for(const l of j.layers){
    if(l.hairAnimationId!==g.id) continue;
    const sh=ss[l.sheetIndex];
    for(const [ai,a] of sh.actions.entries()){
      const imgs=[];
      for(let fi=0;fi<a.frames.length;fi++){
        const c=l.frameData[`${l.sheetIndex}_${ai}_${fi}`];
        imgs.push(c?png.decode(Buffer.from(c.dataURL.split(',')[1],'base64')):null);
      }
      const base=imgs[0];
      if(!base){console.log('   ',sh.name,a.direction,'(no frames)');continue;}
      const rows=imgs.map((im,fi)=>{
        if(!im) return fi+':-';
        if(fi===0) return '0:BASE';
        if(im.width!==base.width||im.height!==base.height) return fi+':size'+im.width+'x'+im.height;
        let d=0;
        for(let i=0;i<im.data.length;i+=4) if(im.data[i+3]!==base.data[i+3]||im.data[i]!==base.data[i]) d++;
        return fi+':d'+d;
      });
      console.log('   ',sh.name,a.direction,'vis='+l.visible,'|',rows.join(' '));
    }
  }
}
