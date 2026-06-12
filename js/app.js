const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const storage = window.HIFZ_STORAGE || {
  getItem(){ return null; },
  setItem(){},
  removeItem(){},
  keys(){ return []; }
};

const state = {
  quran: null,
  currentSurah: null,
  recorder: null,
  chunks: [],
  recordingBlob: null,
  recordingUrl: null,
  recordingMimeType: 'audio/webm',
  prayerTimer: null,
  lastAudio: null,
  captchas: { login: null, register: null }
};

const STORAGE_KEYS = {
  auth: 'hifz_auth_v2',
  progress: 'hifz_progress_v3',
  reviews: 'hifz_reviews_v3',
  submissions: 'hifz_submissions_v3',
  difficult: 'hifz_difficult_v3',
  activeTarget: 'hifz_active_target_v1',
  prayerCache: 'hifz_prayer_cache_v3',
  display: 'hifz_display_settings_v1',
  theme: 'hifz_theme_v1',
  localUsers: 'hifz_local_users_v1',
  guruReviews: 'hifz_guru_reviews_v1'
};

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

// Ubah pola "angka)" menjadi superscript, misalnya "lurus.3)" → "lurus.<sup>3</sup>"
const formatFootnoteRefs = (escaped = '') =>
  escaped.replace(/(\d+)\)/g, '<sup class="fn-ref">$1</sup>');

