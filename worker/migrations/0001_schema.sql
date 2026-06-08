-- Hifz Companion D1 schema
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'santri',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE IF NOT EXISTS surahs (
  id INTEGER PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_latin TEXT NOT NULL,
  total_ayah INTEGER NOT NULL,
  revelation_type TEXT
);

CREATE TABLE IF NOT EXISTS ayahs (
  id TEXT PRIMARY KEY,
  surah_id INTEGER NOT NULL,
  ayah_number INTEGER NOT NULL,
  juz INTEGER,
  text_ar TEXT NOT NULL,
  translation_id TEXT,
  audio_url TEXT,
  UNIQUE(surah_id, ayah_number),
  FOREIGN KEY (surah_id) REFERENCES surahs(id)
);

CREATE TABLE IF NOT EXISTS memorization_targets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  surah_id INTEGER NOT NULL,
  start_ayah INTEGER NOT NULL,
  end_ayah INTEGER NOT NULL,
  start_date TEXT,
  target_date TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS memorization_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  surah_id INTEGER NOT NULL,
  ayah_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  last_reviewed_at TEXT,
  strength_score INTEGER DEFAULT 0,
  mistake_count INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, surah_id, ayah_number)
);

CREATE TABLE IF NOT EXISTS review_schedule (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  surah_id INTEGER,
  start_ayah INTEGER,
  end_ayah INTEGER,
  due_date TEXT NOT NULL,
  priority INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS review_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  surah_id INTEGER,
  start_ayah INTEGER,
  end_ayah INTEGER,
  result TEXT,
  notes TEXT,
  reviewed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  teacher_id TEXT,
  surah_id INTEGER,
  start_ayah INTEGER,
  end_ayah INTEGER,
  audio_url TEXT,
  status TEXT DEFAULT 'submitted',
  note TEXT,
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS submission_notes (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  ayah_number INTEGER,
  mistake_type TEXT,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES submissions(id)
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  teacher_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS class_members (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_prayer_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  country TEXT,
  province TEXT,
  city TEXT,
  latitude REAL,
  longitude REAL,
  timezone TEXT DEFAULT 'Asia/Jakarta',
  calculation_method TEXT DEFAULT 'Kemenag/AlAdhan method=20',
  is_default INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prayer_times_cache (
  id TEXT PRIMARY KEY,
  location_key TEXT NOT NULL,
  prayer_date TEXT NOT NULL,
  imsak TEXT,
  fajr TEXT,
  sunrise TEXT,
  dhuhr TEXT,
  asr TEXT,
  maghrib TEXT,
  isha TEXT,
  source TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(location_key, prayer_date)
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON memorization_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_review_user_due ON review_schedule(user_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_submission_user ON submissions(user_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_prayer_cache ON prayer_times_cache(location_key, prayer_date);

