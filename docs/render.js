import {brandFont} from './brand-type.js';
import {hardBlackAndWhite,contrastingBlackOrWhite} from './bw.js';
import {flySource} from './fly.js';
import {artSource,artRatio} from './brand.js';
import {sheetSpec,sheetPages,sheetSlots} from './formats.js';
import {isText,layerBox,layerName} from './layers.js';
export {PAPER,SHEET_ORDER} from './formats.js';
const images = new Map();
export async function loadImage(src) {
  if (!src) return null;
  if (!images.has(src)) images.set(src, new Promise((resolve,reject) => {
    const im = new Image(); im.onload=()=>resolve(im); im.onerror=()=>{images.delete(src);reject(new Error('This image could not be read.'));}; im.src=src;
  }));
  return images.get(src);
}
export async function preloadPages(pages) { await Promise.all(pages.flatMap(p=>[loadImage(p.image),...(['fly','star'].includes(p.decoration)?[loadImage(flySource(p.accent))]:[]),...(p.art||[]).filter(a=>!isText(a)).map(a=>loadImage(artSource(a)))])); }
const type = (ctx, size, family='Pirelli') => ctx.font=`${size}px "${family}"`;
function lines(ctx, text, width) {
  const result=[];
  for(const para of String(text||'').split('\n')){
    if(!para){result.push('');continue;}
    let current='';
    for(const word of para.split(/\s+/)){
      if(ctx.measureText(word).width>width){
        if(current){result.push(current);current='';}
        for(const char of word){if(ctx.measureText(current+char).width>width&&current){result.push(current);current='';}current+=char;}
      }else if(current&&ctx.measureText(current+' '+word).width>width){result.push(current);current=word;}
      else current+=(current?' ':'')+word;
    }
    result.push(current);
  }
  return result;
}
function frameBounds(ctx,x,y,w,h){
  const m=ctx.getTransform(),pts=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([a,b])=>({x:m.a*a+m.c*b+m.e,y:m.b*a+m.d*b+m.f}));
  const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),spec=ctx._spec;
  return {x:Math.min(...xs)/ctx.canvas.width*spec.pageW,y:Math.min(...ys)/ctx.canvas.height*spec.pageH,w:(Math.max(...xs)-Math.min(...xs))/ctx.canvas.width*spec.pageW,h:(Math.max(...ys)-Math.min(...ys))/ctx.canvas.height*spec.pageH};
}
function printMark(ctx,kind,x,y,w,h,extra={}){ctx.canvas.printMarks.push({kind,...frameBounds(ctx,x,y,w,h),...extra});}
function textBlock(ctx,text,{x,y,width,height,size=25,min=8,lineHeight=1.15,family='Pirelli',align='left',color='#222',fit=true}) {
  let fs=size, ls=[];
  if(fit){type(ctx,fs,family);const widest=Math.max(0,...String(text||'').split(/\s+/).map(word=>ctx.measureText(word).width));if(widest>width)fs=Math.max(min,fs*width/widest*.995);}
  do{type(ctx,fs,family);ls=lines(ctx,text,width);if(!fit||ls.length*fs*lineHeight<=height||fs<=min)break;fs-=.5;}while(fs>=min);
  const overflow=ls.length*fs*lineHeight>height+1||ls.some(line=>ctx.measureText(line).width>width+1);if(overflow)ctx.canvas.dataset.overflow='true';ctx.fillStyle=color;ctx.textBaseline='top';ctx.textAlign=align;
  const ax=align==='center'?x+width/2:align==='right'?x+width:x;
  const visibleWidth=Math.max(0,...ls.map(line=>ctx.measureText(line).width));
  if(String(text).trim())printMark(ctx,'text',align==='center'?x+(width-visibleWidth)/2:align==='right'?x+width-visibleWidth:x,y,visibleWidth,Math.min(height,ls.length*fs*lineHeight),{overflow,label:String(text).slice(0,45)});
  if(ctx._capture&&String(text).trim()){const b=frameBounds(ctx,x,y,width,height),spec=ctx._spec;ctx._capture.push({kind:'text',text,font:family,size:fs*ctx._unit*72,lineHeight,color,align,x:(b.x+b.w/2)/spec.pageW*100,y:(b.y+b.h/2)/spec.pageH*100,width:b.w/spec.pageW*100,height:b.h/spec.pageH*100,rotation:0,locked:false});}
  ls.forEach((line,i)=>{if((i+1)*fs*lineHeight<=height+1)ctx.fillText(line,ax,y+i*fs*lineHeight);});
  return ls.length*fs*lineHeight;
}
async function fly(ctx,x,y,r,color){const im=await loadImage(flySource(color)),w=r*2,h=w*im.height/im.width;ctx.drawImage(im,x-w/2,y-h/2,w,h);}
let grainTile;
function grain(ctx,w,h){
  if(!grainTile){grainTile=document.createElement('canvas');grainTile.width=grainTile.height=100;let c=grainTile.getContext('2d'),d=c.createImageData(100,100);let n=1381;for(let i=0;i<d.data.length;i+=4){n=(n*16807)%2147483647;let v=n%255;d.data[i]=d.data[i+1]=d.data[i+2]=v<128?0:255;d.data[i+3]=n%19;}c.putImageData(d,0,0);}
  ctx.save();ctx.fillStyle=ctx.createPattern(grainTile,'repeat');ctx.fillRect(0,0,w,h);ctx.restore();
}
const rotatedPhotos=new Map();
async function photo(ctx,p,x,y,w,h){
  if(!p.image)return;
  let im=await loadImage(p.image);
  const rotation=p.imageRotate||0;
  if(rotation){const key=p.image+':rotate:'+rotation;if(!rotatedPhotos.has(key)){const c=document.createElement('canvas');c.width=rotation%180?im.height:im.width;c.height=rotation%180?im.width:im.height;const cx=c.getContext('2d');cx.translate(c.width/2,c.height/2);cx.rotate(rotation*Math.PI/180);cx.drawImage(im,-im.width/2,-im.height/2);rotatedPhotos.set(key,c);while(rotatedPhotos.size>3)rotatedPhotos.delete(rotatedPhotos.keys().next().value);}im=rotatedPhotos.get(key);}
  let scale=(p.fit==='contain'?Math.min(w/im.width,h/im.height):Math.max(w/im.width,h/im.height))* (p.fit==='contain'?1:(p.zoom||100)/100);
  let dw=im.width*scale,dh=im.height*scale,fx=(p.focal??50)/100,fy=(p.focalY??50)/100;
  const W=640*ctx._spec.pageW/ctx._spec.pageH;
  printMark(ctx,'image',p.fit==='contain'?x+(w-dw)*fx:x,p.fit==='contain'?y+(h-dh)*fy:y,p.fit==='contain'?dw:w,p.fit==='contain'?dh:h,{dpi:1/ctx._unit/scale,label:p.name||'Photo',vector:!!p.vector});
  if(ctx._capture){const b=frameBounds(ctx,x,y,w,h),spec=ctx._spec;ctx._capture.push({src:p.image,ratio:im.width/im.height,name:'Photo',x:(b.x+b.w/2)/spec.pageW*100,y:(b.y+b.h/2)/spec.pageH*100,width:b.w/spec.pageW*100,height:b.h/spec.pageH*100,rotation:0,fit:p.fit,treatment:p.treatment,focal:p.focal,focalY:p.focalY??50,zoom:p.zoom||100,imageRotate:p.imageRotate||0,overlay:p.overlay,locked:false});}
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  ctx.filter=p.treatment==='mono'?'grayscale(1) contrast(1.2)':p.treatment==='warm'?'sepia(.45) saturate(.8)':p.treatment==='high'?'grayscale(1) contrast(1.8)':'none';
  ctx.drawImage(im,x+(w-dw)*fx,y+(h-dh)*fy,dw,dh);ctx.filter='none';
  if(p.overlay){ctx.fillStyle=`rgba(0,0,0,${p.overlay/100})`;ctx.fillRect(x,y,w,h);}
  ctx.restore();
}
export async function drawPage(canvas,p,paper,index,width=600,format='zine',capture=null,bw=false){
  // Keep the brand fly visible when its accent and paper cross the same threshold.
  if(bw&&['fly','star'].includes(p.decoration))p={...p,accent:contrastingBlackOrWhite(p.bg)};
  const spec=sheetSpec(paper,format),H=640,reserved=spec.neck&&p.layout!=='free'?2:0,unit=(spec.pageH-reserved)/H,W=spec.pageW/unit,fullH=spec.pageH/unit;canvas.width=Math.round(width);canvas.height=Math.round(width*spec.pageH/spec.pageW);
  canvas.dataset.overflow='false';canvas.printMarks=[];const ctx=canvas.getContext('2d');ctx._spec=spec;ctx._unit=unit;ctx._capture=capture;ctx.scale(canvas.width/W,canvas.height/fullH);ctx.fillStyle=p.bg;ctx.fillRect(0,0,W,fullH);
  const m=30,iw=W-m*2;
  if(['photo-only','photo-caption','photo-inset'].includes(p.layout)){
    const inset=p.layout==='photo-only'?0:.125/unit,caption=p.layout==='photo-caption'&&p.photoCaption?.trim(),captionH=caption?Math.min(H*.23,.65/unit):0;
    if(p.image)await photo(ctx,p,inset,reserved/unit+inset,W-2*inset,H-2*inset-captionH);
    else{textBlock(ctx,'Add a photo',{x:W*.1,y:fullH*.45,width:W*.8,height:fullH*.15,size:22,min:10,family:'Pirelli',align:'center',color:p.ink});}
    if(caption)textBlock(ctx,p.photoCaption,{x:inset,y:fullH-inset-captionH+8,width:W-2*inset,height:captionH-8,size:8/72/unit,min:6/72/unit,family:brandFont(p.photoCaption,p.bodyFont),align:p.align,color:p.ink,lineHeight:1.25});
  }else if(p.layout!=='free'){ctx.save();ctx.translate(0,reserved/unit);
  if(spec.pageH<=2){
    const inset=.125/unit,iw=W-2*inset,pt=n=>n/72/unit;
    if(p.image)await photo(ctx,p,0,0,W,H);
    textBlock(ctx,p.eyebrow,{x:inset,y:.125/unit,width:iw,height:.15/unit,size:pt(6),min:pt(5),family:brandFont(p.eyebrow,p.bodyFont),color:p.ink,lineHeight:1});
    textBlock(ctx,p.title,{x:inset,y:.34/unit,width:iw,height:(spec.pageH-.8)/unit,size:pt(28)*p.size/100,min:pt(6),family:p.font,color:p.ink,align:p.align,lineHeight:.96});
    textBlock(ctx,p.body,{x:inset,y:(spec.pageH-.45)/unit,width:iw,height:.17/unit,size:pt(8),min:pt(6),family:p.bodyFont,color:p.ink,align:p.align,lineHeight:1.1});
    textBlock(ctx,p.byline,{x:inset,y:(spec.pageH-.25)/unit,width:iw-pt(18),height:.125/unit,size:pt(6),min:pt(5),family:p.bodyFont,color:p.ink,lineHeight:1});
    if(p.pageNumber&&(spec.folded||spec.insert))textBlock(ctx,String(index+1).padStart(2,'0'),{x:W-inset-pt(15),y:(spec.pageH-.25)/unit,width:pt(15),height:.125/unit,size:pt(6),family:p.bodyFont,color:p.ink,align:'right',lineHeight:1});
  }else{

  if(p.layout==='photo')await photo(ctx,p,0,0,W,H);
  ctx.strokeStyle=p.ink;ctx.lineWidth=.7;
  textBlock(ctx,p.eyebrow,{x:m,y:27,width:iw,height:31,size:9,family:brandFont(p.eyebrow,p.bodyFont),color:p.ink,lineHeight:1.1});
  ctx.beginPath();ctx.moveTo(m,63);ctx.lineTo(W-m,63);ctx.stroke();
  if(p.layout==='poster'){
    let top=83, available=p.image?285:371;
    textBlock(ctx,p.title,{x:m-1,y:top,width:iw+2,height:available,size:83*p.size/100,min:13,family:p.font,lineHeight:.89,align:p.align,color:p.ink});
    if(p.image)await photo(ctx,p,m,382,iw,150);
    else if(['fly','star'].includes(p.decoration))await fly(ctx,W-83,465,58,p.accent);
    else if(p.decoration==='orbit'){ctx.save();ctx.strokeStyle=p.accent;ctx.lineWidth=3;for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(W/2,466,iw/2,17+i*14,-.13,0,Math.PI*2);ctx.stroke();}ctx.restore();}
    textBlock(ctx,p.body,{x:m,y:p.image?546:p.decoration==='orbit'?536:478,width:['fly','star'].includes(p.decoration)&&!p.image?iw-117:iw,height:p.image?42:p.decoration==='orbit'?42:85,size:12.5,family:p.bodyFont,align:p.align,color:p.ink,lineHeight:1.35});
  }else if(p.layout==='editorial'){
    const titleH=textBlock(ctx,p.title,{x:m,y:86,width:iw,height:180,size:48*p.size/100,family:p.font,align:p.align,color:p.ink,lineHeight:.98});
    let bodyY=103+titleH;
    if(p.image){await photo(ctx,p,m,bodyY,iw,170);bodyY+=186;}
    textBlock(ctx,p.body,{x:m,y:bodyY,width:iw,height:568-bodyY,size:16,family:p.bodyFont,align:p.align,color:p.ink,lineHeight:1.35});
    if(['fly','star'].includes(p.decoration))await fly(ctx,W-45,555,14,p.accent);
  }else if(p.layout==='photo'){
    if(!p.image){ctx.save();ctx.strokeStyle=p.accent;ctx.lineWidth=1.5;for(let r=35;r<260;r+=27){ctx.beginPath();ctx.arc(W*.68,270,r,0,Math.PI*2);ctx.stroke();}ctx.restore();}
    textBlock(ctx,p.title,{x:m,y:310,width:iw,height:190,size:62*p.size/100,family:p.font,align:p.align,color:p.ink,lineHeight:.96});
    textBlock(ctx,p.body,{x:m,y:520,width:iw,height:55,size:13,family:p.bodyFont,align:p.align,color:p.ink});
  }else if(p.layout==='quote'){
    if(p.image)await photo(ctx,p,m,85,iw,160);
    else if(p.decoration!=='none')await fly(ctx,W/2,138,37,p.accent);
    textBlock(ctx,p.title,{x:m,y:p.image?270:220,width:iw,height:p.image?225:275,size:57*p.size/100,family:p.font,align:p.align,color:p.ink,lineHeight:1.05});
    textBlock(ctx,p.body,{x:m,y:522,width:iw,height:55,size:13,family:p.bodyFont,align:p.align,color:p.ink});
  }else if(p.layout==='banner'){
    ctx.fillStyle=p.accent;ctx.fillRect(m,85,iw,255);
    textBlock(ctx,p.title,{x:m+18,y:108,width:iw-36,height:215,size:72*p.size/100,family:p.font,align:p.align,color:p.ink,lineHeight:.96});
    if(p.image)await photo(ctx,p,m,360,iw*.45,207);
    textBlock(ctx,p.body,{x:p.image?m+iw*.5:m,y:373,width:p.image?iw*.5:iw,height:190,size:21,family:p.bodyFont,align:p.align,color:p.ink,lineHeight:1.35});
  }else if(p.layout==='frame'){
    ctx.strokeStyle=p.accent;ctx.lineWidth=8;ctx.strokeRect(m+4,85,iw-8,484);ctx.lineWidth=1;ctx.strokeRect(m+16,97,iw-32,460);
    if(p.image)await photo(ctx,p,m+32,116,iw-64,150);
    textBlock(ctx,p.title,{x:m+32,y:p.image?290:155,width:iw-64,height:p.image?165:255,size:65*p.size/100,family:p.font,align:p.align,color:p.ink,lineHeight:1});
    textBlock(ctx,p.body,{x:m+32,y:470,width:iw-64,height:65,size:14,family:p.bodyFont,align:p.align,color:p.ink,lineHeight:1.3});
  }else if(p.layout==='split'){
    ctx.fillStyle=p.accent;ctx.fillRect(m,85,iw,220);
    if(p.image)await photo(ctx,p,m,85,iw,220);
    else{ctx.save();ctx.strokeStyle=p.ink;ctx.lineWidth=1;for(let i=1;i<6;i++){ctx.beginPath();ctx.moveTo(m,85+i*36);ctx.lineTo(W-m,85+i*36);ctx.stroke();}ctx.restore();}
    textBlock(ctx,p.title,{x:m,y:327,width:iw,height:178,size:64*p.size/100,family:p.font,align:p.align,color:p.ink,lineHeight:.95});
    textBlock(ctx,p.body,{x:m,y:526,width:iw,height:49,size:13,family:p.bodyFont,align:p.align,color:p.ink});
  }else if(p.layout==='menu'){
    const titleH=textBlock(ctx,p.title,{x:m,y:84,width:iw,height:185,size:55*p.size/100,family:p.font,align:p.align,color:p.ink,lineHeight:.96});
    const y=106+titleH;ctx.fillStyle=p.accent;ctx.fillRect(m,y,iw,7);
    textBlock(ctx,p.body,{x:m,y:y+30,width:iw,height:558-y-30,size:21,family:p.bodyFont,align:p.align,color:p.ink,lineHeight:1.65});
  }else if(p.layout==='label'){
    ctx.fillStyle=p.accent;ctx.fillRect(m,86,iw,485);ctx.fillStyle=p.bg;ctx.fillRect(m+13,99,iw-26,459);
    textBlock(ctx,p.title,{x:m+30,y:153,width:iw-60,height:275,size:65*p.size/100,family:p.font,align:p.align,color:p.ink,lineHeight:1.02});
    ctx.strokeStyle=p.ink;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(m+30,450);ctx.lineTo(W-m-30,450);ctx.stroke();
    textBlock(ctx,p.body,{x:m+30,y:475,width:iw-60,height:60,size:14,family:p.bodyFont,align:p.align,color:p.ink,lineHeight:1.3});
  }else if(p.layout==='columns'){
    const col=(iw-30)/2;
    textBlock(ctx,p.title,{x:m,y:89,width:col,height:445,size:60*p.size/100,family:p.font,align:p.align,color:p.ink,lineHeight:1.04});
    ctx.strokeStyle=p.accent;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(W/2,85);ctx.lineTo(W/2,565);ctx.stroke();
    if(p.image)await photo(ctx,p,W/2+15,85,col,205);
    textBlock(ctx,p.body,{x:W/2+15,y:p.image?312:91,width:col,height:p.image?250:470,size:19,family:p.bodyFont,align:p.align,color:p.ink,lineHeight:1.45});
  }else{
    const titleH=textBlock(ctx,p.title,{x:m,y:85,width:iw,height:145,size:52*p.size/100,family:p.font,align:p.align,color:p.ink,lineHeight:1});
    const bodyY=115+titleH;
    ctx.save();ctx.globalAlpha=.22;for(let y=bodyY+25;y<577;y+=27){ctx.beginPath();ctx.moveTo(m,y);ctx.lineTo(W-m,y);ctx.stroke();}ctx.restore();
    textBlock(ctx,p.body,{x:m,y:bodyY,width:iw,height:570-bodyY,size:15,family:p.bodyFont,align:p.align,color:p.ink,lineHeight:1.8});
  }
  ctx.beginPath();ctx.moveTo(m,590);ctx.lineTo(W-m,590);ctx.stroke();
  textBlock(ctx,p.byline,{x:m,y:602,width:iw-35,height:23,size:9,family:p.bodyFont,color:p.ink,lineHeight:1.1});
  if(p.pageNumber&&(spec.folded||spec.insert))textBlock(ctx,String(index+1).padStart(2,'0'),{x:W-m-25,y:601,width:25,height:20,size:10,family:p.bodyFont,align:'right',color:p.ink});
  }ctx.restore();}
  if(p.grain)grain(ctx,W,fullH);
  // Artwork stays proportional and prints without editor selection outlines or grain effects.
  for(const a of p.art||[]){
    const box=layerBox(a,spec),w=box.w/unit,h=box.h/unit;
    ctx.save();ctx.translate(W*a.x/100,fullH*a.y/100);ctx.rotate(a.rotation*Math.PI/180);
    if(isText(a))textBlock(ctx,a.text,{x:-w/2,y:-h/2,width:w,height:h,size:a.size/72/unit,family:a.font,lineHeight:a.lineHeight,align:a.align,color:a.color,fit:false});
    else await photo(ctx,{image:artSource(a),fit:a.fit||'cover',treatment:a.treatment||'original',focal:a.focal??50,focalY:a.focalY??50,zoom:a.zoom||100,imageRotate:a.imageRotate||0,overlay:a.overlay||0,name:layerName(a),vector:!!a.asset&&artSource(a).endsWith('.svg')},-w/2,-h/2,w,h);
    ctx.restore();
  }
  if(bw)hardBlackAndWhite(canvas);
  return canvas;
}
export async function movableLayers(page,paper,format){
  const capture=[],canvas=document.createElement('canvas');
  await drawPage(canvas,{...page,art:[]},paper,0,600,format,capture);
  return [...capture,...(page.art||[])];
}
export function drawTrimGuides(ctx,spec,width,safety=false,printerMargin=.25,bw=false){
  const scale=width/spec.w;ctx.save();ctx.scale(scale,scale);ctx.lineWidth=.008;ctx.strokeStyle=bw?'#000000':'#697477';
  const line=(x1,y1,x2,y2)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();};
  if(spec.folded||spec.insert){
    ctx.strokeStyle=bw?'#000000':'#297da3';ctx.setLineDash([.045,.035]);
    for(let i=1;i<spec.cols;i++)line(i*spec.slotW,0,i*spec.slotW,spec.h);
    if(spec.folded){line(0,spec.slotH,spec.w,spec.slotH);ctx.setLineDash([]);ctx.strokeStyle=bw?'#000000':'#df582d';ctx.lineWidth=.02;line(spec.slotW,spec.slotH,3*spec.slotW,spec.slotH);}
  }else for(const s of sheetSlots(spec)){
    ctx.setLineDash([]);ctx.strokeStyle=bw?'#000000':'#df582d';if(spec.count>1)ctx.strokeRect(s.x,s.y,s.w,s.h);
    ctx.strokeStyle=bw?'#000000':'#297da3';ctx.setLineDash([.045,.035]);
    if(spec.tent)line(s.x,s.y+s.h/2,s.x+s.w,s.y+s.h/2);
    if(spec.neck){ctx.strokeStyle=bw?'#000000':'#df582d';ctx.setLineDash([]);ctx.beginPath();ctx.arc(s.x+s.w/2,s.y+1,.625,0,Math.PI*2);ctx.stroke();ctx.strokeStyle=bw?'#000000':'#297da3';ctx.setLineDash([.045,.035]);line(s.x,s.y+2,s.x+s.w,s.y+2);}
  }
  if(safety){ctx.setLineDash([.06,.04]);ctx.strokeStyle=bw?'#000000':'#297da3';ctx.lineWidth=.012;ctx.strokeRect(printerMargin,printerMargin,spec.w-2*printerMargin,spec.h-2*printerMargin);}
  ctx.restore();
}
export async function drawSheet(canvas,project,width=1400,guides=false,sheetIndex=0,selected=0){
  const spec=sheetSpec(project.paper,project.format),sheets=sheetPages(project,selected),slots=sheetSlots(spec);
  const indices=sheets[Math.max(0,Math.min(sheetIndex,sheets.length-1))];
  canvas.width=Math.round(width);canvas.height=Math.round(width*spec.h/spec.w);canvas.dataset.overflow='false';
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);const scale=canvas.width/spec.w;
  for(let slot=0;slot<indices.length;slot++){
    const idx=indices[slot],tile=document.createElement('canvas'),s=slots[slot];await drawPage(tile,project.pages[idx],project.paper,idx,Math.ceil(s.w*scale),project.format,null,project.bw);
    if(tile.dataset.overflow==='true')canvas.dataset.overflow='true';
    const faceH=spec.pageH*scale,x=s.x*scale,y=s.y*scale,w=s.w*scale;
    const face=(top,rotated)=>{ctx.save();ctx.translate(x+w/2,top+faceH/2);if(rotated)ctx.rotate(Math.PI);ctx.drawImage(tile,-w/2,-faceH/2,w,faceH);ctx.restore();};
    face(y,spec.tent||spec.folded&&slot<4);if(spec.tent)face(y+faceH,false);
  }
  if(guides)drawTrimGuides(ctx,spec,canvas.width);
  if(project.bw)hardBlackAndWhite(canvas);
  return canvas;
}
export function drawSafetyOverlay(canvas,project,isSheet=false){
  const spec=sheetSpec(project.paper,project.format),ctx=canvas.getContext('2d');
  if(isSheet){drawTrimGuides(ctx,spec,canvas.width,true,project.printerMargin??.25);return;}
  const scale=canvas.width/spec.pageW,m=project.safeMargin??.125;ctx.save();ctx.scale(scale,scale);ctx.lineWidth=.012;ctx.strokeStyle='#297da3';ctx.setLineDash([.06,.04]);ctx.strokeRect(m,m,spec.pageW-2*m,spec.pageH-2*m);
  if(spec.neck){ctx.beginPath();ctx.arc(spec.pageW/2,1,.625,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(0,2);ctx.lineTo(spec.pageW,2);ctx.stroke();}
  ctx.restore();
}
const enc = new TextEncoder();
function join(parts){const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let i=0;for(const p of parts){out.set(p,i);i+=p.length;}return out;}
function ascii(s){return enc.encode(s);}
export function createPDF(pages){
  const count=pages.length,objects=[];
  objects.push(ascii('<< /Type /Catalog /Pages 2 0 R >>'));
  objects.push(ascii(`<< /Type /Pages /Count ${count} /Kids [${pages.map((p,i)=>`${3+i*3} 0 R`).join(' ')}] >>`));
  pages.forEach((p,i)=>{
    const id=3+i*3;objects.push(ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.w} ${p.h}] /Resources << /XObject << /Im0 ${id+2} 0 R >> >> /Contents ${id+1} 0 R >>`));
    const stream=`q\n${p.w} 0 0 ${p.h} 0 0 cm\n/Im0 Do\nQ\n`;
    objects.push(ascii(`<< /Length ${ascii(stream).length} >>\nstream\n${stream}endstream`));
    objects.push(join([ascii(`<< /Type /XObject /Subtype /Image /Width ${p.pxw} /Height ${p.pxh} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`),p.jpeg,ascii('\nendstream')]));
  });
  let output=[ascii('%PDF-1.4\n%MosquitoPress\n')],offset=output[0].length,offsets=[0];
  objects.forEach((body,i)=>{offsets.push(offset);const object=join([ascii(`${i+1} 0 obj\n`),body,ascii('\nendobj\n')]);output.push(object);offset+=object.length;});
  const xref=offset;output.push(ascii(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
  return new Blob(output,{type:'application/pdf'});
}
export function canvasJpeg(canvas){const raw=atob(canvas.toDataURL('image/jpeg',.98).split(',')[1]);return Uint8Array.from(raw,c=>c.charCodeAt(0));}
export async function png300dpi(canvas){
  const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));const bytes=new Uint8Array(await blob.arrayBuffer());
  const body=new Uint8Array(13),view=new DataView(body.buffer);body.set(ascii('pHYs'));view.setUint32(4,11811);view.setUint32(8,11811);body[12]=1;
  let crc=0xffffffff;for(const b of body){crc^=b;for(let i=0;i<8;i++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1;}const chunk=new Uint8Array(21),cv=new DataView(chunk.buffer);cv.setUint32(0,9);chunk.set(body,4);cv.setUint32(17,(crc^0xffffffff)>>>0);
  return new Blob([bytes.slice(0,33),chunk,bytes.slice(33)],{type:'image/png'});
}
