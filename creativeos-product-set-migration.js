(() => {
  'use strict';
  const STORAGE_KEY='creativeos_local_v3';
  const VERSION='2026-10-12-active-3';
  const allowed=new Set(['strideshield','plnwzcp','flowerpress']);

  function existing(map,id){return map.get(id)||{};}
  function cleanMetrics(p){return {...p,published:null,views:null,bestViews:null,sales:null,comments:null,metricsStatus:'needs-data'};}

  function migrate(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(!raw)return false;
      const state=JSON.parse(raw);
      state.meta=state.meta&&typeof state.meta==='object'?state.meta:{};
      if(state.meta.activeProductSetVersion===VERSION)return false;

      const map=new Map((Array.isArray(state.products)?state.products:[]).map(p=>[p?.id,p]).filter(([id])=>id));
      const stride=cleanMetrics({
        ...existing(map,'strideshield'),id:'strideshield',name:'StrideShield',label:'Protectores de dedos',status:'Testing',day:12,testMax:7,testStart:'2026-10-01',nicheSlugs:['running'],historicalOrders:82,conceptsTested:3,anglesTested:3,
        brief:'StrideShield™ Toe Protectors. Test activo de 12 días. Conceptos confirmados como testeados: trail, basketball y skiing. Los 82 pedidos históricos quedan separados de las métricas del test actual.'
      });
      const camera=cleanMetrics({
        ...existing(map,'plnwzcp'),id:'plnwzcp',name:'auriculares camara',label:'Auriculares cámara',status:'Testing',day:1,testMax:7,testStart:'2026-10-12',nicheSlugs:['tech-fitness'],conceptsTested:0,anglesTested:0,
        brief:'Auriculares-cámara: permiten escuchar audio y grabar lo que queda directamente delante del usuario. Día 1 de test. Gym es un contexto creativo guardado, sin rendimiento atribuido todavía.'
      });
      const oldFlower=existing(map,'flowerpress');
      const flower=cleanMetrics({
        ...oldFlower,id:'flowerpress',name:'Wildflower Press',label:'Mini prensa de flores para hiking',status:'Testing',day:2,testMax:7,testStart:'2026-10-11',nicheSlugs:['hiking-outdoor','flores'],conceptsTested:0,anglesTested:0,
        assets:Array.isArray(oldFlower.assets)?oldFlower.assets:[],avatars:Array.isArray(oldFlower.avatars)?oldFlower.avatars:[],
        brief:'Mini prensa de flores silvestres para senderismo y amantes de las flores. Día 2 de test. Variantes trabajadas: grupo de amigas hikers, flower lover y regalo. No se atribuye rendimiento hasta registrar data real.'
      });

      state.products=[stride,camera,flower];
      if(Array.isArray(state.videos))state.videos=state.videos.filter(v=>!v?.productId||allowed.has(v.productId));
      if(state.context&&!allowed.has(state.context.productId))state.context={...state.context,productId:null,avatarId:null,assetIds:[],videoId:null};
      state.meta.activeProductSetVersion=VERSION;
      state.meta.activeProductIds=[...allowed];
      state.meta.productSetMigratedAt=new Date().toISOString();
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
      window.dispatchEvent(new CustomEvent('creativeos-product-set-migrated',{detail:{version:VERSION,productIds:[...allowed]}}));
      return true;
    }catch(err){console.warn('CreativeOS product set migration skipped',err);return false;}
  }

  migrate();
  document.addEventListener('DOMContentLoaded',()=>migrate(),{once:true});
  window.CreativeOSProductSetMigration={migrate,version:VERSION};
})();