const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const state = {
  quran: null,
  currentSurah: null,
  recorder: null,
  chunks: [],
  recordingUrl: null,
  prayerTimer: null,
};
const STORAGE_KEYS = {
  progress: 'hifz_progress_v1',
  reviews: 'hifz_reviews_v1',
  submissions: 'hifz_submissions_v1',
  difficult: 'hifz_difficult_v1',
  prayerCache: 'hifz_prayer_cache_v1'
};

function toast(message){
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2400);
}
function readJson(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeJson(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function today(){ return new Date().toISOString().slice(0,10); }
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
    headers: {'Content-Type':'application/json', ...(options.headers || {})}
  });
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}

async function loadQuran(){
  const res = await fetch(window.HIFZ_CONFIG.quranDataPath, {cache:'no-store'});
  if(!res.ok) throw new Error('Data Qur\'an tidak dapat dimuat.');
  state.quran = await res.json();
  populateSurahSelect();
  renderReader();
  updateDashboard();
}
function populateSurahSelect(){
  const select = $('#surahSelect');
  select.innerHTML = state.quran.surahs.map(s => `<option value="${s.id}">${s.id}. ${s.name_latin} — ${s.name_ar}</option>`).join('');
  state.currentSurah = state.quran.surahs[0];
  populateAyahSelects();
}
function populateAyahSelects(){
  const surahId = Number($('#surahSelect').value || state.quran.surahs[0].id);
  state.currentSurah = state.quran.surahs.find(s => s.id === surahId);
  const options = state.currentSurah.ayahs.map(a => `<option value="${a.number}">${a.number}</option>`).join('');
  $('#startAyah').innerHTML = options;
  $('#endAyah').innerHTML = options;
  $('#endAyah').value = state.currentSurah.ayahs.at(-1).number;
}
function getAyahsInRange(){
  const {start,end} = getSelectedRange();
  const min = Math.min(start,end), max = Math.max(start,end);
  return state.currentSurah.ayahs.filter(a => a.number >= min && a.number <= max);
}
function renderReader(){
  if(!state.currentSurah) return;
  const mode = $('#hideMode').value;
  const progress = readJson(STORAGE_KEYS.progress, {});
  const difficult = readJson(STORAGE_KEYS.difficult, {});
  const ayahs = getAyahsInRange();
  $('#readerCard').innerHTML = ayahs.map(a => {
    const key = ayahKey(state.currentSurah.id, a.number);
    const isMemorized = progress[key]?.status === 'memorized';
    const isDifficult = difficult[key];
    let arabic = a.text_ar;
    let translation = a.translation_id || '';
    if(mode === 'arabicHidden') arabic = '<div class="hidden-placeholder">Teks Arab disembunyikan</div>';
    if(mode === 'translationHidden') translation = '';
    if(mode === 'firstWords') arabic = `<span>${a.text_ar.split(' ').slice(0, 3).join(' ')} ...</span>`;
    if(mode === 'blank') { arabic = '<div class="hidden-placeholder">Tes hafalan: baca tanpa melihat teks</div>'; translation = ''; }
    return `<article class="ayah-card">
      <div class="ayah-top">
        <span class="badge">${state.currentSurah.name_latin} · ayat ${a.number}</span>
        <span class="badge">${isMemorized ? '✅ Hafal' : '○ Belum'} ${isDifficult ? ' · ⚠ Sulit' : ''}</span>
      </div>
      <div class="arabic">${arabic}</div>
      ${translation ? `<p class="translation">${translation}</p>` : ''}
    </article>`;
  }).join('');
}

