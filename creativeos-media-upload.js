(() => {
  'use strict';

  const SUPABASE_URL='https://naiglzmqpgucfbwfbvxt.supabase.co';
  const SUPABASE_KEY='sb_publishable_h883eAMdoF8IYcPunFFCVQ_SCB42SMf';
  const BUCKET='creativeos-media';

  const safeName=(name='file')=>String(name)
    .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-')
    .replace(/^-|-$/g,'').slice(0,120)||'file';
  const enc=path=>String(path).split('/').map(encodeURIComponent).join('/');
  const publicUrl=path=>`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${enc(path)}`;

  async function upload(file,{kind='winner-lab',id='media',productId=null,metadata={}}={}){
    if(!(file instanceof Blob))throw new Error('Selecciona un archivo válido.');
    if(file.size>250*1024*1024)throw new Error('El archivo supera el límite de 250 MB.');
    const name=safeName(file.name||`${kind}-${id}`);
    const path=`${kind}/${productId?`${safeName(productId)}/`:''}${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safeName(id)}-${name}`;
    const res=await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${enc(path)}`,{
      method:'POST',
      headers:{
        apikey:SUPABASE_KEY,
        Authorization:`Bearer ${SUPABASE_KEY}`,
        'Content-Type':file.type||'application/octet-stream',
        'x-upsert':'false'
      },
      body:file
    });
    if(!res.ok)throw new Error(`No se pudo subir el archivo (${res.status}).`);
    return{url:publicUrl(path),storagePath:path,name:file.name||name,type:file.type||null,size:Number(file.size||0),metadata};
  }

  window.CreativeOSMedia={upload,publicUrl,bucket:BUCKET,version:'1.0'};
})();