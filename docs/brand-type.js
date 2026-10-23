// Brand names have their own default face, regardless of headline/body position.
export function brandFont(text,fallback='Pirelli'){
  const name=String(text||'').trim().replace(/\s+/g,' ').toLowerCase();
  return name==='mosquito ranch spirits'?'Primos':name==='freezer martini service'?'Pirelli':fallback;
}
export function brandTypeDefaults(page){
  return {...page,font:brandFont(page.title,page.font),bodyFont:brandFont(page.body,page.bodyFont),brandTypeVersion:1};
}
export function migrateBrandType(page,version){
  if(version!==1&&page.layout!=='free'){
    // Update the original sample pairing once; retain other chosen typefaces.
    if(page.font==='Primos')page.font=brandFont(page.title,page.font);
    if(page.bodyFont==='Pirelli')page.bodyFont=brandFont(page.body,page.bodyFont);
  }
  page.brandTypeVersion=1;
  return page;
}
