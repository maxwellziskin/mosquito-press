import {drawPage,drawTrimGuides,preloadPages} from './render.js';
import {sheetSpec,sheetPages,sheetSlots,activeCount} from './formats.js';
import {ensureFonts} from './fonts.js';
const fontFiles={Primos:'primos.ttf',Pirelli:'pirelli.otf','Primos Condensed':'primos-condensed.ttf'};
const svgCache=new Map();
async function vectorSources(project){
  const {artSource}=await import('./brand.js'),{flySource}=await import('./fly.js');
  const sources=new Set(project.pages.flatMap(p=>[...(['fly','star'].includes(p.decoration)?[flySource(p.accent)]:[]),...(p.art||[]).filter(a=>a.kind!=='text').map(artSource)]).filter(s=>s&&(/\.svg$/.test(s)||s.startsWith('data:image/svg+xml'))));
  await Promise.all([...sources].map(async src=>{if(svgCache.has(src))return;const response=await fetch(src);if(!response.ok)throw Error('An SVG asset could not be loaded.');svgCache.set(src,await response.text());}));
}
// Canvas-compatible drawing surface: the existing page renderer supplies the same
// wrapping, positions, cropping, and rotations to both screen and vector PDF.
function pdfCanvas(doc,runtime,fonts,width,height){
  const measure=document.createElement('canvas').getContext('2d');
  const canvas={width,height,dataset:{},printMarks:[],getContext:()=>ctx};
  Object.defineProperties(canvas,{width:{get:()=>width,set:()=>{}},height:{get:()=>height,set:()=>{}}});
  let matrix=new DOMMatrix(),stack=[];
  const keys=['fillStyle','strokeStyle','lineWidth','globalAlpha','font','textAlign','textBaseline','filter'];
  const color=value=>{const m=String(value).match(/^rgba?\(([^)]+)\)$/);if(!m)return {color:value,alpha:1};const a=m[1].split(',').map(Number);return {color:a.slice(0,3),alpha:a[3]??1};};
  function paint(stroke=false){const c=color(stroke?ctx.strokeStyle:ctx.fillStyle);if(stroke)doc.strokeColor(c.color).strokeOpacity(ctx.globalAlpha*c.alpha).lineWidth(ctx.lineWidth);else doc.fillColor(c.color).fillOpacity(ctx.globalAlpha*c.alpha);}
  const rasterCache=new Map();
  const raster=(im,filter='none')=>{const key=(im.src||'')+filter;if(im.src&&rasterCache.has(key))return rasterCache.get(key);let data;if(filter==='none'&&/^data:image\/(png|jpeg);/.test(im.src||''))data=im.src;else{const c=document.createElement('canvas');c.width=im.naturalWidth||im.width;c.height=im.naturalHeight||im.height;const x=c.getContext('2d');x.filter=filter;x.drawImage(im,0,0);data=c.toDataURL('image/png');}if(im.src)rasterCache.set(key,data);return data;};
  const ctx={canvas,fillStyle:'#000000',strokeStyle:'#000000',lineWidth:1,globalAlpha:1,font:'12px "Pirelli"',textAlign:'left',textBaseline:'top',filter:'none',
    save(){stack.push({matrix:new DOMMatrix(matrix),props:Object.fromEntries(keys.map(k=>[k,this[k]]))});doc.save();},
    restore(){const state=stack.pop();if(!state)return;matrix=state.matrix;Object.assign(this,state.props);doc.restore();},
    getTransform(){return matrix;},
    scale(x,y){matrix=matrix.scale(x,y);doc.transform(x,0,0,y,0,0);},
    translate(x,y){matrix=matrix.translate(x,y);doc.translate(x,y);},
    rotate(angle){matrix=matrix.rotate(angle*180/Math.PI);doc.rotate(angle*180/Math.PI);},
    beginPath(){},moveTo(x,y){doc.moveTo(x,y);},lineTo(x,y){doc.lineTo(x,y);},closePath(){doc.closePath();},rect(x,y,w,h){doc.rect(x,y,w,h);},
    arc(x,y,r,start,end){if(Math.abs(end-start)>=Math.PI*2-.001)doc.circle(x,y,r);else{const n=32;for(let i=0;i<=n;i++){const a=start+(end-start)*i/n,px=x+r*Math.cos(a),py=y+r*Math.sin(a);if(i)doc.lineTo(px,py);else doc.moveTo(px,py);}}},
    ellipse(x,y,rx,ry,angle,start,end){const n=96;for(let i=0;i<=n;i++){const a=start+(end-start)*i/n,px=x+rx*Math.cos(a)*Math.cos(angle)-ry*Math.sin(a)*Math.sin(angle),py=y+rx*Math.cos(a)*Math.sin(angle)+ry*Math.sin(a)*Math.cos(angle);if(i)doc.lineTo(px,py);else doc.moveTo(px,py);}doc.closePath();},
    clip(){doc.clip();},stroke(){paint(true);doc.stroke();},fill(){paint();doc.fill();},
    setLineDash(a){if(a.length)doc.dash(a[0],{space:a[1]||a[0]});else doc.undash();},
    strokeRect(x,y,w,h){paint(true);doc.rect(x,y,w,h).stroke();},
    createPattern(tile){return {tile};},
    fillRect(x,y,w,h){if(this.fillStyle?.tile){const t=this.fillStyle.tile,data=raster(t);doc.save().rect(x,y,w,h).clip();for(let ty=y;ty<y+h;ty+=t.height)for(let tx=x;tx<x+w;tx+=t.width)doc.image(data,tx,ty,{width:t.width,height:t.height});doc.restore();return;}paint();doc.rect(x,y,w,h).fill();},
    measureText(text){measure.font=this.font;measure.textBaseline=this.textBaseline;return measure.measureText(text);},
    fillText(text,x,y){if(!text)return;const match=this.font.match(/^([\d.]+)px\s+["']?(.+?)["']?$/),size=Number(match?.[1]||12),family=match?.[2]||'Pirelli';const metrics=this.measureText(text),w=metrics.width;let px=this.textAlign==='center'?x-w/2:this.textAlign==='right'?x-w:x;
      if(fonts.has(family)){paint();doc.font(family).fontSize(size);measure.textBaseline='alphabetic';const baseline=measure.measureText(text).actualBoundingBoxAscent-metrics.actualBoundingBoxAscent;doc.text(text,px,y+baseline,{lineBreak:false,baseline:'alphabetic',features:['kern'],characterSpacing:0});}
      else{const c=document.createElement('canvas'),scale=4;c.width=Math.ceil((w+size)*scale);c.height=Math.ceil(size*2.8*scale);const x2=c.getContext('2d');x2.scale(scale,scale);x2.font=this.font;x2.fillStyle=this.fillStyle;x2.textBaseline=this.textBaseline;x2.fillText(text,size/2,size/2);doc.save().opacity(this.globalAlpha).image(c.toDataURL('image/png'),px-size/2,y-size/2,{width:c.width/scale,height:c.height/scale}).restore();}
    },
    drawImage(im,x,y,w=im.width,h=im.height){const svg=svgCache.get(im.src||'')||svgCache.get(im.getAttribute?.('src'));doc.save().opacity(this.globalAlpha);if(svg&&this.filter==='none')runtime.SVGtoPDF(doc,svg,x,y,{width:w,height:h,assumePt:true,preserveAspectRatio:'none',warningCallback:()=>{}});else doc.image(raster(im,this.filter),x,y,{width:w,height:h});doc.restore();}
  };
  return canvas;
}
export async function vectorPDF(project,{mode='print',selected=0,guides=false,progress=()=>{}}={}){
  const runtime=await import('./vendor/pdf-runtime.js');await ensureFonts(project);await document.fonts.ready;await preloadPages(project.pages);await vectorSources(project);
  const spec=sheetSpec(project.paper,project.format),doc=new runtime.PDFDocument({autoFirstPage:false,compress:true,info:{Title:project.name,Creator:'Mosquito Press'}}),fonts=new Set();
  const chunks=[],result=new Promise((resolve,reject)=>{doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(new Blob(chunks,{type:'application/pdf'})));doc.on('error',reject);});
  await Promise.all(Object.entries(fontFiles).map(async([name,file])=>{const res=await fetch('assets/fonts/'+file);if(!res.ok)throw Error('A brand font could not be loaded.');doc.registerFont(name,runtime.Buffer.from(await res.arrayBuffer()));fonts.add(name);}));
  for(const f of project.fonts||[]){doc.registerFont(f.id,runtime.Buffer.from(f.data,'base64'));fonts.add(f.id);}
  const face=async(index,x,y,rotate=false)=>{const w=spec.pageW*72,h=spec.pageH*72;doc.save().translate(x+w/2,y+h/2);if(rotate)doc.rotate(180);doc.translate(-w/2,-h/2).rect(0,0,w,h).clip();const canvas=pdfCanvas(doc,runtime,fonts,w,h);await drawPage(canvas,project.pages[index],project.paper,index,w,project.format);doc.restore();};
  if(mode==='print'){
    const sheets=sheetPages(project,selected),slots=sheetSlots(spec);
    for(let n=0;n<sheets.length;n++){progress(`Preparing vector sheet ${n+1} of ${sheets.length}…`);doc.addPage({size:[spec.w*72,spec.h*72],margin:0});for(let i=0;i<sheets[n].length;i++){const s=slots[i];await face(sheets[n][i],s.x*72,s.y*72,spec.tent||spec.folded&&i<4);if(spec.tent)await face(sheets[n][i],s.x*72,(s.y+spec.pageH)*72);}if(guides)drawTrimGuides(pdfCanvas(doc,runtime,fonts,spec.w*72,spec.h*72).getContext('2d'),spec,spec.w*72);}
  }else{
    for(let i=0;i<activeCount(project);i++){progress(`Preparing vector design ${i+1} of ${activeCount(project)}…`);const pad=mode==='press'?27:0,w=spec.pageW*72,h=spec.pageH*72;doc.addPage({size:[w+pad*2,h+pad*2],margin:0});
      if(pad){doc.page.dictionary.data.TrimBox=[pad,pad,w+pad,h+pad];doc.page.dictionary.data.BleedBox=[pad-9,pad-9,w+pad+9,h+pad+9];
        // Extend edge pixels into the 1/8-inch bleed only. The complete trim area
        // remains vector; edge strips preserve photographs, borders, and artwork.
        const edge=document.createElement('canvas');await drawPage(edge,project.pages[i],project.paper,i,Math.round(spec.pageW*300),project.format);const strip=document.createElement('canvas');
        const add=(sx,sy,sw,sh,dx,dy,dw,dh)=>{strip.width=sw;strip.height=sh;strip.getContext('2d').drawImage(edge,sx,sy,sw,sh,0,0,sw,sh);doc.image(strip.toDataURL('image/png'),dx,dy,{width:dw,height:dh});};
        add(0,0,edge.width,1,pad,pad-9,w,9);add(0,edge.height-1,edge.width,1,pad,pad+h,w,9);add(0,0,1,edge.height,pad-9,pad,9,h);add(edge.width-1,0,1,edge.height,pad+w,pad,9,h);
        for(const [sx,sy,dx,dy]of [[0,0,pad-9,pad-9],[edge.width-1,0,pad+w,pad-9],[0,edge.height-1,pad-9,pad+h],[edge.width-1,edge.height-1,pad+w,pad+h]])add(sx,sy,1,1,dx,dy,9,9);
      }
      await face(i,pad,pad);
      if(pad){doc.save().strokeColor('#202020').lineWidth(.25).undash();for(const x of [pad,pad+w]){doc.moveTo(x,4).lineTo(x,pad-12).stroke();doc.moveTo(x,pad+h+12).lineTo(x,h+2*pad-4).stroke();}for(const y of [pad,pad+h]){doc.moveTo(4,y).lineTo(pad-12,y).stroke();doc.moveTo(pad+w+12,y).lineTo(w+2*pad-4,y).stroke();}doc.restore();}
    }
  }
  doc.end();return result;
}
