window.HIFZ_CONFIG = {
  apiBase: localStorage.getItem('hifz_api_base') || '',
  quranDataPath: 'data/quran-sample.json',
  ppsaDataUrl: 'https://raw.githubusercontent.com/cakgup/ppsa/main/data/doa.json',
  defaultPrayer: {
    locationName: localStorage.getItem('hifz_location_name') || 'Bekasi',
    latitude: Number(localStorage.getItem('hifz_latitude') || -6.2383),
    longitude: Number(localStorage.getItem('hifz_longitude') || 106.9756),
    timezone: 'Asia/Jakarta'
  }
};
