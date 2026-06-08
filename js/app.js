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
};

const STORAGE_KEYS = {
  progress: 'hifz_progress_v2',
  reviews: 'hifz_reviews_v2',
  submissions: 'hifz_submissions_v2',
  difficult: 'hifz_difficult_v2',
  prayerCache: 'hifz_prayer_cache_v2'
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
  setTimeout(() => el.classList.remove('show'), 2600);
}

function readJson(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeJson(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function today(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function nextDate(days){
  const d = new Date();
  d.setDate(d.getDate()+days);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function ayahKey(surahId, ayahNumber){ return `${surahId}:${ayahNumber}`; }
function getSelectedRange(){
  return {
    surahId: Number($('#surahSelect').value),
    start: Number($('#startAyah').value),
    end: Number($('#endAyah').value)
  };
}

async function apiFetch(path, options={}){
  const base = (window.HIFZ_CONFIG.apiBase || '').replace(/\/$/, '');
  if(!base) throw new Error('API Worker belum dikonfigurasi.');
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {'Content-Type':'application/json', 'X-User-Id':'demo-user', ...(options.headers || {})}
  });
  if(!res.ok) throw new Error(await res.text());
  return res.json();
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
  renderReader();
  updateDashboard();
  toast(`${state.quran.metadata.title || 'Konten Qur\'an'} dimuat: ${state.quran.surahs.length} surah.`);
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
  const progress = readJson(STORAGE_KEYS.progress, {});
  const difficult = readJson(STORAGE_KEYS.difficult, {});
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
    let translation = escapeHtml(a.translation_id || '');
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
  const withAudio = ayahs.filter(a => a.audio_url).length;
  if(!withAudio){ toast('URL audio belum tersedia untuk rentang ayat ini.'); return; }
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
async function markMemorized(){
  const progress = readJson(STORAGE_KEYS.progress, {});
  const reviews = readJson(STORAGE_KEYS.reviews, []);
  const selected = getAyahsInRange();
  for(const a of selected){
    const key = ayahKey(state.currentSurah.id, a.number);
    progress[key] = {surah_id: state.currentSurah.id, surah: state.currentSurah.name_latin, ayah_number: a.number, status:'memorized', memorized_at: new Date().toISOString(), strength_score: 60};
    reviews.push({id: crypto.randomUUID(), key, surah:state.currentSurah.name_latin, ayah_number:a.number, due_date: nextDate(1), status:'pending', priority:2});
  }
  writeJson(STORAGE_KEYS.progress, progress);
  writeJson(STORAGE_KEYS.reviews, dedupeReviews(reviews));
  renderReader(); renderReviews(); updateDashboard();
  if(window.HIFZ_CONFIG.apiBase){
    Promise.allSettled(selected.map(a => apiFetch('/api/progress', {
      method:'POST',
      body:JSON.stringify({surah_id:state.currentSurah.id, ayah_number:a.number, status:'memorized', strength_score:60})
    }))).then(results => {
      const failed = results.filter(r => r.status === 'rejected').length;
      if(failed) console.warn(`${failed} progress gagal sinkron ke D1`);
    });
  }
  toast('Hafalan ditandai dan jadwal murajaah dibuat.');
}
function markDifficult(){
  const difficult = readJson(STORAGE_KEYS.difficult, {});
  for(const a of getAyahsInRange()) difficult[ayahKey(state.currentSurah.id, a.number)] = {surah:state.currentSurah.name_latin, ayah_number:a.number, created_at:new Date().toISOString()};
  writeJson(STORAGE_KEYS.difficult, difficult);
  renderReader(); updateDashboard();
  toast('Ayat masuk daftar sulit dan diprioritaskan untuk murajaah.');
}
function dedupeReviews(items){
  const seen = new Map();
  for(const item of items) seen.set(`${item.key}:${item.due_date}:${item.status}`, item);
  return [...seen.values()];
}
function generateReview(){
  const progress = readJson(STORAGE_KEYS.progress, {});
  const difficult = readJson(STORAGE_KEYS.difficult, {});
  const reviews = Object.entries(progress).filter(([,v]) => v.status === 'memorized').map(([key,v]) => ({
    id: crypto.randomUUID(), key, surah:v.surah, ayah_number:v.ayah_number, due_date: today(), status:'pending', priority:difficult[key] ? 1 : 3
  }));
  writeJson(STORAGE_KEYS.reviews, dedupeReviews([...readJson(STORAGE_KEYS.reviews, []), ...reviews]));
  renderReviews(); updateDashboard(); toast('Jadwal murajaah hari ini dibuat.');
}
function renderReviews(){
  const list = readJson(STORAGE_KEYS.reviews, []).sort((a,b)=>a.priority-b.priority || a.due_date.localeCompare(b.due_date));
  const due = list.filter(r => r.status === 'pending' && r.due_date <= today());
  $('#reviewList').innerHTML = due.length ? due.map(r => `<article class="review-item">
    <div><strong>${escapeHtml(r.surah)} ayat ${r.ayah_number}</strong><p>Jatuh tempo: ${escapeHtml(r.due_date)} · Prioritas ${r.priority}</p></div>
    <div class="action-row"><button class="btn secondary" data-review="lancar" data-id="${r.id}">Lancar</button><button class="btn warning" data-review="ulang" data-id="${r.id}">Perlu ulang</button></div>
  </article>`).join('') : '<article class="info-card"><p>Belum ada murajaah jatuh tempo hari ini.</p></article>';
}
function handleReviewResult(id, result){
  const reviews = readJson(STORAGE_KEYS.reviews, []);
  const idx = reviews.findIndex(r => r.id === id);
  if(idx >= 0){
    const current = reviews[idx];
    reviews[idx] = {...current, status:'done', result, reviewed_at:new Date().toISOString()};
    if(result === 'ulang') reviews.push({...current, id:crypto.randomUUID(), due_date:nextDate(1), status:'pending', priority:1});
    if(result === 'lancar') reviews.push({...current, id:crypto.randomUUID(), due_date:nextDate(7), status:'pending', priority:3});
    writeJson(STORAGE_KEYS.reviews, dedupeReviews(reviews));
    renderReviews(); updateDashboard(); toast('Hasil murajaah tersimpan.');
  }
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
  const {surahId, start, end} = getSelectedRange();
  const submissions = readJson(STORAGE_KEYS.submissions, []);
  const item = {id:crypto.randomUUID(), teacher:$('#teacherName').value || 'Guru', note:$('#submissionNote').value || `${state.currentSurah.name_latin} ${start}-${end}`, audio_url:state.recordingUrl, status:'draft/local', surah_id:surahId, start_ayah:start, end_ayah:end, created_at:new Date().toISOString()};
  submissions.unshift(item);
  writeJson(STORAGE_KEYS.submissions, submissions);
  if(window.HIFZ_CONFIG.apiBase){
    apiFetch('/api/submissions', {method:'POST', body:JSON.stringify({teacher_id:item.teacher, surah_id:surahId, start_ayah:start, end_ayah:end, audio_url:item.audio_url, note:item.note})}).catch(console.warn);
  }
  renderSubmissions(); updateDashboard(); toast('Setoran disimpan. Untuk produksi, audio perlu disimpan ke R2/storage.');
}
function renderSubmissions(){
  const data = readJson(STORAGE_KEYS.submissions, []);
  $('#submissionList').innerHTML = data.length ? data.map(s => `<article class="review-item"><div><strong>${escapeHtml(s.note)}</strong><p>Guru: ${escapeHtml(s.teacher)} · Status: ${escapeHtml(s.status)}</p></div>${s.audio_url ? `<audio controls src="${s.audio_url}"></audio>` : ''}</article>`).join('') : '';
}

async function updatePrayer(){
  const cfg = window.HIFZ_CONFIG.defaultPrayer;
  $('#activeLocation').textContent = cfg.locationName;
  const cache = readJson(STORAGE_KEYS.prayerCache, {});
  const cacheKey = `${cfg.latitude},${cfg.longitude},${today()}`;
  let times = cache[cacheKey];
  if(!times){
    try{
      if(window.HIFZ_CONFIG.apiBase){
        const data = await apiFetch(`/api/prayer/today?lat=${cfg.latitude}&lng=${cfg.longitude}&location=${encodeURIComponent(cfg.locationName)}&timezone=${encodeURIComponent(cfg.timezone || 'Asia/Jakarta')}`);
        times = data.times;
      } else {
        times = localPrayerFallback();
      }
      cache[cacheKey] = times; writeJson(STORAGE_KEYS.prayerCache, cache);
    } catch(e) { console.warn(e); times = localPrayerFallback(); }
  }
  startPrayerCountdown(times);
}
function localPrayerFallback(){
  return {fajr:'04:38', sunrise:'05:55', dhuhr:'11:54', asr:'15:15', maghrib:'17:47', isha:'19:00'};
}
function startPrayerCountdown(times){
  const labels = [
    ['Subuh', times.fajr], ['Dzuhur', times.dhuhr], ['Ashar', times.asr], ['Maghrib', times.maghrib], ['Isya', times.isha]
  ].filter(([,t]) => t);
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
    const h = String(Math.floor(diff/3600000)).padStart(2,'0');
    const m = String(Math.floor(diff%3600000/60000)).padStart(2,'0');
    const s = String(Math.floor(diff%60000/1000)).padStart(2,'0');
    $('#nextPrayerName').textContent = next.name;
    $('#nextPrayerTime').textContent = next.time;
    $('#prayerCountdown').textContent = `${h}:${m}:${s}`;
  };
  tick(); state.prayerTimer = setInterval(tick, 1000);
}
function savePrayerSettings(){
  const name = $('#locationName').value || 'Bekasi';
  const lat = Number($('#latitude').value || -6.2383);
  const lng = Number($('#longitude').value || 106.9756);
  localStorage.setItem('hifz_location_name', name);
  localStorage.setItem('hifz_latitude', lat);
  localStorage.setItem('hifz_longitude', lng);
  localStorage.setItem('hifz_timezone', 'Asia/Jakarta');
  window.HIFZ_CONFIG.defaultPrayer = {locationName:name, latitude:lat, longitude:lng, timezone:'Asia/Jakarta'};
  updatePrayer(); toast('Lokasi jadwal shalat disimpan.');
}
async function loadPpsa(){
  const log = $('#ppsaPreview');
  log.textContent = 'Memuat data PPSA...';
  try{
    const res = await fetch(window.HIFZ_CONFIG.ppsaDataUrl);
    const json = await res.json();
    const items = normalizePpsaContent(json);
    log.innerHTML = `<strong>${escapeHtml(json.metadata?.title || 'PPSA')}</strong><br>${items.length} item berhasil dibaca.<br>Contoh: ${escapeHtml(items[0]?.title || '-')} — ${escapeHtml(items[0]?.arabic?.slice(0,80) || '')}`;
  }catch(e){ log.textContent = `Gagal memuat PPSA: ${e.message}`; }
}
function normalizePpsaContent(json){
  const items = [];
  for(const section of json.sections || []){
    for(const subsection of section.subsections || []){
      for(const item of subsection.items || []){
        items.push({section:section.title, title:subsection.title, arabic:item.arabic_display || item.arabic, translation_id:item.translation_id, id:item.id});
      }
    }
  }
  return items;
}
function updateDashboard(){
  const progress = readJson(STORAGE_KEYS.progress, {});
  const difficult = readJson(STORAGE_KEYS.difficult, {});
  const reviews = readJson(STORAGE_KEYS.reviews, []);
  const submissions = readJson(STORAGE_KEYS.submissions, []);
  const totalAyahs = state.quran?.surahs.reduce((sum,s)=>sum+s.ayahs.length,0) || 6236;
  const memorized = Object.values(progress).filter(v => v.status === 'memorized').length;
  const pct = Math.min(100, Math.round(memorized / totalAyahs * 100));
  document.documentElement.style.setProperty('--pct', `${pct}%`);
  $('#heroProgress').textContent = `${pct}%`; $('#memorizedCount').textContent = memorized;
  $('#statAyah').textContent = memorized; $('#statDifficult').textContent = Object.keys(difficult).length;
  $('#statReviews').textContent = reviews.filter(r=>r.status==='pending').length; $('#statSubmissions').textContent = submissions.length;
  $('#dashboardDetail').innerHTML = `<h3>Ayat lemah/sulit</h3>${Object.values(difficult).length ? Object.values(difficult).map(d=>`<span class="badge">${escapeHtml(d.surah)} ${d.ayah_number}</span>`).join(' ') : '<p>Belum ada ayat sulit.</p>'}`;
}
function switchView(view){
  $$('.view').forEach(v => v.classList.remove('active'));
  $(`#view-${view}`).classList.add('active');
  $$('.nav-pill').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  window.scrollTo({top:0, behavior:'smooth'});
}
function bindEvents(){
  $$('.nav-pill').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
  $$('[data-jump]').forEach(b => b.addEventListener('click', () => switchView(b.dataset.jump)));
  $('#surahSelect').addEventListener('change', () => { populateAyahSelects(); renderReader(); });
  ['startAyah','endAyah','hideMode'].forEach(id => $(`#${id}`).addEventListener('change', renderReader));
  $('#playSequence').addEventListener('click', playSequence);
  $('#markMemorized').addEventListener('click', () => markMemorized().catch(e=>toast(e.message)));
  $('#markDifficult').addEventListener('click', markDifficult);
  $('#generateReview').addEventListener('click', generateReview);
  $('#reviewList').addEventListener('click', e => { if(e.target.dataset.review) handleReviewResult(e.target.dataset.id, e.target.dataset.review); });
  $('#startRecord').addEventListener('click', () => startRecording().catch(e=>toast(e.message)));
  $('#stopRecord').addEventListener('click', stopRecording);
  $('#saveSubmission').addEventListener('click', saveSubmission);
  $('#savePrayerSettings').addEventListener('click', savePrayerSettings);
  $('#saveApiBase').addEventListener('click', () => { localStorage.setItem('hifz_api_base', $('#apiBase').value.trim()); window.HIFZ_CONFIG.apiBase = $('#apiBase').value.trim(); updatePrayer(); toast('Endpoint API disimpan.'); });
  $('#loadPpsa').addEventListener('click', loadPpsa);
  $('#reloadQuran').addEventListener('click', () => loadQuran().then(()=>toast('Konten dimuat ulang.')).catch(e=>toast(e.message)));
}
async function init(){
  $('#apiBase').value = window.HIFZ_CONFIG.apiBase;
  $('#locationName').value = window.HIFZ_CONFIG.defaultPrayer.locationName;
  $('#latitude').value = window.HIFZ_CONFIG.defaultPrayer.latitude;
  $('#longitude').value = window.HIFZ_CONFIG.defaultPrayer.longitude;
  bindEvents();
  await loadQuran();
  renderReviews(); renderSubmissions(); updatePrayer();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
}
init().catch(err => { console.error(err); toast(err.message); });
