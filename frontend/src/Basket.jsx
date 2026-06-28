import { useState, useEffect } from 'react'
import { api, fmt } from './api'
import { Spinner, Icon } from './ui'
import { useLang } from './i18n'

export default function Basket({ basket, onRemove, onClear, go }) {
  const { t } = useLang()
  const [res, setRes] = useState(null)
  const [loading, setLoading] = useState(false)
  const [city, setCity] = useState('')
  const [cities, setCities] = useState([])

  useEffect(() => { api.cities().then(setCities) }, [])
  useEffect(() => {
    if (!basket.length) { setRes(null); return }
    setLoading(true)
    api.basket(basket.map((b) => b.service_id), city)
      .then(setRes).catch(() => {}).finally(() => setLoading(false))
  }, [basket, city])

  if (!basket.length)
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center fade-in">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Icon name="basket" size={30} strokeWidth={1.6} />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink-900">{t('basket.empty')}</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-500">{t('basket.emptyHint')}</p>
        <button onClick={() => go({ name: 'home' })} className="btn-primary mt-6">{t('basket.pick')}</button>
      </div>
    )

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Icon name="basket" size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">{t('nav.basket')}</h1>
            <p className="text-sm text-ink-500">{basket.length} {t('svcGen')} — {t('basket.optimize')}</p>
          </div>
        </div>
        <button onClick={onClear} className="text-sm text-ink-400 transition-colors hover:text-rose-600">{t('clear')}</button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold text-ink-900">{t('services')}</div>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="field py-1.5">
              <option value="">{t('allCities')}</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="divide-y divide-ink-100">
            {basket.map((b) => (
              <div key={b.service_id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 text-sm font-medium text-ink-800">{b.name}</div>
                <button onClick={() => onRemove(b.service_id)} className="text-ink-300 hover:text-rose-500"><Icon name="close" size={15} /></button>
              </div>
            ))}
          </div>
        </div>

        <div>
          {loading ? <Spinner /> : res && (
            <div className="space-y-4">
              <div className="card overflow-hidden">
                <div className="bg-brand-700 p-6 text-white">
                  <div className="text-sm font-medium text-brand-100">{t('basket.split')}</div>
                  <div className="mt-1 text-4xl font-extrabold tabular-nums tracking-tight">{fmt(res.split.total)}</div>
                  {res.savings > 0 && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold">
                      <Icon name="trendDown" size={15} strokeWidth={2.2} />
                      {t('basket.saveUpTo')} {fmt(res.savings)} ({res.savings_pct}%) {t('basket.vsWorst')}
                    </div>
                  )}
                </div>
                <div className="divide-y divide-ink-100">
                  {res.split.plan.map((p) => (
                    <div key={p.service_id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-ink-800">{p.name}</div>
                        <div className="text-xs text-ink-400">→ {p.clinic} · {p.city}</div>
                      </div>
                      <div className="font-bold tabular-nums text-ink-900">{fmt(p.price_kzt)}</div>
                    </div>
                  ))}
                </div>
                {res.found_count < basket.length && (
                  <div className="bg-amber-50 px-5 py-2 text-xs text-amber-700">
                    {basket.length - res.found_count} {t('basket.notFoundCity')}
                  </div>
                )}
              </div>

              {res.single_clinic && (
                <div className="card p-5">
                  <div className="text-sm font-medium text-ink-400">{t('basket.single')}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-ink-900">{res.single_clinic.clinic}</div>
                      <div className="text-xs text-ink-400">
                        {res.single_clinic.city} · {t('basket.covers')} {res.single_clinic.covered} {t('of')} {res.found_count} {t('svcGen')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-extrabold tabular-nums text-ink-900">{fmt(res.single_clinic.total_covered)}</div>
                      {res.single_clinic.missing > 0 && (
                        <div className="text-xs text-amber-600">{t('basket.missing')} {res.single_clinic.missing} {t('svcGen')}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
