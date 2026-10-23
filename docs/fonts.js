const MAX_FILE=5_000_000,MAX_TOTAL=20_000_000,MAX_FONTS=12;
export const BUILTIN_FONTS=['Primos','Pirelli','Primos Condensed','Georgia','Courier New'];
const faces=new Map();
const $=id=>document.getElementById(id);
const cleanName=name=>String(name||'Imported font').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,100);
const dataSize=data=>data.length*3/4-(data.endsWith('==')?2:data.endsWith('=')?1:0);
export const isFontFile=file=>/\.(ttf|otf|woff2?)$/i.test(file.name);
function formatOf(bytes){
  const tag=String.fromCharCode(...bytes.slice(0,4));
  if(tag==='wOFF')return 'woff';
  if(tag==='wOF2')return 'woff2';
  if(tag==='OTTO')return 'otf';
  if(tag==='true'||(bytes[0]===0&&bytes[1]===1&&bytes[2]===0&&bytes[3]===0))return 'ttf';
  throw new Error('This is not a supported font file. Choose TTF, OTF, WOFF, or WOFF2.');
}
async function fontId(bytes){return 'mpfont-'+[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
function encode(bytes){let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);}
function decode(data){return Uint8Array.from(atob(data),c=>c.charCodeAt(0));}
export function validateFonts(raw){
  if(raw===undefined)return [];
  if(!Array.isArray(raw)||raw.length>MAX_FONTS)throw new Error('A project can contain up to 12 imported fonts.');
  const ids=new Set();let total=0;
  return raw.map(f=>{
    if(!f||!/^mpfont-[0-9a-f]{64}$/.test(f.id)||ids.has(f.id)||!['ttf','otf','woff','woff2'].includes(f.format)||typeof f.data!=='string'||f.data.length>Math.ceil(MAX_FILE/3)*4||!f.data.length||f.data.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(f.data))throw new Error('This project contains an invalid font.');
    const size=dataSize(f.data);total+=size;
    if(size>MAX_FILE||total>MAX_TOTAL)throw new Error('Use fonts under 5 MB each, up to 20 MB per project.');
    ids.add(f.id);return {id:f.id,name:cleanName(f.name),format:f.format,data:f.data};
  });
}
export async function ensureFonts(project){
  await Promise.all((project.fonts||[]).map(async f=>{
    const cached=faces.get(f.id);
    if(cached&&cached.data===f.data)return cached.promise;
    const promise=(async()=>{
      const bytes=decode(f.data);
      if(formatOf(bytes)!==f.format||await fontId(bytes)!==f.id)throw new Error('Font data does not match its saved identifier.');
      const face=new FontFace(f.id,bytes.buffer);
      await face.load();document.fonts.add(face);return face;
    })();
    faces.set(f.id,{data:f.data,promise});
    try{return await promise;}catch{faces.delete(f.id);throw new Error('Could not load '+f.name+'. Choose a valid font file.');}
  }));
}
export function createFontTools({getProject,getPage,markUndo,changed,fillFields,toast,showDesign}){
  let busy=false,listKey='';
  const nameOf=id=>(getProject().fonts||[]).find(f=>f.id===id)?.name||id;
  function preview(){
    const p=getPage();
    $('font-preview-heading').style.fontFamily='"'+p.font+'"';
    $('font-preview-body').textContent=p.body.slice(0,80)||'Aa Bb. 123';
    $('font-preview-body').style.fontFamily='"'+p.bodyFont+'"';
    $('font-preview-names').textContent=nameOf(p.font)+' / '+nameOf(p.bodyFont);
    $('headline-font-name').textContent=nameOf(p.font);
    $('headline').style.fontFamily='"'+p.font+'"';
    $('body-copy').style.fontFamily='"'+p.bodyFont+'"';
    for(const b of $('font-list').querySelectorAll('[data-font-use]'))b.setAttribute('aria-pressed',String(p[b.dataset.fontUse]===b.dataset.fontId));
  }
  function sync(){
    const fonts=getProject().fonts||[],key=JSON.stringify(fonts.map(f=>[f.id,f.name,f.format]));
    if(key!==listKey){
      listKey=key;status('');
      for(const id of ['headline-font','body-font']){
        const select=$(id),old=select.value;select.replaceChildren();
        const builtins=document.createElement('optgroup');builtins.label='Studio fonts';
        const names=id==='body-font'?['Pirelli',...BUILTIN_FONTS.filter(n=>n!=='Pirelli')]:BUILTIN_FONTS;
        for(const name of names)builtins.appendChild(new Option(name==='Courier New'?'Courier':name,name));
        select.appendChild(builtins);
        if(fonts.length){const group=document.createElement('optgroup');group.label='Imported fonts';for(const f of fonts)group.appendChild(new Option(f.name,f.id));select.appendChild(group);}
        select.value=old;
      }
      $('font-list').replaceChildren();
      for(const f of fonts){
        const row=document.createElement('div');row.className='imported-font';
        const label=document.createElement('strong');label.textContent=f.name;
        const meta=document.createElement('small');meta.textContent=f.format.toUpperCase()+' · '+Math.max(1,Math.round(dataSize(f.data)/1000))+' KB';
        const sample=document.createElement('div');sample.className='imported-font-sample';sample.textContent='Mosquito Ranch';sample.style.fontFamily='"'+f.id+'"';
        const actions=document.createElement('div');actions.className='font-actions';
        for(const [field,text] of [['font','Headline'],['bodyFont','Body']]){
          const b=document.createElement('button');b.textContent=text;b.dataset.fontUse=field;b.dataset.fontId=f.id;b.setAttribute('aria-label','Use '+f.name+' for '+text.toLowerCase());
          b.onclick=()=>{markUndo();getPage()[field]=f.id;fillFields();changed();};actions.appendChild(b);
        }
        const remove=document.createElement('button');remove.textContent='Remove';remove.className='remove-font';remove.setAttribute('aria-label','Remove '+f.name);
        remove.onclick=()=>{
          markUndo();const p=getProject();p.fonts=p.fonts.filter(x=>x.id!==f.id);
          for(const page of p.pages){if(page.font===f.id)page.font='Primos';if(page.bodyFont===f.id)page.bodyFont='Pirelli';for(const a of page.art||[])if(a.kind==='text'&&a.font===f.id)a.font='Pirelli';}
          fillFields();changed();status(f.name+' removed. Affected text uses Primos / Pirelli. Undo restores it.');
        };actions.appendChild(remove);row.append(label,meta,sample,actions);$('font-list').appendChild(row);
      }
    }
    $('font-library').hidden=!fonts.length;$('font-count').textContent=String(fonts.length);
    preview();
  }
  function status(text,error=false){$('font-status').textContent=text;$('font-status').classList.toggle('error',error);}
  async function importFiles(input){
    const files=[...input];if(!files.length||busy)return;
    const target=getProject();busy=true;$('font-upload').disabled=true;showDesign();status('Loading fonts…');
    try{
      if(files.length>MAX_FONTS)throw new Error('Choose up to 12 font files at a time.');
      const fonts=[...(target.fonts||[])],added=[];let duplicate=0;
      for(const file of files){
        if(!isFontFile(file))throw new Error('Choose TTF, OTF, WOFF, or WOFF2 files.');
        if(!file.size||file.size>MAX_FILE)throw new Error(file.name+' must be under 5 MB.');
        const bytes=new Uint8Array(await file.arrayBuffer()),format=formatOf(bytes),id=await fontId(bytes);
        if(fonts.some(f=>f.id===id)){duplicate++;continue;}
        const f={id,name:cleanName(file.name.replace(/\.(ttf|otf|woff2?)$/i,'').replace(/[_-]+/g,' ')),format,data:encode(bytes)};
        fonts.push(f);added.push(f);
      }
      validateFonts(fonts);await ensureFonts({fonts:added});
      if(getProject()!==target)throw new Error('The project changed. Import these fonts into the current project again.');
      if(added.length){markUndo();target.fonts=fonts;fillFields();changed();$('font-library').open=true;}
      status(added.length?added.length+' font'+(added.length===1?'':'s')+' imported. Choose Headline or Body below.'+(duplicate?' Existing fonts were skipped.':''):'These fonts are already in this project.');
    }catch(e){status(e.message||'The fonts could not be imported.',true);toast(e.message||'The fonts could not be imported.');}
    finally{busy=false;$('font-upload').disabled=false;}
  }
  function bind(){
    $('font-upload').onclick=()=>$('font-input').click();
    $('font-input').onchange=e=>{importFiles(e.target.files);e.target.value='';};
    const target=$('font-upload');target.ondragover=e=>{if([...e.dataTransfer.types].includes('Files')){e.preventDefault();target.classList.add('dragover');}};target.ondragleave=()=>target.classList.remove('dragover');
    target.ondrop=e=>{e.preventDefault();target.classList.remove('dragover');importFiles(e.dataTransfer.files);};
  }
  return {bind,sync,preview,importFiles};
}
