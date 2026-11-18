const fs=require('fs');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
(async()=>{const j=JSON.parse(fs.readFileSync(__dirname+'/main-original.json'));
const show=async(li,key,w,h)=>{const l=j.layers[li],c=l.frameData[key];const cv=createCanvas(w,h),cx=cv.getContext('2d');const im=await loadImage(c.dataURL);cx.drawImage(im,0,0);const d=cx.getImageData(0,0,w,h).data;const m={'46465e':'A','feede1':'D','e0c5b4':'E'};let o='['+li+'] '+l.name+' '+key+' '+JSON.stringify(c.placement||null)+'\n';for(let y=0;y<13;y++){for(let x=0;x<w;x++){const i=(y*w+x)*4;o+=d[i+3]?(m[[0,1,2].map(q=>d[i+q].toString(16).padStart(2,'0')).join('')]||'?'):'.';}o+='\n';}console.log(o);};
await show(28,'1_1_0',19,19);await show(28,'1_1_1',19,19);await show(28,'1_1_2',19,19);await show(18,'0_1_0',19,19);await show(18,'0_1_1',19,19);await show(86,'1_1_1',19,19);await show(86,'1_1_2',19,19);
})();
