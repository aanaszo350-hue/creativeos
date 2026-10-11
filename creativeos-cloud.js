(() => {
  const SUPABASE_URL = 'https://naiglzmqpgucfbwfbvxt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_h883eAMdoF8IYcPunFFCVQ_SCB42SMf';
  const STORAGE_KEY = 'creativeos_local_v3';
  const MEDIA_BUCKET = 'creativeos-media';
  const CONCEPT_MEDIA_DB = 'creativeos_media_v1';
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };

  let syncing = false;
  let lastPushed = '';
  let pollTimer = null;
  let reloadLock = false;

  async function rest(path, options = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) }
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  }

  function safeName(name = 'file') {
    return String(name)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 120) || 'file';
  }

  function encodedPath(path) {
    return String(path).split('/').map(encodeURIComponent).join('/');
  }

  function publicUrl(path) {
    return `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${encodedPath(path)}`;
  }

  function isDurableUrl(url) {
    return /^https:\/\//i.test(String(url || ''));
  }

  function blobFromRecord(rec) {
    if (!rec) return null;
    if (rec instanceof Blob) return rec;
    for (const key of ['blob', 'file', 'data', 'value']) {
      if (rec[key] instanceof Blob) return rec[key];
    }
    return null;
  }

  async function openDb(name, version) {
    return new Promise((resolve, reject) => {
      let req;
      try { req = version ? indexedDB.open(name, version) : indexedDB.open(name); }
      catch (err) { reject(err); return; }
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getFromStore(db, storeName, key) {
    return new Promise(resolve => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  }

  async function findBlobInIndexedDb(keys) {
    const wanted = [...new Set((keys || []).filter(Boolean).map(String))];
    if (!wanted.length || !window.indexedDB) return null;

    const candidates = [];
    try {
      if (indexedDB.databases) {
        const dbs = await indexedDB.databases();
        for (const d of dbs || []) if (d?.name) candidates.push({ name: d.name, version: d.version });
      }
    } catch {}
    if (!candidates.some(d => d.name === CONCEPT_MEDIA_DB)) candidates.push({ name: CONCEPT_MEDIA_DB });

    for (const info of candidates) {
      let db;
      try { db = await openDb(info.name, info.version); } catch { continue; }
      try {
        for (const storeName of [...db.objectStoreNames]) {
          for (const key of wanted) {
            const rec = await getFromStore(db, storeName, key);
            const blob = blobFromRecord(rec);
            if (blob) return blob;
          }
        }
      } finally {
        try { db.close(); } catch {}
      }
    }
    return null;
  }

  async function blobFromUrl(url) {
    if (!url || !/^(blob:|data:)/i.test(url)) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.blob();
    } catch { return null; }
  }

  async function resolveLocalBlob(item, extraKeys = []) {
    const direct = await blobFromUrl(item?.src || item?.url);
    if (direct) return direct;
    return findBlobInIndexedDb([item?.fileId, item?.id, item?.localId, ...extraKeys]);
  }

  async function uploadBlob(blob, { id, kind, name, productId = null, conceptId = null, metadata = {} }) {
    if (!(blob instanceof Blob)) throw new Error('No hay archivo real para subir');
    const extName = safeName(name || `media-${id}`);
    const path = `${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${safeName(id)}-${extName}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${MEDIA_BUCKET}/${encodedPath(path)}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': blob.type || 'application/octet-stream',
        'x-upsert': 'false'
      },
      body: blob
    });
    if (!res.ok) throw new Error(`Storage ${res.status}: ${await res.text()}`);

    const url = publicUrl(path);
    const row = {
      id: `${kind}:${id}`,
      kind,
      product_id: productId,
      concept_id: conceptId,
      name: name || extName,
      storage_path: path,
      public_url: url,
      mime_type: blob.type || null,
      size_bytes: Number(blob.size || 0),
      source_local_id: String(id),
      metadata
    };
    await rest('creativeos_media?on_conflict=id', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([row])
    });
    return { path, url, mimeType: blob.type || null, size: Number(blob.size || 0) };
  }

  async function migrateAsset(asset, productId) {
    if (!asset) return false;
    if (asset.storagePath && (asset.publicUrl || isDurableUrl(asset.url) || isDurableUrl(asset.src))) {
      const url = asset.publicUrl || asset.url || asset.src || publicUrl(asset.storagePath);
      asset.publicUrl = url;
      asset.url = url;
      asset.src = url;
      asset.storageStatus = 'ready';
      return false;
    }
    const localish = asset.localFile || asset.isLocal || asset.needsObjectUrl || asset.fileId || /^(blob:|data:)/i.test(asset.url || asset.src || '');
    if (!localish) return false;

    const blob = await resolveLocalBlob(asset);
    if (!blob) {
      asset.storageStatus = 'missing-local-file';
      return false;
    }
    const uploaded = await uploadBlob(blob, {
      id: asset.id || asset.fileId || Math.random().toString(36).slice(2),
      kind: 'asset',
      name: asset.name || 'asset',
      productId,
      metadata: { category: asset.type || asset.category || null }
    });
    asset.storagePath = uploaded.path;
    asset.publicUrl = uploaded.url;
    asset.url = uploaded.url;
    asset.src = uploaded.url;
    asset.mimeType = uploaded.mimeType;
    asset.sizeBytes = uploaded.size;
    asset.storageStatus = 'ready';
    asset.localFile = false;
    asset.isLocal = false;
    asset.needsObjectUrl = false;
    return true;
  }

  async function migrateConceptRef(ref, concept) {
    if (!ref) return false;
    if (ref.storagePath && isDurableUrl(ref.url || ref.publicUrl)) {
      ref.publicUrl = ref.publicUrl || ref.url;
      ref.url = ref.publicUrl;
      ref.storageStatus = 'ready';
      return false;
    }
    if (ref.kind === 'url' && isDurableUrl(ref.url)) return false;
    const localish = ref.kind === 'local' || ref.fileId || /^(blob:|data:)/i.test(ref.url || '');
    if (!localish) return false;

    let blob = await blobFromUrl(ref.url);
    if (!blob) blob = await findBlobInIndexedDb([ref.fileId, ref.id]);
    if (!blob) {
      ref.storageStatus = 'missing-local-file';
      return false;
    }
    const uploaded = await uploadBlob(blob, {
      id: ref.id || ref.fileId || Math.random().toString(36).slice(2),
      kind: 'concept-video',
      name: ref.name || 'concept-video',
      conceptId: concept?.id || null,
      metadata: { originalKind: ref.kind || null }
    });
    ref.originalKind = ref.kind || 'local';
    ref.kind = 'storage';
    ref.storagePath = uploaded.path;
    ref.publicUrl = uploaded.url;
    ref.url = uploaded.url;
    ref.type = ref.type || uploaded.mimeType;
    ref.size = ref.size || uploaded.size;
    ref.storageStatus = 'ready';
    return true;
  }

  async function migrateMedia(state) {
    let changed = false;
    let uploaded = 0;
    let missing = 0;

    for (const p of state.products || []) {
      for (const asset of p.assets || []) {
        try {
          if (await migrateAsset(asset, p.id)) { changed = true; uploaded++; }
          else if (asset.storageStatus === 'missing-local-file') missing++;
        } catch (err) {
          asset.storageStatus = 'upload-error';
          asset.storageError = String(err?.message || err);
          console.warn('CreativeOS asset upload failed', asset.name, err);
        }
      }
    }

    for (const concept of state.concepts || []) {
      for (const ref of concept.videoRefs || []) {
        try {
          if (await migrateConceptRef(ref, concept)) { changed = true; uploaded++; }
          else if (ref.storageStatus === 'missing-local-file') missing++;
        } catch (err) {
          ref.storageStatus = 'upload-error';
          ref.storageError = String(err?.message || err);
          console.warn('CreativeOS concept video upload failed', ref.name, err);
        }
      }
    }

    window.dispatchEvent(new CustomEvent('creativeos-media-status', {
      detail: { changed, uploaded, missing }
    }));
    return { changed, uploaded, missing };
  }

  function mediaRefsFor(state) {
    const c = state.context || {};
    const products = state.products || [];
    const concepts = state.concepts || [];
    const videos = state.videos || [];
    const p = products.find(x => x.id === c.productId) || null;
    const concept = concepts.find(x => x.id === c.conceptId) || null;
    const selectedIds = new Set(c.assetIds || []);
    const refs = [];

    for (const prod of products) {
      for (const a of prod.assets || []) {
        if (!selectedIds.has(a.id)) continue;
        const url = a.publicUrl || (isDurableUrl(a.url) ? a.url : null) || (isDurableUrl(a.src) ? a.src : null);
        if (!url) continue;
        refs.push({
          role: 'asset',
          id: a.id,
          name: a.name || 'Asset',
          category: a.type || a.category || null,
          productId: prod.id,
          url,
          storagePath: a.storagePath || null,
          mimeType: a.mimeType || null,
          sizeBytes: a.sizeBytes || null
        });
      }
    }

    for (const r of concept?.videoRefs || []) {
      const url = r.publicUrl || (isDurableUrl(r.url) ? r.url : null);
      if (!url) continue;
      refs.push({
        role: 'concept_video',
        id: r.id,
        name: r.name || 'Vídeo de concepto',
        conceptId: concept.id,
        url,
        storagePath: r.storagePath || null,
        mimeType: r.type || r.mimeType || 'video/mp4',
        sizeBytes: r.size || r.sizeBytes || null
      });
    }

    const video = videos.find(x => x.id === c.videoId) || null;
    if (video) {
      const url = video.publicUrl || video.resultUrl || video.url || video.src;
      if (isDurableUrl(url)) refs.push({
        role: 'selected_video',
        id: video.id,
        name: video.title || video.name || 'Vídeo seleccionado',
        productId: video.productId || p?.id || null,
        url,
        storagePath: video.storagePath || null,
        mimeType: video.mimeType || 'video/mp4'
      });
    }

    return refs;
  }

  async function pushState(raw, force = false) {
    if (syncing || !raw || (!force && raw === lastPushed)) return;
    let state;
    try { state = JSON.parse(raw); } catch { return; }
    syncing = true;
    try {
      const mediaResult = await migrateMedia(state);
      if (mediaResult.changed) {
        raw = JSON.stringify(state);
        originalSetItem(STORAGE_KEY, raw);
      }

      await rest('creativeos_state?on_conflict=id', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{ id: 'default', payload: state }])
      });

      const c = state.context || {};
      const mediaRefs = mediaRefsFor(state);
      await rest('creativeos_context?on_conflict=id', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{
          id: 'default',
          product_id: c.productId || null,
          concept_id: c.conceptId || null,
          video_id: c.videoId || null,
          avatar_id: c.avatarId || null,
          asset_ids: c.assetIds || [],
          mode: c.mode || null,
          instruction: c.instruction || null,
          locks: c.locks || {},
          media_refs: mediaRefs,
          payload: { ...c, mediaRefs }
        }])
      });
      lastPushed = raw;
      window.dispatchEvent(new CustomEvent('creativeos-cloud-status', {
        detail: { ok: true, mediaRefs: mediaRefs.length, uploaded: mediaResult.uploaded, missing: mediaResult.missing }
      }));
    } catch (err) {
      console.warn('CreativeOS cloud sync failed', err);
      window.dispatchEvent(new CustomEvent('creativeos-cloud-status', { detail: { ok: false, error: String(err) } }));
    } finally {
      syncing = false;
    }
  }

  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key, value) {
    originalSetItem(key, value);
    if (key === STORAGE_KEY) setTimeout(() => pushState(value), 0);
  };

  async function pullRemoteJobs() {
    if (reloadLock) return;
    try {
      const rows = await rest('creativeos_jobs?select=*&order=created_at.desc&limit=100');
      if (!Array.isArray(rows) || !rows.length) return;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw);
      const remoteJobs = rows.map(r => ({
        ...(r.payload || {}),
        id: r.id,
        productId: r.product_id,
        conceptId: r.concept_id,
        avatarId: r.avatar_id,
        status: r.status,
        model: r.model,
        mode: r.mode,
        title: r.title,
        version: r.version,
        progress: r.progress,
        higgsfieldJobId: r.higgsfield_job_id,
        resultUrl: r.result_url,
        note: r.note,
        feedback: r.feedback,
        createdAt: r.created_at
      }));
      const localSig = JSON.stringify((state.jobs || []).map(j => [j.id,j.status,j.progress,j.higgsfieldJobId,j.resultUrl]));
      const remoteSig = JSON.stringify(remoteJobs.map(j => [j.id,j.status,j.progress,j.higgsfieldJobId,j.resultUrl]));
      if (remoteSig !== localSig) {
        state.jobs = remoteJobs;
        reloadLock = true;
        originalSetItem(STORAGE_KEY, JSON.stringify(state));
        setTimeout(() => location.reload(), 120);
      }
    } catch (err) {
      console.warn('CreativeOS cloud job pull failed', err);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) pushState(raw, true);
    pollTimer = setInterval(pullRemoteJobs, 5000);
    pullRemoteJobs();
  });

  window.CreativeOSCloud = {
    syncNow: () => pushState(localStorage.getItem(STORAGE_KEY), true),
    migrateMediaNow: () => pushState(localStorage.getItem(STORAGE_KEY), true),
    getMediaRefs: () => {
      try { return mediaRefsFor(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); }
      catch { return []; }
    },
    pullJobs: pullRemoteJobs,
    projectId: 'naiglzmqpgucfbwfbvxt',
    mediaBucket: MEDIA_BUCKET
  };
})();