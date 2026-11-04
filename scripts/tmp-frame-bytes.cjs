const fs=require('fs');
const file=process.argv[2];
const j=JSON.parse(fs.readFileSync(file,'utf8'));
const ss=j.spriteSheets;
const groups=new Map();
for(const l of j.layers) if(l.hairAnimationId){ if(!groups.has(l.hairAnimationId))groups.set(l.hairAnimationId,[]); groups.get(l.hairAnimationId).push(l); }
const dec=c=>{const b=Buffer.from(c.dataURL.split(',')[1],'base64');const {createCanvas,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');};
for(const [id,ls] of groups){
  const master=j.layers.find(l=>l.hairAnimation&&l.hairAnimation.id===id);
  console.log('== GROUP',master?master.name:id.slice(0,8),'enabled',master?master.hairAnimation.enabled:'-','live',master?master.hairAnimation.live:'-');
  for(const l of ls){
    const sh=ss[l.sheetIndex];
    for(const [ai,a] of sh.actions.entries()){
      const rows=[];
      for(let fi=0;fi<a.frames.length;fi++){
        const key=`${l.sheetIndex}_${ai}_${fi}`;
        const c=l.frameData[key];
        if(!c){rows.push(fi+':MISSING');continue;}
        const m=/data:image\/png;base64,(.*)$/.exec(c.dataURL);
        const buf=Buffer.from(m[1],'base64');
        rows.push(fi+':'+buf.length+'b'+(c.placement?('@'+c.placement.x+','+c.placement.y):''));
      }
      console.log('   ',sh.name,a.direction,'vis='+l.visible,rows.join(' '));
    }
  }
}
