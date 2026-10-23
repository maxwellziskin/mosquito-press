// Threshold the finished artwork, including photos, logos, type, and effects.
// Source colors and image data stay untouched so the toggle is reversible.
export function contrastingBlackOrWhite(hex){
  const [r,g,b]=hex.slice(1).match(/../g).map(v=>parseInt(v,16));
  return .299*r+.587*g+.114*b<150?'#ffffff':'#000000';
}
export function hardBlackAndWhite(canvas){
  const ctx=canvas.getContext('2d'),image=ctx.getImageData(0,0,canvas.width,canvas.height),data=image.data;
  for(let i=0;i<data.length;i+=4){
    const alpha=data[i+3]/255;
    const luminance=(.299*data[i]+.587*data[i+1]+.114*data[i+2])*alpha+255*(1-alpha);
    const ink=luminance<150?0:255;
    data[i]=data[i+1]=data[i+2]=ink;data[i+3]=255;
  }
  ctx.putImageData(image,0,0);
  return canvas;
}
