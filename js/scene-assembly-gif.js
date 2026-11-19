/* GIF89a with a per-frame palette and transparent index 0. */
window.SceneAssemblyGIF=async function(frames,width,height){
  const bytes=[],word=n=>bytes.push(n&255,n>>8&255),str=s=>{for(const c of s)bytes.push(c.charCodeAt(0));};
  str('GIF89a');word(width);word(height);bytes.push(0x70,0,0);
  bytes.push(0x21,0xff,11);str('NETSCAPE2.0');bytes.push(3,1,0,0,0);
  for(const frame of frames){
    const rgba=frame.pixels.data,colors=new Map(),indices=new Uint8Array(width*height),palette=[0,0,0];
    let quantized=false;
    for(let i=0;i<rgba.length;i+=4)if(rgba[i+3]>=128){const rgb=(rgba[i]<<16)|(rgba[i+1]<<8)|rgba[i+2];colors.set(rgb,0);if(colors.size>255){quantized=true;break;}}
    colors.clear();
    for(let i=0,j=0;i<rgba.length;i+=4,j++){
      if(rgba[i+3]<128)continue;
      // shortcut: GIF has binary alpha and 255 opaque colors; large palettes use RGB 3/3/1 quantization.
      const r=quantized?Math.round((rgba[i]>>5)*255/7):rgba[i],g=quantized?Math.round((rgba[i+1]>>5)*255/7):rgba[i+1],b=quantized?(rgba[i+2]>=128?255:0):rgba[i+2];
      const rgb=(r<<16)|(g<<8)|b;
      if(!colors.has(rgb)){colors.set(rgb,palette.length/3);palette.push(r,g,b);}
      indices[j]=colors.get(rgb);
    }
    while(palette.length<768)palette.push(0);
    bytes.push(0x21,0xf9,4,9);word(Math.max(1,Math.round(frame.delay/10)));bytes.push(0,0,0x2c);word(0);word(0);word(width);word(height);bytes.push(0x87,...palette,8);
    const compressed=[];let bits=0,count=0;
    const code=n=>{bits|=n<<count;count+=9;while(count>=8){compressed.push(bits&255);bits>>>=8;count-=8;}};
    // Clear before the dictionary grows: a small, bounded encoder without a second dictionary implementation.
    for(let start=0;start<indices.length;start+=200){code(256);for(let i=start;i<Math.min(start+200,indices.length);i++)code(indices[i]);}
    code(257);if(count)compressed.push(bits&255);
    for(let i=0;i<compressed.length;i+=255){const block=compressed.slice(i,i+255);bytes.push(block.length,...block);}bytes.push(0);
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  bytes.push(0x3b);return new Blob([new Uint8Array(bytes)],{type:'image/gif'});
};
