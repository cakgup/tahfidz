const DEFAULT_PRAYER_LOCATION = {
  locationName: 'Bekasi',
  latitude: -6.2383,
  longitude: 106.9756,
  timezone: 'Asia/Jakarta'
};

const storedLocationName = localStorage.getItem('hifz_location_name');
const storedLatitude = Number(localStorage.getItem('hifz_latitude'));
const storedLongitude = Number(localStorage.getItem('hifz_longitude'));
const storedTimezone = localStorage.getItem('hifz_timezone');
const hasStoredPrayerLocation = Boolean(storedLocationName) && storedLocationName !== 'Lokasi saat ini' && Number.isFinite(storedLatitude) && Number.isFinite(storedLongitude);

window.HIFZ_CONFIG = {
  // Endpoint Worker Bapak yang sudah berhasil deploy.
  apiBase: localStorage.getItem('hifz_api_base') || 'https://hifz-companion-api.baghasasi.workers.dev',

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
