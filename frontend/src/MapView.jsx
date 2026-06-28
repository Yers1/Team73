import { useEffect, useRef, useState } from 'react'
import { api, fmt } from './api'
import { useLang } from './i18n'

const CITY = {
  'Алматы': [43.2389, 76.8897], 'Астана': [51.1605, 71.4704],
  'Шымкент': [42.3417, 69.5901], 'Караганда': [49.8047, 73.1094],
  'Актобе': [50.2839, 57.167], 'Павлодар': [52.2873, 76.9674],
  'Тараз': [42.9000, 71.3667], 'Усть-Каменогорск': [49.9489, 82.6276],
  'Семей': [50.4111, 80.2275], 'Костанай': [53.2144, 63.6246],
  'Кызылорда': [44.8488, 65.4823], 'Атырау': [47.0945, 51.9238],
  'Уральск': [51.2225, 51.3865], 'Петропавловск': [54.8753, 69.1628],
  'Туркестан': [43.2973, 68.2517], 'Кокшетау': [53.2833, 69.3833],
}

export default function MapView({ onOpenClinic }) {
  const { t } = useLang()
  const ref = useRef(null)
  const map = useRef(null)
  const [clinics, setClinics] = useState([])

  useEffect(() => { api.clinics().then(setClinics) }, [])

  useEffect(() => {
    if (!ref.current || !window.L || map.current) return
    map.current = window.L.map(ref.current).setView([48.0, 68.0], 5)
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 18,
    }).addTo(map.current)
  }, [])

  useEffect(() => {
    if (!map.current || !window.L || !clinics.length) return
    const seen = {}
    clinics.forEach((cl) => {
      const base = CITY[cl.city]
      if (!base) return
      const n = seen[cl.city] = (seen[cl.city] || 0) + 1
      const lat = base[0] + (n - 1) * 0.06 * (n % 2 ? 1 : -1)
      const lng = base[1] + (n - 1) * 0.08
      const icon = window.L.divIcon({
        className: '', html: `<div style="background:#059669;color:#fff;border:2px solid #fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,.3)">${cl.n_services}</div>`,
        iconSize: [34, 34], iconAnchor: [17, 17],
      })
      const m = window.L.marker([lat, lng], { icon }).addTo(map.current)
      m.bindPopup(`<b>${cl.name}</b><br/>${cl.city} · ★ ${cl.rating}<br/>${cl.n_services} услуг · от ${fmt(cl.min_price)}<br/><span style="color:#047857;font-weight:600">Открыть и записаться →</span><br/><a href="https://2gis.kz/search/${encodeURIComponent(cl.name + ' ' + cl.city)}" target="_blank" rel="noreferrer" style="color:#1e7d3f;font-weight:600">Смотреть в 2ГИС ↗</a>`)
      m.on('click', () => onOpenClinic && onOpenClinic(cl))
    })
  }, [clinics])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 fade-in">
      <h1 className="text-2xl font-bold text-ink-900">{t('map.title')}</h1>
      <p className="mt-1 text-ink-500">{clinics.length} {t('map.subA')} {Object.keys(CITY).filter(c => clinics.some(cl => cl.city === c)).length} {t('map.subB')}</p>
      <div ref={ref} className="mt-6 h-[520px] w-full border border-ink-100 shadow-card" />
    </div>
  )
}
