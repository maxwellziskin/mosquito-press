import {FORMATS, sheetSpec, sheetSlots, sheetPages, activeCount, itemWord, inches} from './formats.js';

export const OBJECTS = {booklet:'Booklet / bottle-neck booklet',insert:'Packaging insert',neck:'Bottle-neck tag',tent:'Table tent',flat:'Flat print / cut pieces'};
export function objectFor(format){const f=FORMATS[format];return f.folded?'booklet':f.insert?'insert':f.neck?'neck':f.tent?'tent':'flat';}
export function sizeText(w,h){return `${inches(w)} × ${inches(h)} in`;}
export function printInstructions(spec,paperName){
  if(spec.offsetX>0&&spec.offsetY>0)return '';
  return `<aside class="print-instructions"><strong>Printing without a white border</strong><p>The PDF fills the sheet. Your printer must support <b>${paperName} Borderless</b> to print all the way to the paper edge.</p><ul><li><b>Borderless printer:</b> choose ${paperName} Borderless, ${spec.portrait?'portrait':'landscape'}, single-sided, and Actual size / 100%. Turn off Fit / Scale to fit.</li><li><b>Standard printer:</b> fit the complete sheet to the printable area, then trim off the white perimeter <b>before ${spec.folded||spec.insert?'folding':'cutting'}</b>. ${spec.folded||spec.insert?'Fold the trimmed rectangle into equal panels. The finished piece will be smaller.':'The finished pieces will be smaller.'}</li></ul><p>Changing the margin guide in the editor cannot remove a printer’s white edge.</p></aside>`;
}
export function setupSummary(project,selected=0){
  const s=sheetSpec(project.paper,project.format),n=activeCount(project),sheets=sheetPages(project,selected).length;
  if(s.folded)return `8 reading pages · 1 sheet · ${sizeText(s.pageW,s.pageH)} closed`;
  if(s.insert)return `${s.panels} printed panels · 1 sheet · ${sizeText(s.pageW,s.pageH)} folded`;
  if(project.printContent==='repeat')return `Repeat D${selected+1} · ${s.count} copies · 1 print sheet`;
  return `${n} design${n===1?'':'s'} · ${s.count} ${s.tent?'tents':s.neck?'tags':'pieces'} per sheet · ${sheets} print sheet${sheets===1?'':'s'}`;
}
export function assemblySteps(spec){
  if(spec.folded)return ['Print the complete sheet single-sided, landscape, using the borderless or trim-first instructions above. The upper row is intentionally upside down.','Crease into eight equal panels: fold in half lengthwise, unfold, fold in half crosswise, then fold both short edges to the center. Unfold.','Cut only the orange center slit, across the two middle columns. Keep all other panels joined.','Fold lengthwise with the print outside. Push the short ends together so the slit opens into a diamond, then a cross.','Wrap the pages around page 1 (front cover). Flatten and crease. Page 8 is the back cover.'];
  if(spec.insert)return spec.panels===2?['Print single-sided, landscape, at 100% / actual size.','Fold on the blue center line with the two printed panels facing each other.','Open to read panels 1–2 from left to right. The two outside faces are blank. No cutting is needed.']:[`Print single-sided, landscape, at 100% / actual size. Read the printed face from panel 1 to panel ${spec.panels}.`,'Crease on each blue line. Make the first fold toward the printed face, then alternate away and toward to make a zigzag.','Collapse the equal panels into a stack. The reverse of the paper stays blank. No cutting is needed.'];
  if(spec.neck)return ['Print single-sided, portrait, at 100% / actual size.','Cut each orange tag outline and its 1.25 in neck opening.','Fold on the blue line 2 in from the top. Check the opening against your bottle before printing a batch.'];
  if(spec.tent)return ['Print single-sided, landscape, at 100% / actual size.','Cut each orange 5 × 7 in outline.','Fold on the blue center line with the printed faces outside. Both faces use the same design; the upper face prints upside down.'];
  return [`Print single-sided, ${spec.portrait?'portrait':'landscape'}, at 100% / actual size.`,spec.count>1?`Cut along the orange outlines into ${sizeText(spec.pageW,spec.pageH)} pieces.`:'Use the full sheet. No fold or cut is needed.','Design numbers identify independent pieces. They are not a booklet reading order.'];
}
export function assemblyDiagram(project,selected=0,sheetIndex=0){
  const s=sheetSpec(project.paper,project.format),slots=sheetSlots(s),map=sheetPages(project,selected)[sheetIndex]||sheetPages(project,selected)[0];
  const scale=600/s.w,H=s.h*scale,word=itemWord(project),parts=[];
  const line=(x1,y1,x2,y2,color='#297da3',dash='6 5')=>parts.push(`<line x1="${x1*scale}" y1="${y1*scale}" x2="${x2*scale}" y2="${y2*scale}" stroke="${color}" stroke-width="2" stroke-dasharray="${dash}"/>`);
  const label=(n,x,y,h,rotate=false)=>{const text=n==null?'Blank':`${word==='design'?'D':'P'}${n+1}`;parts.push(`<text x="${x*scale}" y="${y*scale}" text-anchor="middle" dominant-baseline="middle" font-family="Pirelli,Arial,sans-serif" font-size="${Math.min(23,h*scale*.3)}" fill="#202020"${rotate?` transform="rotate(180 ${x*scale} ${y*scale})"`:''}>${text}</text>`);};
  for(const [i,a]of slots.entries()){
    parts.push(`<rect x="${a.x*scale}" y="${a.y*scale}" width="${a.w*scale}" height="${a.h*scale}" fill="${map[i]==null?'#efefe9':map[i]===0?'#f8c630':'#edf0d7'}" stroke="#a5ab95" stroke-width="1"/>`);
    if(s.tent){label(map[i],a.x+a.w/2,a.y+a.h/4,a.h/2,true);label(map[i],a.x+a.w/2,a.y+a.h*.75,a.h/2);}
    else label(map[i],a.x+a.w/2,a.y+(s.neck?4.5:a.h/2),a.h,s.folded&&i<4);
    if(!s.folded&&!s.insert&&s.count>1)parts.push(`<rect x="${a.x*scale}" y="${a.y*scale}" width="${a.w*scale}" height="${a.h*scale}" fill="none" stroke="#df582d" stroke-width="2"/>`);
    if(s.tent)line(a.x,a.y+a.h/2,a.x+a.w,a.y+a.h/2);
    if(s.neck){parts.push(`<circle cx="${(a.x+a.w/2)*scale}" cy="${(a.y+1)*scale}" r="${.625*scale}" fill="#fff" stroke="#df582d" stroke-width="2"/>`);line(a.x,a.y+2,a.x+a.w,a.y+2);}
  }
  if(s.folded||s.insert)for(let i=1;i<s.cols;i++)line(s.slotW*i,0,s.slotW*i,s.h);
  if(s.folded){line(0,s.h/2,s.w,s.h/2);line(s.w/4,s.h/2,s.w*.75,s.h/2,'#df582d','');}
  const legend=s.folded?'P1 = front cover · P8 = back cover · upper row upside down':s.insert?'P = printed panel · left-to-right order · reverse blank':'D = design ID · matching IDs use the same artwork';
  return `<figure class="assembly-figure"><svg viewBox="-3 -3 606 ${H+6}" role="img" aria-label="Print placement: ${map.map(i=>word+' '+(i+1)).join(', ')}. ${legend}">${parts.join('')}</svg><figcaption>${legend}</figcaption></figure><div class="assembly-legend">${s.folded||s.insert||s.tent||s.neck?'<span><i class="fold-line"></i>Fold</span>':''}${!s.insert&&s.count>1?'<span><i class="cut-line"></i>Cut</span>':''}<span>Diagram labels do not print</span></div>`;
}
