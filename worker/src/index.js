export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    try {
      let response;
      if (url.pathname === '/api/health') response = json({ ok: true, service: 'hifz-worker' });
      else if (url.pathname === '/api/captcha' && request.method === 'GET') response = await createCaptcha(env);
      else if (url.pathname === '/api/auth/register' && request.method === 'POST') response = await registerUser(request, env);
      else if (url.pathname === '/api/auth/login' && request.method === 'POST') response = await loginUser(request, env);
      else if (url.pathname === '/api/auth/logout' && request.method === 'POST') response = await logoutUser(request, env);
      else if (url.pathname === '/api/auth/me' && request.method === 'GET') response = await authMe(request, env);
      else if (url.pathname === '/api/prayer/today') response = await prayerToday(request, env);
      else if (url.pathname === '/api/quran/surahs') response = await listSurahs(env);
      else if (url.pathname.match(/^\/api\/quran\/surahs\/\d+\/ayahs$/)) response = await listAyahs(url, env);
      else if (url.pathname === '/api/progress' && request.method === 'GET') response = await getProgress(request, env);
      else if (url.pathname === '/api/progress' && request.method === 'POST') response = await saveProgress(request, env);
      else if (url.pathname === '/api/reviews/today') response = await getTodayReviews(request, env);
      else if (url.pathname === '/api/reviews/generate' && request.method === 'POST') response = await generateReviews(request, env);
      else if (url.pathname === '/api/reviews/result' && request.method === 'POST') response = await saveReviewResult(request, env);
      else if (url.pathname === '/api/submissions' && request.method === 'GET') response = await listSubmissions(request, env);
      else if (url.pathname === '/api/submissions' && request.method === 'POST') response = await createSubmission(request, env);
      else if (url.pathname === '/api/dashboard' && request.method === 'GET') response = await dashboard(request, env);
      else response = json({ error: 'Not found' }, 404);
      for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
      return response;
    } catch (err) {
      const response = json({ error: err.message || 'Internal error' }, err.status || 500);
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
function fail(message, status = 400){ const e = new Error(message); e.status = status; throw e; }
function nowIso(){ return new Date().toISOString(); }
function addMinutes(minutes){ return new Date(Date.now() + minutes * 60000).toISOString(); }
function addDays(days){ return new Date(Date.now() + days * 86400000).toISOString(); }
function secret(env){ return env.AUTH_SECRET || 'dev-secret-change-me'; }
function bytesToHex(bytes){ return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2,'0')).join(''); }
function randomHex(bytes = 32){ const arr = new Uint8Array(bytes); crypto.getRandomValues(arr); return bytesToHex(arr); }
async function sha256(text){ return bytesToHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))); }
async function passwordHash(password, salt){
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', salt:enc.encode(salt), iterations:120000, hash:'SHA-256' }, key, 256);
  return bytesToHex(bits);
}
function publicUser(row){ return { id: row.id, name: row.name, email: row.email, role: row.role, status: row.status }; }
async function createSession(env, userId){
  const token = randomHex(32);
  const tokenHash = await sha256(`${token}:${secret(env)}`);
  await env.DB.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), userId, tokenHash, addDays(30), nowIso()).run();
  return token;
}
async function requireAuth(request, env){
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if(!token) fail('Silakan login terlebih dahulu.', 401);
  const tokenHash = await sha256(`${token}:${secret(env)}`);
  const row = await env.DB.prepare(`SELECT u.id, u.name, u.email, u.role, u.status, s.id AS session_id
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'active'`)
    .bind(tokenHash, nowIso()).first();
  if(!row) fail('Sesi login tidak valid atau sudah kedaluwarsa.', 401);
  return { user: publicUser(row), sessionId: row.session_id, tokenHash };
}

