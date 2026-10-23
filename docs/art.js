import {ASSETS,artSource,artRatio} from './brand.js';
import {loadImage,movableLayers} from './render.js';
import {MAX_LAYERS,isText,layerBox,layerName,validateLayers} from './layers.js';
export const validateArt=validateLayers;
export function createArtTools({getPage,getProject,getSpec,getView,setPageView,markUndo,changed,toast,showLayers,fillFields}){
  const $=id=>document.getElementById(id);let selected=-1,lastPage=null,drag=null,swipeUntil=0,paintFrame,uploading=false;
  const layers=()=>getPage().art||[],current=()=>layers()[selected];
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  function edit(action,group=false){markUndo(group);const next=layers().map(a=>({...a}));action(next);getPage().art=next;changed();sync();}
  function selection(){
    const a=current(),box=$('art-selection');box.hidden=!a||getView()!=='page';if(!a)return;
    const spec=getSpec(),b=layerBox(a,spec);box.style.left=a.x+'%';box.style.top=a.y+'%';box.style.width=a.width+'%';box.style.height=b.h/spec.pageH*100+'%';box.style.transform=`translate(-50%,-50%) rotate(${a.rotation}deg)`;
    box.classList.toggle('locked',!!a.locked);$('art-resize').hidden=!!a.locked;
  }
  function sync(){
    if(lastPage!==getPage()){selected=-1;lastPage=getPage();}
    if(selected>=layers().length)selected=layers().length-1;
    $('art-layer-list').replaceChildren();layers().forEach((a,i)=>{const b=document.createElement('button');b.className='art-layer';b.textContent=(a.locked?'🔒 ':isText(a)?'Aa ':'▧ ')+layerName(a);b.setAttribute('aria-pressed',String(i===selected));b.onclick=()=>{selected=i;setPageView();sync();};$('art-layer-list').appendChild(b);});
    $('art-empty').hidden=!!layers().length;$('art-controls').hidden=!current();$('make-free').disabled=getPage().layout==='free';$('make-free').textContent=getPage().layout==='free'?'Free layout active':'Make text movable';
    $('free-content-note').hidden=getPage().layout!=='free';$('template-content-fields').hidden=['free','photo-only','photo-caption','photo-inset'].includes(getPage().layout);$('snap-layers').checked=getProject().snap!==false;
    const a=current();
    if(a){
      const values={'art-x':a.x,'art-y':a.y,'art-size':a.width,'art-height':layerBox(a,getSpec()).h/getSpec().pageH*100,'art-rotation':a.rotation};
      for(const [id,value]of Object.entries(values)){$(id).value=value;$(id+'-value').textContent=Math.round(value)+(id==='art-rotation'?'°':'%');}
      $('art-lock').checked=!!a.locked;$('art-text-controls').hidden=!isText(a);$('art-fit-control').hidden=isText(a);
      $('layer-properties').disabled=!!a.locked;$('art-delete').disabled=!!a.locked;$('art-back').disabled=!!a.locked||selected<=0;$('art-front').disabled=!!a.locked||selected===layers().length-1;
      if(isText(a)){
        if($('layer-text').value!==a.text)$('layer-text').value=a.text;
        const fonts=['Primos','Pirelli','Primos Condensed','Georgia','Courier New',...(getProject().fonts||[]).map(f=>f.id)];
        $('layer-font').replaceChildren(...fonts.map(id=>new Option((getProject().fonts||[]).find(f=>f.id===id)?.name||id,id)));$('layer-font').value=a.font;
        $('layer-font-size').value=Number(a.size.toFixed(2));$('layer-leading').value=a.lineHeight;$('layer-color').value=a.color;$('layer-align').value=a.align;
      }else $('layer-fit').value=a.fit||'cover';
    }
    $('page-canvas').style.touchAction=layers().length?'none':'pan-y';selection();
  }
  async function add(item){
    if(layers().length>=MAX_LAYERS){toast('Use up to 32 layers per page.');return;}
    const page=getPage();try{if(!isText(item))await loadImage(artSource(item));if(page!==getPage())return;
      edit(next=>{next.push({x:50,y:50,width:isText(item)?80:Math.max(10,Math.min(60,42*getSpec().pageH/getSpec().pageW*artRatio(item))),rotation:0,locked:false,...item});selected=next.length-1;});lastPage=getPage();setPageView();showLayers();sync();toast(isText(item)?'Text added. Edit it in Layers.':'Image added. Drag it on the page or use the position controls.');
    }catch{toast('This layer could not be added.');}
  }
  async function makeFree(){
    const page=getPage();if(page.layout==='free'){showLayers();return;}
    try{const next=await movableLayers(page,getProject().paper,getProject().format);if(page!==getPage())return;if(next.length>MAX_LAYERS)throw Error('Remove a few layers before converting this layout.');markUndo();page.art=next;page.layout='free';selected=-1;fillFields();changed();setPageView();showLayers();toast('Text and photos are now movable layers. Undo restores the template.');}catch(e){toast(e.message);}
  }
  async function upload(files){
    if(uploading)return;uploading=true;const page=getPage();
    try{for(const file of files){
      if(page!==getPage())break;
      if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>25000000){toast('Choose PNG, JPG, or WebP files under 25 MB.');continue;}
      const url=URL.createObjectURL(file);let im;try{im=await loadImage(url);}finally{URL.revokeObjectURL(url);}
      const factor=Math.min(1,3600/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*factor);c.height=Math.round(im.height*factor);c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      const src=c.toDataURL(file.type==='image/jpeg'?'image/jpeg':'image/png',.94);if(src.length>10000000){toast(file.name+' is too large after import. Use a smaller image.');continue;}await add({src,ratio:c.width/c.height,name:file.name.slice(0,80)});
    }}catch{toast('Image could not be added. Try a smaller file.');}finally{uploading=false;}
  }
  function begin(e,resize=false){
    if(getView()!=='page'||e.button!==0)return;const canvas=$('page-canvas'),rect=canvas.getBoundingClientRect(),px=(e.clientX-rect.left)/rect.width,py=(e.clientY-rect.top)/rect.height,spec=getSpec();
    if(!resize){let hit=-1;for(let i=layers().length-1;i>=0;i--){const a=layers()[i],b=layerBox(a,spec),r=-a.rotation*Math.PI/180,dx=px*spec.pageW-b.x,dy=py*spec.pageH-b.y,rx=dx*Math.cos(r)-dy*Math.sin(r),ry=dx*Math.sin(r)+dy*Math.cos(r);if(Math.abs(rx)<=b.w/2&&Math.abs(ry)<=b.h/2){hit=i;break;}}selected=hit;sync();}
    const a=current();if(!a||a.locked)return;e.preventDefault();e.stopPropagation();canvas.focus({preventScroll:true});drag={pointer:e.pointerId,target:e.currentTarget,startX:e.clientX,startY:e.clientY,a:{...a},rect,moved:false,resize};e.currentTarget.setPointerCapture(e.pointerId);
  }
  function snapAxis(value,size,axis){
    const spec=getSpec(),extent=axis==='x'?spec.pageW:spec.pageH,safe=(getProject().safeMargin??.125)/extent*100;
    const targets=[safe,50,100-safe];
    for(let i=0;i<layers().length;i++)if(i!==selected){const b=layerBox(layers()[i],spec),v=(axis==='x'?b.x:b.y)/extent*100,half=(axis==='x'?b.w:b.h)/extent*50;targets.push(v-half,v,v+half);}
    let best=value,distance=1.3;
    for(const target of targets)for(const anchor of [value-size/2,value,value+size/2]){const d=target-anchor;if(Math.abs(d)<distance){best=value+d;distance=Math.abs(d);}}
    return best;
  }
  function move(e){
    if(!drag||drag.pointer!==e.pointerId)return;const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;if(!drag.moved&&Math.hypot(dx,dy)<3)return;
    if(!drag.moved){markUndo();drag.moved=true;}swipeUntil=Date.now()+700;
    const a={...drag.a},spec=getSpec();
    if(drag.resize){
      const b=layerBox(drag.a,spec),r=-a.rotation*Math.PI/180,ix=dx/drag.rect.width*spec.pageW,iy=dy/drag.rect.height*spec.pageH,rx=ix*Math.cos(r)-iy*Math.sin(r),ry=ix*Math.sin(r)+iy*Math.cos(r);
      // Resize around the center, keeping ordinary image proportions.
      a.width=clamp((b.w+2*rx)/spec.pageW*100,2,200);
      if(isText(a)||a.height!==undefined)a.height=clamp((b.h+2*ry)/spec.pageH*100,2,200);
    }else{
      a.x=clamp(a.x+100*dx/drag.rect.width,0,100);a.y=clamp(a.y+100*dy/drag.rect.height,0,100);
      if(getProject().snap!==false&&!e.altKey){const b=layerBox(a,spec);a.x=clamp(snapAxis(a.x,a.width,'x'),0,100);a.y=clamp(snapAxis(a.y,b.h/spec.pageH*100,'y'),0,100);}
    }
    const next=layers().slice();next[selected]=a;getPage().art=next;selection();cancelAnimationFrame(paintFrame);paintFrame=requestAnimationFrame(()=>{changed();sync();});
  }
  function end(e){if(drag?.pointer===e.pointerId){if(drag.moved){swipeUntil=Date.now()+700;changed();}drag=null;sync();}}
  function bind(){
    for(const group of ['Logos','Photos','Imagery']){const h=document.createElement('h2');h.className='field-label';h.textContent=group;$('art-library').appendChild(h);const grid=document.createElement('div');grid.className='art-grid';for(const asset of ASSETS.filter(a=>a.category===group)){const b=document.createElement('button');b.className='art-card'+(asset.dark?' dark-art':'');b.setAttribute('aria-label','Add '+asset.name);const img=document.createElement('img');img.src=asset.src;img.alt='';img.loading='lazy';const label=document.createElement('span');label.textContent=asset.name;b.append(img,label);b.onclick=()=>add({asset:asset.id});grid.appendChild(b);}$('art-library').appendChild(grid);}
    $('make-free').onclick=makeFree;$('free-content-layers').onclick=showLayers;
    $('add-text').onclick=()=>add({kind:'text',text:'Mosquito Ranch Spirits',font:'Primos',size:Math.max(8,Math.min(24,getSpec().pageH*4)),height:30,lineHeight:1.15,color:getPage().ink,align:'left'});
    $('art-upload').onclick=()=>$('art-input').click();$('art-input').onchange=e=>{upload([...e.target.files]);e.target.value='';};
    for(const [id,key]of [['art-x','x'],['art-y','y'],['art-size','width'],['art-height','height'],['art-rotation','rotation'],['layer-text','text'],['layer-font','font'],['layer-font-size','size'],['layer-leading','lineHeight'],['layer-color','color'],['layer-align','align'],['layer-fit','fit']])$(id).oninput=e=>{if(!current()||current().locked)return;let v=['text','font','color','align','fit'].includes(key)?e.target.value:Number(e.target.value);if(!['text','font','color','align','fit'].includes(key)&&(!Number.isFinite(v)||e.target.value===''))return;if(key==='size')v=clamp(v,2,200);if(key==='lineHeight')v=clamp(v,.8,2);edit(next=>next[selected][key]=v,true);};
    $('art-lock').onchange=e=>{if(current())edit(next=>next[selected].locked=e.target.checked);};
    $('snap-layers').onchange=e=>{markUndo();getProject().snap=e.target.checked;changed();};
    $('art-delete').onclick=()=>{if(current()&&!current().locked)edit(next=>{next.splice(selected,1);selected=Math.min(selected,next.length-1);});};
    $('art-duplicate').onclick=()=>{if(layers().length>=MAX_LAYERS){toast('Use up to 32 layers per page.');return;}const a=current();if(a)edit(next=>{next.push({...a,locked:false,x:Math.min(100,a.x+4),y:Math.min(100,a.y+4)});selected=next.length-1;});};
    $('art-front').onclick=()=>{if(current()&&!current().locked)edit(next=>{const a=next.splice(selected,1)[0];next.push(a);selected=next.length-1;});};
    $('art-back').onclick=()=>{if(current()&&!current().locked)edit(next=>{const a=next.splice(selected,1)[0];next.unshift(a);selected=0;});};
    const canvas=$('page-canvas'),handle=$('art-resize');canvas.addEventListener('pointerdown',e=>begin(e));handle.addEventListener('pointerdown',e=>begin(e,true));
    for(const el of [canvas,handle]){el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);}
    canvas.addEventListener('keydown',e=>{if(!current()||current().locked)return;const d=e.shiftKey?5:1;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Delete','Backspace'].includes(e.key)){e.preventDefault();e.stopPropagation();if(e.key==='Delete'||e.key==='Backspace')$('art-delete').click();else edit(next=>{const a=next[selected],axis=e.key==='ArrowLeft'||e.key==='ArrowRight'?'x':'y';a[axis]=clamp(a[axis]+(e.key==='ArrowLeft'||e.key==='ArrowUp'?-d:d),0,100);},true);}});
    sync();
  }
  return {bind,sync,selection,makeFree,upload,add,isDragging:()=>!!drag||Date.now()<swipeUntil};
}
