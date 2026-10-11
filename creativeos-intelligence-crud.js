(() => {
  const API='https://naiglzmqpgucfbwfbvxt.supabase.co/functions/v1/creativeos-intelligence';
  let decorating=false;
  const esc=(v='')=>String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
  const low=v=>String(v||'').toLowerCase();
  const slugify=v=>low(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);
  const split=v=>String(v||'').split(',').map(x=>x.trim()).filter(Boolean);
  const snap=()=>window.CreativeOSIntelligence?.getSnapshot?.()||{};
  const activeView=()=>document.querySelector('.ci-nav-btn.active')?.dataset?.ciRoute||null;
  const niches=()=>snap().niches||[];
  const nicheOptions=(selected=[])=>niches().filter(n=>n.slug!=='mascotas').map(n=>`<label class="cix-check"><input type="checkbox" value="${esc(n.slug)}" ${selected.includes(n.slug)?'checked':''}> <span>${esc(n.name)}</span></label>`).join('');
  const oneNicheOptions=(selected='')=>`<option value="">Sin nicho</option>${niches().filter(n=>n.slug!=='mascotas').map(n=>`<option value="${esc(n.slug)}" ${selected===n.slug?'selected':''}>${esc(n.name)}</option>`).join('')}`;
  const productOptions=(selected='')=>`<option value="">Sin producto</option>${(snap().products||[]).map(p=>`<option value="${esc(p.id)}" ${selected===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}`;
  const patternOptions=(selected='')=>`<option value="">Sin patrón</option>${(snap().patterns||[]).map(p=>`<option value="${esc(p.slug)}" ${selected===p.slug?'selected':''}>${esc(p.name)}</option>`).join('')}`;

  async function post(body){
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.error) throw new Error(d.detail||d.error||`HTTP ${r.status}`);
    return d.data;
  }
  async function reload(){ await window.CreativeOSIntelligence?.refresh?.(); setTimeout(decorate,60); }
  function toast(text,kind='ok'){
    let host=document.getElementById('cixToasts');
    if(!host){host=document.createElement('div');host.id='cixToasts';host.className='cix-toasts';document.body.appendChild(host);}
    const el=document.createElement('div');el.className=`cix-toast ${kind}`;el.textContent=text;host.appendChild(el);setTimeout(()=>el.remove(),2600);
  }
  function ensureModal(){
    let root=document.getElementById('cixModalRoot');
    if(!root){root=document.createElement('div');root.id='cixModalRoot';document.body.appendChild(root);}
    return root;
  }
  function closeModal(){const r=document.getElementById('cixModalRoot');if(r)r.innerHTML='';}
  function field(label,html,wide=false){return `<div class="cix-field ${wide?'wide':''}"><label>${esc(label)}</label>${html}</div>`;}
  function input(id,value='',type='text',extra=''){return `<input class="cix-input" id="${id}" type="${type}" value="${esc(value??'')}" ${extra}>`;}
  function area(id,value='',placeholder=''){return `<textarea class="cix-area" id="${id}" placeholder="${esc(placeholder)}">${esc(value??'')}</textarea>`;}
  function openModal({title,sub='',body,entity,key='',isNew=false}){
    const root=ensureModal();
    root.innerHTML=`<div class="cix-backdrop" data-cix-close><div class="cix-modal" role="dialog" aria-modal="true"><div class="cix-head"><div><h3>${esc(title)}</h3><p>${esc(sub)}</p></div><button class="cix-x" data-cix-close>×</button></div><div class="cix-body">${body}</div><div class="cix-foot"><button class="cix-btn" data-cix-close>Cancelar</button>${!isNew?`<button class="cix-btn danger" data-cix-delete="${entity}" data-cix-key="${esc(key)}">Eliminar</button>`:''}<button class="cix-btn primary" data-cix-save="${entity}" data-cix-key="${esc(key)}" data-cix-new="${isNew?'1':'0'}">Guardar</button></div></div></div>`;
  }
  function checkedNiches(){return [...document.querySelectorAll('#cixModalRoot .cix-check input:checked')].map(x=>x.value);}

  function allConcepts(){
    const s=snap(), persisted=[...(s.concepts||[])], seen=new Set(persisted.map(c=>c.metadata?.sourceConceptId).filter(Boolean));
    for(const c of s.conceptsLegacy||[]) if(!seen.has(c.id)) persisted.push({slug:slugify(c.name||c.id),name:c.name,description:c.desc||'',niches:[low(c.category)==='pets'?'perros':low(c.category)==='sport'?'running':low(c.category)==='babies'?'bebes':'general'],uses_count:c.uses||0,wins_count:0,avg_views:c.avgViews||0,best_views:c.bestViews||0,metadata:{sourceConceptId:c.id,legacyOnly:true},legacy:c});
    return persisted;
  }
  function findEntity(entity,key){
    const s=snap();
    if(entity==='concept') return allConcepts().find(x=>x.slug===key||x.metadata?.sourceConceptId===key);
    if(entity==='angle') return (s.angles||[]).find(x=>x.slug===key);
    if(entity==='pattern') return (s.patterns||[]).find(x=>x.slug===key);
    if(entity==='hook') return (s.hooks||[]).find(x=>String(x.id)===String(key));
    if(entity==='niche') return (s.niches||[]).find(x=>x.slug===key);
    if(entity==='learning') return (s.learnings||[]).find(x=>String(x.id)===String(key));
    if(entity==='avatar') return (s.avatars||[]).find(x=>x.id===key) || productAvatars().find(x=>x.id===key);
    return null;
  }
  function productAvatars(){
    const s=snap(), out=[];
    for(const p of s.products||[]){
      const imgs=(p.assets||[]).filter(a=>low(a.type).includes('avatar')&&(a.publicUrl||a.url||a.src));
      for(const a of p.avatars||[]) out.push({id:a.id,product_id:p.id,name:a.name,image_url:imgs[0]?.publicUrl||imgs[0]?.url||imgs[0]?.src||'',description:[a.role,a.segment].filter(Boolean).join(' · '),niche_slugs:[],uses_count:0,wins_count:0,avg_views:0,best_views:0,best_concepts:[],best_angles:a.angle?[a.angle]:[],ai_hypothesis:'',metadata:{legacy:true}});
      if(!(p.avatars||[]).length) for(const a of imgs) out.push({id:a.id,product_id:p.id,name:a.name,image_url:a.publicUrl||a.url||a.src,description:'Asset de avatar',niche_slugs:[],uses_count:0,wins_count:0,avg_views:0,best_views:0,best_concepts:[],best_angles:[],ai_hypothesis:'',metadata:{legacy:true}});
    }
    const map=new Map(out.map(x=>[x.id,x])); for(const a of s.avatars||[]) map.set(a.id,{...map.get(a.id),...a}); return [...map.values()];
  }

  function editor(entity,item=null){
    const isNew=!item;
    if(entity==='concept'){
      item=item||{name:'',description:'',niches:[],uses_count:0,wins_count:0,avg_views:0,best_views:0,best_hooks:[],best_angles:[],best_avatars:[]};
      openModal({entity,key:item.slug||'',isNew,title:isNew?'Nuevo concepto':item.name,sub:'Concepto reutilizable: edita su definición y la data que has acumulado.',body:`<div class="cix-grid">${field('Nombre',input('cixName',item.name))}${field('Slug',input('cixSlug',item.slug||'', 'text', isNew?'':'disabled'))}${field('Descripción',area('cixDescription',item.description),'wide')}${field('Nichos',`<div class="cix-checks">${nicheOptions(item.niches||[])}</div>`,'wide')}${field('Usos',input('cixUses',item.uses_count||0,'number','min="0"'))}${field('Wins',input('cixWins',item.wins_count||0,'number','min="0"'))}${field('Views medias',input('cixAvg',item.avg_views||0,'number','min="0"'))}${field('Mejor vídeo',input('cixBest',item.best_views||0,'number','min="0"'))}${field('Mejores hooks',input('cixBestHooks',(item.best_hooks||[]).join(', ')),'wide')}${field('Mejores ángulos',input('cixBestAngles',(item.best_angles||[]).join(', ')),'wide')}${field('Mejores avatares',input('cixBestAvatars',(item.best_avatars||[]).join(', ')),'wide')}</div>`});
    } else if(entity==='angle'){
      item=item||{name:'',description:'',niches:[],uses_count:0,wins_count:0,avg_views:0,best_views:0};
      openModal({entity,key:item.slug||'',isNew,title:isNew?'Nuevo ángulo de venta':item.name,sub:'Qué promesa, problema o motivación estás vendiendo.',body:`<div class="cix-grid">${field('Nombre',input('cixName',item.name))}${field('Slug',input('cixSlug',item.slug||'','text',isNew?'':'disabled'))}${field('Descripción',area('cixDescription',item.description),'wide')}${field('Nichos',`<div class="cix-checks">${nicheOptions(item.niches||[])}</div>`,'wide')}${field('Usos',input('cixUses',item.uses_count||0,'number','min="0"'))}${field('Wins',input('cixWins',item.wins_count||0,'number','min="0"'))}${field('Views medias',input('cixAvg',item.avg_views||0,'number','min="0"'))}${field('Mejor vídeo',input('cixBest',item.best_views||0,'number','min="0"'))}</div>`});
    } else if(entity==='pattern'){
      item=item||{name:'',template:'',description:'',niches:[],examples:[],uses_count:0,wins_count:0};
      openModal({entity,key:item.slug||'',isNew,title:isNew?'Nuevo patrón de hook':item.name,sub:'Guarda el mecanismo del texto para poder adaptarlo a otros productos.',body:`<div class="cix-grid">${field('Nombre',input('cixName',item.name))}${field('Slug',input('cixSlug',item.slug||'','text',isNew?'':'disabled'))}${field('Plantilla',area('cixTemplate',item.template,'My [avatar] + problema + trigger'),'wide')}${field('Descripción',area('cixDescription',item.description),'wide')}${field('Nichos',`<div class="cix-checks">${nicheOptions(item.niches||[])}</div>`,'wide')}${field('Ejemplo',area('cixExample',(item.examples||[])[0]||''),'wide')}${field('Usos',input('cixUses',item.uses_count||0,'number','min="0"'))}${field('Wins',input('cixWins',item.wins_count||0,'number','min="0"'))}</div>`});
    } else if(entity==='hook'){
      item=item||{text:'',niche_slug:sessionStorage.getItem('creativeos_ci_niche')||'perros',pattern_slug:'',hook_type:'',emotion:'',keywords:[],source_type:'research',source_url:'',views:'',likes:'',notes:''};
      openModal({entity,key:item.id||'',isNew,title:isNew?'Nuevo hook viral':'Editar hook',sub:'Texto exacto + clasificación + resultado del original.',body:`<div class="cix-grid">${field('Texto',area('cixText',item.text),'wide')}${field('Nicho',`<select id="cixNiche" class="cix-input">${oneNicheOptions(item.niche_slug||'')}</select>`)}${field('Patrón',`<select id="cixPattern" class="cix-input">${patternOptions(item.pattern_slug||'')}</select>`)}${field('Tipo de hook',input('cixHookType',item.hook_type||''))}${field('Emoción',input('cixEmotion',item.emotion||''))}${field('Keywords',input('cixKeywords',(item.keywords||[]).join(', ')),'wide')}${field('Views',input('cixViews',item.views??'','number','min="0"'))}${field('Likes',input('cixLikes',item.likes??'','number','min="0"'))}${field('Fuente / URL',input('cixSource',item.source_url||''),'wide')}${field('Notas',area('cixNotes',item.notes||''),'wide')}</div>`});
    } else if(entity==='niche'){
      item=item||{name:'',slug:'',parent_slug:'',description:'',keywords:[]};
      openModal({entity,key:item.slug||'',isNew,title:isNew?'Nuevo nicho':item.name,sub:'Agrupa hooks, conceptos, ángulos y aprendizajes.',body:`<div class="cix-grid">${field('Nombre',input('cixName',item.name))}${field('Slug',input('cixSlug',item.slug||'','text',isNew?'':'disabled'))}${field('Nicho padre',`<select id="cixParent" class="cix-input"><option value="">Ninguno</option>${niches().filter(n=>n.slug!==item.slug).map(n=>`<option value="${esc(n.slug)}" ${item.parent_slug===n.slug?'selected':''}>${esc(n.name)}</option>`).join('')}</select>`)}${field('Keywords',input('cixKeywords',(item.keywords||[]).join(', ')))}${field('Descripción',area('cixDescription',item.description),'wide')}</div>`});
    } else if(entity==='learning'){
      item=item||{kind:'manual',niche_slug:'',product_id:'',title:'',body:'',confidence:''};
      openModal({entity,key:item.id||'',isNew,title:isNew?'Nuevo aprendizaje':'Editar aprendizaje',sub:'Separa lo que sabes, lo que muestran los datos y lo que todavía es hipótesis.',body:`<div class="cix-grid">${field('Tipo',`<select id="cixKind" class="cix-input"><option value="manual" ${item.kind==='manual'?'selected':''}>Aprendizaje tuyo</option><option value="data_insight" ${item.kind==='data_insight'?'selected':''}>Insight de datos</option><option value="ai_hypothesis" ${item.kind==='ai_hypothesis'?'selected':''}>Hipótesis IA</option></select>`)}${field('Nicho',`<select id="cixNiche" class="cix-input">${oneNicheOptions(item.niche_slug||'')}</select>`)}${field('Producto',`<select id="cixProduct" class="cix-input">${productOptions(item.product_id||'')}</select>`)}${field('Confianza 0–1',input('cixConfidence',item.confidence??'','number','min="0" max="1" step="0.05"'))}${field('Título',input('cixTitle',item.title),'wide')}${field('Aprendizaje',area('cixBody',item.body),'wide')}</div>`});
    } else if(entity==='avatar'){
      item=item||{id:'',product_id:'',name:'',image_url:'',description:'',niche_slugs:[],uses_count:0,wins_count:0,avg_views:0,best_views:0,best_concepts:[],best_angles:[],ai_hypothesis:''};
      openModal({entity,key:item.id||'',isNew,title:isNew?'Nuevo avatar intelligence':item.name,sub:'La imagen puede seguir viviendo en Productos; aquí guardamos su rendimiento y aprendizajes.',body:`<div class="cix-grid">${field('Nombre',input('cixName',item.name))}${field('ID',input('cixId',item.id||'','text',isNew?'':'disabled'))}${field('Producto',`<select id="cixProduct" class="cix-input">${productOptions(item.product_id||'')}</select>`)}${field('Imagen URL',input('cixImage',item.image_url||''))}${field('Descripción',area('cixDescription',item.description),'wide')}${field('Nichos',`<div class="cix-checks">${nicheOptions(item.niche_slugs||[])}</div>`,'wide')}${field('Usos',input('cixUses',item.uses_count||0,'number','min="0"'))}${field('Wins',input('cixWins',item.wins_count||0,'number','min="0"'))}${field('Views medias',input('cixAvg',item.avg_views||0,'number','min="0"'))}${field('Mejor vídeo',input('cixBest',item.best_views||0,'number','min="0"'))}${field('Mejores conceptos',input('cixBestConcepts',(item.best_concepts||[]).join(', ')),'wide')}${field('Mejores ángulos',input('cixBestAngles',(item.best_angles||[]).join(', ')),'wide')}${field('Hipótesis IA',area('cixHypothesis',item.ai_hypothesis||''),'wide')}</div>`});
    }
  }

  const val=id=>document.getElementById(id)?.value?.trim()??'';
  const num=id=>{const v=val(id);return v===''?0:Number(v)||0;};
  async function saveEntity(entity,key,isNew){
    try{
      let body={};
      if(entity==='concept'){
        const name=val('cixName'),slug=isNew?(val('cixSlug')||slugify(name)):key;if(!name||!slug) throw new Error('Nombre y slug son obligatorios.');
        body={action:'upsert_concept',slug,name,description:val('cixDescription'),niches:checkedNiches(),uses_count:num('cixUses'),wins_count:num('cixWins'),avg_views:num('cixAvg'),best_views:num('cixBest'),best_hooks:split(val('cixBestHooks')),best_angles:split(val('cixBestAngles')),best_avatars:split(val('cixBestAvatars')),metadata:findEntity('concept',key)?.metadata||{}};
      } else if(entity==='angle'){
        const name=val('cixName'),slug=isNew?(val('cixSlug')||slugify(name)):key;if(!name||!slug) throw new Error('Nombre y slug son obligatorios.');
        body={action:'upsert_angle',slug,name,description:val('cixDescription'),niches:checkedNiches(),uses_count:num('cixUses'),wins_count:num('cixWins'),avg_views:num('cixAvg'),best_views:num('cixBest'),metadata:findEntity('angle',key)?.metadata||{}};
      } else if(entity==='pattern'){
        const name=val('cixName'),slug=isNew?(val('cixSlug')||slugify(name)):key;if(!name||!slug||!val('cixTemplate')) throw new Error('Nombre, slug y plantilla son obligatorios.');
        body={action:'upsert_pattern',slug,name,template:val('cixTemplate'),description:val('cixDescription'),niches:checkedNiches(),examples:val('cixExample')?[val('cixExample')]:[],uses_count:num('cixUses'),wins_count:num('cixWins'),metadata:findEntity('pattern',key)?.metadata||{}};
      } else if(entity==='hook'){
        if(!val('cixText')) throw new Error('Escribe el hook.');
        body={action:isNew?'add_hook':'update_hook',...(isNew?{}:{id:key}),text:val('cixText'),niche_slug:val('cixNiche')||null,pattern_slug:val('cixPattern')||null,hook_type:val('cixHookType')||null,emotion:val('cixEmotion')||null,keywords:split(val('cixKeywords')),source_type:'research',source_url:val('cixSource')||null,views:val('cixViews')===''?null:num('cixViews'),likes:val('cixLikes')===''?null:num('cixLikes'),notes:val('cixNotes')||null};
      } else if(entity==='niche'){
        const name=val('cixName'),slug=isNew?(val('cixSlug')||slugify(name)):key;if(!name||!slug) throw new Error('Nombre y slug son obligatorios.');
        body={action:'upsert_niche',slug,name,parent_slug:val('cixParent')||null,description:val('cixDescription'),keywords:split(val('cixKeywords')),metadata:findEntity('niche',key)?.metadata||{}};
      } else if(entity==='learning'){
        if(!val('cixTitle')||!val('cixBody')) throw new Error('Título y aprendizaje son obligatorios.');
        body={action:isNew?'add_learning':'update_learning',...(isNew?{}:{id:key}),kind:val('cixKind')||'manual',niche_slug:val('cixNiche')||null,product_id:val('cixProduct')||null,title:val('cixTitle'),body:val('cixBody'),confidence:val('cixConfidence')===''?null:Number(val('cixConfidence')),evidence:[],metadata:findEntity('learning',key)?.metadata||{source:'web'}};
      } else if(entity==='avatar'){
        const name=val('cixName'),id=isNew?(val('cixId')||slugify(name)):key;if(!name||!id) throw new Error('Nombre e ID son obligatorios.');
        body={action:'upsert_avatar',id,name,product_id:val('cixProduct')||null,image_url:val('cixImage')||null,description:val('cixDescription'),niche_slugs:checkedNiches(),uses_count:num('cixUses'),wins_count:num('cixWins'),avg_views:num('cixAvg'),best_views:num('cixBest'),best_concepts:split(val('cixBestConcepts')),best_angles:split(val('cixBestAngles')),ai_hypothesis:val('cixHypothesis')||null,metadata:findEntity('avatar',key)?.metadata||{}};
      }
      await post(body);closeModal();toast('Guardado en CreativeOS');await reload();
    }catch(err){toast(String(err.message||err),'error');}
  }
  async function deleteEntity(entity,key){
    const item=findEntity(entity,key);if(!item)return;
    if(!confirm(`¿Eliminar “${item.name||item.title||item.text||key}”?`))return;
    try{
      if(entity==='concept'){
        if(item.slug) await post({action:'delete_concept',slug:item.slug});
        const legacyId=item.metadata?.sourceConceptId||item.legacy?.id;if(legacyId) await post({action:'delete_legacy_concept',id:legacyId});
      } else if(entity==='angle') await post({action:'delete_angle',slug:key});
      else if(entity==='pattern') await post({action:'delete_pattern',slug:key});
      else if(entity==='hook') await post({action:'delete_hook',id:key});
      else if(entity==='niche') await post({action:'delete_niche',slug:key});
      else if(entity==='learning') await post({action:'delete_learning',id:key});
      else if(entity==='avatar') await post({action:'delete_avatar',id:key});
      closeModal();toast('Eliminado');await reload();
    }catch(err){toast(`No se pudo eliminar: ${err.message||err}`,'error');}
  }

  function addActions(container,entity,key){
    if(container.querySelector(':scope > .cix-card-actions'))return;
    container.classList.add('cix-editable');container.dataset.cixEntity=entity;container.dataset.cixKey=key;
    const bar=document.createElement('div');bar.className='cix-card-actions';bar.innerHTML=`<button data-cix-edit="${entity}" data-cix-key="${esc(key)}">Editar</button><button class="danger" data-cix-delete="${entity}" data-cix-key="${esc(key)}">Eliminar</button>`;container.appendChild(bar);
  }
  function decorate(){
    if(decorating)return;decorating=true;
    try{
      const host=document.getElementById('ciHost');if(!host||!host.classList.contains('active'))return;
      const view=activeView();const s=snap();
      const actions=host.querySelector('.ci-hero .ci-actions');
      if(actions&&!actions.querySelector('[data-cix-add]')){
        const defs={niches:[['hook','+ Hook'],['pattern','+ Patrón'],['niche','+ Nicho']],concepts:[['concept','+ Concepto']],angles:[['angle','+ Ángulo']],avatars:[['avatar','+ Avatar']],learnings:[['learning','+ Aprendizaje']]};
        for(const [entity,label] of defs[view]||[]){const b=document.createElement('button');b.className='ci-btn primary';b.dataset.cixAdd=entity;b.textContent=label;actions.prepend(b);}
      }
      if(view==='testing'){
        host.querySelectorAll('.ci-table tbody tr').forEach(tr=>{const name=tr.querySelector('td b')?.textContent?.trim();const p=(s.products||[]).find(x=>x.name===name);if(p){tr.dataset.cixProduct=p.id;tr.classList.add('cix-row-click');tr.title='Abrir producto';}});
      }
      if(view==='niches'){
        host.querySelectorAll('.ci-niche[data-ci-niche]').forEach(card=>{const key=card.dataset.ciNiche;if(!card.querySelector('.cix-niche-edit')){const b=document.createElement('button');b.className='cix-niche-edit';b.dataset.cixEdit='niche';b.dataset.cixKey=key;b.textContent='Editar';card.prepend(b);}});
        host.querySelectorAll('.ci-pattern').forEach(el=>{const name=el.querySelector('b')?.textContent?.trim();const item=(s.patterns||[]).find(x=>x.name===name);if(item)addActions(el,'pattern',item.slug);});
        const hookMap=new Map((s.hooks||[]).map(h=>[h.text,h]));
        host.querySelectorAll('.ci-list-item').forEach(el=>{const b=el.querySelector('b');const item=hookMap.get(b?.textContent?.trim());if(item&&!el.closest('.ci-card')?.querySelector('h3')?.textContent?.includes('Aprendiz'))addActions(el,'hook',item.id);});
      }
      if(view==='concepts'){
        const items=allConcepts();host.querySelectorAll('.ci-grid.three > .ci-card.pad').forEach(el=>{const name=el.querySelector('h3')?.textContent?.trim();const item=items.find(x=>x.name===name);if(item)addActions(el,'concept',item.slug||item.metadata?.sourceConceptId);});
      }
      if(view==='angles'){
        host.querySelectorAll('.ci-grid.three > .ci-card.pad').forEach(el=>{const name=el.querySelector('h3')?.textContent?.trim();const item=(s.angles||[]).find(x=>x.name===name);if(item)addActions(el,'angle',item.slug);});
      }
      if(view==='avatars'){
        const items=productAvatars();host.querySelectorAll('.ci-avatar').forEach(el=>{const name=el.querySelector('b')?.textContent?.trim();const item=items.find(x=>x.name===name);if(item)addActions(el,'avatar',item.id);});
      }
      if(view==='learnings'){
        host.querySelectorAll('.ci-list-item').forEach(el=>{const name=el.querySelector('b')?.textContent?.trim();const item=(s.learnings||[]).find(x=>x.title===name);if(item)addActions(el,'learning',item.id);});
      }
    }finally{decorating=false;}
  }
  function openNativeProduct(id){
    const productsNav=document.querySelector('.nav-btn[data-route="products"]');if(productsNav)productsNav.click();
    setTimeout(()=>{const card=document.querySelector(`[data-open-product="${CSS.escape(id)}"]`);if(card)card.click();else toast('No encontré la ficha del producto.','error');},120);
  }

  document.addEventListener('click',e=>{
    const close=e.target.closest?.('[data-cix-close]');if(close){if(close.classList.contains('cix-backdrop')&&e.target!==close)return;closeModal();return;}
    const add=e.target.closest?.('[data-cix-add]');if(add){e.preventDefault();e.stopPropagation();editor(add.dataset.cixAdd,null);return;}
    const edit=e.target.closest?.('[data-cix-edit]');if(edit){e.preventDefault();e.stopPropagation();editor(edit.dataset.cixEdit,findEntity(edit.dataset.cixEdit,edit.dataset.cixKey));return;}
    const del=e.target.closest?.('[data-cix-delete]');if(del){e.preventDefault();e.stopPropagation();deleteEntity(del.dataset.cixDelete,del.dataset.cixKey);return;}
    const save=e.target.closest?.('[data-cix-save]');if(save){e.preventDefault();saveEntity(save.dataset.cixSave,save.dataset.cixKey,save.dataset.cixNew==='1');return;}
    const row=e.target.closest?.('[data-cix-product]');if(row&&!e.target.closest('button,a,input,select,textarea')){e.preventDefault();openNativeProduct(row.dataset.cixProduct);return;}
    const card=e.target.closest?.('[data-cix-entity]');if(card&&!e.target.closest('button,a,input,select,textarea')){editor(card.dataset.cixEntity,findEntity(card.dataset.cixEntity,card.dataset.cixKey));}
  },true);

  const mo=new MutationObserver(()=>requestAnimationFrame(decorate));
  document.addEventListener('DOMContentLoaded',()=>{const root=document.getElementById('ciHost')||document.body;mo.observe(root,{childList:true,subtree:true});decorate();},{once:true});
  if(document.body){mo.observe(document.body,{childList:true,subtree:true});setTimeout(decorate,100);}
  window.CreativeOSIntelligenceCRUD={open:(entity,key)=>editor(entity,key?findEntity(entity,key):null),decorate};
})();
