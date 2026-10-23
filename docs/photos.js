import {activeCount} from './formats.js';
import {BRAND_PHOTOS} from './brand.js';
import {loadImage,drawPage} from './render.js';
export const PHOTO_LAYOUTS=['photo-only','photo-caption','photo-inset'];
export function validatePhotos(raw){
  if(raw==null)return [];
  if(!Array.isArray(raw)||raw.length>16)throw Error('Keep up to 16 photos in a project library.');
  const ids=new Set();let bytes=0;
  return raw.map(p=>{if(!p||typeof p.src!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(p.src)||p.src.length>10000000||typeof p.id!=='string'||!/^photo-[0-9a-f]{64}$/.test(p.id)||ids.has(p.id))throw Error('This project contains an invalid library photo.');ids.add(p.id);bytes+=p.src.length;if(bytes>20000000)throw Error('Keep the photo library under 20 MB. Use smaller images.');return {id:p.id,src:p.src,name:String(p.name||'Photo').slice(0,80),ratio:Math.max(.04,Math.min(25,Number(p.ratio)||1))};});
}
export function createPhotoTools({getProject,getPage,getSelected,markUndo,changed,fillFields,toast,modal,showContent,selectPage}){
  const $=id=>document.getElementById(id);let busy=false,libraryKey='';
  function patch(photo,layout='photo-only'){
    return {image:photo.src,layout,fit:'cover',focal:50,focalY:50,zoom:100,imageRotate:0,treatment:'original',overlay:0,grain:false,pageNumber:false,decoration:'none',art:[]};
  }
  function place(photo){markUndo();Object.assign(getPage(),patch(photo,PHOTO_LAYOUTS.includes(getPage().layout)?getPage().layout:'photo-only'));fillFields();changed();showContent();toast('Photo added. Adjust the crop in Photos.');}
  function sync(){
    const p=getPage(),photoPage=PHOTO_LAYOUTS.includes(p.layout);
    $('template-content-fields').hidden=p.layout==='free'||photoPage;
    $('image-controls').hidden=!p.image;$('remove-image').hidden=!p.image;
    $('photo-caption-controls').hidden=p.layout!=='photo-caption';$('photo-caption').value=p.photoCaption||'';
    $('photo-layout').value=photoPage||p.layout==='photo'?p.layout:'template';
    $('image-zoom-value').textContent=(p.zoom||100)+'%';$('image-zoom').disabled=p.fit==='contain';
    $('image-position-y').value=p.focalY??50;$('image-zoom').value=p.zoom||100;
    const photos=getProject().photos||[];const key=photos.map(p=>p.id).join(',');$('photo-library').hidden=!photos.length;$('photo-count').textContent=photos.length;
    if(key!==libraryKey){libraryKey=key;$('photo-library-grid').replaceChildren();for(const photo of photos){const b=document.createElement('button');b.className='photo-thumb';b.setAttribute('aria-label','Use photo '+photo.name);const img=document.createElement('img');img.src=photo.src;img.alt='';img.loading='lazy';const name=document.createElement('span');name.textContent=photo.name;b.append(img,name);b.onclick=()=>place(photo);const item=document.createElement('div');item.className='photo-library-item';const remove=document.createElement('button');remove.className='photo-library-remove';remove.textContent='Remove';remove.setAttribute('aria-label','Remove from library '+photo.name);remove.onclick=()=>{markUndo();getProject().photos=getProject().photos.filter(x=>x.id!==photo.id);sync();changed();toast('Removed from library. Photos already on pages are kept. Undo restores it.');};item.append(b,remove);$('photo-library-grid').appendChild(item);}}
  }
  async function importFiles(files){
    if(busy||!files?.length)return;busy=true;const project=getProject(),start=getSelected();
    try{
      if(files.length>16)throw Error('Choose up to 16 photos at a time.');
      const imported=[];toast('Preparing photos on this device…');
      for(const file of files){
        if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>25000000)throw Error('Choose JPG, PNG, or WebP images under 25 MB each.');
        const url=URL.createObjectURL(file);let im;try{im=await loadImage(url);}finally{URL.revokeObjectURL(url);}
        const scale=Math.min(1,3600/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));c.getContext('2d').drawImage(im,0,0,c.width,c.height);
        const src=c.toDataURL(file.type==='image/png'?'image/png':'image/jpeg',.94);
        if(src.length>10000000)throw Error(file.name+' is too large after import. Try a smaller image.');
        const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(src));const id='photo-'+[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
        imported.push({id,src,ratio:c.width/c.height,name:file.name.slice(0,80)});
      }
      if(project!==getProject())return;
      const photos=[...(project.photos||[])];for(const p of imported)if(!photos.some(x=>x.id===p.id))photos.push(p);validatePhotos(photos);
      markUndo();project.photos=photos;changed();sync();
      if(imported.length===1){selectPage(start);place(imported[0]);return;}
      const count=Math.min(imported.length,activeCount(project)-start);
      modal('Add photo pages',`<p class="photo-help">${imported.length} photos are in your library. Place one photo on each page, starting at page ${start+1}.</p><div id="photo-strip" class="photo-strip"></div><p class="photo-help">This replaces the visible layouts on pages ${start+1}–${start+count}. Existing text is retained behind the photo layout; Undo restores the pages.${count<imported.length?' Extra photos stay in the library.':''}</p><div class="photo-placement"><button id="photo-place-pages" class="button primary">Make ${count} photo pages</button><button id="photo-keep-library" class="button outline">Library only</button></div>`,'PHOTOS');
      for(const p of imported){const img=document.createElement('img');img.src=p.src;img.alt=p.name;$('photo-strip').append(img);}
      $('photo-place-pages').onclick=()=>{if(project!==getProject())return;markUndo();for(let i=0;i<count;i++)Object.assign(project.pages[start+i],patch(imported[i]),{photoCaption:''});$('modal').close();selectPage(start);changed();showContent();toast(count+' photo pages created.');};
      $('photo-keep-library').onclick=()=>{$('modal').close();showContent();$('photo-library').open=true;};
    }catch(e){toast(e.message||'These photos could not be opened.');}finally{busy=false;}
  }
  async function useBrandPhoto(asset,button){
    if(busy)return;busy=true;const project=getProject(),page=getPage();button.disabled=true;button.setAttribute('aria-busy','true');
    try{
      const response=await fetch(asset.src);if(!response.ok)throw Error('The brand photo could not be loaded.');
      const blob=await response.blob();const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('The brand photo could not be read.'));r.readAsDataURL(blob);});
      await loadImage(src);const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(src)),id='photo-'+[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
      const photo={id,src,name:asset.name,ratio:asset.ratio},photos=[...(project.photos||[])];if(!photos.some(p=>p.id===id))photos.push(photo);validatePhotos(photos);
      if(project!==getProject()||page!==getPage())throw Error('The selected page changed. Choose the photo again.');
      markUndo();project.photos=photos;Object.assign(page,patch(photo,PHOTO_LAYOUTS.includes(page.layout)?page.layout:'photo-only'),{fit:'contain'});fillFields();changed();$('modal').close();showContent();toast('Photo added. Use Adjust photo to change the fit or crop.');
    }catch(e){toast(e.message||'The brand photo could not be added.');}finally{busy=false;button.disabled=false;button.removeAttribute('aria-busy');}
  }
  function brandPhotoDialog(){
    modal('Brand photos','<p class="modal-copy">Mosquito Ranch Spirits / Freezer Martini Service. Choose a photo for this page. These are also available as image layers.</p><div id="brand-photo-grid" class="brand-photo-grid"></div>','PHOTO LIBRARY');
    $('modal').style.width='760px';
    for(const photo of BRAND_PHOTOS){const b=document.createElement('button');b.className='brand-photo-card';b.setAttribute('aria-label','Use brand photo '+photo.name);const img=document.createElement('img');img.src=photo.src;img.alt='';img.loading='lazy';img.decoding='async';const name=document.createElement('strong');name.textContent=photo.name;b.append(img,name);b.onclick=()=>useBrandPhoto(photo,b);$('brand-photo-grid').append(b);}
  }
  function cropDialog(){
    const project=getProject(),page=getPage(),index=getSelected();let seq=0;
    modal('Adjust photo',`<div class="photo-crop-preview"><canvas id="photo-crop-canvas" aria-label="Live photo crop preview"></canvas></div><div class="photo-crop-fields"><label>FIT<select id="crop-fit" class="field"><option value="cover">Fill / crop</option><option value="contain">Entire photo</option></select></label><label>ZOOM <output id="crop-zoom-value"></output><input id="crop-zoom" type="range" min="100" max="300" aria-label="Crop zoom"></label><label>LEFT / RIGHT<input id="crop-x" type="range" min="0" max="100" aria-label="Crop horizontal position"></label><label>UP / DOWN<input id="crop-y" type="range" min="0" max="100" aria-label="Crop vertical position"></label></div><div class="photo-actions"><button id="crop-rotate" class="button outline">Rotate 90°</button><button id="crop-reset" class="button outline">Reset crop</button></div><button id="crop-done" class="button primary crop-done">Done</button>`,'PHOTOS');
    const draw=async()=>{const n=++seq,c=document.createElement('canvas');await drawPage(c,{...page},project.paper,index,750,project.format);const target=$('photo-crop-canvas');if(n!==seq||!target)return;target.width=c.width;target.height=c.height;target.getContext('2d').drawImage(c,0,0);};
    const syncCrop=()=>{$('crop-fit').value=page.fit;$('crop-zoom').value=page.zoom||100;$('crop-zoom').disabled=page.fit==='contain';$('crop-zoom-value').textContent=(page.zoom||100)+'%';$('crop-x').value=page.focal??50;$('crop-y').value=page.focalY??50;draw();};
    const apply=(patch,group=false)=>{if(project!==getProject())return;markUndo(group);Object.assign(page,patch);fillFields();changed();syncCrop();};
    for(const [id,key] of [['crop-fit','fit'],['crop-zoom','zoom'],['crop-x','focal'],['crop-y','focalY']])$(id).oninput=e=>apply({[key]:key==='fit'?e.target.value:Number(e.target.value)},true);
    $('crop-rotate').onclick=()=>apply({imageRotate:((page.imageRotate||0)+90)%360});$('crop-reset').onclick=()=>apply({zoom:100,focal:50,focalY:50,imageRotate:0});$('crop-done').onclick=()=>{$('modal').close();showContent();};syncCrop();
  }
  function bind(){
    $('photo-adjust').onclick=cropDialog;$('brand-photo-browse').onclick=brandPhotoDialog;
    $('photo-layout').onchange=e=>{if(e.target.value==='template'){sync();return;}markUndo();Object.assign(getPage(),{layout:e.target.value,grain:false,pageNumber:false,decoration:'none'});fillFields();changed();};
    $('photo-rotate').onclick=()=>{markUndo();getPage().imageRotate=((getPage().imageRotate||0)+90)%360;fillFields();changed();};
    $('photo-reset').onclick=()=>{markUndo();Object.assign(getPage(),{focal:50,focalY:50,zoom:100,imageRotate:0});fillFields();changed();};
    sync();
  }
  return {sync,bind,importFiles};
}
