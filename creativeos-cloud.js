(() => {
  const SUPABASE_URL = 'https://naiglzmqpgucfbwfbvxt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_h883eAMdoF8IYcPunFFCVQ_SCB42SMf';
  const STORAGE_KEY = 'creativeos_local_v3';
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

  async function pushState(raw) {
    if (syncing || !raw || raw === lastPushed) return;
    let state;
    try { state = JSON.parse(raw); } catch { return; }
    syncing = true;
    try {
      await rest('creativeos_state?on_conflict=id', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{ id: 'default', payload: state }])
      });
      const c = state.context || {};
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
          payload: c
        }])
      });
      lastPushed = raw;
      window.dispatchEvent(new CustomEvent('creativeos-cloud-status', { detail: { ok: true } }));
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
    if (raw) pushState(raw);
    pollTimer = setInterval(pullRemoteJobs, 5000);
    pullRemoteJobs();
  });

  window.CreativeOSCloud = {
    syncNow: () => pushState(localStorage.getItem(STORAGE_KEY)),
    pullJobs: pullRemoteJobs,
    projectId: 'naiglzmqpgucfbwfbvxt'
  };
})();