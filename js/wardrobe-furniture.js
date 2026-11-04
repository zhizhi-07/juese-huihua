/* Native-pixel furniture shared by the test room and transparent PNG exports. */
window.PE=window.PE||{};
PE.WardrobeFurniture={
  layout:[
    {id:'chair-down',name:'木椅·正面',kind:'chair',direction:'down',x:48,y:116},
    {id:'chair-left',name:'木椅·朝左',kind:'chair',direction:'left',x:108,y:116},
    {id:'chair-right',name:'木椅·朝右',kind:'chair',direction:'right',x:168,y:116},
    {id:'chair-up',name:'木椅·背面',kind:'chair',direction:'up',x:228,y:116},
    {id:'bed',name:'木床·鼠尾草绿被褥',kind:'bed',direction:'down',x:278,y:174}
  ],
  sprites:null,
  build(){
    if(this.sprites)return this.sprites;
    const p={edge:'#46504b',dark:'#79645b',shade:'#987c69',wood:'#b49173',light:'#c4a17f',rim:'#d2b28c',grain:'#aa866b',linen:'#ddd9b5',white:'#eeebd0',fold:'#b7b99e',green:'#93b3a6',pale:'#b9d0bc',seam:'#73998d'};
    const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
    const result={};
    for(const direction of ['down','left','right','up']){
      const rear=make(24,34),front=make(24,34);
      let ctx=rear.getContext('2d');
      const r=(x,y,w,h,color)=>{ctx.fillStyle=p[color];ctx.fillRect(x,y,w,h);};
      const leg=(x,y,h)=>{r(x,y,3,h,'edge');r(x+1,y,1,h-1,'wood');};
      const seat=(x,y,w,h)=>{r(x,y,w,h,'edge');r(x+1,y,w-2,2,'rim');r(x+1,y+2,w-2,h-3,'wood');r(x+2,y+3,w-4,1,'light');r(x+1,y+h-2,w-2,1,'shade');};
      const back=(x,y,w,h)=>{
        r(x,y,w,h,'edge');r(x+1,y+1,w-2,h-2,'shade');r(x+2,y+2,w-4,2,'rim');r(x+2,y+4,w-4,3,'wood');
        r(x+2,y+7,w-4,1,'dark');r(x+2,y+h-4,w-4,2,'light');r(x+4,y+4,1,3,'grain');r(x+w-6,y+h-4,2,1,'wood');
      };
      if(direction==='down'){
        leg(3,13,20);leg(18,13,20);back(3,1,18,14);r(4,15,2,5,'wood');r(19,15,1,5,'shade');
        seat(1,18,22,7);r(4,27,16,2,'dark');r(5,27,14,1,'wood');r(10,20,1,2,'grain');
      }else if(direction==='up'){
        leg(3,15,18);leg(18,15,18);seat(1,10,22,13);r(3,12,18,1,'light');r(8,14,1,4,'grain');
        ctx=front.getContext('2d');back(3,8,18,15);r(4,23,1,8,'light');r(19,23,1,8,'wood');r(5,21,14,1,'dark');
      }else{
        // The back is on the right for a left-facing seat; lighting stays top-left in both views.
        const left=direction==='left',bx=left?19:2;
        leg(3,20,13);leg(18,14,19);seat(1,17,22,8);r(5,26,13,2,'dark');r(5,26,12,1,'wood');
        r(bx,1,3,24,'edge');r(bx+1,2,1,21,left?'shade':'light');r(left?16:5,3,3,12,'edge');
        r(left?17:5,4,2,4,'light');r(left?17:5,9,2,5,'wood');r(left?16:5,15,3,4,'dark');
        r(4,19,14,1,'rim');r(9,21,4,1,'grain');
        ctx=front.getContext('2d');r(bx,20,3,12,'edge');r(bx+1,20,1,11,left?'shade':'light');
      }
      result[direction]={rear,front};
    }
    const rear=make(40,66),front=make(40,66);let ctx=rear.getContext('2d');
    const r=(x,y,w,h,color)=>{ctx.fillStyle=p[color];ctx.fillRect(x,y,w,h);};
    r(2,1,36,64,'edge');r(4,2,32,60,'shade');r(5,3,30,7,'wood');r(5,3,30,2,'rim');r(7,7,26,1,'grain');r(4,10,32,3,'dark');
    r(1,0,4,65,'edge');r(2,1,2,62,'light');r(35,0,4,65,'edge');r(36,1,2,62,'wood');
    r(5,13,30,44,'fold');r(6,13,28,42,'linen');r(7,14,26,2,'white');
    r(9,16,22,12,'fold');r(10,15,20,12,'white');r(11,17,18,7,'linen');r(11,25,18,1,'fold');r(10,18,1,5,'fold');
    r(6,30,28,25,'green');r(6,30,28,3,'pale');r(7,33,1,19,'pale');r(32,33,2,22,'seam');r(8,53,24,2,'seam');
    r(10,36,1,13,'pale');r(28,38,1,12,'seam');r(11,49,3,1,'seam');r(25,35,3,1,'pale');
    ctx=front.getContext('2d');r(2,55,36,8,'edge');r(3,56,34,5,'wood');r(4,56,32,2,'rim');r(4,61,32,1,'shade');r(8,59,24,1,'grain');
    result.bed={rear,front};this.sprites=result;return result;
  },
  sprite(f){return this.build()[f.kind==='bed'?'bed':f.direction];},
  bounds(f){return {left:f.x-(f.kind==='bed'?20:12),right:f.x+(f.kind==='bed'?20:12),top:f.y-(f.kind==='bed'?53:12),bottom:f.y+1};},
  blocked(x,y){return this.layout.some(f=>{const b=this.bounds(f);return x>b.left-4&&x<b.right+4&&y>b.top-2&&y<b.bottom+3;});},
  nearest(player,kind){return this.layout.filter(f=>!kind||f.kind===kind).map(f=>{const b=this.bounds(f);return {f,d:Math.hypot(Math.max(b.left-player.x,0,player.x-b.right),Math.max(b.top-player.y,0,player.y-b.bottom))};}).filter(v=>v.d<=22).sort((a,b)=>a.d-b.d)[0]?.f;},
  draw(ctx,f,part){const c=this.sprite(f)[part];ctx.drawImage(c,f.x-c.width/2,f.y-c.height+1);}
};
