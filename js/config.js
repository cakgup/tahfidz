const memoryStorage = window.__HIFZ_MEMORY_STORAGE__ || (window.__HIFZ_MEMORY_STORAGE__ = new Map());
const storage = (() => {
  try {
    if(typeof localStorage !== 'undefined' && localStorage) {
      return {
        getItem(key){ return localStorage.getItem(key); },
        setItem(key, value){ localStorage.setItem(key, value); },
        removeItem(key){ localStorage.removeItem(key); },
        keys(){ return Object.keys(localStorage); }
      };
    }
  } catch {}
  return {
    getItem(key){ return memoryStorage.has(key) ? memoryStorage.get(key) : null; },
    setItem(key, value){ memoryStorage.set(key, String(value)); },
    removeItem(key){ memoryStorage.delete(key); },
    keys(){ return [...memoryStorage.keys()]; }
  };
})();

window.HIFZ_STORAGE = storage;

const DEFAULT_PRAYER_LOCATION = {
  locationName: 'Bekasi',
  latitude: -6.2383,
  longitude: 106.9756,
  timezone: 'Asia/Jakarta'
};

const storedLocationName = storage.getItem('hifz_location_name');
const storedLatitude = Number(storage.getItem('hifz_latitude'));
const storedLongitude = Number(storage.getItem('hifz_longitude'));
const storedTimezone = storage.getItem('hifz_timezone');
const hasStoredPrayerLocation = Boolean(storedLocationName) && storedLocationName !== 'Lokasi saat ini' && Number.isFinite(storedLatitude) && Number.isFinite(storedLongitude);

window.HIFZ_CONFIG = {
  // Endpoint Worker Bapak yang sudah berhasil deploy.
  apiBase: storage.getItem('hifz_api_base') || 'https://hifz-companion-api.baghasasi.workers.dev',

  // Konten utama Al-Qur'an dari JSON Kemenag yang sudah dinormalisasi.
  quranDataPath: 'data/quran-kemenag-combined.json',
  quranIndexPath: 'data/quran-kemenag-index.json',
  quranSourceLabel: 'Al-Qur’an Kemenag RI',

  ppsaDataUrl: 'https://raw.githubusercontent.com/cakgup/ppsa/main/data/doa.json',
  defaultPrayer: hasStoredPrayerLocation ? {
    locationName: storedLocationName,
    latitude: storedLatitude,
    longitude: storedLongitude,
    timezone: storedTimezone || 'Asia/Jakarta'
  } : DEFAULT_PRAYER_LOCATION
};
