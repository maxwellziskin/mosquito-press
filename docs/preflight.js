import {sheetSpec,sheetPages,sheetSlots,inches} from './formats.js';
import {drawPage,preloadPages} from './render.js';
import {ensureFonts} from './fonts.js';
export async function checkPrint(project,selected=0,only=null){
  await ensureFonts(project);await preloadPages(project.pages);
  const spec=sheetSpec(project.paper,project.format),sheets=sheetPages(project,selected),slots=sheetSlots(spec),margin=project.safeMargin??.125,printer=project.printerMargin??.25;
  const indices=only||[...new Set(sheets.flat())],issues=[],seen=new Set();
  function add(page,code,message,severity='warning'){const key=page+':'+code;if(!seen.has(key)){seen.add(key);issues.push({page,code,message,severity});}}
  for(const index of indices){
    if(['photo-only','photo-caption','photo-inset'].includes(project.pages[index].layout)&&!project.pages[index].image)add(index,'missing-photo','Add a photo to this photo page before exporting.','error');
    const c=document.createElement('canvas');await drawPage(c,project.pages[index],project.paper,index,400,project.format);
    for(const mark of c.printMarks){
      const right=mark.x+mark.w,bottom=mark.y+mark.h,outside=mark.x<-.005||mark.y<-.005||right>spec.pageW+.005||bottom>spec.pageH+.005;
      if(mark.overflow)add(index,'overflow','A text box is too small. Enlarge it, reduce the type size, or shorten the copy.','error');
      if(outside&&mark.kind==='text')add(index,'cropped-text','Text extends beyond the design edge and will be cropped.','error');
      else if(mark.kind==='text'&&(mark.x<margin||mark.y<margin||right>spec.pageW-margin||bottom>spec.pageH-margin))add(index,'safe','Text is within '+inches(margin)+' in of a cut or fold. Move it inside the blue safe area.');
      if(mark.kind==='image'&&!mark.vector&&mark.dpi<200)add(index,'resolution','An image is about '+Math.round(mark.dpi)+' DPI at print size. Use a larger source or print it smaller; aim for 300 DPI.');
      if(outside&&mark.kind==='image')add(index,'cropped-image','An image extends beyond the design edge. Check that this crop is intentional.');
      if(spec.neck){
        const dx=spec.pageW/2-Math.max(mark.x,Math.min(spec.pageW/2,right)),dy=1-Math.max(mark.y,Math.min(1,bottom));
        if(dx*dx+dy*dy<Math.pow(.625+margin,2))add(index,'hole','Content overlaps the neck hole or its safe area. Keep important content below the 2 in fold.');
        if(mark.kind==='text'&&mark.y<2+margin&&bottom>2-margin)add(index,'fold','Text crosses the neck tag fold at 2 in. Move it clear of the fold.');
      }
      if(printer>0&&mark.kind==='text'){
        for(const page of sheets)for(let n=0;n<page.length;n++)if(page[n]===index){
          const slot=slots[n],placements=spec.tent?[true,false]:[spec.folded&&n<4];
          placements.forEach((rot,j)=>{const x=slot.x+(rot?spec.pageW-right:mark.x),y=slot.y+(spec.tent?j*spec.pageH:0)+(rot?spec.pageH-bottom:mark.y);if(x<printer||y<printer||x+mark.w>spec.w-printer||y+mark.h>spec.h-printer)add(index,'printer','Text enters the '+inches(printer)+' in printer margin. Choose a format with more sheet margin, reposition it, or use a borderless printer.');});
        }
      }
    }
  }
  if(printer>0&&(spec.offsetX<printer||spec.offsetY<printer)&&indices.some(i=>project.pages[i].bg.toLowerCase()!=='#ffffff'))add(-1,'borderless','Color reaches the sheet’s printer margin. A standard printer may leave a white edge; use borderless printing or a format with outer margins.');
  return {issues,errors:issues.filter(i=>i.severity==='error').length,warnings:issues.filter(i=>i.severity==='warning').length,designs:indices.length};
}
