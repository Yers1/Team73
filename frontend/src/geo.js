// Координаты городов РК [lat, lon] для карт и ссылок
export const CITY = {
  'Алматы': [43.2389, 76.8897], 'Астана': [51.1605, 71.4704],
  'Шымкент': [42.3417, 69.5901], 'Караганда': [49.8047, 73.1094],
  'Актобе': [50.2839, 57.167], 'Павлодар': [52.2873, 76.9674],
  'Тараз': [42.9000, 71.3667], 'Усть-Каменогорск': [49.9489, 82.6276],
  'Семей': [50.4111, 80.2275], 'Костанай': [53.2144, 63.6246],
  'Кызылорда': [44.8488, 65.4823], 'Атырау': [47.0945, 51.9238],
  'Уральск': [51.2225, 51.3865], 'Петропавловск': [54.8753, 69.1628],
  'Туркестан': [43.2973, 68.2517], 'Кокшетау': [53.2833, 69.3833],
}

// Точки для виджета Яндекс.Карт (формат "lon,lat,style", разделитель ~)
export function yandexPoints(clinics) {
  const seen = {}
  return clinics.map((cl) => {
    const b = CITY[cl.city]
    if (!b) return null
    const n = (seen[cl.city] = (seen[cl.city] || 0) + 1)
    const lat = b[0] + (n - 1) * 0.012 * (n % 2 ? 1 : -1)
    const lon = b[1] + (n - 1) * 0.016
    return `${lon.toFixed(4)},${lat.toFixed(4)},pm2rdm`
  }).filter(Boolean).join('~')
}

// Ссылки наружу
export const yandexOpen = (lon, lat, z = 15) =>
  `https://yandex.ru/maps/?ll=${lon},${lat}&z=${z}&pt=${lon},${lat},pm2rdm`
export const gisRoute = (lon, lat) =>
  `https://2gis.kz/directions/points/%7C${lon}%2C${lat}`
