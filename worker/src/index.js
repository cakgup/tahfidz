export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    try {
      let response;
      if (url.pathname === '/api/health') response = json({ ok: true, service: 'hifz-worker' });
      else if (url.pathname === '/api/prayer/today') response = await prayerToday(request, env);
      else if (url.pathname === '/api/quran/surahs') response = await listSurahs(env);
      else if (url.pathname.match(/^\/api\/quran\/surahs\/\d+\/ayahs$/)) response = await listAyahs(url, env);
      else if (url.pathname === '/api/progress' && request.method === 'GET') response = await getProgress(request, env);
      else if (url.pathname === '/api/progress' && request.method === 'POST') response = await saveProgress(request, env);
      else if (url.pathname === '/api/reviews/today') response = await getTodayReviews(request, env);
      else if (url.pathname === '/api/submissions' && request.method === 'POST') response = await createSubmission(request, env);
      else response = json({ error: 'Not found' }, 404);
      for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
      return response;
    } catch (err) {
      const response = json({ error: err.message || 'Internal error' }, 500);
      for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
      return response;
    }
  }
};
function corsHeaders(request, env){
  const origin = request.headers.get('Origin') || '*';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
  const allowOrigin = allowed.length === 0 || allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin'
  };
}
function json(data, status = 200){ return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } }); }
async function prayerToday(request, env){
  const url = new URL(request.url);
  const lat = url.searchParams.get('lat') || '-6.2383';
  const lng = url.searchParams.get('lng') || '106.9756';
  const location = url.searchParams.get('location') || 'Bekasi';
  const date = new Date().toISOString().slice(0,10);
  const locationKey = `${lat},${lng}`;
  const cached = await env.DB.prepare('SELECT * FROM prayer_times_cache WHERE location_key=? AND prayer_date=?').bind(locationKey, date).first();
  if (cached) return json({ location, date, source: 'd1-cache', times: mapPrayer(cached) });
  const endpoint = `https://api.aladhan.com/v1/timings/${date}?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&method=20`;
  const res = await fetch(endpoint, { cf: { cacheTtl: 3600 } });
  if (!res.ok) throw new Error('Gagal mengambil jadwal shalat dari sumber eksternal.');
  const data = await res.json();
  const t = data.data.timings;
  const times = {
    imsak: cleanTime(t.Imsak), fajr: cleanTime(t.Fajr), sunrise: cleanTime(t.Sunrise), dhuhr: cleanTime(t.Dhuhr),
    asr: cleanTime(t.Asr), maghrib: cleanTime(t.Maghrib), isha: cleanTime(t.Isha)
  };
  await env.DB.prepare(`INSERT OR REPLACE INTO prayer_times_cache
    (id, location_key, prayer_date, imsak, fajr, sunrise, dhuhr, asr, maghrib, isha, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), locationKey, date, times.imsak, times.fajr, times.sunrise, times.dhuhr, times.asr, times.maghrib, times.isha, 'aladhan', new Date().toISOString()).run();
  return json({ location, date, source: 'aladhan', times });
}
function cleanTime(value){ return String(value || '').split(' ')[0].slice(0,5); }
function mapPrayer(row){ return { imsak: row.imsak, fajr: row.fajr, sunrise: row.sunrise, dhuhr: row.dhuhr, asr: row.asr, maghrib: row.maghrib, isha: row.isha }; }
async function listSurahs(env){
  const { results } = await env.DB.prepare('SELECT id, name_ar, name_latin, total_ayah, revelation_type FROM surahs ORDER BY id').all();
  return json({ surahs: results });
}
async function listAyahs(url, env){
  const surahId = Number(url.pathname.split('/')[4]);
  const { results } = await env.DB.prepare('SELECT surah_id, ayah_number, juz, text_ar, translation_id, audio_url FROM ayahs WHERE surah_id=? ORDER BY ayah_number').bind(surahId).all();
  return json({ ayahs: results });
}
function userIdFromRequest(request){
  // MVP: gunakan header X-User-Id dulu. Produksi: ganti dengan JWT/session valid.
  return request.headers.get('X-User-Id') || 'demo-user';
}
async function getProgress(request, env){
  const userId = userIdFromRequest(request);
  const { results } = await env.DB.prepare('SELECT * FROM memorization_progress WHERE user_id=? ORDER BY updated_at DESC').bind(userId).all();
  return json({ progress: results });
}
async function saveProgress(request, env){
  const userId = userIdFromRequest(request);
  const body = await request.json();
  const id = body.id || crypto.randomUUID();
  await env.DB.prepare(`INSERT OR REPLACE INTO memorization_progress
    (id, user_id, surah_id, ayah_number, status, last_reviewed_at, strength_score, mistake_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, userId, body.surah_id, body.ayah_number, body.status || 'memorized', body.last_reviewed_at || null, body.strength_score || 60, body.mistake_count || 0, new Date().toISOString()).run();
  return json({ ok: true, id });
}
async function getTodayReviews(request, env){
  const userId = userIdFromRequest(request);
  const date = new Date().toISOString().slice(0,10);
  const { results } = await env.DB.prepare('SELECT * FROM review_schedule WHERE user_id=? AND due_date<=? AND status=? ORDER BY priority ASC, due_date ASC').bind(userId, date, 'pending').all();
  return json({ reviews: results });
}
async function createSubmission(request, env){
  const userId = userIdFromRequest(request);
  const body = await request.json();
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO submissions
    (id, user_id, teacher_id, surah_id, start_ayah, end_ayah, audio_url, status, note, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, userId, body.teacher_id || null, body.surah_id || null, body.start_ayah || null, body.end_ayah || null, body.audio_url || null, 'submitted', body.note || '', new Date().toISOString()).run();
  return json({ ok: true, id });
}
