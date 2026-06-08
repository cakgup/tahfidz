window.HIFZ_CONFIG = {
  // Endpoint Worker Bapak yang sudah berhasil deploy.
  apiBase: localStorage.getItem('hifz_api_base') || 'https://hifz-companion-api.baghasasi.workers.dev',

  // Konten utama Al-Qur'an dari JSON Kemenag yang sudah dinormalisasi.
  quranDataPath: 'data/quran-kemenag-combined.json',
  quranIndexPath: 'data/quran-kemenag-index.json',
  quranSourceLabel: 'Al-Qur’an Kemenag RI',

  ppsaDataUrl: 'https://raw.githubusercontent.com/cakgup/ppsa/main/data/doa.json',
  defaultPrayer: {
    locationName: localStorage.getItem('hifz_location_name') || 'Bekasi',
    latitude: Number(localStorage.getItem('hifz_latitude') || -6.2383),
    longitude: Number(localStorage.getItem('hifz_longitude') || 106.9756),
    timezone: localStorage.getItem('hifz_timezone') || 'Asia/Jakarta'
  }
};
