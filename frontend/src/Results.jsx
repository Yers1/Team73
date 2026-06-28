import { useState, useEffect } from 'react'
import { api, fmt } from './api'
import { Spinner, CatIcon, Icon, FavHeart } from './ui'
import { useLang } from './i18n'

export default function Results({ query, onPickService }) {
  const { t } = useLang()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cities, setCities] = useState([])
  const [cats, setCats] = useState([])
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const [pmin, setPmin] = useState('')
  const [pmax, setPmax] = useState('')
  const [sort, setSort] = useState('popular')

  useEffect(() => { api.cities().then(setCities); api.categories().then(setCats) }, [])
  useEffect(() => {
    setLoading(true)
    const tm = setTimeout(() => {
      api.search({ q: query, city, category, sort, price_min: pmin || 0, price_max: pmax || 0 })
        .then(setData).catch(() => setData([])).finally(() => setLoading(false))
    }, 200)
    return () => clearTimeout(tm)
  }, [query, city, category, sort, pmin, pmax])

  const dirty = city || category || pmin || pmax
  const reset = () => { setCity(''); setCategory(''); setPmin(''); setPmax('') }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 fade-in">
      <div className="mb-6">
        <div className="text-sm text-ink-400">{t('results.title')}</div>
        <h1 className="text-2xl font-bold text-ink-900">«{query}»</h1>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <select value={city} onChange={(e) => setCity(e.target.value)} className="field">
          <option value="">{t('allCities')}</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="field">
          <option value="">{t('allCats')}</option>
          {cats.map((c) => <option key={c} value={c}>{t('cat.' + c)}</option>)}
        </select>
        <div className="flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-1.5">
          <span className="text-sm text-ink-400">{t('priceLabel')}</span>
          <input value={pmin} onChange={(e) => setPmin(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric" placeholder={t('priceFrom')} className="w-16 bg-transparent text-sm outline-none tabular-nums" />
          <span className="text-ink-300">–</span>
          <input value={pmax} onChange={(e) => setPmax(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric" placeholder={t('priceTo')} className="w-16 bg-transparent text-sm outline-none tabular-nums" />
        </div>
        {dirty && <button onClick={reset} className="text-sm text-ink-400 hover:text-rose-600">{t('reset')}</button>}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-ink-400">{t('sort')}</span>
          {[['popular', t('sort.popular')], ['price_asc', t('sort.cheap')], ['price_desc', t('sort.expensive')]].map(([v, l]) => (
            <button key={v} onClick={() => setSort(v)} className={`chip ${sort === v ? 'chip-active' : ''}`}>{l}</button>
          ))}
        </div>
      </div>

      {loading ? <Spinner /> : !data?.length ? (
        <div className="card p-12 text-center text-ink-400">{t('results.empty')}</div>
      ) : (
        <div className="grid gap-3">
          {data.map((s) => (
            <div key={s.id}
              className="card flex flex-col gap-4 p-5 transition-colors hover:border-ink-300 md:flex-row md:items-center">
              <button onClick={() => onPickService(s)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
                  <CatIcon c={s.category} size={22} />
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-ink-900">{s.name}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="tag bg-ink-100 text-ink-600">{t('cat.' + s.category)}</span>
                    <span className="text-ink-400">{s.nclinics} {t('clinicsN')}</span>
                    {s.tarif_code && <span className="tag bg-ink-100 text-ink-500">{t('code')} {s.tarif_code}</span>}
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-ink-400">{t('from')}</div>
                  <div className="text-xl font-extrabold tabular-nums text-ink-900">{fmt(s.min_price)}</div>
                </div>
                <div className="hidden text-right sm:block">
                  <div className="text-xs text-ink-400">{t('saveUpTo')}</div>
                  <div className="text-lg font-bold tabular-nums text-brand-700">{fmt(s.savings)}</div>
                </div>
                <FavHeart item={{ service_id: s.id, name: s.name, category: s.category, min_price: s.min_price, nclinics: s.nclinics }} />
                <button onClick={() => onPickService(s)} className="btn-ghost px-3 py-2"><Icon name="arrow" size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
