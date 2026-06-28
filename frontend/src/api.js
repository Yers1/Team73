// В проде фронт и API на одном домене Vercel — относительный base ('').
// В дев-режиме ходим на локальный uvicorn. Можно переопределить через VITE_API.
const BASE = import.meta.env.VITE_API ?? (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000')

async function get(path, params) {
  let qs = ''
  if (params) {
    const sp = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== '' && v != null) sp.set(k, v) })
    const s = sp.toString()
    if (s) qs = '?' + s
  }
  const r = await fetch(BASE + path + qs)
  if (!r.ok) throw new Error(`${r.status}`)
  return r.json()
}
async function post(path, body) {
  const r = await fetch(BASE + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`${r.status}`)
  return r.json()
}

export const api = {
  stats: () => get('/api/stats'),
  cities: () => get('/api/cities'),
  clinics: () => get('/api/clinics'),
  categories: () => get('/api/categories'),
  autocomplete: (q) => get('/api/autocomplete', { q }),
  search: (p) => get('/api/search', p),
  service: (id, p) => get(`/api/service/${id}`, p),
  clinic: (id, p) => get(`/api/clinic/${id}`, p),
  history: (service_id, clinic_id) => get('/api/history', { service_id, clinic_id }),
  basket: (service_ids, city) => post('/api/basket/optimize', { service_ids, city }),
  popular: () => get('/api/popular'),
  presets: () => get('/api/presets'),
  assistant: (message, city, lang) => post('/api/assistant', { message, city, lang }),
  adminSources: () => get('/api/admin/sources'),
  adminUnmatched: (p) => get('/api/admin/unmatched', p),
}

export const fmt = (n) =>
  n == null ? '—' : Math.round(n).toLocaleString('ru-RU') + ' ₸'
export const fmtN = (n) => (n == null ? '—' : Math.round(n).toLocaleString('ru-RU'))
