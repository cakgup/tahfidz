import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'data', 'quran_kemenag');
const outCombined = path.join(root, 'data', 'quran-kemenag-combined.json');
const outIndex = path.join(root, 'data', 'quran-kemenag-index.json');

function readJson(file){
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}
function everyAyahUrl(surahId, ayahNumber){
  return `https://everyayah.com/data/Alafasy_128kbps/${String(surahId).padStart(3, '0')}${String(ayahNumber).padStart(3, '0')}.mp3`;
}

const files = fs.readdirSync(srcDir)
  .filter(name => /^surah_\d+\.json$/.test(name))
  .sort((a,b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

const surahs = files.map(file => {
  const raw = readJson(path.join(srcDir, file));
  const s = raw.surah;
  return {
    id: Number(s.id),
    name_ar: s.arabic_harakat || s.arabic || '',
    name_ar_plain: s.arabic || '',
    name_latin: s.latin || s.transliteration || `Surah ${s.id}`,
    transliteration: s.transliteration || s.latin || '',
    translation: s.translation || '',
    total_ayah: Number(s.num_ayah || raw.ayahs?.length || 0),
    page: s.page || null,
    revelation_type: s.location || '',
    ayahs: (raw.ayahs || []).map(a => {
      const surahId = Number(a.surah_id || s.id);
      const ayahNumber = Number(a.ayah);
      return {
        id: `${surahId}:${ayahNumber}`,
        global_id: a.id || null,
        surah_id: surahId,
        number: ayahNumber,
        ayah_number: ayahNumber,
        page: a.page || null,
        juz: a.juz || null,
        text_ar: a.arabic || a.kitabah || '',
        kitabah: a.kitabah || a.arabic || '',
        translation_id: a.translation || '',
        footnotes: a.footnotes || '',
        audio_url: everyAyahUrl(surahId, ayahNumber)
      };
    })
  };
});

const combined = {
  metadata: {
    title: 'Al-Qur’an Kemenag RI',
    source: 'Quran Kemenag RI - web-api.qurankemenag.net',
    generated_from: 'data/quran_kemenag/surah_1.json ... surah_114.json',
    surah_count: surahs.length,
    ayah_count: surahs.reduce((sum, s) => sum + s.ayahs.length, 0),
    note: 'Teks Arab dan terjemahan mengacu pada JSON Kemenag yang ditambahkan pengguna. Audio menggunakan URL eksternal EveryAyah Alafasy berdasarkan nomor surah/ayat.'
  },
  surahs
};

const index = {
  metadata: combined.metadata,
  surahs: surahs.map(({ayahs, ...s}) => s)
};

fs.writeFileSync(outCombined, JSON.stringify(combined, null, 0));
fs.writeFileSync(outIndex, JSON.stringify(index, null, 2));
console.log(`Generated ${outCombined}`);
console.log(`Generated ${outIndex}`);