async function createCaptcha(env){
  const a = Math.floor(Math.random()*8)+2;
  const b = Math.floor(Math.random()*8)+1;
  const op = ['+','-','×'][Math.floor(Math.random()*3)];
  const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
  const id = crypto.randomUUID();
  const question = `Berapa hasil ${a} ${op} ${b}?`;
  const answerHash = await sha256(`${id}:${answer}:${secret(env)}`);
  await env.DB.prepare('INSERT INTO captcha_challenges (id, question, answer_hash, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)')
    .bind(id, question, answerHash, addMinutes(5), nowIso()).run();
  return json({ captchaId: id, question, expiresInSeconds: 300 });
}
async function validateCaptcha(env, captchaId, captchaAnswer){
  if(!captchaId || captchaAnswer === undefined || captchaAnswer === null) fail('Captcha wajib diisi.');
  const row = await env.DB.prepare('SELECT * FROM captcha_challenges WHERE id = ?').bind(captchaId).first();
  if(!row || row.used) fail('Captcha tidak valid. Silakan muat ulang soal.');
  if(row.expires_at <= nowIso()) fail('Captcha sudah kedaluwarsa. Silakan muat ulang soal.');
  const answerHash = await sha256(`${captchaId}:${String(captchaAnswer).trim()}:${secret(env)}`);
  if(answerHash !== row.answer_hash) fail('Jawaban captcha belum benar.');
  await env.DB.prepare('UPDATE captcha_challenges SET used = 1 WHERE id = ?').bind(captchaId).run();
}
async function registerUser(request, env){
  const body = await request.json();
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if(name.length < 2) fail('Nama lengkap wajib diisi.');
  if(!/^\S+@\S+\.\S+$/.test(email)) fail('Format email tidak valid.');
  if(password.length < 6) fail('Password minimal 6 karakter.');
  await validateCaptcha(env, body.captchaId, body.captchaAnswer);
  const existing = await env.DB.prepare('SELECT id FROM users WHERE lower(email) = ?').bind(email).first();
  if(existing) fail('Email sudah terdaftar.', 409);
  const id = crypto.randomUUID();
  const salt = randomHex(16);
  const hash = await passwordHash(password, salt);
  await env.DB.prepare(`INSERT INTO users (id, name, email, password_hash, password_salt, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'santri', 'active', ?, ?)`)
    .bind(id, name, email, hash, salt, nowIso(), nowIso()).run();
  const user = { id, name, email, role:'santri', status:'active' };
  const token = await createSession(env, id);
  return json({ ok:true, token, user });
}
async function loginUser(request, env){
  const body = await request.json();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  await validateCaptcha(env, body.captchaId, body.captchaAnswer);
  const row = await env.DB.prepare('SELECT * FROM users WHERE lower(email) = ? AND status = ?').bind(email, 'active').first();
  if(!row || !row.password_hash || !row.password_salt) fail('Email atau password tidak sesuai.', 401);
  const hash = await passwordHash(password, row.password_salt);
  if(hash !== row.password_hash) fail('Email atau password tidak sesuai.', 401);
  const token = await createSession(env, row.id);
  return json({ ok:true, token, user: publicUser(row) });
}
async function logoutUser(request, env){
  const auth = await requireAuth(request, env);
  await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(auth.sessionId).run();
  return json({ ok:true });
}
async function authMe(request, env){
  const auth = await requireAuth(request, env);
  return json({ user: auth.user });
}

