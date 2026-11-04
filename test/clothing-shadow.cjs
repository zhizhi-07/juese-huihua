const assert=require('node:assert/strict');
const F=require(process.argv[2]||'../js/clothing-fit.js');
const light=[114,149,190,255],dark=[82,107,149,255],skin=[254,237,225,255],shadow=[224,197,180,255];
const image=colors=>({width:2,height:3,data:new Uint8ClampedArray(colors.flat())});
const body=image(Array(6).fill(skin)),clothes=image([light,light,dark,light,dark,light]);
const src={body,clothes};
for(const run of [target=>F.fromIdle(src,target),target=>F.fit(src,target,{shadeLegs:true})]){
  assert.deepEqual(run(body).data,clothes.data,'painted shadows must survive bright skin');
  const target=image([skin,skin,shadow,shadow,shadow,shadow]),out=run(target);
  for(let i=2;i<6;i++)assert.deepEqual(Array.from(out.data.slice(i*4,i*4+4)),dark,'skin shadow must darken cloth');
  const other=image(Array(6).fill([254,100,100,255]));
  assert.deepEqual(run(other).data,clothes.data,'red channel alone is not a skin classification');
}
console.log('PASS: preserve painted shadows; follow skin shadow; no red-channel-only classification (both fitting paths).');
