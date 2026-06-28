import { useState, useEffect } from 'react'
import { api, fmt } from './api'
import { Spinner, CatIcon, Icon, Rating } from './ui'
import { useLang } from './i18n'

export default function ClinicView({ clinicId, onBook, go }) {
  const { t } = useLang()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.clinic(clinicId).then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [clinicId])

  if (loading) return <Spinner />
  if (!data?.clinic) return <div className="p-12 text-center text-ink-400">—</div>
  const cl = data.clinic

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 fade-in">
      <button onClick={() => go({ name: 'map' })} className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-ink-700">
        <Icon name="arrow" size={14} className="rotate-180" />{t('clinic.back')}
      </button>

      <div className="card p-6">
        <div className="flex items-start gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon name="building" size={24} /></span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">{cl.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
              <span className="inline-flex items-center gap-1"><Icon name="mapPin" size={14} />{cl.city}{cl.address ? `, ${cl.address}` : ''}</span>
              <Rating value={cl.rating} />
              <span className="inline-flex items-center gap-1"><Icon name="clock" size={14} />{cl.working_hours}</span>
              <span className="inline-flex items-center gap-1"><Icon name="phone" size={14} />{cl.phone}</span>
            </div>
            <a href={`https://2gis.kz/search/${encodeURIComponent(cl.name + ' ' + cl.city)}`} target="_blank" rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50">
              <Icon name="mapPin" size={14} />{t('g2.rev')}
            </a>
          </div>
        </div>
      </div>

      <h2 className="mb-3 mt-6 text-lg font-bold text-ink-900">
        {t('clinic.services')} <span className="font-normal text-ink-400">· {data.n_services}</span>
      </h2>
      <div className="space-y-5">
        {Object.entries(data.by_category || {}).map(([cat, items]) => (
          <div key={cat}>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-500">
              <CatIcon c={cat} size={16} />{t('cat.' + cat)} <span className="text-ink-300">({items.length})</span>
            </div>
            <div className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white">
              {items.slice(0, 40).map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1 truncate text-sm text-ink-800">{s.name}</div>
                  <div className="font-bold tabular-nums text-ink-900">{fmt(s.price_kzt)}</div>
                  <button onClick={() => onBook(cl, s.name)} className="btn-primary px-3 py-1.5 text-xs">{t('book')}</button>
                </div>
              ))}
            </div>
            {items.length > 40 && <div className="mt-1 text-xs text-ink-400">…ещё {items.length - 40}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