async function prayerToday(request, env){
  const url = new URL(request.url);
  const lat = url.searchParams.get('lat') || '-6.2383';
  const lng = url.searchParams.get('lng') || '106.9756';
  const location = url.searchParams.get('location') || 'Bekasi';
  const tz = url.searchParams.get('timezone') || 'Asia/Jakarta';
  const date = localDate(tz);
  const locationKey = `${lat},${lng}`;
  const cached = await env.DB.prepare('SELECT * FROM prayer_times_cache WHERE location_key=? AND prayer_date=?').bind(locationKey, date).first();
  if (cached) return json({ location, date, source: 'd1-cache', times: mapPrayer(cached) });
  const endpoint = `https://api.aladhan.com/v1/timings/${date}?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&method=20`;
  const res = await fetch(endpoint, { cf: { cacheTtl: 3600 } });
  if (!res.ok) throw new Error('Gagal mengambil jadwal shalat dari sumber eksternal.');
  const data = await res.json();
  const t = data.data.timings;
  const times = { imsak: cleanTime(t.Imsak), fajr: cleanTime(t.Fajr), sunrise: cleanTime(t.Sunrise), dhuhr: cleanTime(t.Dhuhr), asr: cleanTime(t.Asr), maghrib: cleanTime(t.Maghrib), isha: cleanTime(t.Isha) };
  await env.DB.prepare(`INSERT OR REPLACE INTO prayer_times_cache
    (id, location_key, prayer_date, imsak, fajr, sunrise, dhuhr, asr, maghrib, isha, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), locationKey, date, times.imsak, times.fajr, times.sunrise, times.dhuhr, times.asr, times.maghrib, times.isha, 'aladhan', nowIso()).run();
  return json({ location, date, source: 'aladhan', times });
}
function localDate(timeZone = 'Asia/Jakarta'){
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
  const get = type => parts.find(p => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function cleanTime(value){ return String(value || '').split(' ')[0].slice(0,5); }
function mapPrayer(row){ return { imsak: row.imsak, fajr: row.fajr, sunrise: row.sunrise, dhuhr: row.dhuhr, asr: row.asr, maghrib: row.maghrib, isha: row.isha }; }
async function listSurahs(env){
  const { results } = await env.DB.prepare('SELECT id, name_ar, name_latin, total_ayah, revelation_type FROM surahs ORDER BY id').all();
  return json({ surahs: results });
}
async function listAyahs(url, env){
  const surahId = Number(url.pathname.split('/')[4]);
  const { results } = await env.DB.prepare('SELECT surah_id, ayah_number, juz, page, global_ayah_id, text_ar, translation_id, footnotes, audio_url FROM ayahs WHERE surah_id=? ORDER BY ayah_number').bind(surahId).all();
  return json({ ayahs: results });
}
async function getProgress(request, env){
  const auth = await requireAuth(request, env);
  const { results } = await env.DB.prepare('SELECT * FROM memorization_progress WHERE user_id=? ORDER BY updated_at DESC').bind(auth.user.id).all();
  return json({ progress: results });
}
async function saveProgress(request, env){
  const auth = await requireAuth(request, env);
  const body = await request.json();
  const id = body.id || crypto.randomUUID();
  await env.DB.prepare(`INSERT OR REPLACE INTO memorization_progress
    (id, user_id, surah_id, ayah_number, status, last_reviewed_at, strength_score, mistake_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, auth.user.id, body.surah_id, body.ayah_number, body.status || 'memorized', body.last_reviewed_at || null, body.strength_score || 60, body.mistake_count || 0, nowIso()).run();
  return json({ ok: true, id });
}
async function getTodayReviews(request, env){
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const tz = url.searchParams.get('timezone') || 'Asia/Jakarta';
  const date = localDate(tz);
  const { results } = await env.DB.prepare('SELECT * FROM review_schedule WHERE user_id=? AND due_date<=? AND status=? ORDER BY priority ASC, due_date ASC').bind(auth.user.id, date, 'pending').all();
  return json({ reviews: results });
}
async function generateReviews(request, env){
  const auth = await requireAuth(request, env);
  const date = localDate('Asia/Jakarta');
  const { results } = await env.DB.prepare(`SELECT surah_id, ayah_number, strength_score FROM memorization_progress WHERE user_id=? AND status='memorized'`).bind(auth.user.id).all();
  let count = 0;
  for (const row of results) {
    const exists = await env.DB.prepare(`SELECT id FROM review_schedule WHERE user_id=? AND surah_id=? AND start_ayah=? AND end_ayah=? AND due_date=? AND status='pending'`)
      .bind(auth.user.id, row.surah_id, row.ayah_number, row.ayah_number, date).first();
    if(exists) continue;
    await env.DB.prepare(`INSERT INTO review_schedule (id, user_id, surah_id, start_ayah, end_ayah, due_date, priority, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`)
      .bind(crypto.randomUUID(), auth.user.id, row.surah_id, row.ayah_number, row.ayah_number, date, row.strength_score < 60 ? 1 : 3, nowIso()).run();
    count++;
  }
  return json({ ok:true, created: count });
}
async function saveReviewResult(request, env){
  const auth = await requireAuth(request, env);
  const body = await request.json();
  const row = await env.DB.prepare('SELECT * FROM review_schedule WHERE id=? AND user_id=?').bind(body.id, auth.user.id).first();
  if(!row) fail('Jadwal murajaah tidak ditemukan.', 404);
  await env.DB.prepare('UPDATE review_schedule SET status=? WHERE id=?').bind('done', body.id).run();
  await env.DB.prepare('INSERT INTO review_logs (id, user_id, surah_id, start_ayah, end_ayah, result, notes, reviewed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), auth.user.id, row.surah_id, row.start_ayah, row.end_ayah, body.result || 'lancar', body.notes || '', nowIso()).run();
  const nextDue = localDateFromDate(new Date(Date.now() + (body.result === 'ulang' ? 1 : 7) * 86400000));
  await env.DB.prepare('INSERT INTO review_schedule (id, user_id, surah_id, start_ayah, end_ayah, due_date, priority, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), auth.user.id, row.surah_id, row.start_ayah, row.end_ayah, nextDue, body.result === 'ulang' ? 1 : 3, 'pending', nowIso()).run();
  return json({ ok:true });
}
function localDateFromDate(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
async function createSubmission(request, env){
  const auth = await requireAuth(request, env);
  const body = await request.json();
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO submissions
    (id, user_id, teacher_id, surah_id, start_ayah, end_ayah, audio_url, status, note, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, auth.user.id, body.teacher_id || null, body.surah_id || null, body.start_ayah || null, body.end_ayah || null, body.audio_url || null, 'submitted', body.note || '', nowIso()).run();
  return json({ ok: true, id });
}
async function listSubmissions(request, env){
  const auth = await requireAuth(request, env);
  const { results } = await env.DB.prepare('SELECT * FROM submissions WHERE user_id=? ORDER BY submitted_at DESC LIMIT 100').bind(auth.user.id).all();
  return json({ submissions: results });
}
async function dashboard(request, env){
  const auth = await requireAuth(request, env);
  const ayah = await env.DB.prepare(`SELECT COUNT(*) AS n FROM memorization_progress WHERE user_id=? AND status='memorized'`).bind(auth.user.id).first();
  const reviews = await env.DB.prepare(`SELECT COUNT(*) AS n FROM review_schedule WHERE user_id=? AND status='pending'`).bind(auth.user.id).first();
  const submissions = await env.DB.prepare(`SELECT COUNT(*) AS n FROM submissions WHERE user_id=?`).bind(auth.user.id).first();
  return json({ ayah: ayah.n || 0, reviews: reviews.n || 0, submissions: submissions.n || 0 });
}
