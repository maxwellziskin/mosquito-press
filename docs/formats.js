export const FORMATS = {
  zine: {name:'Folded 8-page booklet',cols:4,rows:2,portrait:false,folded:true,panels:8,description:'One sheet, eight reading pages, one center slit. The default.'},
  half: {name:'Half-fold insert',cols:2,rows:1,portrait:false,insert:true,panels:2,description:'One fold. Two printed inside panels; the outside stays blank.'},
  accordion3: {name:'3-panel accordion',cols:3,rows:1,portrait:false,insert:true,panels:3,description:'Two alternating folds. Three printed panels; the reverse stays blank.'},
  accordion4: {name:'4-panel accordion',cols:4,rows:1,portrait:false,insert:true,panels:4,description:'Three alternating folds. Four printed panels; the reverse stays blank.'},
  portrait: {name:'Full-sheet portrait',cols:1,rows:1,portrait:true,description:'One design per sheet. Posters and menus.'},
  landscape: {name:'Full-sheet landscape',cols:1,rows:1,portrait:false,description:'One wide design per sheet.'},
  flyers: {name:'Two-up flyers',cols:2,rows:1,portrait:false,description:'Two half-sheet flyers. Cut down the center.'},
  cards: {name:'Four-up cards',cols:2,rows:2,portrait:true,description:'Four quarter-sheet cards. Cut into quarters.'},
  eight: {name:'Eight-up cards',cols:4,rows:2,portrait:false,description:'Eight upright cards. Cut along the grid.'},
  tasting: {name:'Tasting cards',cols:2,rows:5,portrait:true,pieceW:3.5,pieceH:2,gap:.125,description:'Ten 3.5 × 2 in cards. ⅛ in gutters.'},
  shelf: {name:'Shelf labels',cols:2,rows:7,portrait:true,pieceW:3.5,pieceH:1.25,gap:.125,description:'Fourteen 3.5 × 1.25 in labels. ⅛ in gutters.'},
  menus: {name:'Cocktail menus',cols:2,rows:1,portrait:true,pieceW:3.5,pieceH:8.5,gap:.25,description:'Two 3.5 × 8.5 in menus. ¼ in gutter.'},
  neck: {name:'Bottle neck tags',cols:3,rows:1,portrait:true,pieceW:2.25,pieceH:7,gap:.125,neck:true,description:'Three 2.25 × 7 in tags. Cut a 1.25 in hole; fold at 2 in.'},
  tents: {name:'Table tents',cols:2,rows:1,portrait:false,pieceW:5,pieceH:7,gap:.25,tent:true,description:'Two 5 × 7 in blanks. Fold to 5 × 3.5 in; same design on both faces.'}
};
export const PAPER = {letter:{name:'US Letter',w:11,h:8.5},a4:{name:'A4',w:297/25.4,h:210/25.4},a3:{name:'A3',w:420/25.4,h:297/25.4}};
export const SHEET_ORDER=[4,3,2,1,5,6,7,0];
export function activeCount(project){return FORMATS[project.format||'zine']?.panels||project.pages.length;}
export function itemWord(project){const f=FORMATS[project.format||'zine'];return f?.folded?'page':f?.insert?'panel':'design';}
export function sheetSpec(paper='letter',format='zine') {
  const p=PAPER[paper]||PAPER.letter,f=FORMATS[format]||FORMATS.zine;
  const w=f.portrait?p.h:p.w,h=f.portrait?p.w:p.h,gap=f.gap||0;
  const slotW=f.pieceW||w/f.cols,slotH=f.pieceH||h/f.rows;
  const offsetX=(w-f.cols*slotW-(f.cols-1)*gap)/2,offsetY=(h-f.rows*slotH-(f.rows-1)*gap)/2;
  return {...f,w,h,gap,slotW,slotH,offsetX,offsetY,pageW:slotW,pageH:f.tent?slotH/2:slotH,count:f.cols*f.rows};
}
export function sheetSlots(spec){return Array.from({length:spec.count},(_,i)=>({x:spec.offsetX+i%spec.cols*(spec.slotW+spec.gap),y:spec.offsetY+Math.floor(i/spec.cols)*(spec.slotH+spec.gap),w:spec.slotW,h:spec.slotH}));}
export function sheetPages(project,selected=0) {
  const spec=sheetSpec(project.paper,project.format);
  if(spec.folded)return [SHEET_ORDER];
  if(spec.insert)return [Array.from({length:spec.panels},(_,i)=>i)];
  if(project.printContent==='repeat')return [Array(spec.count).fill(selected)];
  return Array.from({length:Math.ceil(project.pages.length/spec.count)},(_,i)=>Array.from({length:spec.count},(_,j)=>i*spec.count+j).filter(n=>n<project.pages.length));
}
export function inches(n){return Number(n.toFixed(3)).toString();}
