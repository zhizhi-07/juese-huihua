const fs=require('fs'),D=__dirname+'/';let s=fs.readFileSync(D+'build-base.cjs','utf8');
const a=s.indexOf('const ART={'),b=s.indexOf('const rgb=');if(a<0||b<0)throw Error('ART');
const styles=`const CAP_DOWN=['.....AAAA','....ACBBB','...ACCBBB','...ACCCBB','...ABCCCB','...ABBB.B','...ABB...','...ABB...','...AB....'];
const CAP_SIDE=[
   '.....AAAAAAA.....',
   '.....BBBBBBBA....',
   '....BBBCCBBCCA...',
   '....BBBCCCBCCA...',
   '....BBBBBBBBBA...',
   '....DBBBB.B.BA...',
   '....DBBB....BA...',
   '....DDBB....BA...',
   '....DDBB....BA...',
   '.....DB..........'];
const STYLES={
 '丸子头':{
  front:{
   down:full(mirror(['.......AA','.....AACC','....ACABB','...ACCBDD','...ACCCBB','...ABCCCB','...ABBB.B','...ABB...','...ABB...','...AB....']),0),
   side:full([
   '....AAA..........',
   '...ACCBAAAAAA....',
   '...ABBDBBBBBA....',
   '....DDBCCBBCCA...',
   '....BBBCCCBCCA...',
   '....BBBBBBBBBA...',
   '....DBBBB.B.BA...',
   '....DBBB....BA...',
   '....DDBB....BA...',
   '....DD.......A...'],0)},
  rear:{
   up:full(mirror(['.......AA','.....AACC','....ACABB','...ACCCAA','...ACCCCC','...ABCCCC','...ABBCCC','...ABBBBB','...ABBBBB','...ADDBBB','....AAAAA']),0)}},
 '马尾辫':{
  front:{down:full(mirror(CAP_DOWN),1),side:full(CAP_SIDE,1)},
  rear:{
   down:full([
   '..............A..',
   '..............BA.',
   '..............CBA',
   '..............CBA',
   '..............BBA',
   '..............BDA',
   '.............ABDA',
   '.............ADA.',
   '..............A..'],4),
   up:full(mirror(['.....AAAA','....ACBBB','...ACCCAR','...ACCACC','...ABCACB','...ABBACB','...ABBABB','...ABBABB','...ADBABB','....AAABD','......ABD','.......AD','........A']),1),
   side:full([
   '.AA..............',
   'ACR..............',
   'ACB..............',
   'ACB..............',
   'ABB..............',
   'ABB..............',
   'ABD..............',
   'ABD..............',
   'ADA..............',
   '.A...............'],2)}}
};
const SHOW='丸子头';
`;
s=s.slice(0,a)+styles+s.slice(b);
const rep=(x,y)=>{if(!s.includes(x))throw Error('missing '+x.slice(0,50));s=s.split(x).join(y);};
rep(`'base-original.meta.json'`,`'base-saved.meta.json'`);
rep(`assert(!j.layers.some(l=>l.name.startsWith('头发 / 双马尾')),'已存在双马尾图层');`,`for(const n of Object.keys(STYLES))assert(!j.layers.some(l=>l.name.startsWith('头发 / '+n+' /')),'已存在 '+n);fs.writeFileSync(D+'base-before-styles.json',raw);`);
rep(`for(const [slot,label] of [['rear','后发'],['front','前发']]){`,`for(const [style,ART] of Object.entries(STYLES))for(const [slot,label] of [['rear','后发'],['front','前发']]){`);
rep(`name:\`头发 / 双马尾 / \${label}\`,visible:true,`,`name:\`头发 / \${style} / \${label}\`,visible:style===SHOW,`);
rep(`s.name+' '+key);}}`,`style+label+' '+s.name+' '+key);}}`);
rep(`  await sheetPreview(j,\`base-preview-idle-\${stamp}.png\`,12,s=>s.name==='original16_idle');
  await sheetPreview(j,\`base-preview-all-\${stamp}.png\`,4);`,`  for(const style of Object.keys(STYLES)){const v=JSON.parse(JSON.stringify(j));for(const l of v.layers)if(/^头发 \\//.test(l.name))l.visible=l.name.startsWith('头发 / '+style+' /');
    await sheetPreview(v,\`styles-\${style}-idle-\${stamp}.png\`,12,s=>s.name==='original16_idle');await sheetPreview(v,\`styles-\${style}-walk-pickup-sit-\${stamp}.png\`,8,s=>/walk|pickup|sit/.test(s.name));}`);
rep(`const dir=b.spriteSheets[si].actions[ai].direction,slot=/后发/.test(n.name)?'rear':'front';assert.equal(cnt,ART[slot][dir]`,`const dir=b.spriteSheets[si].actions[ai].direction,slot=/后发/.test(n.name)?'rear':'front';assert.equal(cnt,STYLES[n.name.split(' / ')[1]][slot][dir]`);
rep(`'base-saved.meta.json',JSON.stringify({etag:back`,`'base-saved2.meta.json',JSON.stringify({etag:back`);
// the meta-read replacement above also hit nothing else; ensure read uses saved meta, write uses saved2
fs.writeFileSync(D+'build-base-styles.cjs',s);
