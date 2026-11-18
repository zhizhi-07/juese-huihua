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
const wide=rows=>({width:4,height:5,data:new Uint8ClampedArray(rows.flat(2))});
const full=(c)=>Array(4).fill(c),white=[255,255,255,255],offWhite=[222,222,222,255],pants=[125,125,125,255],pantsDark=[105,105,105,255],flat=[200,80,40,200],flatDark=[170,68,34,200],clear=[0,0,0,0];
const noOutline=wide(Array(5).fill(full(skin))),lit=wide(Array(5).fill([shadow,skin,shadow,skin]));
const garment=wide([full(offWhite),full(white),[white,white,clear,white],full(pants),full(pantsDark)]);
assert.deepEqual(F.fromIdle({body:noOutline,clothes:garment},lit).data,
  wide([full(offWhite),full(white),[white,white,clear,white],[pantsDark,pants,pantsDark,pants],full(pantsDark)]).data);
const flatCloth=wide(Array(5).fill(full(flat)));
assert.deepEqual(F.fromIdle({body:noOutline,clothes:flatCloth},lit).data,wide([full(flat),full(flat),full(flat),[flatDark,flat,flatDark,flat],[flatDark,flat,flatDark,flat]]).data);
console.log('PASS: only the bottom two rows follow skin shadow; reuse painted tones across rows; single-color fabric keeps hue and alpha; no darkening twice.');
