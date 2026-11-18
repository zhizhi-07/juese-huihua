const {fixture}=require('../../../test/clothing-sync.cjs');
(async()=>{const {p}=await fixture(),C=PE.ClothingSync,F=PE.ClothingFit;
for(let si of [2,3])for(let ai=0;ai<3;ai++)for(let fi=0;fi<p.spriteSheets[si].actions[ai].frames.length;fi++){
const body=C.base(p,si,ai,fi,'body'),head=C.base(p,si,ai,fi,'head');
let rows=[];for(let y=0;y<body.height;y++){let line='';for(let x=0;x<body.width;x++){let i=(y*body.width+x)*4;line+=body.data[i+3]?(head.data[i+3]?'h':body.data[i]===224?'s':'o'):'.'}if(/[hso]/.test(line))rows.push(y+':'+line);}console.log(p.getFrameKey(si,ai,fi),F.bounds(head).bottom,rows.join(' '));
}})().catch(e=>{console.error(e);process.exitCode=1});
