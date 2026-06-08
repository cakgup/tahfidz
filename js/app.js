const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  quran: null,
  currentSurah: null,
  recorder: null,
  chunks: [],
  recordingUrl: null,
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
  prayerCache: 'hifz_prayer_cache_v3',
  display: 'hifz_display_settings_v1',
  localUsers: 'hifz_local_users_v1'
};

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

function toast(message){
  const el = $('#toast');
  if(!el) return;
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}
function readJson(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeJson(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
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
function setAuth(auth){ auth ? writeJson(STORAGE_KEYS.auth, auth) : localStorage.removeItem(STORAGE_KEYS.auth); }
function isLoggedIn(){ return Boolean(getAuth()?.token && getAuth()?.user); }
function currentUser(){ return getAuth()?.user || null; }
function userScopedKey(base){ return `${base}:${currentUser()?.id || 'guest'}`; }
function getSelectedRange(){
  return { surahId: Number($('#surahSelect').value), start: Number($('#startAyah').value), end: Number($('#endAyah').value) };
}

async function apiFetch(path, options={}){
  const base = (window.HIFZ_CONFIG.apiBase || '').replace(/\/$/, '');
  if(!base) throw new Error('API Worker belum dikonfigurasi.');
  const auth = getAuth();
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type':'application/json',
      ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...(options.headers || {})
    }
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
        <span class="badge">${isMemorized ? '✅ Hafal' : '○ Belum'} ${isDifficult ? ' · ⚠ Sulit' : ''}</span>
      </div>
      <div class="arabic">${arabic}</div>
      ${translation ? `<p class="translation">${translation}</p>` : ''}
      ${footnotes ? `<details class="footnote"><summary>Catatan Kemenag</summary><p>${escapeHtml(footnotes)}</p></details>` : ''}
    </article>`;
  }).join('');
}

async function playSequence(){
  const repeat = Number($('#repeatCount').value);
  const ayahs = getAyahsInRange();
  if(!ayahs.some(a => a.audio_url)){ toast('URL audio belum tersedia untuk rentang ayat ini.'); return; }
  toast(`Memutar ${ayahs.length} ayat × ${repeat} pengulangan.`);
  $('#playSequence').disabled = true;
  try{
    for(const ayah of ayahs){
      if(!ayah.audio_url) continue;
      for(let i=0;i<repeat;i++){
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
async function markMemorized(){
  if(!requireLogin()) return;
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
  renderReader(); renderReviews(); updateDashboard(); updateHome();
  if(window.HIFZ_CONFIG.apiBase){
    Promise.allSettled(selected.map(a => apiFetch('/api/progress', {
      method:'POST', body:JSON.stringify({surah_id:state.currentSurah.id, ayah_number:a.number, status:'memorized', strength_score:60})
    }))).catch(console.warn);
  }
  toast('Alhamdulillah, hafalan ditandai dan masuk jadwal murajaah.');
}
function markDifficult(){
  if(!requireLogin()) return;
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
function generateReview(){
  if(!requireLogin('Silakan masuk untuk membuat jadwal murajaah.')) return;
  const progress = readJson(userScopedKey(STORAGE_KEYS.progress), {});
  const difficult = readJson(userScopedKey(STORAGE_KEYS.difficult), {});
  const memorized = Object.entries(progress).filter(([,v]) => v.status === 'memorized');
  if(!memorized.length){
    $('#reviewList').innerHTML = emptyState('Belum ada hafalan untuk dimurajaah.', 'Tandai ayat sebagai sudah hafal terlebih dahulu agar sistem dapat membuat jadwal murajaah.', 'Mulai Hafalan', 'hafalan');
    toast('Belum ada hafalan yang dapat dijadikan jadwal murajaah.');
    return;
  }
  const reviews = memorized.map(([key,v]) => ({
    id: crypto.randomUUID(), key, surah:v.surah, surah_id:v.surah_id, ayah_number:v.ayah_number, due_date: today(), status:'pending', priority:difficult[key] ? 1 : 3
  }));
  writeJson(userScopedKey(STORAGE_KEYS.reviews), dedupeReviews([...readJson(userScopedKey(STORAGE_KEYS.reviews), []), ...reviews]));
  renderReviews(); updateDashboard(); updateHome(); toast('Jadwal murajaah berhasil dibuat dari hafalan Anda.');
  if(window.HIFZ_CONFIG.apiBase) apiFetch('/api/reviews/generate', {method:'POST'}).catch(console.warn);
}
function emptyState(title, body, buttonLabel, jump){
  return `<article class="info-card empty-state"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p>${buttonLabel ? `<button class="btn secondary" data-jump="${jump}">${escapeHtml(buttonLabel)}</button>` : ''}</article>`;
}
function renderReviews(){
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

async function setupRecorder(){
  if(!navigator.mediaDevices?.getUserMedia) throw new Error('Browser tidak mendukung rekaman audio.');
  const stream = await navigator.mediaDevices.getUserMedia({audio:true});
  state.recorder = new MediaRecorder(stream);
  state.chunks = [];
  state.recorder.ondataavailable = e => state.chunks.push(e.data);
  state.recorder.onstop = () => {
    const blob = new Blob(state.chunks, {type:'audio/webm'});
    state.recordingUrl = URL.createObjectURL(blob);
    $('#recordPreview').src = state.recordingUrl;
    $('#recordPreview').hidden = false;
  };
}
async function startRecording(){
  if(!requireLogin('Silakan masuk untuk mengirim setoran hafalan.')) return;
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
function saveSubmission(){
  if(!requireLogin('Silakan masuk untuk menyimpan setoran hafalan.')) return;
  const {surahId, start, end} = getSelectedRange();
  const submissions = readJson(userScopedKey(STORAGE_KEYS.submissions), []);
  const item = {id:crypto.randomUUID(), teacher:$('#teacherName').value || 'Guru', note:$('#submissionNote').value || `${state.currentSurah.name_latin} ${start}-${end}`, audio_url:state.recordingUrl, status:'submitted/local', surah_id:surahId, start_ayah:start, end_ayah:end, created_at:new Date().toISOString()};
  submissions.unshift(item);
  writeJson(userScopedKey(STORAGE_KEYS.submissions), submissions);
  if(window.HIFZ_CONFIG.apiBase){
    apiFetch('/api/submissions', {method:'POST', body:JSON.stringify({teacher_id:item.teacher, surah_id:surahId, start_ayah:start, end_ayah:end, audio_url:item.audio_url, note:item.note})}).catch(console.warn);
  }
  renderSubmissions(); updateDashboard(); updateHome(); toast('Setoran berhasil disimpan.');
}
function renderSubmissions(){
  if(!isLoggedIn()){ $('#submissionList').innerHTML = ''; return; }
  const data = readJson(userScopedKey(STORAGE_KEYS.submissions), []);
  $('#submissionList').innerHTML = data.length ? data.map(s => `<article class="review-item"><div><strong>${escapeHtml(s.note)}</strong><p>Guru: ${escapeHtml(s.teacher)} · Status: ${escapeHtml(s.status)}</p></div>${s.audio_url ? `<audio controls src="${s.audio_url}"></audio>` : ''}</article>`).join('') : emptyState('Belum ada setoran.', 'Rekam bacaan lalu simpan setoran untuk membuat riwayat.', null, null);
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
function setPrayerLocation(name, latitude, longitude){
  localStorage.setItem('hifz_location_name', name);
  localStorage.setItem('hifz_latitude', latitude);
  localStorage.setItem('hifz_longitude', longitude);
  localStorage.setItem('hifz_timezone', 'Asia/Jakarta');
  window.HIFZ_CONFIG.defaultPrayer = {locationName:name, latitude:Number(latitude), longitude:Number(longitude), timezone:'Asia/Jakarta'};
  localStorage.removeItem(STORAGE_KEYS.prayerCache);
  updatePrayer();
}
function detectGps(){
  const status = $('#gpsStatus');
  if(!navigator.geolocation){ status.textContent = 'Browser tidak mendukung GPS. Aplikasi tetap memakai lokasi default.'; return; }
  status.textContent = 'Meminta izin lokasi...';
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = Number(pos.coords.latitude.toFixed(4));
    const lng = Number(pos.coords.longitude.toFixed(4));
    setPrayerLocation('Lokasi saat ini', lat, lng);
    status.textContent = `Lokasi berhasil diperbarui: ${lat}, ${lng}`;
    toast('Lokasi jadwal shalat berhasil diperbarui.');
  }, err => {
    status.textContent = `Lokasi tidak dapat dideteksi: ${err.message}. Aplikasi tetap memakai lokasi sebelumnya.`;
  }, {enableHighAccuracy:true, timeout:10000, maximumAge:600000});
}

function localCaptcha(){
  const a = Math.floor(Math.random()*8)+2;
  const b = Math.floor(Math.random()*8)+1;
  const ops = ['+', '-', '×'];
  const op = ops[Math.floor(Math.random()*ops.length)];
  let answer = op === '+' ? a+b : op === '-' ? a-b : a*b;
  return {id:`local-${crypto.randomUUID()}`, question:`Berapa hasil ${a} ${op} ${b}?`, answer:String(answer), local:true};
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

function updateDashboard(){
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
function updateHome(){
  const user = currentUser();
  const reviews = readJson(userScopedKey(STORAGE_KEYS.reviews), []).filter(r=>r.status==='pending' && r.due_date <= today()).length;
  if(user){
    $('#homeTitle').textContent = `Assalamu’alaikum, ${user.name}`;
    $('#homeDescription').textContent = reviews ? `Hari ini ada ${reviews} ayat untuk murajaah. Lanjutkan hafalan atau kerjakan murajaah hari ini.` : 'Belum ada murajaah jatuh tempo hari ini. Anda bisa lanjut menambah hafalan atau membuat jadwal murajaah dari hafalan.';
    $('#homeActions').innerHTML = `<button class="btn primary" data-jump="hafalan">Lanjutkan Hafalan</button><button class="btn secondary" data-jump="murajaah">Kerjakan Murajaah Hari Ini</button><button class="btn ghost" data-jump="dashboard">Lihat Progres</button>`;
    $('#homeSmallNote').textContent = 'Progres tersimpan untuk akun aktif.';
  } else {
    $('#homeTitle').textContent = 'Hafalan baru terarah, murajaah lama tetap terjaga.';
    $('#homeDescription').textContent = 'Mulai latihan hafalan ayat per ayat. Daftar atau masuk agar progres, jadwal murajaah, dan setoran tersimpan rapi.';
    $('#homeActions').innerHTML = `<button class="btn primary" data-jump="hafalan">Mulai Latihan Hafalan</button><button class="btn secondary" data-jump="register">Daftar untuk Simpan Progres</button>`;
    $('#homeSmallNote').textContent = 'Progres pribadi aktif setelah masuk.';
  }
  bindJumpButtons();
  updateDashboard();
}
function updateProfile(){
  const user = currentUser();
  if(!user) return;
  $('#profileCard').innerHTML = `<h3>${escapeHtml(user.name)}</h3><p>${escapeHtml(user.email || '-')}</p><span class="badge">Role: ${escapeHtml(user.role || 'santri')}</span>`;
}
function updateAuthUi(){
  const logged = isLoggedIn();
  $$('[data-user-only]').forEach(el => el.hidden = !logged);
  $$('[data-guest-only]').forEach(el => el.hidden = logged);
  updateHome(); renderReviews(); renderSubmissions(); updateDashboard(); updateProfile();
}
function switchView(view){
  if(['dashboard','setoran','profile'].includes(view) && !requireLogin('Silakan masuk terlebih dahulu untuk membuka halaman ini.')) return;
  if(view === 'generate-review'){ generateReview(); return; }
  $$('.view').forEach(v => v.classList.remove('active'));
  const target = $(`#view-${view}`);
  if(!target) return;
  target.classList.add('active');
  $$('.nav-pill').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  if(view === 'murajaah') renderReviews();
  if(view === 'dashboard') updateDashboard();
  if(view === 'profile') updateProfile();
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
function resetLocalData(){
  if(!confirm('Hapus data progres, murajaah, setoran, dan ayat sulit di perangkat ini?')) return;
  const preserve = new Set([STORAGE_KEYS.auth, STORAGE_KEYS.display, STORAGE_KEYS.localUsers]);
  const prefixes = [STORAGE_KEYS.progress, STORAGE_KEYS.reviews, STORAGE_KEYS.submissions, STORAGE_KEYS.difficult, STORAGE_KEYS.prayerCache];
  Object.keys(localStorage).forEach(k => {
    if(!preserve.has(k) && prefixes.some(prefix => k === prefix || k.startsWith(`${prefix}:`))) localStorage.removeItem(k);
  });
  updateDashboard(); renderReviews(); renderSubmissions(); renderReader(); updateHome(); toast('Data lokal sudah direset.');
}
function bindEvents(){
  $$('.nav-pill[data-view]').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
  bindJumpButtons();
  $('#logoutBtn').addEventListener('click', logout);
  $('#surahSelect').addEventListener('change', () => { populateAyahSelects(); renderReader(); });
  ['startAyah','endAyah','hideMode'].forEach(id => $(`#${id}`).addEventListener('change', renderReader));
  $('#playSequence').addEventListener('click', playSequence);
  $('#markMemorized').addEventListener('click', () => markMemorized().catch(e=>toast(e.message)));
  $('#markDifficult').addEventListener('click', markDifficult);
  $('#generateReview').addEventListener('click', generateReview);
  $('#reviewList').addEventListener('click', e => {
    if(e.target.dataset.review) handleReviewResult(e.target.dataset.id, e.target.dataset.review);
    if(e.target.dataset.openReview) openReviewAyah(e.target.dataset.openReview);
    if(e.target.dataset.jump) switchView(e.target.dataset.jump);
  });
  $('#startRecord').addEventListener('click', () => startRecording().catch(e=>toast(e.message)));
  $('#stopRecord').addEventListener('click', stopRecording);
  $('#saveSubmission').addEventListener('click', saveSubmission);
  $('#reloadQuran').addEventListener('click', () => loadQuran().then(()=>toast('Konten dimuat ulang.')).catch(e=>toast(e.message)));
  $('#locationButton').addEventListener('click', openLocationModal);
  $('#closeLocationModal').addEventListener('click', closeLocationModal);
  $('#locationModal').addEventListener('click', e => { if(e.target.id === 'locationModal') closeLocationModal(); });
  $('#detectGps').addEventListener('click', detectGps);
  $('#useDefaultLocation').addEventListener('click', () => { setPrayerLocation('Bekasi', -6.2383, 106.9756); toast('Lokasi default Bekasi digunakan.'); });
  $('#loginForm').addEventListener('submit', handleLogin);
  $('#registerForm').addEventListener('submit', handleRegister);
  $('#refreshLoginCaptcha').addEventListener('click', () => loadCaptcha('login'));
  $('#refreshRegisterCaptcha').addEventListener('click', () => loadCaptcha('register'));
  $('#saveDisplaySettings').addEventListener('click', saveDisplaySettings);
  $('#resetLocalData').addEventListener('click', resetLocalData);
}
async function init(){
  bindEvents();
  await loadQuran();
  applyDisplaySettings();
  await Promise.all([loadCaptcha('login'), loadCaptcha('register')]);
  updateAuthUi();
  updatePrayer();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
}
init().catch(err => { console.error(err); toast(err.message); });
