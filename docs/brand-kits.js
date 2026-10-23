import {loadImage} from './render.js';
import {BUILTIN_FONTS,validateFonts,ensureFonts} from './fonts.js';
import {validatePhotos} from './photos.js';
import {validateArt} from './art.js';
import {artSource,artName} from './brand.js';
const clone=x=>JSON.parse(JSON.stringify(x)),keys=['font','bodyFont','bg','ink','accent'];
export function validateKitAssets(raw,fonts=BUILTIN_FONTS){return validateArt(raw,fonts).filter(a=>a.kind!=='text');}
function validateKit(raw){
  if(raw?.version!==1||raw?.kind!=='mosquito-brand-kit')throw Error('Choose a Mosquito Press brand kit.');
  const fonts=validateFonts(raw.fonts),allowed=[...BUILTIN_FONTS,...fonts.map(f=>f.id)],style={};
  for(const k of keys){const v=raw.style?.[k];if(k==='font'||k==='bodyFont'){if(!allowed.includes(v))throw Error('This brand kit is missing a font.');}else if(!/^#[a-f0-9]{6}$/i.test(v))throw Error('This brand kit contains an invalid color.');style[k]=v;}
  return {version:1,kind:'mosquito-brand-kit',id:typeof raw.id==='string'?raw.id:crypto.randomUUID(),name:String(raw.name||'Brand kit').slice(0,80),style,fonts,photos:validatePhotos(raw.photos),assets:validateKitAssets(raw.assets,allowed)};
}
let database;
async function db(){if(database)return database;database=await new Promise((resolve,reject)=>{const req=indexedDB.open('mosquito-brand-kits',1);req.onupgradeneeded=()=>req.result.createObjectStore('kits',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});return database;}
async function stored(method,value){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('kits',method==='getAll'?'readonly':'readwrite'),r=tx.objectStore('kits')[method](value);let result;r.onsuccess=()=>{result=r.result;};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);});}
export function createBrandKits({getProject,getPage,markUndo,changed,fillFields,modal,toast,download,addArt}){
  const $=id=>document.getElementById(id);let assetKey='';
  function sync(){
    const assets=getProject().kitAssets||[],key=JSON.stringify(assets.map(a=>[a.asset||a.src,a.name]));$('kit-assets').hidden=!assets.length;
    if(key===assetKey)return;assetKey=key;$('kit-asset-grid').replaceChildren();
    for(const a of assets){const b=document.createElement('button');b.className='photo-thumb';b.setAttribute('aria-label','Add kit artwork '+artName(a));const im=document.createElement('img');im.src=artSource(a);im.alt='';const name=document.createElement('span');name.textContent=artName(a);b.append(im,name);b.onclick=()=>addArt({...(a.asset?{asset:a.asset}:{src:a.src,ratio:a.ratio,name:a.name}),fit:'contain'});$('kit-asset-grid').append(b);}
  }
  async function apply(kit){
    try{const p=getProject(),fonts=[...(p.fonts||[])],photos=[...(p.photos||[])],assets=[...(p.kitAssets||[])];for(const f of kit.fonts)if(!fonts.some(x=>x.id===f.id))fonts.push(f);for(const photo of kit.photos)if(!photos.some(x=>x.id===photo.id))photos.push(photo);for(const a of kit.assets)if(!assets.some(x=>artSource(x)===artSource(a)))assets.push(a);validateFonts(fonts);validatePhotos(photos);validateKitAssets(assets,[...BUILTIN_FONTS,...fonts.map(f=>f.id)]);await ensureFonts({fonts});if(p!==getProject())return;
      markUndo();p.fonts=fonts;p.photos=photos;p.kitAssets=clone(assets);const targets=$('kit-scope').value==='all'?p.pages:[getPage()];for(const page of targets)Object.assign(page,kit.style);fillFields();changed();$('modal').close();toast(kit.name+' applied. Photos and artwork are available in their libraries.');
    }catch(e){toast(e.message||'The kit could not be applied.');}
  }
  async function show(){
    modal('Brand kits','<p class="modal-copy">Save the current page’s colors and type, plus this project’s imported fonts, photos, and image layers. Reuse them in other projects on this browser, or download a kit for another device.</p><label class="field-label" for="kit-name">NEW KIT NAME</label><input id="kit-name" class="field" maxlength="80" placeholder="Mosquito Ranch Spirits"><div class="photo-actions"><button id="kit-save" class="button primary">Save current kit</button><button id="kit-import" class="button outline">Import kit</button></div><input id="kit-file" type="file" accept=".mosquitokit,application/json" hidden><p id="kit-status" role="status"></p><label class="field-label" for="kit-scope">APPLY COLORS & TYPE TO</label><select id="kit-scope" class="field"><option value="page">Current page</option><option value="all">All designs in the project</option></select><div id="saved-kits"></div>','BRAND LIBRARY');
    const status=t=>{if($('kit-status'))$('kit-status').textContent=t;};
    const list=async()=>{const kits=await stored('getAll');const target=$('saved-kits');if(!target)return;target.replaceChildren();if(!kits.length){target.textContent='No saved kits yet.';return;}
      for(const raw of kits){let kit;try{kit=validateKit(raw);}catch{continue;}const row=document.createElement('section');row.className='saved-kit';const name=document.createElement('strong');name.textContent=kit.name;const colors=document.createElement('div');colors.className='kit-colors';for(const k of ['bg','ink','accent']){const dot=document.createElement('i');dot.style.background=kit.style[k];colors.append(dot);}const meta=document.createElement('p');meta.className='fine-print';meta.textContent=`${kit.fonts.length} imported fonts · ${kit.photos.length} photos · ${kit.assets.length} image layers`;const buttons=document.createElement('div');buttons.className='kit-buttons';
        for(const [text,action] of [['Apply',()=>apply(kit)],['Download',()=>download(new Blob([JSON.stringify(kit)],{type:'application/json'}),kit.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.mosquitokit')],['Remove',async()=>{try{await stored('delete',kit.id);await list();status('Kit removed.');const undo=document.createElement('button');undo.className='small-link';undo.textContent='Undo removal';undo.onclick=async()=>{await stored('put',kit);await list();status('Kit restored.');};$('kit-status').append(' ',undo);}catch{status('The kit could not be removed.');}}]]){const b=document.createElement('button');b.className='button outline';b.textContent=text;b.setAttribute('aria-label',text+' kit '+kit.name);b.onclick=action;buttons.append(b);}row.append(name,colors,meta,buttons);target.append(row);}
    };
    const save=async kit=>{await ensureFonts(kit);const kits=await stored('getAll');if(kits.length>=8&&!kits.some(k=>k.id===kit.id))throw Error('Keep up to eight kits. Download or remove a kit to make room.');await stored('put',kit);await list();status('Kit saved on this browser.');};
    $('kit-save').onclick=async()=>{const b=$('kit-save');b.disabled=true;try{const p=getProject(),assets=[];for(const a of [...(p.kitAssets||[]),...p.pages.flatMap(page=>page.art||[])])if(a.kind!=='text'&&!assets.some(x=>artSource(x)===artSource(a)))assets.push(a);const name=$('kit-name').value.trim();if(!name)throw Error('Name this kit first.');const photos=[...(p.photos||[])];for(const [i,page]of p.pages.entries())if(page.image&&!photos.some(a=>a.src===page.image)){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(page.image)),id='photo-'+[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join(''),im=await loadImage(page.image);photos.push({id,src:page.image,name:'Page '+(i+1)+' photo',ratio:im.width/im.height});}const kit=validateKit({version:1,kind:'mosquito-brand-kit',id:crypto.randomUUID(),name,style:Object.fromEntries(keys.map(k=>[k,getPage()[k]])),fonts:p.fonts||[],photos,assets});await save(kit);}catch(e){status(e.message||'Browser storage is full. Download your project to keep it.');}finally{b.disabled=false;}};
    $('kit-import').onclick=()=>$('kit-file').click();$('kit-file').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{if(f.size>75000000)throw Error('Choose a brand kit under 75 MB.');const kit=validateKit(JSON.parse(await f.text()));kit.id=crypto.randomUUID();await save(kit);}catch(e){status(e.message||'The kit could not be opened.');}};
    try{await list();}catch{status('Brand storage is unavailable in this browser. Your current project is unaffected.');}
  }
  function bind(){$('brand-kits-button').onclick=show;}
  return {bind,sync,show};
}
