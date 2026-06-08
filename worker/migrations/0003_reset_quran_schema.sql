-- Reset Quran tables and prepare full Kemenag Quran seed.
-- This avoids Cloudflare D1 SQLITE_TOOBIG by keeping ayah inserts in later small files.
PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS ayahs;
DROP TABLE IF EXISTS surahs;

CREATE TABLE IF NOT EXISTS surahs (
  id INTEGER PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_latin TEXT NOT NULL,
  total_ayah INTEGER NOT NULL,
  revelation_type TEXT,
  name_ar_plain TEXT,
  transliteration TEXT,
  translation TEXT,
  page INTEGER
);

CREATE TABLE IF NOT EXISTS ayahs (
  id TEXT PRIMARY KEY,
  surah_id INTEGER NOT NULL,
  ayah_number INTEGER NOT NULL,
  juz INTEGER,
  page INTEGER,
  global_ayah_id INTEGER,
  text_ar TEXT NOT NULL,
  translation_id TEXT,
  footnotes TEXT,
  audio_url TEXT,
  UNIQUE(surah_id, ayah_number),
  FOREIGN KEY (surah_id) REFERENCES surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_ayahs_surah_number ON ayahs(surah_id, ayah_number);
CREATE INDEX IF NOT EXISTS idx_ayahs_juz ON ayahs(juz);

INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (1, 'سُورَةُ ٱلْفَاتِحَةِ', 'Al-Fātiḥah', 7, 'Makkiyah', 'الفاتحة', 'Al-Fatihah', 'Pembuka', 1);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (2, 'سُورَةُ البَقَرَةِ', 'Al-Baqarah', 286, 'Madaniyah', 'البقرة', 'Al-Baqarah', 'Sapi Betina', 2);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (3, 'سُورَةُ آلِ عِمۡرَانَ', 'Āli ‘Imrān', 200, 'Madaniyah', 'اٰل عمرٰن', 'Ali ‘Imran', 'Keluarga Imran', 50);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (4, 'سُورَةُ النِّسَاءِ', 'An-Nisā''', 176, 'Madaniyah', 'النّساۤء', 'An-Nisa''', 'Perempuan', 77);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (5, 'سُورَةُ المَائـِدَةِ', 'Al-Mā''idah', 120, 'Madaniyah', 'الماۤئدة', 'Al-Ma''idah', 'Hidangan', 106);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (6, 'سُورَةُ الأَنۡعَامِ', 'Al-An‘ām', 165, 'Makkiyah', 'الانعام', 'Al-An‘am', 'Binatang Ternak', 128);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (7, 'سُورَةُ الأَعۡرَافِ', 'Al-A‘rāf', 206, 'Makkiyah', 'الاعراف', 'Al-A‘raf', 'Tempat Tertinggi', 151);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (8, 'سُورَةُ الأَنفَالِ', 'Al-Anfāl', 75, 'Madaniyah', 'الانفال', 'Al-Anfal', 'Rampasan Perang', 177);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (9, 'سُورَةُ التَّوۡبَةِ', 'At-Taubah', 129, 'Madaniyah', 'التّوبة', 'At-Taubah', 'Pengampunan', 187);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (10, 'سُورَةُ يُونُسَ', 'Yūnus', 109, 'Makkiyah', 'يونس', 'Yunus', 'Yunus', 208);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (11, 'سُورَةُ هُودٍ', 'Hūd', 123, 'Makkiyah', 'هود', 'Hud', 'Hud', 221);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (12, 'سُورَةُ يُوسُفَ', 'Yūsuf', 111, 'Makkiyah', 'يوسف', 'Yusuf', 'Yusuf', 235);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (13, 'سُورَةُ الرَّعۡدِ', 'Ar-Ra‘d', 43, 'Makkiyah', 'الرّعد', 'Ar-Ra‘d', 'Guruh', 249);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (14, 'سُورَةُ إِبۡرَاهِيمَ', 'Ibrāhīm', 52, 'Makkiyah', 'ابرٰهيم', 'Ibrahim', 'Ibrahim', 255);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (15, 'سُورَةُ الحِجۡرِ', 'Al-Ḥijr', 99, 'Makkiyah', 'الحجر', 'Al-Hijr', 'Hijr', 262);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (16, 'سُورَةُ النَّحۡلِ', 'An-Naḥl', 128, 'Makkiyah', 'النّحل', 'An-Nahl', 'Lebah', 267);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (17, 'سُورَةُ الإِسۡرَاءِ', 'Al-Isrā''', 111, 'Makkiyah', 'الاسراۤء', 'Al-Isra''', 'Memperjalankan di Malam Hari', 282);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (18, 'سُورَةُ الكَهۡفِ', 'Al-Kahf', 110, 'Makkiyah', 'الكهف', 'Al-Kahf', 'Gua', 293);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (19, 'سُورَةُ مَرۡيَمَ', 'Maryam', 98, 'Makkiyah', 'مريم', 'Maryam', 'Maryam', 305);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (20, 'سُورَةُ طه', 'Ṭāhā', 135, 'Makkiyah', 'طٰهٰ', 'Taha', 'Taha', 312);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (21, 'سُورَةُ الأَنبِيَاءِ', 'Al-Anbiyā''', 112, 'Makkiyah', 'الانبياۤء', 'Al-Anbiya''', 'Para Nabi', 322);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (22, 'سُورَةُ الحَجِّ', 'Al-Ḥajj', 78, 'Madaniyah', 'الحجّ', 'Al-Hajj', 'Haji', 332);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (23, 'سُورَةُ المُؤۡمِنُونَ', 'Al-Mu''minūn', 118, 'Makkiyah', 'المؤمنون', 'Al-Mu''minun', 'Orang-Orang Mukmin', 342);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (24, 'سُورَةُ النُّورِ', 'An-Nūr', 64, 'Madaniyah', 'النّور', 'An-Nur', 'Cahaya', 350);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (25, 'سُورَةُ الفُرۡقَانِ', 'Al-Furqān', 77, 'Makkiyah', 'الفرقان', 'Al-Furqan', 'Pembeda', 359);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (26, 'سُورَةُ الشُّعَرَاءِ', 'Asy-Syu‘arā''', 227, 'Makkiyah', 'الشّعراۤء', 'Asy-Syu‘ara''', 'Para Penyair', 367);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (27, 'سُورَةُ النَّمۡلِ', 'An-Naml', 93, 'Makkiyah', 'النّمل', 'An-Naml', 'Semut', 377);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (28, 'سُورَةُ القَصَصِ', 'Al-Qaṣaṣ', 88, 'Makkiyah', 'القصص', 'Al-Qasas', 'Kisah-Kisah', 385);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (29, 'سُورَةُ العَنكَبُوتِ', 'Al-‘Ankabūt', 69, 'Makkiyah', 'العنكبوت', 'Al-‘Ankabut', 'Laba-Laba', 396);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (30, 'سُورَةُ الرُّومِ', 'Ar-Rūm', 60, 'Makkiyah', 'الرّوم', 'Ar-Rum', 'Romawi', 404);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (31, 'سُورَةُ لُقۡمَانَ', 'Luqmān', 34, 'Makkiyah', 'لقمٰن', 'Luqman', 'Luqman', 411);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (32, 'سُورَةُ السَّجۡدَةِ', 'As-Sajdah', 30, 'Makkiyah', 'السّجدة', 'As-Sajdah', 'Sajdah', 415);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (33, 'سُورَةُ الأَحۡزَابِ', 'Al-Aḥzāb', 73, 'Madaniyah', 'الاحزاب', 'Al-Ahzab', 'Golongan Yang Bersekutu', 418);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (34, 'سُورَةُ سَبَإٍ', 'Saba''', 54, 'Makkiyah', 'سبأ', 'Saba''', 'Saba''', 428);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (35, 'سُورَةُ فَاطِرٍ', 'Fāṭir', 45, 'Makkiyah', 'فاطر', 'Fatir', 'Pencipta', 434);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (36, 'سُورَةُ يسٓ', 'Yāsīn', 83, 'Makkiyah', 'يٰسۤ', 'Yasin', 'Yasin', 440);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (37, 'سُورَةُ الصَّافَّاتِ', 'Aṣ-Ṣāffāt', 182, 'Makkiyah', 'الصّٰۤفّٰت', 'As-Saffat', 'Barisan-Barisan', 446);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (38, 'سُورَةُ صٓ', 'Ṣād', 88, 'Makkiyah', 'صۤ', 'Sad', 'Ṣād', 453);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (39, 'سُورَةُ الزُّمَرِ', 'Az-Zumar', 75, 'Makkiyah', 'الزّمر', 'Az-Zumar', 'Rombongan', 458);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (40, 'سُورَةُ غَافِرٍ', 'Gāfir', 85, 'Makkiyah', 'غافر', 'Gafir', 'Maha Pengampun', 467);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (41, 'سُورَةُ فُصِّلَتۡ', 'Fuṣṣilat', 54, 'Makkiyah', 'فصّلت', 'Fussilat', 'Dijelaskan', 477);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (42, 'سُورَةُ الشُّورَىٰ', 'Asy-Syūrā', 53, 'Makkiyah', 'الشّورٰى', 'Asy-Syura', 'Musyawarah', 483);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (43, 'سُورَةُ الزُّخۡرُفِ', 'Az-Zukhruf', 89, 'Makkiyah', 'الزّخرف', 'Az-Zukhruf', 'Perhiasan dari Emas', 489);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (44, 'سُورَةُ الدُّخَانِ', 'Ad-Dukhān', 59, 'Makkiyah', 'الدّخان', 'Ad-Dukhan', 'Kabut Asap', 496);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (45, 'سُورَةُ الجَاثِيَةِ', 'Al-Jāṡiyah', 37, 'Makkiyah', 'الجاثية', 'Al-Jasiyah', 'Berlutut', 499);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (46, 'سُورَةُ الأَحۡقَافِ', 'Al-Aḥqāf', 35, 'Makkiyah', 'الاحقاف', 'Al-Ahqaf', 'Ahqaf', 502);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (47, 'سُورَةُ مُحَمَّدٍ', 'Muḥammad', 38, 'Madaniyah', 'محمّد', 'Muhammad', 'Nabi Muhammad', 507);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (48, 'سُورَةُ الفَتۡحِ', 'Al-Fatḥ', 29, 'Madaniyah', 'الفتح', 'Al-Fath', 'Kemenangan', 511);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (49, 'سُورَةُ الحُجُرَاتِ', 'Al-Ḥujurāt', 18, 'Madaniyah', 'الحجرٰت', 'Al-Hujurat', 'Kamar-Kamar', 515);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (50, 'سُورَةُ قٓ', 'Qāf', 45, 'Makkiyah', 'قۤ', 'Qaf', 'Qaf', 518);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (51, 'سُورَةُ الذَّارِيَاتِ', 'Aż-Żāriyāt', 60, 'Makkiyah', 'الذّٰريٰت', 'Az-Zariyat', 'Yang Menerbangkan', 520);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (52, 'سُورَةُ الطُّورِ', 'Aṭ-Ṭūr', 49, 'Makkiyah', 'الطّور', 'At-Tur', 'Gunung', 523);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (53, 'سُورَةُ النَّجۡمِ', 'An-Najm', 62, 'Makkiyah', 'النّجم', 'An-Najm', 'Bintang', 526);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (54, 'سُورَةُ القَمَرِ', 'Al-Qamar', 55, 'Makkiyah', 'القمر', 'Al-Qamar', 'Bulan', 528);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (55, 'سُورَةُ الرَّحۡمَٰن', 'Ar-Raḥmān', 78, 'Makkiyah', 'الرّحمٰن', 'Ar-Rahman', 'Yang Maha Pengasih', 531);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (56, 'سُورَةُ الوَاقِعَةِ', 'Al-Wāqi‘ah', 96, 'Makkiyah', 'الواقعة', 'Al-Waqi‘ah', 'Hari Kiamat Yang Pasti Terjadi', 534);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (57, 'سُورَةُ الحَدِيدِ', 'Al-Ḥadīd', 29, 'Madaniyah', 'الحديد', 'Al-Hadid', 'Besi', 537);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (58, 'سُورَةُ المُجَادلَةِ', 'Al-Mujādalah', 22, 'Madaniyah', 'المجادلة', 'Al-Mujadalah', 'Gugatan', 542);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (59, 'سُورَةُ الحَشۡرِ', 'Al-Ḥasyr', 24, 'Madaniyah', 'الحشر', 'Al-Hasyr', 'Pengusiran', 545);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (60, 'سُورَةُ المُمۡتَحنَةِ', 'Al-Mumtaḥanah', 13, 'Madaniyah', 'الممتحنة', 'Al-Mumtahanah', 'Wanita Yang Diuji', 549);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (61, 'سُورَةُ الصَّفِّ', 'Aṣ-Ṣaff', 14, 'Madaniyah', 'الصّفّ', 'As-Saff', 'Barisan', 551);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (62, 'سُورَةُ الجُمُعَةِ', 'Al-Jumu‘ah', 11, 'Madaniyah', 'الجمعة', 'Al-Jumu‘ah', 'Jumat', 553);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (63, 'سُورَةُ المُنَافِقُونَ', 'Al-Munāfiqūn', 11, 'Madaniyah', 'المنٰفقون', 'Al-Munafiqun', 'Orang-Orang Munafik', 554);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (64, 'سُورَةُ التَّغَابُنِ', 'At-Tagābun', 18, 'Madaniyah', 'التّغابن', 'At-Tagabun', 'Pengungkapan Kesalahan', 556);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (65, 'سُورَةُ الطَّلَاقِ', 'Aṭ-Ṭalāq', 12, 'Madaniyah', 'الطّلاق', 'At-Talaq', 'Talak', 558);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (66, 'سُورَةُ التَّحۡرِيمِ', 'At-taḥrīm', 12, 'Madaniyah', 'التّحريم', 'At-tahrim', 'Pengharaman', 560);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (67, 'سُورَةُ المُلۡكِ', 'Al-Mulk', 30, 'Makkiyah', 'المُلك', 'Al-Mulk', 'Kerajaan', 562);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (68, 'سُورَةُ القَلَمِ', 'Al-Qalam', 52, 'Makkiyah', 'القلم', 'Al-Qalam', 'Pena', 564);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (69, 'سُورَةُ الحَاقَّةِ', 'Al-Ḥāqqah', 52, 'Makkiyah', 'الحاۤقّة', 'Al-Haqqah', 'Hari Kiamat Yang Pasti Terjadi', 566);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (70, 'سُورَةُ المَعَارِجِ', 'Al-Ma‘ārij', 44, 'Makkiyah', 'المعارج', 'Al-Ma‘arij', 'Tempat-Tempat Naik', 568);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (71, 'سُورَةُ نُوحٍ', 'Nūḥ', 28, 'Makkiyah', 'نوح', 'Nuh', 'Nuh', 570);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (72, 'سُورَةُ الجِنِّ', 'Al-Jinn', 28, 'Makkiyah', 'الجنّ', 'Al-Jinn', 'Jin', 572);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (73, 'سُورَةُ المُزَّمِّلِ', 'Al-Muzzammil', 20, 'Makkiyah', 'المزّمّل', 'Al-Muzzammil', 'Orang Berkelumun', 574);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (74, 'سُورَةُ المُدَّثِّرِ', 'Al-Muddaṡṡir', 56, 'Makkiyah', 'المدّثّر', 'Al-Muddassir', 'Orang Berselimut', 575);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (75, 'سُورَةُ القِيَامَةِ', 'Al-Qiyāmah', 40, 'Makkiyah', 'القيٰمة', 'Al-Qiyamah', 'Hari Kiamat', 577);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (76, 'سُورَةُ الإِنسَانِ', 'Al-Insān', 31, 'Madaniyah', 'الانسان', 'Al-Insan', 'Manusia', 578);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (77, 'سُورَةُ المُرۡسَلَاتِ', 'Al-Mursalāt', 50, 'Makkiyah', 'المرسلٰت', 'Al-Mursalat', 'Malaikat Yang Diutus', 580);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (78, 'سُورَةُ النَّبَإِ', 'An-Naba''', 40, 'Makkiyah', 'النّبأ', 'An-Naba''', 'Berita', 582);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (79, 'سُورَةُ النَّازِعَاتِ', 'An-Nāzi‘āt', 46, 'Makkiyah', 'النّٰزعٰت', 'An-Nazi‘at', 'Yang Mencabut Dengan Keras', 583);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (80, 'سُورَةُ عَبَسَ', '‘Abasa', 42, 'Makkiyah', 'عبس', '‘Abasa', 'Berwajah Masam', 585);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (81, 'سُورَةُ التَّكۡوِيرِ', 'At-Takwīr', 29, 'Makkiyah', 'التّكوير', 'At-Takwir', 'Penggulungan', 586);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (82, 'سُورَةُ الانفِطَارِ', 'Al-Infiṭār', 19, 'Makkiyah', 'الانفطار', 'Al-Infitar', 'Terbelah', 587);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (83, 'سُورَةُ المُطَفِّفِينَ', 'Al-Muṭaffifīn', 36, 'Makkiyah', 'المطفّفين', 'Al-Mutaffifin', 'Orang-Orang Yang Curang', 587);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (84, 'سُورَةُ الانشِقَاقِ', 'Al-Insyiqāq', 25, 'Makkiyah', 'الانشقاق', 'Al-Insyiqaq', 'Terbelah', 589);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (85, 'سُورَةُ البُرُوجِ', 'Al-Burūj', 22, 'Makkiyah', 'البروج', 'Al-Buruj', 'Gugusan Bintang', 590);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (86, 'سُورَةُ الطَّارِقِ', 'Aṭ-Ṭāriq', 17, 'Makkiyah', 'الطّارق', 'At-Tariq', 'Yang Datang Pada Malam Hari', 591);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (87, 'سُورَةُ الأَعۡلَىٰ', 'Al-A‘lā', 19, 'Makkiyah', 'الاعلى', 'Al-A‘la', 'Yang Maha Tinggi', 591);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (88, 'سُورَةُ الغَاشِيَةِ', 'Al-Gāsyiyah', 26, 'Makkiyah', 'الغاشية', 'Al-Gasyiyah', 'Hari Kiamat Yang Menghilangkan Kesadaran', 592);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (89, 'سُورَةُ الفَجۡرِ', 'Al-Fajr', 30, 'Makkiyah', 'الفجر', 'Al-Fajr', 'Fajar', 593);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (90, 'سُورَةُ البَلَدِ', 'Al-Balad', 20, 'Makkiyah', 'البلد', 'Al-Balad', 'Negeri', 594);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (91, 'سُورَةُ الشَّمۡسِ', 'Asy-Syams', 15, 'Makkiyah', 'الشّمس', 'Asy-Syams', 'Matahari', 595);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (92, 'سُورَةُ اللَّيۡلِ', 'Al-Lail', 21, 'Makkiyah', 'الّيل', 'Al-Lail', 'Malam', 595);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (93, 'سُورَةُ الضُّحَىٰ', 'Aḍ-Ḍuḥā', 11, 'Makkiyah', 'الضّحى', 'Ad-Duha', 'Duha', 596);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (94, 'سُورَةُ الشَّرۡحِ', 'Asy-Syarḥ', 8, 'Makkiyah', 'الشّرح', 'Asy-Syarh', 'Pelapangan', 596);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (95, 'سُورَةُ التِّينِ', 'At-Tīn', 8, 'Makkiyah', 'التّين', 'At-Tin', 'Buah Tin', 597);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (96, 'سُورَةُ العَلَقِ', 'Al-‘Alaq', 19, 'Makkiyah', 'العلق', 'Al-‘Alaq', 'Segumpal Darah', 597);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (97, 'سُورَةُ القَدۡرِ', 'Al-Qadr', 5, 'Makkiyah', 'القدر', 'Al-Qadr', 'Al-Qadar', 598);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (98, 'سُورَةُ البَيِّنَةِ', 'Al-Bayyinah', 8, 'Madaniyah', 'البيّنة', 'Al-Bayyinah', 'Bukti Nyata', 598);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (99, 'سُورَةُ الزَّلۡزَلَةِ', 'Az-Zalzalah', 8, 'Madaniyah', 'الزّلزلة', 'Az-Zalzalah', 'Guncangan', 599);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (100, 'سُورَةُ العَادِيَاتِ', 'Al-‘Ādiyāt', 11, 'Makkiyah', 'العٰديٰت', 'Al-‘Adiyat', 'Kuda Perang Yang Berlari Kencang', 599);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (101, 'سُورَةُ القَارِعَةِ', 'Al-Qāri‘ah', 11, 'Makkiyah', 'القارعة', 'Al-Qari‘ah', 'Al-Qāri‘ah', 600);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (102, 'سُورَةُ التَّكَاثُرِ', 'At-Takāṡur', 8, 'Makkiyah', 'التّكاثر', 'At-Takasur', 'Berbangga-Bangga Dalam Memperbanyak Dunia', 600);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (103, 'سُورَةُ العَصۡرِ', 'Al-‘Aṣr', 3, 'Makkiyah', 'العصر', 'Al-‘Asr', 'Masa', 601);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (104, 'سُورَةُ الهُمَزَةِ', 'Al-Humazah', 9, 'Makkiyah', 'الهمزة', 'Al-Humazah', 'Pengumpat', 601);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (105, 'سُورَةُ الفِيلِ', 'Al-Fīl', 5, 'Makkiyah', 'الفيل', 'Al-Fil', 'Gajah', 601);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (106, 'سُورَةُ قُرَيۡشٍ', 'Quraisy', 4, 'Makkiyah', 'قريش', 'Quraisy', 'Orang Quraisy', 602);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (107, 'سُورَةُ المَاعُونِ', 'Al-Mā‘ūn', 7, 'Makkiyah', 'الماعون', 'Al-Ma‘un', 'Bantuan', 602);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (108, 'سُورَةُ الكَوۡثَرِ', 'Al-Kauṡar', 3, 'Makkiyah', 'الكوثر', 'Al-Kausar', 'Nikmat Yang Banyak', 602);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (109, 'سُورَةُ الكَافِرُونَ', 'Al-Kāfirūn', 6, 'Makkiyah', 'الكٰفرون', 'Al-Kafirun', 'Orang-Orang kafir', 603);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (110, 'سُورَةُ النَّصۡرِ', 'An-Naṣr', 3, 'Madaniyah', 'النّصر', 'An-Nasr', 'Pertolongan', 603);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (111, 'سُورَةُ المَسَدِ', 'Al-Lahab', 5, 'Makkiyah', 'اللّهب', 'Al-Lahab', 'Gejolak Api', 603);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (112, 'سُورَةُ الإِخۡلَاصِ', 'Al-Ikhlāṣ', 4, 'Makkiyah', 'الاخلاص', 'Al-Ikhlas', 'Ikhlas', 604);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (113, 'سُورَةُ الفَلَقِ', 'Al-Falaq', 5, 'Madaniyah', 'الفلق', 'Al-Falaq', 'Fajar', 604);
INSERT OR REPLACE INTO surahs (id, name_ar, name_latin, total_ayah, revelation_type, name_ar_plain, transliteration, translation, page) VALUES (114, 'سُورَةُ النَّاسِ', 'An-Nās', 6, 'Madaniyah', 'النّاس', 'An-Nas', 'Manusia', 604);

PRAGMA foreign_keys = ON;
