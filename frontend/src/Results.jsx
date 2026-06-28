import { useState, useEffect } from 'react'
import { api, fmt } from './api'
import { Spinner, CatIcon, Icon } from './ui'
import { useLang } from './i18n'

export default function Results({ query, onPickService }) {
  const { t } = useLang()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cities, setCities] = useState([])
  const [cats, setCats] = useState([])
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('popular')

  useEffect(() => { api.cities().then(setCities); api.categories().then(setCats) }, [])
  useEffect(() => {
    setLoading(true)
    api.search({ q: query, city, category, sort })
      .then(setData).catch(() => setData([])).finally(() => setLoading(false))
  }, [query, city, category, sort])

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
            <button key={s.id} onClick={() => onPickService(s)}
              className="card flex flex-col gap-4 p-5 text-left transition-colors hover:border-ink-300 md:flex-row md:items-center">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
                <CatIcon c={s.category} size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink-900">{s.name}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                  <span className="tag bg-ink-100 text-ink-600">{t('cat.' + s.category)}</span>
                  <span className="text-ink-400">{s.nclinics} {t('clinicsN')}</span>
                  {s.tarif_code && <span className="tag bg-ink-100 text-ink-500">{t('code')} {s.tarif_code}</span>}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-xs text-ink-400">{t('from')}</div>
                  <div className="text-xl font-extrabold tabular-nums text-ink-900">{fmt(s.min_price)}</div>
                </div>
                <div className="hidden text-right sm:block">
                  <div className="text-xs text-ink-400">{t('saveUpTo')}</div>
                  <div className="text-lg font-bold tabular-nums text-brand-700">{fmt(s.savings)}</div>
                </div>
                <span className="btn-ghost px-3 py-2"><Icon name="arrow" size={16} /></span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
