import {ASSET_BY_ID,artRatio,artName} from './brand.js';
export const MAX_LAYERS=32;
const clamp=(v,a,b,f)=>Number.isFinite(v)?Math.max(a,Math.min(b,v)):f;
export const isText=a=>a.kind==='text';
export const layerName=a=>isText(a)?(a.text.trim().split('\n')[0].slice(0,45)||'Empty text'):artName(a);
export function layerBox(a,spec){return {x:a.x*spec.pageW/100,y:a.y*spec.pageH/100,w:a.width*spec.pageW/100,h:a.height!==undefined?a.height*spec.pageH/100:a.width*spec.pageW/100/artRatio(a)};}
export function layerBounds(a,spec){const b=layerBox(a,spec),r=a.rotation*Math.PI/180,w=Math.abs(b.w*Math.cos(r))+Math.abs(b.h*Math.sin(r)),h=Math.abs(b.w*Math.sin(r))+Math.abs(b.h*Math.cos(r));return {x:b.x-w/2,y:b.y-h/2,w,h};}
export function validateLayers(raw,fonts=[]){
  if(raw==null)return [];
  if(!Array.isArray(raw)||raw.length>MAX_LAYERS)throw new Error('Use up to 32 layers per page.');
  return raw.map(a=>{
    if(!a||typeof a!=='object')throw new Error('Invalid layer.');
    const item={x:clamp(a.x,0,100,50),y:clamp(a.y,0,100,50),width:clamp(a.width,2,200,55),rotation:clamp(a.rotation,-180,180,0),locked:a.locked===true};
    if(a.height!==undefined)item.height=clamp(a.height,2,200,20);
    if(isText(a)){
      if(typeof a.font==='string'&&a.font.startsWith('mpfont-')&&!fonts.includes(a.font))throw new Error('A text layer is missing its imported font.');
      return {...item,kind:'text',height:clamp(a.height,2,200,20),text:String(a.text||'').slice(0,2400),font:fonts.includes(a.font)?a.font:'Pirelli',size:clamp(a.size,2,200,14),lineHeight:clamp(a.lineHeight,.8,2,1.15),color:/^#[0-9a-f]{6}$/i.test(a.color)?a.color:'#202020',align:['left','center','right'].includes(a.align)?a.align:'left'};
    }
    if(Object.hasOwn(ASSET_BY_ID,a.asset))item.asset=a.asset;
    else if(typeof a.src==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(a.src)&&a.src.length<=10000000){item.src=a.src;item.ratio=clamp(a.ratio,.04,25,1);item.name=String(a.name||'Uploaded image').slice(0,80);}
    else throw new Error('This project contains an unsupported image layer.');
    item.fit=a.fit==='contain'?'contain':'cover';item.treatment=['mono','warm','high'].includes(a.treatment)?a.treatment:'original';item.focal=clamp(a.focal,0,100,50);item.focalY=clamp(a.focalY,0,100,50);item.zoom=clamp(a.zoom,100,300,100);item.imageRotate=[0,90,180,270].includes(a.imageRotate)?a.imageRotate:0;item.overlay=clamp(a.overlay,0,80,0);return item;
  });
}