function toast(message){
  const el = $('#toast');
  if(!el) return;
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}
function readJson(key, fallback){
  try { return JSON.parse(storage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeJson(key, value){ storage.setItem(key, JSON.stringify(value)); }
function applyTheme(theme = storage.getItem(STORAGE_KEYS.theme) || 'dark'){
  const normalized = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = normalized;
  storage.setItem(STORAGE_KEYS.theme, normalized);
  const moonEl = $('#iconMoon');
  const sunEl  = $('#iconSun');
  const btn    = $('#themeToggle');
  if(moonEl) moonEl.style.display = normalized === 'light' ? 'none'  : '';
  if(sunEl)  sunEl.style.display  = normalized === 'light' ? ''      : 'none';
  if(btn)    btn.title             = normalized === 'light' ? 'Beralih ke tema gelap' : 'Beralih ke tema terang';
  if(btn)    btn.setAttribute('aria-label', normalized === 'light' ? 'Beralih ke tema gelap' : 'Beralih ke tema terang');
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if(metaTheme) metaTheme.setAttribute('content', normalized === 'light' ? '#dfeaff' : '#1A3A6B');
}
function toggleTheme(){
  applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
}
function submissionStatusLabel(status = ''){
  switch(String(status).toLowerCase()){
    case 'submitted/r2': return 'Tersimpan di R2';
    case 'submitted/local': return 'Tersimpan';
    case 'submitted': return 'Terkirim';
    default: return status || 'Tersimpan';
  }
}
function today(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function nextDate(days){
  const d = new Date(); d.setDate(d.getDate()+days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function ayahKey(surahId, ayahNumber){ return `${surahId}:${ayahNumber}`; }
function getAuth(){ return readJson(STORAGE_KEYS.auth, null); }
function setAuth(auth){ auth ? writeJson(STORAGE_KEYS.auth, auth) : storage.removeItem(STORAGE_KEYS.auth); }
function isLoggedIn(){ return Boolean(getAuth()?.token && getAuth()?.user); }
function currentUser(){ return getAuth()?.user || null; }
function currentRole(){ return currentUser()?.role || 'guest'; }
function isSantriRole(){ return ['santri', 'admin'].includes(currentRole()); }
function canAccessView(view){
  const role = currentRole();
  if(['home', 'login', 'register'].includes(view)) return true;
  if(role === 'guest') return false;
  if(['profile'].includes(view)) return ['santri', 'guru', 'admin'].includes(role);
  if(['hafalan', 'murajaah', 'setoran', 'dashboard', 'generate-review'].includes(view)) return ['santri', 'admin'].includes(role);
  if(view === 'guru') return ['guru', 'admin'].includes(role);
  return false;
}
function userScopedKey(base){ return `${base}:${currentUser()?.id || 'guest'}`; }
function getActiveTarget(){ return readJson(userScopedKey(STORAGE_KEYS.activeTarget), null); }
function getSelectedRange(){
  return { surahId: Number($('#surahSelect').value), start: Number($('#startAyah').value), end: Number($('#endAyah').value) };
}
function saveActiveTarget(range = getSelectedRange()){
  if(!state.quran?.surahs?.length || !range?.surahId || !range?.start || !range?.end) return;
  const surah = state.quran.surahs.find(s => s.id === Number(range.surahId));
  if(!surah) return;
  const start = Math.min(Number(range.start), Number(range.end));
  const end = Math.max(Number(range.start), Number(range.end));
  writeJson(userScopedKey(STORAGE_KEYS.activeTarget), {
    surah_id: surah.id,
    surah: surah.name_latin,
    start_ayah: start,
    end_ayah: end,
    total_ayah: (end - start) + 1
  });
}
function getTargetProgressSummary(){
  const progress = readJson(userScopedKey(STORAGE_KEYS.progress), {});
  const target = getActiveTarget();
  if(!target?.surah_id || !target?.start_ayah || !target?.end_ayah) return { target:null, memorized:0, total:0, pct:0 };
  const start = Math.min(Number(target.start_ayah), Number(target.end_ayah));
  const end = Math.max(Number(target.start_ayah), Number(target.end_ayah));
  const total = Number(target.total_ayah) || ((end - start) + 1);
  const memorized = Object.values(progress).filter(v =>
    v.status === 'memorized' &&
    Number(v.surah_id) === Number(target.surah_id) &&
    Number(v.ayah_number) >= start &&
    Number(v.ayah_number) <= end
  ).length;
  return { target, memorized, total, pct: total ? Math.min(100, Math.round((memorized / total) * 100)) : 0 };
}

async function apiFetch(path, options={}){
  const base = (window.HIFZ_CONFIG.apiBase || '').replace(/\/$/, '');
  if(!base) throw new Error('API Worker belum dikonfigurasi.');
  const auth = getAuth();
  const headers = {
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    ...(options.headers || {})
  };
  if(!(options.body instanceof FormData) && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if(!res.ok) throw new Error(data.error || text || 'Request gagal.');
  return data;
}

function normalizeQuran(raw){
  const source = raw?.metadata?.title || window.HIFZ_CONFIG.quranSourceLabel || 'Data Qur\'an';
  const surahs = (raw?.surahs || []).map(s => ({
    id: Number(s.id),
    name_ar: s.name_ar || s.arabic_harakat || s.arabic || '',
    name_ar_plain: s.name_ar_plain || s.arabic || s.name_ar || '',
    name_latin: s.name_latin || s.latin || s.transliteration || `Surah ${s.id}`,
    transliteration: s.transliteration || s.name_latin || s.latin || '',
    translation: s.translation || '',
    total_ayah: Number(s.total_ayah || s.num_ayah || s.ayahs?.length || 0),
    page: s.page || null,
    revelation_type: s.revelation_type || s.location || '',
    ayahs: (s.ayahs || []).map(a => ({
      id: a.id || `${s.id}:${a.number || a.ayah || a.ayah_number}`,
      global_id: a.global_id || a.global_ayah_id || null,
      surah_id: Number(a.surah_id || s.id),
      number: Number(a.number || a.ayah || a.ayah_number),
      ayah_number: Number(a.number || a.ayah || a.ayah_number),
      page: a.page || null,
      juz: a.juz || null,
      text_ar: a.text_ar || a.arabic || a.kitabah || '',
      kitabah: a.kitabah || a.text_ar || a.arabic || '',
      translation_id: a.translation_id || a.translation || '',
      footnotes: a.footnotes || '',
      audio_url: a.audio_url || buildEveryAyahUrl(Number(a.surah_id || s.id), Number(a.number || a.ayah || a.ayah_number))
    })).sort((a,b)=>a.number-b.number)
  })).sort((a,b)=>a.id-b.id);
  return {metadata:{...(raw.metadata || {}), title: source}, surahs};
}
function buildEveryAyahUrl(surahId, ayahNumber){
  if(!surahId || !ayahNumber) return '';
  return `https://everyayah.com/data/Alafasy_128kbps/${String(surahId).padStart(3,'0')}${String(ayahNumber).padStart(3,'0')}.mp3`;
}

async function loadQuran(){
  const path = window.HIFZ_CONFIG.quranDataPath || 'data/quran-kemenag-combined.json';
  const res = await fetch(path, {cache:'no-store'});
  if(!res.ok) throw new Error(`Data Qur'an tidak dapat dimuat dari ${path}.`);
  const raw = await res.json();
  state.quran = normalizeQuran(raw);
  populateSurahSelect();
  applyDisplaySettings();
  renderReader();
  updateDashboard();
}
function populateSurahSelect(){
  const select = $('#surahSelect');
  select.innerHTML = state.quran.surahs.map(s => `<option value="${s.id}">${s.id}. ${escapeHtml(s.name_latin)} — ${escapeHtml(s.name_ar_plain || s.name_ar)}</option>`).join('');
  state.currentSurah = state.quran.surahs[0];
  populateAyahSelects();
}
function populateAyahSelects(){
  const surahId = Number($('#surahSelect').value || state.quran.surahs[0].id);
  state.currentSurah = state.quran.surahs.find(s => s.id === surahId) || state.quran.surahs[0];
  const options = state.currentSurah.ayahs.map(a => `<option value="${a.number}">${a.number}</option>`).join('');
  $('#startAyah').innerHTML = options;
  $('#endAyah').innerHTML = options;
  $('#endAyah').value = state.currentSurah.ayahs.at(-1)?.number || 1;
  saveActiveTarget();
}
function getAyahsInRange(){
  const {start,end} = getSelectedRange();
  const min = Math.min(start,end), max = Math.max(start,end);
  return (state.currentSurah?.ayahs || []).filter(a => a.number >= min && a.number <= max);
}
function renderReader(){
  if(!state.currentSurah) return;
  const mode = $('#hideMode').value;
  const progress = readJson(userScopedKey(STORAGE_KEYS.progress), {});
  const difficult = readJson(userScopedKey(STORAGE_KEYS.difficult), {});
  const display = readJson(STORAGE_KEYS.display, { showTranslation: true });
  const ayahs = getAyahsInRange();
  const meta = `${state.currentSurah.revelation_type || '-'} · ${state.currentSurah.total_ayah} ayat${state.currentSurah.translation ? ` · ${state.currentSurah.translation}` : ''}`;
  $('#readerCard').innerHTML = `<div class="surah-title">
      <div><span class="badge">${escapeHtml(window.HIFZ_CONFIG.quranSourceLabel || 'Al-Qur’an Kemenag RI')}</span><h3>${state.currentSurah.id}. ${escapeHtml(state.currentSurah.name_latin)}</h3><p>${escapeHtml(meta)}</p></div>
      <div class="arabic surah-name">${escapeHtml(state.currentSurah.name_ar)}</div>
    </div>` + ayahs.map(a => {
    const key = ayahKey(state.currentSurah.id, a.number);
    const isMemorized = progress[key]?.status === 'memorized';
    const isDifficult = difficult[key];
    let arabic = escapeHtml(a.text_ar);
    let translation = display.showTranslation ? escapeHtml(a.translation_id || '') : '';
    const footnotes = String(a.footnotes || '').trim();
    if(mode === 'arabicHidden') arabic = '<div class="hidden-placeholder">Teks Arab disembunyikan</div>';
    if(mode === 'translationHidden') translation = '';
    if(mode === 'firstWords') arabic = `<span>${escapeHtml(a.text_ar.split(/\s+/).slice(0, 3).join(' '))} ...</span>`;
    if(mode === 'blank') { arabic = '<div class="hidden-placeholder">Tes hafalan: baca tanpa melihat teks</div>'; translation = ''; }
    return `<article class="ayah-card">
      <div class="ayah-top">
        <span class="badge">${escapeHtml(state.currentSurah.name_latin)} · ayat ${a.number}${a.juz ? ` · juz ${a.juz}` : ''}</span>
        <div class="status-badges">
          <span class="badge status-badge ${isMemorized ? 'status-hafal' : 'status-belum'}">${isMemorized ? '✅ Hafal' : '○ Belum'}</span>
          ${isDifficult ? '<span class="badge status-badge status-sulit">⚠ Sulit</span>' : ''}
        </div>
      </div>
      <div class="arabic">${arabic}</div>
      ${translation ? `<p class="translation">${formatFootnoteRefs(translation)}</p>` : ''}
      ${footnotes ? `<details class="footnote"><summary>Catatan Kemenag</summary><p>${formatFootnoteRefs(escapeHtml(footnotes))}</p></details>` : ''}
    </article>`;
  }).join('');
}

async function playSequence(){
  const repeat = Number($('#repeatCount').value);
  const ayahs = getAyahsInRange();
  if(!ayahs.some(a => a.audio_url)){ toast('URL audio belum tersedia untuk rentang ayat ini.'); return; }
  toast(`Memutar rentang ${ayahs.length} ayat sebanyak ${repeat} kali.`);
  $('#playSequence').disabled = true;
  try{
    for(let i=0;i<repeat;i++){
      for(const ayah of ayahs){
        if(!ayah.audio_url) continue;
        await playAudio(ayah.audio_url);
        await new Promise(r=>setTimeout(r, 550));
      }
    }
  }catch(e){ toast(`Audio gagal diputar: ${e.message || 'cek koneksi'}`); }
  finally{ $('#playSequence').disabled = false; }
}
function playAudio(url){
  return new Promise((resolve, reject) => {
    if(state.lastAudio){ state.lastAudio.pause(); state.lastAudio = null; }
    const audio = new Audio(url);
    state.lastAudio = audio;
    audio.onended = resolve;
    audio.onerror = () => reject(new Error('sumber audio tidak dapat diakses'));
    audio.play().catch(reject);
  });
}
function requireLogin(message = 'Silakan masuk terlebih dahulu agar progres tersimpan.'){ 
  if(isLoggedIn()) return true;
  toast(message);
  switchView('login');
  return false;
}
function requireSantri(message = 'Menu ini khusus santri. Silakan gunakan akun santri atau ubah role dari admin.'){
  if(!requireLogin()) return false;
  if(isSantriRole()) return true;
  toast(message);
  switchView('home');
  return false;
}
async function markMemorized(){
  if(!requireSantri()) return;
  const progress = readJson(userScopedKey(STORAGE_KEYS.progress), {});
  const reviews = readJson(userScopedKey(STORAGE_KEYS.reviews), []);
  const selected = getAyahsInRange();
  for(const a of selected){
    const key = ayahKey(state.currentSurah.id, a.number);
    progress[key] = {surah_id: state.currentSurah.id, surah: state.currentSurah.name_latin, ayah_number: a.number, status:'memorized', memorized_at: new Date().toISOString(), strength_score: 60};
    reviews.push({id: crypto.randomUUID(), key, surah:state.currentSurah.name_latin, surah_id:state.currentSurah.id, ayah_number:a.number, due_date: nextDate(1), status:'pending', priority:2});
  }
  writeJson(userScopedKey(STORAGE_KEYS.progress), progress);
  writeJson(userScopedKey(STORAGE_KEYS.reviews), dedupeReviews(reviews));
  saveActiveTarget();
  renderReader(); renderReviews(); updateDashboard(); updateHome();
  if(window.HIFZ_CONFIG.apiBase){
    Promise.allSettled(selected.map(a => apiFetch('/api/progress', {
      method:'POST', body:JSON.stringify({surah_id:state.currentSurah.id, ayah_number:a.number, status:'memorized', strength_score:60})
    }))).catch(console.warn);
  }
  toast('Alhamdulillah, hafalan ditandai dan masuk jadwal murajaah.');
}
function markDifficult(){
  if(!requireSantri()) return;
  const difficult = readJson(userScopedKey(STORAGE_KEYS.difficult), {});
  for(const a of getAyahsInRange()) difficult[ayahKey(state.currentSurah.id, a.number)] = {surah:state.currentSurah.name_latin, surah_id:state.currentSurah.id, ayah_number:a.number, created_at:new Date().toISOString()};
  writeJson(userScopedKey(STORAGE_KEYS.difficult), difficult);
  renderReader(); updateDashboard(); updateHome();
  toast('Ayat masuk daftar sulit dan diprioritaskan untuk murajaah.');
}
function dedupeReviews(items){
  const seen = new Map();
  for(const item of items) seen.set(`${item.key}:${item.due_date}:${item.status}`, item);
  return [...seen.values()];
}
function emptyState(title, body, buttonLabel, jump){
  return `<article class="info-card empty-state"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p>${buttonLabel ? `<button class="btn secondary" data-jump="${jump}">${escapeHtml(buttonLabel)}</button>` : ''}</article>`;
}
function renderReviewsLegacy(){
  if(!isLoggedIn()){
    $('#reviewList').innerHTML = emptyState('Silakan masuk untuk melihat murajaah.', 'Jadwal murajaah bersifat personal dan akan mengikuti hafalan yang sudah Anda tandai.', 'Masuk', 'login');
    return;
  }
  const list = readJson(userScopedKey(STORAGE_KEYS.reviews), []).sort((a,b)=>a.priority-b.priority || a.due_date.localeCompare(b.due_date));
  const progress = readJson(userScopedKey(STORAGE_KEYS.progress), {});
  const due = list.filter(r => r.status === 'pending' && r.due_date <= today());
  if(due.length){
    $('#reviewList').innerHTML = due.map(r => `<article class="review-item">
      <div><strong>${escapeHtml(r.surah)} ayat ${r.ayah_number}</strong><p>Jatuh tempo: ${escapeHtml(r.due_date)} · Prioritas ${r.priority}</p></div>
      <div class="action-row"><button class="btn ghost" data-open-review="${r.key}">Tampilkan ayat</button><button class="btn secondary" data-review="lancar" data-id="${r.id}">Tandai lancar</button><button class="btn warning" data-review="ulang" data-id="${r.id}">Perlu ulang</button></div>
    </article>`).join('');
    return;
  }
  if(Object.values(progress).some(v=>v.status==='memorized')){
    $('#reviewList').innerHTML = emptyState('Belum ada murajaah jatuh tempo hari ini.', 'Anda sudah memiliki hafalan. Buat jadwal murajaah dari hafalan yang tersimpan.', 'Buat Jadwal dari Hafalan', 'generate-review');
  } else {
    $('#reviewList').innerHTML = emptyState('Belum ada hafalan untuk dimurajaah.', 'Tandai ayat sebagai hafal terlebih dahulu agar sistem dapat membuat jadwal murajaah.', 'Mulai Hafalan', 'hafalan');
  }
}
function handleReviewResult(id, result){
  const reviews = readJson(userScopedKey(STORAGE_KEYS.reviews), []);
  const idx = reviews.findIndex(r => r.id === id);
  if(idx < 0) return;
  const current = reviews[idx];
  reviews[idx] = {...current, status:'done', result, reviewed_at:new Date().toISOString()};
  const nextDays = result === 'ulang' ? 1 : 7;
  const priority = result === 'ulang' ? 1 : 3;
  reviews.push({...current, id:crypto.randomUUID(), due_date:nextDate(nextDays), status:'pending', priority});
  writeJson(userScopedKey(STORAGE_KEYS.reviews), dedupeReviews(reviews));
  renderReviews(); updateDashboard(); updateHome(); toast('Hasil murajaah tersimpan.');
  if(window.HIFZ_CONFIG.apiBase) apiFetch('/api/reviews/result', {method:'POST', body:JSON.stringify({id, result})}).catch(console.warn);
}
function openReviewAyah(key){
  const [surahId, ayahNumber] = key.split(':').map(Number);
  $('#surahSelect').value = String(surahId);
  populateAyahSelects();
  $('#startAyah').value = String(ayahNumber);
  $('#endAyah').value = String(ayahNumber);
  renderReader();
  switchView('hafalan');
}

function generateReview(){
  if(!requireSantri('Jadwal murajaah hanya tersedia untuk akun santri.')) return;
  const progress = readJson(userScopedKey(STORAGE_KEYS.progress), {});
  const difficult = readJson(userScopedKey(STORAGE_KEYS.difficult), {});
  const memorized = Object.entries(progress).filter(([, v]) => v.status === 'memorized');
  if(!memorized.length){
    $('#reviewList').innerHTML = emptyState('Belum ada hafalan untuk dijadwalkan.', 'Tandai dulu ayat sebagai sudah hafal di menu Hafalan. Setelah itu, jadwal murajaah bisa disusun otomatis.', 'Mulai Hafalan', 'hafalan');
    toast('Belum ada hafalan yang dapat dijadikan jadwal murajaah.');
    return;
  }
  const reviews = memorized.map(([key, v]) => ({
    id: crypto.randomUUID(), key, surah: v.surah, surah_id: v.surah_id, ayah_number: v.ayah_number, due_date: today(), status: 'pending', priority: difficult[key] ? 1 : 3
  }));
  writeJson(userScopedKey(STORAGE_KEYS.reviews), dedupeReviews([...readJson(userScopedKey(STORAGE_KEYS.reviews), []), ...reviews]));
  renderReviews(); updateDashboard(); updateHome(); toast('Jadwal murajaah berhasil dibuat dari hafalan Anda.');
  if(window.HIFZ_CONFIG.apiBase) apiFetch('/api/reviews/generate', { method: 'POST' }).catch(console.warn);
}

function renderReviews(){
  if(!isLoggedIn()){
    $('#reviewList').innerHTML = emptyState('Silakan masuk untuk melihat murajaah.', 'Jadwal murajaah bersifat personal dan dibuat dari ayat yang sudah Anda tandai hafal.', 'Masuk', 'login');
    return;
  }
  const list = readJson(userScopedKey(STORAGE_KEYS.reviews), []).sort((a, b) => a.priority - b.priority || a.due_date.localeCompare(b.due_date));
  const progress = readJson(userScopedKey(STORAGE_KEYS.progress), {});
  const due = list.filter(r => r.status === 'pending' && r.due_date <= today());
  if(due.length){
    $('#reviewList').innerHTML = due.map(r => `<article class="review-item">
      <div><strong>${escapeHtml(r.surah)} ayat ${r.ayah_number}</strong><p>Jatuh tempo: ${escapeHtml(r.due_date)} · Prioritas ${r.priority}</p><p class="form-help">Buka ayat, baca murajaah, lalu pilih hasilnya.</p></div>
      <div class="action-row"><button class="btn ghost" data-open-review="${r.key}">Buka ayat</button><button class="btn secondary" data-review="lancar" data-id="${r.id}">Lancar</button><button class="btn warning" data-review="ulang" data-id="${r.id}">Perlu ulang</button></div>
    </article>`).join('');
    return;
  }
  if(Object.values(progress).some(v => v.status === 'memorized')){
    $('#reviewList').innerHTML = emptyState('Belum ada jadwal murajaah hari ini.', 'Hafalan Anda sudah tersimpan. Tekan tombol susun jadwal agar sistem menyiapkan daftar murajaah untuk hari ini.', 'Susun Jadwal Murajaah', 'generate-review');
  } else {
    $('#reviewList').innerHTML = emptyState('Belum ada hafalan untuk dijadwalkan.', 'Tandai ayat sebagai hafal terlebih dahulu, lalu kembali ke sini untuk menyusun murajaah.', 'Mulai Hafalan', 'hafalan');
  }
}

async function setupRecorder(){
  if(!navigator.mediaDevices?.getUserMedia) throw new Error('Browser tidak mendukung rekaman audio.');
  const stream = await navigator.mediaDevices.getUserMedia({audio:true});
  state.recorder = new MediaRecorder(stream);
  state.chunks = [];
  state.recorder.ondataavailable = e => state.chunks.push(e.data);
  state.recorder.onstop = () => {
    const blob = new Blob(state.chunks, {type:state.recorder.mimeType || 'audio/webm'});
    if(state.recordingUrl) URL.revokeObjectURL(state.recordingUrl);
    state.recordingBlob = blob;
    state.recordingMimeType = blob.type || 'audio/webm';
    state.recordingUrl = URL.createObjectURL(blob);
    $('#recordPreview').src = state.recordingUrl;
    $('#recordPreview').hidden = false;
  };
}
async function startRecording(){
  if(!requireLogin('Silakan masuk untuk mengirim setoran hafalan.')) return;
  if(state.recordingUrl) URL.revokeObjectURL(state.recordingUrl);
  state.recordingBlob = null;
  state.recordingUrl = null;
  $('#recordPreview').hidden = true;
  $('#recordPreview').removeAttribute('src');
  await setupRecorder();
  state.recorder.start();
  $('#startRecord').disabled = true; $('#stopRecord').disabled = false;
  toast('Rekaman dimulai.');
}
function stopRecording(){
  state.recorder?.stop();
  $('#startRecord').disabled = false; $('#stopRecord').disabled = true;
  toast('Rekaman dihentikan.');
}
async function saveSubmission(){
  if(!requireSantri('Setoran hafalan hanya tersedia untuk akun santri.')) return;
  if(!state.recordingBlob || !state.recordingUrl) throw new Error('Rekam setoran terlebih dahulu sebelum disimpan.');
  const {surahId, start, end} = getSelectedRange();
  const submissions = readJson(userScopedKey(STORAGE_KEYS.submissions), []);
  const item = {
    id: crypto.randomUUID(),
    teacher: $('#teacherName').value || 'Guru',
    note: $('#submissionNote').value || `${state.currentSurah.name_latin} ${start}-${end}`,
    audio_url: state.recordingUrl,
    status: 'Tersimpan',
    surah_id: surahId,
    start_ayah: start,
    end_ayah: end,
    created_at: new Date().toISOString()
  };
  if(window.HIFZ_CONFIG.apiBase){
    const form = new FormData();
    form.append('teacher_id', item.teacher);
    form.append('surah_id', String(surahId));
    form.append('start_ayah', String(start));
    form.append('end_ayah', String(end));
    form.append('note', item.note);
    form.append('audio', state.recordingBlob, `setoran-${Date.now()}.webm`);
    const saved = await apiFetch('/api/submissions', { method:'POST', body:form });
    item.id = saved.id || item.id;
    item.audio_url = saved.audio_url || item.audio_url;
    item.status = saved.status || 'submitted/r2';
  }
  submissions.unshift(item);
  writeJson(userScopedKey(STORAGE_KEYS.submissions), submissions);
  $('#teacherName').value = '';
  $('#submissionNote').value = '';
  renderSubmissions(); updateDashboard(); updateHome(); toast('Setoran berhasil disimpan.');
}
function renderSubmissionsLegacy(){
  if(!isLoggedIn()){ $('#submissionList').innerHTML = ''; return; }
  const data = readJson(userScopedKey(STORAGE_KEYS.submissions), []);
  $('#submissionList').innerHTML = data.length ? data.map(s => `<article class="review-item"><div><strong>${escapeHtml(s.note)}</strong><p>Guru: ${escapeHtml(s.teacher)} · Status: ${escapeHtml(submissionStatusLabel(s.status))}</p></div>${s.audio_url ? `<audio controls src="${s.audio_url}"></audio>` : ''}</article>`).join('') : emptyState('Belum ada setoran.', 'Rekam bacaan lalu simpan setoran untuk membuat riwayat.', null, null);
}

async function updatePrayer(){
  const cfg = window.HIFZ_CONFIG.defaultPrayer;
  $('#activeLocation').textContent = cfg.locationName;
  $('#modalLocationName').textContent = cfg.locationName;
  const cache = readJson(STORAGE_KEYS.prayerCache, {});
  const cacheKey = `${cfg.latitude},${cfg.longitude},${today()}`;
  let times = cache[cacheKey];
  if(!times){
    try{
      if(window.HIFZ_CONFIG.apiBase){
        const data = await apiFetch(`/api/prayer/today?lat=${cfg.latitude}&lng=${cfg.longitude}&location=${encodeURIComponent(cfg.locationName)}&timezone=${encodeURIComponent(cfg.timezone || 'Asia/Jakarta')}`);
        times = data.times;
      } else times = localPrayerFallback();
      cache[cacheKey] = times; writeJson(STORAGE_KEYS.prayerCache, cache);
    } catch(e) { console.warn(e); times = localPrayerFallback(); }
  }
  startPrayerCountdown(times);
}
function localPrayerFallback(){ return {fajr:'04:38', sunrise:'05:55', dhuhr:'11:54', asr:'15:15', maghrib:'17:47', isha:'19:00'}; }
function startPrayerCountdown(times){
  const labels = [['Subuh', times.fajr], ['Dzuhur', times.dhuhr], ['Ashar', times.asr], ['Maghrib', times.maghrib], ['Isya', times.isha]].filter(([,t]) => t);
  clearInterval(state.prayerTimer);
  const tick = () => {
    const now = new Date();
    const todayDate = today();
    let next = labels.map(([name,time]) => ({name,time,date:new Date(`${todayDate}T${time}:00`)})).find(x => x.date > now);
    if(!next){
      const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate()+1);
      const iso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
      next = {name:labels[0][0], time:labels[0][1], date:new Date(`${iso}T${labels[0][1]}:00`)};
    }
    const diff = Math.max(0, next.date - now);
    $('#nextPrayerName').textContent = next.name;
    $('#nextPrayerTime').textContent = next.time;
    $('#prayerCountdown').textContent = `${String(Math.floor(diff/3600000)).padStart(2,'0')}:${String(Math.floor(diff%3600000/60000)).padStart(2,'0')}:${String(Math.floor(diff%60000/1000)).padStart(2,'0')}`;
  };
  tick(); state.prayerTimer = setInterval(tick, 1000);
}
function openLocationModal(){ $('#locationModal').hidden = false; $('#gpsStatus').textContent = ''; }
function closeLocationModal(){ $('#locationModal').hidden = true; }
function setPrayerLocation(name, latitude, longitude, options = {}){
  const persist = options.persist ?? true;
  if(persist){
    storage.setItem('hifz_location_name', name);
    storage.setItem('hifz_latitude', latitude);
    storage.setItem('hifz_longitude', longitude);
    storage.setItem('hifz_timezone', 'Asia/Jakarta');
  }
  window.HIFZ_CONFIG.defaultPrayer = {locationName:name, latitude:Number(latitude), longitude:Number(longitude), timezone:'Asia/Jakarta'};
  storage.removeItem(STORAGE_KEYS.prayerCache);
  updatePrayer();
}
function detectGps(){
  const status = $('#gpsStatus');
  if(!navigator.geolocation){ status.textContent = 'Browser tidak mendukung GPS. Aplikasi tetap memakai lokasi default.'; return; }
  status.textContent = 'Meminta izin lokasi...';
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = Number(pos.coords.latitude.toFixed(4));
    const lng = Number(pos.coords.longitude.toFixed(4));
    setPrayerLocation('Lokasi GPS aktif', lat, lng, {persist:false});
    status.textContent = `Lokasi berhasil diperbarui: ${lat}, ${lng}`;
    toast('Lokasi jadwal shalat berhasil diperbarui.');
  }, err => {
    status.textContent = `Lokasi tidak dapat dideteksi: ${err.message}. Aplikasi tetap memakai lokasi sebelumnya.`;
  }, {enableHighAccuracy:true, timeout:10000, maximumAge:600000});
}

function localCaptcha(){
  const a = Math.floor(Math.random()*9)+1;
  const b = Math.floor(Math.random()*9)+1;
  const answer = a + b;
  return {id:`local-${crypto.randomUUID()}`, question:`Berapa hasil ${a} + ${b}?`, answer:String(answer), local:true};
}
async function loadCaptcha(type){
  try{
    const data = await apiFetch('/api/captcha');
    state.captchas[type] = {id:data.captchaId, question:data.question, local:false};
  }catch{
    state.captchas[type] = localCaptcha();
  }
  $(`#${type}CaptchaQuestion`).textContent = state.captchas[type].question;
  $(`#${type}CaptchaAnswer`).value = '';
}
function validateLocalCaptcha(type){
  const cap = state.captchas[type];
  if(cap?.local && String($(`#${type}CaptchaAnswer`).value).trim() !== String(cap.answer)) throw new Error('Jawaban captcha belum benar.');
}
async function localRegister({name,email,password}){
  validateLocalCaptcha('register');
  const users = readJson(STORAGE_KEYS.localUsers, []);
  if(users.some(u => u.email.toLowerCase() === email.toLowerCase())) throw new Error('Email sudah terdaftar di perangkat ini.');
  const user = {id:crypto.randomUUID(), name, email:email.toLowerCase(), role:'santri', created_at:new Date().toISOString()};
  users.push({...user, password}); writeJson(STORAGE_KEYS.localUsers, users);
  return {token:`local-${crypto.randomUUID()}`, user};
}
async function localLogin({email,password}){
  validateLocalCaptcha('login');
  const user = readJson(STORAGE_KEYS.localUsers, []).find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if(!user) throw new Error('Email atau password tidak sesuai.');
  const {password:_, ...safeUser} = user;
  return {token:`local-${crypto.randomUUID()}`, user:safeUser};
}
async function handleRegister(e){
  e.preventDefault();
  const name = $('#registerName').value.trim();
  const email = $('#registerEmail').value.trim();
  const password = $('#registerPassword').value;
  const confirm = $('#registerPasswordConfirm').value;
  if(password !== confirm){ toast('Konfirmasi password belum sama.'); return; }
  try{
    const cap = state.captchas.register;
    const payload = {name,email,password,captchaId:cap.id,captchaAnswer:$('#registerCaptchaAnswer').value.trim()};
    const data = cap.local ? await localRegister({name,email,password}) : await apiFetch('/api/auth/register', {method:'POST', body:JSON.stringify(payload)});
    setAuth({token:data.token, user:data.user});
    updateAuthUi();
    toast('Akun berhasil dibuat. Mari mulai menentukan hafalan pertama.');
    switchView('hafalan');
  }catch(err){ toast(err.message); loadCaptcha('register'); }
}
async function handleLogin(e){
  e.preventDefault();
  const email = $('#loginEmail').value.trim();
  const password = $('#loginPassword').value;
  try{
    const cap = state.captchas.login;
    const payload = {email,password,captchaId:cap.id,captchaAnswer:$('#loginCaptchaAnswer').value.trim()};
    const data = cap.local ? await localLogin({email,password}) : await apiFetch('/api/auth/login', {method:'POST', body:JSON.stringify(payload)});
    setAuth({token:data.token, user:data.user});
    updateAuthUi();
    toast(`Selamat datang, ${data.user.name}.`);
    switchView('home');
  }catch(err){ toast(err.message); loadCaptcha('login'); }
}
async function logout(){
  if(window.HIFZ_CONFIG.apiBase && getAuth()?.token) apiFetch('/api/auth/logout', {method:'POST'}).catch(()=>{});
  setAuth(null);
  updateAuthUi();
  switchView('home');
  toast('Anda sudah keluar.');
}

function updateDashboardLegacy(){
  const progress = readJson(userScopedKey(STORAGE_KEYS.progress), {});
  const difficult = readJson(userScopedKey(STORAGE_KEYS.difficult), {});
  const reviews = readJson(userScopedKey(STORAGE_KEYS.reviews), []);
  const submissions = readJson(userScopedKey(STORAGE_KEYS.submissions), []);
  const totalAyahs = state.quran?.surahs.reduce((sum,s)=>sum+s.ayahs.length,0) || 6236;
  const memorized = Object.values(progress).filter(v => v.status === 'memorized').length;
  const pct = Math.min(100, Math.round(memorized / totalAyahs * 100));
  document.documentElement.style.setProperty('--pct', `${pct}%`);
  $('#heroProgress').textContent = `${pct}%`; $('#memorizedCount').textContent = memorized;
  $('#statAyah').textContent = memorized; $('#statDifficult').textContent = Object.keys(difficult).length;
  $('#statReviews').textContent = reviews.filter(r=>r.status==='pending').length; $('#statSubmissions').textContent = submissions.length;
  const difficultHtml = Object.values(difficult).length ? Object.values(difficult).slice(0,30).map(d=>`<span class="badge">${escapeHtml(d.surah)} ${d.ayah_number}</span>`).join(' ') : '<p>Belum ada ayat sulit.</p>';
  $('#dashboardDetail').innerHTML = `<h3>Ayat lemah/sulit</h3>${difficultHtml}`;
}
function updateHomeLegacy(){
  const user = currentUser();
  const reviews = readJson(userScopedKey(STORAGE_KEYS.reviews), []).filter(r=>r.status==='pending' && r.due_date <= today()).length;
  if(user){
    $('#homeTitle').textContent = `Assalamu’alaikum, ${user.name}`;
    $('#homeDescription').textContent = reviews ? `Hari ini ada ${reviews} ayat untuk dimurajaah. Semoga Allah mudahkan, lanjutkan ziyadah atau tuntaskan murajaah dengan tertib.` : 'Belum ada murajaah jatuh tempo hari ini. Gunakan waktu ini untuk menambah ziyadah atau menyusun jadwal murajaah dari hafalan yang sudah ada.';
    $('#homeActions').innerHTML = `<button class="btn primary" data-jump="hafalan">Lanjut Ziyadah</button><button class="btn secondary" data-jump="murajaah">Murajaah Hari Ini</button><button class="btn ghost" data-jump="dashboard">Lihat Progres</button>`;
    $('#homeSmallNote').textContent = 'Semoga Allah menjaga hafalan yang sedang Anda ikhtiarkan.';
  } else {
    $('#homeTitle').textContent = 'Yuk, lebih dekat dengan Al-Qur\'an';
    $('#homeDescription').textContent = 'Mulailah menghafal sedikit demi sedikit dengan niat yang lurus. Masuk atau daftar agar catatan hafalan, murajaah, dan setoran tersimpan rapi sebagai ikhtiar untuk istiqamah.';
    $('#homeActions').innerHTML = `<button class="btn primary" data-jump="hafalan">Mulai Menghafal</button><button class="btn secondary" data-jump="register">Daftar Akun</button>`;
    $('#homeSmallNote').textContent = 'Masuk untuk menyimpan jejak hafalan dan murajaah secara pribadi.';
  }
  bindJumpButtons();
  updateDashboard();
}
function updateDashboardV1(){
  const progress = readJson(userScopedKey(STORAGE_KEYS.progress), {});
  const difficult = readJson(userScopedKey(STORAGE_KEYS.difficult), {});
  const reviews = readJson(userScopedKey(STORAGE_KEYS.reviews), []);
  const submissions = readJson(userScopedKey(STORAGE_KEYS.submissions), []);
  const totalMemorized = Object.values(progress).filter(v => v.status === 'memorized').length;
  const targetSummary = getTargetProgressSummary();
  const memorized = targetSummary.total ? targetSummary.memorized : totalMemorized;
  const pct = targetSummary.total ? targetSummary.pct : 0;
  document.documentElement.style.setProperty('--pct', `${pct}%`);
  $('#heroProgress').textContent = `${pct}%`;
  $('#memorizedCount').textContent = memorized;
  $('#statAyah').textContent = totalMemorized;
  $('#statDifficult').textContent = Object.keys(difficult).length;
  $('#statReviews').textContent = reviews.filter(r=>r.status==='pending').length;
  $('#statSubmissions').textContent = submissions.length;
  const difficultHtml = Object.values(difficult).length ? Object.values(difficult).slice(0,30).map(d=>`<span class="badge">${escapeHtml(d.surah)} ${d.ayah_number}</span>`).join(' ') : '<p>Belum ada ayat sulit.</p>';
  $('#dashboardDetail').innerHTML = `<h3>Ayat lemah/sulit</h3>${difficultHtml}`;
}
function updateHomeV1(){
  const user = currentUser();
  const reviews = readJson(userScopedKey(STORAGE_KEYS.reviews), []).filter(r=>r.status==='pending' && r.due_date <= today()).length;
  const targetSummary = getTargetProgressSummary();
  if(user){
    $('#homeTitle').textContent = `Assalamuâ€™alaikum, ${user.name}`;
    if(targetSummary.target?.total){
      $('#homeDescription').textContent = reviews
        ? `Target aktif ${targetSummary.target.surah} ayat ${targetSummary.target.start_ayah}-${targetSummary.target.end_ayah}: ${targetSummary.memorized} dari ${targetSummary.total} ayat sudah ditandai hafal. Hari ini ada ${reviews} ayat untuk dimurajaah.`
        : `Target aktif ${targetSummary.target.surah} ayat ${targetSummary.target.start_ayah}-${targetSummary.target.end_ayah}: ${targetSummary.memorized} dari ${targetSummary.total} ayat sudah ditandai hafal. Lanjutkan ziyadah hingga target ini tuntas.`;
      $('#homeSmallNote').textContent = `Progress dihitung dari target aktif ${targetSummary.target.surah} ayat ${targetSummary.target.start_ayah}-${targetSummary.target.end_ayah}.`;
    } else {
      $('#homeDescription').textContent = reviews ? `Hari ini ada ${reviews} ayat untuk dimurajaah. Semoga Allah mudahkan, lanjutkan ziyadah atau tuntaskan murajaah dengan tertib.` : 'Tentukan rentang hafalan aktif Anda di menu Hafalan, lalu lanjutkan hafalan sedikit demi sedikit dengan istiqamah.';
      $('#homeSmallNote').textContent = 'Pilih rentang ayat pada menu Hafalan untuk menjadikannya target aktif.';
    }
    $('#homeActions').innerHTML = `<button class="btn primary" data-jump="hafalan">Lanjut Ziyadah</button><button class="btn secondary" data-jump="murajaah">Murajaah Hari Ini</button><button class="btn ghost" data-jump="dashboard">Lihat Progres</button>`;
  } else {
    $('#homeTitle').textContent = 'Yuk, lebih dekat dengan Al-Qur\'an';
    $('#homeDescription').textContent = 'Mulailah dengan menetapkan target hafalan aktif, lalu jaga istiqamah ayat demi ayat. Masuk atau daftar agar progres target, murajaah, dan setoran tersimpan rapi.';
    $('#homeActions').innerHTML = `<button class="btn primary" data-jump="hafalan">Mulai Menghafal</button><button class="btn secondary" data-jump="register">Daftar Akun</button>`;
    $('#homeSmallNote').textContent = 'Progress pada beranda dihitung dari target hafalan aktif yang Anda pilih.';
  }
  bindJumpButtons();
  updateDashboard();
}
function updateProfileV1(){
  const user = currentUser();
  if(!user) return;
  $('#profileCard').innerHTML = `<h3>${escapeHtml(user.name)}</h3><p>${escapeHtml(user.email || '-')}</p><span class="badge">Role: ${escapeHtml(user.role || 'santri')}</span>`;
}
function renderSubmissions(){
  if(!isLoggedIn()){
    $('#submissionList').innerHTML = '';
    return;
  }
  const data = readJson(userScopedKey(STORAGE_KEYS.submissions), []);
  $('#submissionList').innerHTML = data.length
    ? data.map(s => `<article class="review-item"><div><strong>${escapeHtml(s.note)}</strong><p>Guru: ${escapeHtml(s.teacher)} - Status: ${escapeHtml(submissionStatusLabel(s.status))}</p></div>${s.audio_url ? `<audio controls src="${s.audio_url}"></audio>` : ''}</article>`).join('')
    : emptyState('Belum ada setoran.', 'Pilih target di menu Hafalan, rekam bacaan, lalu simpan setoran agar riwayat dan audio bisa diputar kembali.', null, null);
}

/* ============================================================
   PANEL GURU — Fungsi-fungsi khusus guru
   ============================================================ */

/** Ambil semua setoran dari semua user di localStorage */
function getAllSubmissions(){
  const guruReviews = readJson(STORAGE_KEYS.guruReviews, {});
  const localUsers  = readJson(STORAGE_KEYS.localUsers, []);
  const allSubs = [];

  // Kumpulkan semua key submissions dari storage
  const keys = typeof storage.keys === 'function' ? storage.keys() : [];
  const subPrefix = STORAGE_KEYS.submissions + ':';
  const subKeys = keys.filter(k => k.startsWith(subPrefix));

  for(const key of subKeys){
    const userId = key.slice(subPrefix.length);
    const userObj = localUsers.find(u => u.id === userId);
    const userName = userObj ? userObj.name : `Santri (${userId.slice(0,6)})`;
    const subs = readJson(key, []);
    for(const sub of subs){
      const grade = guruReviews[sub.id] || null;
      allSubs.push({ ...sub, _userId: userId, _userName: userName, _grade: grade });
    }
  }

  // Urutkan: terbaru dulu
  return allSubs.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
}

/** Chip status untuk kartu setoran */
function statusChipHtml(grade){
  if(!grade) return '<span class="status-chip pending">⏳ Belum dinilai</span>';
  const map = {
    disetujui:   '<span class="status-chip disetujui">✅ Disetujui</span>',
    'perlu-ulang': '<span class="status-chip perlu-ulang">🔄 Perlu Ulang</span>',
    ditolak:     '<span class="status-chip ditolak">❌ Ditolak</span>'
  };
  return map[grade.status] || '<span class="status-chip pending">⏳ Belum dinilai</span>';
}

/** Render panel guru */
function renderGuruPanel(filter = 'all'){
  if(!isLoggedIn() || !['guru','admin'].includes(currentRole())) return;

  const all = getAllSubmissions();

  // Update stats
  const pending = all.filter(s => !s._grade);
  const graded  = all.filter(s =>  s._grade);
  if($('#statGuruTotal'))   $('#statGuruTotal').textContent   = all.length;
  if($('#statGuruPending')) $('#statGuruPending').textContent = pending.length;
  if($('#statGuruDone'))    $('#statGuruDone').textContent    = graded.length;

  // Filter
  const list = filter === 'pending' ? pending
             : filter === 'graded'  ? graded
             : all;

  const container = $('#guruSubmissionList');
  if(!container) return;

  if(!all.length){
    container.innerHTML = `<article class="info-card empty-state">
      <h3>Belum ada setoran masuk</h3>
      <p>Setoran dari santri akan muncul di sini setelah mereka menyimpan rekaman hafalan.</p>
    </article>`;
    return;
  }
  if(!list.length){
    container.innerHTML = `<article class="info-card empty-state">
      <h3>Tidak ada setoran pada filter ini</h3>
      <p>Coba pilih filter lain di atas.</p>
    </article>`;
    return;
  }

  container.innerHTML = list.map(sub => {
    const dateStr = sub.created_at ? new Date(sub.created_at).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'}) : '-';
    const grade = sub._grade;
    const gradePanel = grade ? `
      <div class="grade-panel">
        <div class="grade-row">
          <div class="grade-score-badge ${grade.nilai < 60 ? 'low' : grade.nilai < 80 ? 'mid' : ''}">${grade.nilai ?? '-'}</div>
          <div>
            <strong>${statusChipHtml(grade)} &nbsp; Nilai: ${grade.nilai ?? '-'}/100</strong>
            ${grade.catatan ? `<span style="display:block;margin-top:6px">${escapeHtml(grade.catatan)}</span>` : ''}
            <span style="font-size:.85rem;opacity:.7">Dinilai: ${grade.graded_at ? new Date(grade.graded_at).toLocaleString('id-ID',{dateStyle:'short',timeStyle:'short'}) : '-'}</span>
          </div>
        </div>
      </div>` : '';

    return `<article class="submission-card">
      <div class="submission-card-header">
        <div class="submission-card-meta">
          <strong>👤 ${escapeHtml(sub._userName)}</strong>
          <span>📖 ${escapeHtml(sub.note || '-')}</span>
          <span>🕐 ${dateStr} &nbsp;·&nbsp; Guru: ${escapeHtml(sub.teacher || '-')}</span>
        </div>
        <div>
          ${statusChipHtml(grade)}
        </div>
      </div>
      ${sub.audio_url ? `<audio controls src="${sub.audio_url}" style="max-width:100%;width:100%"></audio>` : '<p class="form-help">Audio tidak tersedia (disimpan sementara).</p>'}
      ${gradePanel}
      <div class="submission-card-actions">
        <button class="btn primary" style="min-height:44px;padding:11px 20px" data-grade-id="${escapeHtml(sub.id)}">
          ${grade ? '✏️ Edit Penilaian' : '📝 Beri Penilaian'}
        </button>
      </div>
    </article>`;
  }).join('');
}

/** Buka modal penilaian */
function openGradeModal(submissionId){
  const all = getAllSubmissions();
  const sub = all.find(s => s.id === submissionId);
  if(!sub){ toast('Setoran tidak ditemukan.'); return; }

  $('#gradeSubmissionId').value = submissionId;
  $('#gradeInfo').innerHTML = `
    <strong>👤 ${escapeHtml(sub._userName)}</strong>
    <span>${escapeHtml(sub.note || '-')} &nbsp;·&nbsp; ${sub.created_at ? new Date(sub.created_at).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'}) : ''}</span>
  `;

  const existing = sub._grade;
  $('#gradeScore').value   = existing?.nilai   ?? '';
  $('#gradeStatus').value  = existing?.status  ?? 'disetujui';
  $('#gradeCatatan').value = existing?.catatan ?? '';

  $('#gradeModal').hidden = false;
}

/** Tutup modal penilaian */
function closeGradeModal(){
  $('#gradeModal').hidden = true;
}

/** Simpan penilaian guru */
function saveGrade(){
  const submissionId = $('#gradeSubmissionId').value;
  const nilai  = Number($('#gradeScore').value);
  const status = $('#gradeStatus').value;
  const catatan = $('#gradeCatatan').value.trim();

  if(!submissionId){ toast('ID setoran tidak valid.'); return; }
  if(isNaN(nilai) || nilai < 0 || nilai > 100){ toast('Nilai harus antara 0 dan 100.'); return; }

  const guruReviews = readJson(STORAGE_KEYS.guruReviews, {});
  guruReviews[submissionId] = { nilai, status, catatan, graded_at: new Date().toISOString(), graded_by: currentUser()?.id };
  writeJson(STORAGE_KEYS.guruReviews, guruReviews);

  closeGradeModal();
  const activeFilter = $('.filter-tab.active')?.dataset?.filter || 'all';
  renderGuruPanel(activeFilter);
  toast('Penilaian berhasil disimpan.');
}
function updateDashboard(){
  const progress = readJson(userScopedKey(STORAGE_KEYS.progress), {});
  const difficult = readJson(userScopedKey(STORAGE_KEYS.difficult), {});
  const reviews = readJson(userScopedKey(STORAGE_KEYS.reviews), []);
  const submissions = readJson(userScopedKey(STORAGE_KEYS.submissions), []);
  const totalMemorized = Object.values(progress).filter(v => v.status === 'memorized').length;
  const targetSummary = getTargetProgressSummary();
  const memorized = targetSummary.total ? targetSummary.memorized : totalMemorized;
  const pct = targetSummary.total ? targetSummary.pct : 0;
  document.documentElement.style.setProperty('--pct', `${pct}%`);
  $('#heroProgress').textContent = `${pct}%`;
  $('#memorizedCount').textContent = memorized;
  $('#statAyah').textContent = totalMemorized;
  $('#statDifficult').textContent = Object.keys(difficult).length;
  $('#statReviews').textContent = reviews.filter(r => r.status === 'pending').length;
  $('#statSubmissions').textContent = submissions.length;
  const targetInfo = targetSummary.target?.total
    ? `<p class="form-help">Target aktif: <strong>${escapeHtml(targetSummary.target.surah)} ayat ${targetSummary.target.start_ayah}-${targetSummary.target.end_ayah}</strong>. Progress target: <strong>${targetSummary.memorized}/${targetSummary.total}</strong> ayat (${targetSummary.pct}%).</p>`
    : '<p class="form-help">Belum ada target aktif. Buka menu Hafalan untuk memilih surah dan rentang ayat yang ingin difokuskan.</p>';
  const difficultHtml = Object.values(difficult).length
    ? Object.values(difficult).slice(0, 30).map(d => `<span class="badge">${escapeHtml(d.surah)} ${d.ayah_number}</span>`).join(' ')
    : '<p>Belum ada ayat sulit.</p>';
  $('#dashboardDetail').innerHTML = `<h3>Fokus hafalan saat ini</h3>${targetInfo}<h3>Ayat yang perlu perhatian</h3>${difficultHtml}`;
}
function updateHome(){
  const user = currentUser();
  const reviews = readJson(userScopedKey(STORAGE_KEYS.reviews), []).filter(r => r.status === 'pending' && r.due_date <= today()).length;
  const targetSummary = getTargetProgressSummary();
  if(user){
    if(currentRole() === 'guru'){
      const guruReviews = readJson(STORAGE_KEYS.guruReviews, {});
      const allSubs     = getAllSubmissions();
      const ungraded    = allSubs.filter(s => !guruReviews[s.id]).length;
      $('#homeTitle').textContent = `Assalamu'alaikum, Ustadz/Ustadzah ${user.name}`;
      $('#homeDescription').textContent = ungraded
        ? `Ada ${ungraded} setoran santri yang belum dinilai. Segera buka Panel Guru untuk memberikan penilaian dan catatan.`
        : allSubs.length
          ? `Semua ${allSubs.length} setoran santri sudah dinilai. Pantau terus perkembangan hafalan santri Anda.`
          : 'Belum ada setoran santri yang masuk. Setoran akan muncul di Panel Guru setelah santri merekam hafalan.';
      $('#homeActions').innerHTML = `<button class="btn primary" data-jump="guru">Buka Panel Guru</button><button class="btn ghost" data-jump="profile">Profil</button>`;
      $('#homeSmallNote').textContent = `Total setoran masuk: ${allSubs.length} · Belum dinilai: ${ungraded}`;
      bindJumpButtons();
      return;
    }
    $('#homeTitle').textContent = `Assalamu'alaikum, ${user.name}`;
    if(targetSummary.target?.total){
      $('#homeDescription').textContent = reviews
        ? `Target aktif ${targetSummary.target.surah} ayat ${targetSummary.target.start_ayah}-${targetSummary.target.end_ayah}: ${targetSummary.memorized} dari ${targetSummary.total} ayat sudah ditandai hafal. Hari ini ada ${reviews} ayat untuk dimurajaah.`
        : `Target aktif ${targetSummary.target.surah} ayat ${targetSummary.target.start_ayah}-${targetSummary.target.end_ayah}: ${targetSummary.memorized} dari ${targetSummary.total} ayat sudah ditandai hafal. Lanjutkan ziyadah hingga target ini tuntas.`;
      $('#homeSmallNote').textContent = `Progress dihitung dari target aktif ${targetSummary.target.surah} ayat ${targetSummary.target.start_ayah}-${targetSummary.target.end_ayah}.`;
      $('#homeActions').innerHTML = `<button class="btn primary" data-jump="hafalan">Lanjut Target Aktif</button><button class="btn secondary" data-jump="${reviews ? 'murajaah' : 'generate-review'}">${reviews ? 'Murajaah Hari Ini' : 'Susun Murajaah'}</button><button class="btn ghost" data-jump="dashboard">Lihat Progres</button>`;
    } else {
      $('#homeDescription').textContent = reviews
        ? `Hari ini ada ${reviews} ayat untuk dimurajaah. Sebelum menambah hafalan baru, tentukan dulu target aktif Anda di menu Hafalan agar progresnya terukur.`
        : 'Langkah berikutnya: buka menu Hafalan, pilih surah dan rentang ayat, lalu jadikan rentang itu sebagai target aktif hafalan Anda.';
      $('#homeSmallNote').textContent = 'Target aktif membantu aplikasi menghitung progres dan menyusun alur belajar dengan lebih jelas.';
      $('#homeActions').innerHTML = `<button class="btn primary" data-jump="hafalan">Pilih Target Hafalan</button><button class="btn ghost" data-jump="dashboard">Lihat Progres</button>`;
    }
  } else {
    $('#homeTitle').textContent = 'Yuk, lebih dekat dengan Al-Qur\'an';
    $('#homeDescription').textContent = 'Mulailah dengan menetapkan target hafalan aktif, lalu lanjutkan ayat demi ayat. Masuk atau daftar agar progres target, murajaah, dan setoran tersimpan rapi.';
    $('#homeActions').innerHTML = `<button class="btn primary" data-jump="hafalan">Mulai Menghafal</button><button class="btn secondary" data-jump="register">Daftar Akun</button>`;
    $('#homeSmallNote').textContent = 'Urutan penggunaan aplikasi: pilih target, tandai hafal, susun murajaah, lalu rekam setoran.';
  }
  bindJumpButtons();
  updateDashboard();
}
function updateProfile(){
  const user = currentUser();
  if(!user) return;
  $('#profileCard').innerHTML = `<h3>${escapeHtml(user.name)}</h3><p>${escapeHtml(user.email || '-')}</p><span class="badge">Role: ${escapeHtml(user.role || 'santri')}</span><p class="form-help">Gunakan menu ini untuk menyesuaikan tampilan bacaan dan mereset data aplikasi bila diperlukan.</p>`;
}
function updateAuthUi(){
  const logged = isLoggedIn();
  const role = currentRole();
  $$('[data-user-only]').forEach(el => el.hidden = !logged);
  $$('[data-guest-only]').forEach(el => el.hidden = logged);
  $$('[data-role]').forEach(el => {
    const allowed = String(el.dataset.role || '').split(',').map(x => x.trim()).filter(Boolean);
    if(!allowed.length) return;
    el.hidden = !logged || !allowed.includes(role);
  });
  if(logged){
    $$('[data-view="login"], [data-view="register"]').forEach(el => { el.hidden = true; });
  }
  updateHome(); renderReviews(); renderSubmissions(); updateDashboard(); updateProfile();
  // Jika guru langsung masuk ke panel guru
  if(logged && role === 'guru') renderGuruPanel('all');
}
function switchView(view){
  if(['dashboard','setoran','profile','hafalan','murajaah'].includes(view) && !requireLogin('Silakan masuk terlebih dahulu untuk membuka halaman ini.')) return;
  if(view === 'guru' && !requireLogin('Silakan masuk untuk mengakses Panel Guru.')) return;
  if(!canAccessView(view)){
    toast(currentRole() === 'guru' ? 'Role guru tidak memiliki akses ke menu ini.' : 'Anda tidak memiliki akses ke menu ini.');
    view = isLoggedIn() ? 'home' : 'login';
  }
  if(view === 'generate-review'){
    switchView('murajaah');
    generateReview();
    return;
  }
  $$('.view').forEach(v => v.classList.remove('active'));
  const target = $(`#view-${view}`);
  if(!target) return;
  target.classList.add('active');
  $$('.nav-pill').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  if(view === 'murajaah') renderReviews();
  if(view === 'dashboard') updateDashboard();
  if(view === 'profile') updateProfile();
  if(view === 'guru'){
    const activeFilter = $('.filter-tab.active')?.dataset?.filter || 'all';
    renderGuruPanel(activeFilter);
  }
  window.scrollTo({top:0, behavior:'smooth'});
}
function bindJumpButtons(){ $$('[data-jump]').forEach(b => { b.onclick = () => switchView(b.dataset.jump); }); }
function applyDisplaySettings(){
  const display = readJson(STORAGE_KEYS.display, {arabicFontSize:42, showTranslation:true});
  document.documentElement.style.setProperty('--arabic-size', `${display.arabicFontSize || 42}px`);
  if($('#arabicFontSize')) $('#arabicFontSize').value = display.arabicFontSize || 42;
  if($('#showTranslation')) $('#showTranslation').checked = display.showTranslation !== false;
}
function saveDisplaySettings(){
  const data = {arabicFontSize:Number($('#arabicFontSize').value), showTranslation:$('#showTranslation').checked};
  writeJson(STORAGE_KEYS.display, data);
  applyDisplaySettings(); renderReader(); toast('Pengaturan tampilan disimpan.');
}
async function resetLocalData(){
  const message = isLoggedIn()
    ? 'Hapus data hafalan, murajaah, setoran, dan ayat sulit pada perangkat ini serta di server? Audio setoran di R2 juga akan dihapus.'
    : 'Hapus data hafalan, murajaah, setoran, dan ayat sulit pada perangkat ini?';
  if(!confirm(message)) return;
  if(isLoggedIn() && window.HIFZ_CONFIG.apiBase){
    await apiFetch('/api/account/reset-data', { method:'POST', body:JSON.stringify({ confirm:true }) });
  }
  const preserve = new Set([STORAGE_KEYS.auth, STORAGE_KEYS.display, STORAGE_KEYS.localUsers]);
  const prefixes = [STORAGE_KEYS.progress, STORAGE_KEYS.reviews, STORAGE_KEYS.submissions, STORAGE_KEYS.difficult, STORAGE_KEYS.prayerCache];
  const keys = typeof storage.keys === 'function' ? storage.keys() : [];
  keys.forEach(k => {
    if(!preserve.has(k) && prefixes.some(prefix => k === prefix || k.startsWith(`${prefix}:`))) storage.removeItem(k);
  });
  updateDashboard(); renderReviews(); renderSubmissions(); renderReader(); updateHome(); toast(isLoggedIn() ? 'Data aplikasi di perangkat dan server berhasil direset.' : 'Data aplikasi pada perangkat berhasil direset.');
}
function bindEvents(){
  $$('.nav-pill[data-view]').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
  bindJumpButtons();
  $('#logoutBtn').addEventListener('click', logout);
  $('#surahSelect').addEventListener('change', () => { populateAyahSelects(); saveActiveTarget(); renderReader(); updateHome(); });
  ['startAyah','endAyah'].forEach(id => $(`#${id}`).addEventListener('change', () => { saveActiveTarget(); renderReader(); updateHome(); }));
  $('#hideMode').addEventListener('change', renderReader);
  $('#playSequence').addEventListener('click', playSequence);
  $('#markMemorized').addEventListener('click', () => markMemorized().catch(e=>toast(e.message)));
  $('#markDifficult').addEventListener('click', markDifficult);
  $('#generateReview').addEventListener('click', generateReview);
  $('#reviewList').addEventListener('click', e => {
    if(e.target.dataset.review) handleReviewResult(e.target.dataset.id, e.target.dataset.review);
    if(e.target.dataset.openReview) openReviewAyah(e.target.dataset.openReview);
    if(e.target.dataset.jump === 'generate-review'){
      generateReview();
      return;
    }
    if(e.target.dataset.jump) switchView(e.target.dataset.jump);
  });
  $('#startRecord').addEventListener('click', () => startRecording().catch(e=>toast(e.message)));
  $('#stopRecord').addEventListener('click', stopRecording);
  $('#saveSubmission').addEventListener('click', () => saveSubmission().catch(e=>toast(e.message)));
  $('#reloadQuran').addEventListener('click', () => loadQuran().then(()=>toast('Konten dimuat ulang.')).catch(e=>toast(e.message)));
  $('#locationButton').addEventListener('click', openLocationModal);
  $('#themeToggle').addEventListener('click', toggleTheme);
  $('#closeLocationModal').addEventListener('click', closeLocationModal);
  $('#locationModal').addEventListener('click', e => { if(e.target.id === 'locationModal') closeLocationModal(); });
  $('#detectGps').addEventListener('click', detectGps);
  $('#useDefaultLocation').addEventListener('click', () => { setPrayerLocation('Bekasi', -6.2383, 106.9756); toast('Lokasi default Bekasi digunakan.'); });
  $('#loginForm').addEventListener('submit', handleLogin);
  $('#registerForm').addEventListener('submit', handleRegister);
  $('#refreshLoginCaptcha').addEventListener('click', () => loadCaptcha('login'));
  $('#refreshRegisterCaptcha').addEventListener('click', () => loadCaptcha('register'));
  $('#saveDisplaySettings').addEventListener('click', saveDisplaySettings);
  $('#resetLocalData').addEventListener('click', () => resetLocalData().catch(e=>toast(e.message)));

  // ── Panel Guru ──────────────────────────────────────────────
  // Filter tabs
  $('#guruFilterTabs').addEventListener('click', e => {
    const tab = e.target.closest('.filter-tab');
    if(!tab) return;
    $$('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderGuruPanel(tab.dataset.filter || 'all');
  });

  // Tombol beri penilaian pada kartu setoran
  $('#guruSubmissionList').addEventListener('click', e => {
    const btn = e.target.closest('[data-grade-id]');
    if(btn) openGradeModal(btn.dataset.gradeId);
  });

  // Modal penilaian
  $('#saveGradeBtn').addEventListener('click', saveGrade);
  $('#cancelGradeBtn').addEventListener('click', closeGradeModal);
  $('#closeGradeModal').addEventListener('click', closeGradeModal);
  $('#gradeModal').addEventListener('click', e => { if(e.target.id === 'gradeModal') closeGradeModal(); });
}
async function init(){
  applyTheme();
  bindEvents();
  await loadQuran();
  applyDisplaySettings();
  await Promise.all([loadCaptcha('login'), loadCaptcha('register')]);
  updateAuthUi();
  updatePrayer();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
}
init().catch(err => { console.error(err); toast(err.message); });