async function playSequence(){
  const repeat = Number($('#repeatCount').value);
  const ayahs = getAyahsInRange();
  toast(`Mode demo: urutan ${ayahs.length} ayat × ${repeat} pengulangan disiapkan.`);
  for(const ayah of ayahs){
    if(!ayah.audio_url) continue;
    for(let i=0;i<repeat;i++){
      await playAudio(ayah.audio_url).catch(()=>{});
      await new Promise(r=>setTimeout(r, 550));
    }
  }
}
function playAudio(url){
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.onended = resolve;
    audio.onerror = reject;
    audio.play().catch(reject);
  });
}
function markMemorized(){
  const progress = readJson(STORAGE_KEYS.progress, {});
  const reviews = readJson(STORAGE_KEYS.reviews, []);
  for(const a of getAyahsInRange()){
    const key = ayahKey(state.currentSurah.id, a.number);
    progress[key] = {surah_id: state.currentSurah.id, surah: state.currentSurah.name_latin, ayah_number: a.number, status:'memorized', memorized_at: new Date().toISOString(), strength_score: 60};
    reviews.push({id: crypto.randomUUID(), key, surah:state.currentSurah.name_latin, ayah_number:a.number, due_date: nextDate(1), status:'pending', priority:2});
  }
  writeJson(STORAGE_KEYS.progress, progress);
  writeJson(STORAGE_KEYS.reviews, dedupeReviews(reviews));
  renderReader(); renderReviews(); updateDashboard();
  toast('Hafalan ditandai dan jadwal murajaah dibuat.');
}
function markDifficult(){
  const difficult = readJson(STORAGE_KEYS.difficult, {});
  for(const a of getAyahsInRange()) difficult[ayahKey(state.currentSurah.id, a.number)] = {surah:state.currentSurah.name_latin, ayah_number:a.number, created_at:new Date().toISOString()};
  writeJson(STORAGE_KEYS.difficult, difficult);
  renderReader(); updateDashboard();
  toast('Ayat masuk daftar sulit dan diprioritaskan untuk murajaah.');
}
function nextDate(days){ const d = new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }
function dedupeReviews(items){
  const seen = new Map();
  for(const item of items) seen.set(`${item.key}:${item.due_date}`, item);
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
    <div><strong>${r.surah} ayat ${r.ayah_number}</strong><p>Jatuh tempo: ${r.due_date} · Prioritas ${r.priority}</p></div>
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
  const submissions = readJson(STORAGE_KEYS.submissions, []);
  submissions.unshift({id:crypto.randomUUID(), teacher:$('#teacherName').value || 'Guru', note:$('#submissionNote').value || 'Setoran hafalan', audio_url:state.recordingUrl, status:'draft/local', created_at:new Date().toISOString()});
  writeJson(STORAGE_KEYS.submissions, submissions);
  renderSubmissions(); updateDashboard(); toast('Setoran disimpan secara lokal.');
}
function renderSubmissions(){
  const data = readJson(STORAGE_KEYS.submissions, []);
  $('#submissionList').innerHTML = data.length ? data.map(s => `<article class="review-item"><div><strong>${s.note}</strong><p>Guru: ${s.teacher} · Status: ${s.status}</p></div>${s.audio_url ? `<audio controls src="${s.audio_url}"></audio>` : ''}</article>`).join('') : '';
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
        const data = await apiFetch(`/api/prayer/today?lat=${cfg.latitude}&lng=${cfg.longitude}&location=${encodeURIComponent(cfg.locationName)}`);
        times = data.times;
      } else {
        times = localPrayerFallback();
      }
      cache[cacheKey] = times; writeJson(STORAGE_KEYS.prayerCache, cache);
    } catch { times = localPrayerFallback(); }
  }
  startPrayerCountdown(times);
}
function localPrayerFallback(){
  // Fallback statis untuk pratinjau offline. Produksi mengambil data dari Worker/API.
  return {fajr:'04:38', sunrise:'05:55', dhuhr:'11:54', asr:'15:15', maghrib:'17:47', isha:'19:00'};
}
function startPrayerCountdown(times){
  const labels = [
    ['Subuh', times.fajr], ['Dzuhur', times.dhuhr], ['Ashar', times.asr], ['Maghrib', times.maghrib], ['Isya', times.isha]
  ].filter(([,t]) => t);
  clearInterval(state.prayerTimer);
  const tick = () => {
    const now = new Date();
    const todayDate = now.toISOString().slice(0,10);
    let next = labels.map(([name,time]) => ({name,time,date:new Date(`${todayDate}T${time}:00`)})).find(x => x.date > now);
    if(!next){
      const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate()+1);
      const iso = tomorrow.toISOString().slice(0,10);
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
    log.innerHTML = `<strong>${json.metadata?.title || 'PPSA'}</strong><br>${items.length} item berhasil dibaca.<br>Contoh: ${items[0]?.title || '-'} — ${items[0]?.arabic?.slice(0,80) || ''}`;
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
  const totalAyahs = state.quran?.surahs.reduce((sum,s)=>sum+s.ayahs.length,0) || 1;
  const memorized = Object.values(progress).filter(v => v.status === 'memorized').length;
  const pct = Math.round(memorized / totalAyahs * 100);
  document.documentElement.style.setProperty('--pct', `${pct}%`);
  $('#heroProgress').textContent = `${pct}%`; $('#memorizedCount').textContent = memorized;
  $('#statAyah').textContent = memorized; $('#statDifficult').textContent = Object.keys(difficult).length;
  $('#statReviews').textContent = reviews.filter(r=>r.status==='pending').length; $('#statSubmissions').textContent = submissions.length;
  $('#dashboardDetail').innerHTML = `<h3>Ayat lemah/sulit</h3>${Object.values(difficult).length ? Object.values(difficult).map(d=>`<span class="badge">${d.surah} ${d.ayah_number}</span>`).join(' ') : '<p>Belum ada ayat sulit.</p>'}`;
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
  $('#markMemorized').addEventListener('click', markMemorized);
  $('#markDifficult').addEventListener('click', markDifficult);
  $('#generateReview').addEventListener('click', generateReview);
  $('#reviewList').addEventListener('click', e => { if(e.target.dataset.review) handleReviewResult(e.target.dataset.id, e.target.dataset.review); });
  $('#startRecord').addEventListener('click', () => startRecording().catch(e=>toast(e.message)));
  $('#stopRecord').addEventListener('click', stopRecording);
  $('#saveSubmission').addEventListener('click', saveSubmission);
  $('#savePrayerSettings').addEventListener('click', savePrayerSettings);
  $('#saveApiBase').addEventListener('click', () => { localStorage.setItem('hifz_api_base', $('#apiBase').value.trim()); window.HIFZ_CONFIG.apiBase = $('#apiBase').value.trim(); toast('Endpoint API disimpan.'); });
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
