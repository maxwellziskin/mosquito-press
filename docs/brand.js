// Colors from Mosquito Ranch Martini Graphic Toolkit v1, page 9.
export const SWATCHES = [
 {name:'Castelvetrano',hex:'#677727'}, {name:'Cerignola',hex:'#4e561d'},
 {name:'Lemon',hex:'#f8c630'}, {name:'Rind',hex:'#e8a718'},
 {name:'Soft Black',hex:'#202020'}, {name:'White',hex:'#ffffff'}
];
export const PALETTES = {
 dirty:{name:'Dirty',colors:['#677727','#ffffff','#4e561d']},
 dirtyDark:{name:'Dirty dark',colors:['#4e561d','#ffffff','#677727']},
 twist:{name:'Twist',colors:['#f8c630','#202020','#e8a718']},
 rind:{name:'Twist rind',colors:['#e8a718','#202020','#f8c630']},
 black:{name:'Soft Black',colors:['#202020','#ffffff','#f8c630']},
 white:{name:'White',colors:['#ffffff','#202020','#677727']}
};
export const BRAND_PHOTOS = [
  {
    "id": "photo-twist-lemons",
    "name": "Twist / lemons",
    "src": "assets/brand/photos/twist-lemons.jpg",
    "category": "Photos",
    "ratio": 0.75,
    "dark": false
  },
  {
    "id": "photo-slivovitz-sunlight",
    "name": "Slivovitz / sunlight",
    "src": "assets/brand/photos/slivovitz-sunlight.jpg",
    "category": "Photos",
    "ratio": 1.0,
    "dark": false
  },
  {
    "id": "photo-twist-dirty-pair",
    "name": "Twist + Dirty",
    "src": "assets/brand/photos/twist-dirty-pair.jpg",
    "category": "Photos",
    "ratio": 0.75,
    "dark": false
  },
  {
    "id": "photo-dirty-daylight",
    "name": "Dirty / daylight",
    "src": "assets/brand/photos/dirty-daylight.jpg",
    "category": "Photos",
    "ratio": 0.75,
    "dark": false
  },
  {
    "id": "photo-dirty-dog",
    "name": "Dirty / dog",
    "src": "assets/brand/photos/dirty-dog.jpg",
    "category": "Photos",
    "ratio": 0.75,
    "dark": false
  },
  {
    "id": "photo-skeleton",
    "name": "Skeleton",
    "src": "assets/brand/photos/skeleton.jpg",
    "category": "Photos",
    "ratio": 0.9875,
    "dark": false
  },
  {
    "id": "photo-dirty-golden-light",
    "name": "Dirty / golden light",
    "src": "assets/brand/photos/dirty-golden-light.jpg",
    "category": "Photos",
    "ratio": 0.665625,
    "dark": false
  }
];
export const ASSETS = [
  ...BRAND_PHOTOS,
  {id:'mosquito-fly-black',name:'Mosquito Ranch fly / black',src:'assets/brand/mosquito-fly-black.svg',category:'Logos',ratio:1.1044068209233813,dark:false},
  {id:'mosquito-fly-white',name:'Mosquito Ranch fly / white',src:'assets/brand/mosquito-fly-white.svg',category:'Logos',ratio:1.1044068209233813,dark:true},
  {
    "id": "fms-primary-black",
    "name": "FMS primary / black",
    "src": "assets/brand/fms-primary-black.svg",
    "category": "Logos",
    "ratio": 2.076923076923077,
    "dark": false
  },
  {
    "id": "fms-primary-white",
    "name": "FMS primary / white",
    "src": "assets/brand/fms-primary-white.svg",
    "category": "Logos",
    "ratio": 2.076923076923077,
    "dark": true
  },
  {
    "id": "fms-two-line-black",
    "name": "FMS two-line / black",
    "src": "assets/brand/fms-two-line-black.svg",
    "category": "Logos",
    "ratio": 4.5,
    "dark": false
  },
  {
    "id": "fms-two-line-white",
    "name": "FMS two-line / white",
    "src": "assets/brand/fms-two-line-white.svg",
    "category": "Logos",
    "ratio": 4.5,
    "dark": true
  },
  {
    "id": "fms-inline-black",
    "name": "FMS inline / black",
    "src": "assets/brand/fms-inline-black.svg",
    "category": "Logos",
    "ratio": 13.5,
    "dark": false
  },
  {
    "id": "fms-inline-white",
    "name": "FMS inline / white",
    "src": "assets/brand/fms-inline-white.svg",
    "category": "Logos",
    "ratio": 13.5,
    "dark": true
  },
  {
    "id": "mosquito-ranch",
    "name": "Mosquito Ranch Spirits",
    "src": "assets/brand/mrs-stacked-transparent.png",
    "category": "Logos",
    "ratio": 1.09375,
    "dark": false
  },
  {
    "id": "freezer-martinis",
    "name": "Freezer martinis",
    "src": "assets/brand/freezer-martini-editorial.png",
    "category": "Imagery",
    "ratio": 1.7768331562167907,
    "dark": false
  },
  {
    "id": "plums-still",
    "name": "Plums & copper still",
    "src": "assets/brand/slivovitz-editorial.png",
    "category": "Imagery",
    "ratio": 1.7768331562167907,
    "dark": false
  }
];
export const ASSET_BY_ID=Object.fromEntries(ASSETS.map(a=>[a.id,a]));
export const artSource=art=>ASSET_BY_ID[art.asset]?.src||art.src;
export const artRatio=art=>ASSET_BY_ID[art.asset]?.ratio||art.ratio||1;
export const artName=art=>ASSET_BY_ID[art.asset]?.name||art.name||'Uploaded artwork';
const LEGACY_PALETTES={"#f4522a,#26271f,#f4522a":"dirty","#254ad2,#fff8e7,#dce55c": "dirtyDark", "#26271f,#f4f0e5,#dce55c": "black", "#dce55c,#25261e,#f4512b": "twist", "#dce55c,#26271f,#f4522a": "twist", "#f3c7d3,#86252d,#86252d": "dirty", "#f3c7d3,#86252d,#f4522a": "dirty", "#f3c7d3,#961e24,#f4522a": "dirty", "#f4522a,#26271f,#b92a15": "dirty", "#f4522a,#26271f,#dce55c": "dirty", "#f4f0e5,#26271f,#dce55c": "white", "#f4f0e5,#26271f,#f4522a": "white"};
export function migrateColors(page){const key=[page.bg,page.ink,page.accent].map(c=>c.toLowerCase()).join(',');const palette=PALETTES[LEGACY_PALETTES[key]];if(palette)[page.bg,page.ink,page.accent]=palette.colors;return page;}
