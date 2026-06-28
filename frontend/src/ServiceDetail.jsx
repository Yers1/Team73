import { useState, useEffect } from 'react'
import { api, fmt } from './api'
import { Spinner, FairBadge, PriceBar, Spark, CatIcon, Icon, Rating, FavHeart } from './ui'
import { useLang } from './i18n'

function OfferRow({ o, idx, min, max, serviceId, serviceName, onAddClinic, onBook }) {
  const { t } = useLang()
  const [hist, setHist] = useState(null)
  const [show, setShow] = useState(false)
  const loadHist = async () => {
    if (!hist) setHist(await api.history(serviceId, o.clinic_id))
    setShow((s) => !s)
  }
  return (
    <div className={`p-4 md:p-5 ${idx === 0 ? 'bg-brand-50/40' : ''}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3 md:w-72">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-sm font-bold text-ink-500">
            {o.clinic.replace(/[^А-ЯA-Z]/g, '').slice(0, 2) || <Icon name="building" size={18} />}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-ink-900">{o.clinic}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-400">
              <Icon name="mapPin" size={13} />{o.city}<span className="text-ink-300">·</span><Rating value={o.rating} />
            </div>
          </div>
        </div>

        <div className="flex-1">
          <PriceBar value={o.price_kzt} min={min} max={max} />
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <FairBadge pct={o.vs_median_pct} cheapest={idx === 0} />
            {o.has_history && (
              <button onClick={loadHist} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                <Icon name="pulse" size={13} />{show ? t('hideDyn') : t('priceDyn')}
              </button>
            )}
            {o.match_method === 'tarif' && (
              <span className="tag gap-1 bg-ink-100 text-ink-500"><Icon name="check" size={12} strokeWidth={2.4} />{t('byTarif')}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 md:w-72 md:justify-end">
          <div className="text-right">
            <div className="text-2xl font-extrabold tabular-nums text-ink-900">{fmt(o.price_kzt)}</div>
            <a href={o.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-ink-400 hover:text-brand-700">{t('source')}<Icon name="source" size={12} /></a>
          </div>
          <button onClick={() => onAddClinic(o)} title={t('addToBasket')} className="btn-ghost px-2.5 py-2"><Icon name="plus" size={16} /></button>
          <button onClick={() => onBook(o.clinic, o.clinic_id, serviceName)} className="btn-primary px-3 py-2 text-xs">{t('book')}</button>
        </div>
      </div>

      {show && hist?.points?.length >= 2 && (
        <div className="mt-3 rounded-xl bg-white p-3 fade-in"><Spark points={hist.points} /></div>
      )}
      {show && hist && hist.points?.length < 2 && (
        <div className="mt-2 text-xs text-ink-400">{t('noDyn')}</div>
      )}
    </div>
  )
}

export default function ServiceDetail({ serviceId, onAdd, onBook, go }) {
  const { t } = useLang()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState('')
  const [sort, setSort] = useState('price_asc')
  const [cities, setCities] = useState([])
  const [market, setMarket] = useState(null)

  useEffect(() => { api.cities().then(setCities) }, [])
  useEffect(() => {
    setLoading(true)
    api.service(serviceId, { city, sort })
      .then((d) => { setData(d); return api.history(serviceId) })
      .then(setMarket)
      .catch(() => {}).finally(() => setLoading(false))
  }, [serviceId, city, sort])

  if (loading) return <Spinner />
  if (!data?.service) return <div className="p-12 text-center text-ink-400">{t('svcNotFound')}</div>
  const s = data.service, st = data.stats

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 fade-in">
      <button onClick={() => go({ name: 'home' })} className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-ink-700">
        <Icon name="arrow" size={14} className="rotate-180" />{t('back')}
      </button>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <CatIcon c={s.category} size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink-900">{s.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                <span className="tag bg-ink-100 text-ink-600">{t('cat.' + s.category)}</span>
                {s.tarif_code && <span className="tag bg-ink-100 text-ink-500">{t('code')} {s.tarif_code}</span>}
                {s.specialty && <span className="text-ink-400">{s.specialty}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FavHeart item={{ service_id: s.id, name: s.name, category: s.category }} size={20} className="border border-ink-200" />
            <button onClick={() => onAdd({ service_id: s.id, name: s.name })} className="btn-primary">
              <Icon name="plus" size={16} />{t('addToBasket')}
            </button>
          </div>
        </div>

        {st?.count > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-ink-100 pt-5 md:grid-cols-4">
            <div><div className="text-xs text-ink-400">{t('st.min')}</div><div className="text-xl font-extrabold tabular-nums text-brand-700">{fmt(st.min)}</div></div>
            <div><div className="text-xs text-ink-400">{t('st.median')}</div><div className="text-xl font-bold tabular-nums text-ink-900">{fmt(st.median)}</div></div>
            <div><div className="text-xs text-ink-400">{t('st.max')}</div><div className="text-xl font-bold tabular-nums text-ink-700">{fmt(st.max)}</div></div>
            <div><div className="text-xs text-ink-400">{t('st.spread')}</div><div className="text-xl font-bold tabular-nums text-amber-600">+{st.spread_pct}%</div></div>
          </div>
        )}
        {market?.points?.length >= 2 && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-ink-50 p-3">
            <span className="text-xs font-semibold text-ink-500">{t('marketDyn')}</span>
            <Spark points={market.points} />
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <select value={city} onChange={(e) => setCity(e.target.value)} className="field">
          <option value="">{t('allCities')}</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          {[['price_asc', t('sort.cheap')], ['price_desc', t('sort.expensive')], ['rating', t('sort.rating')]].map(([v, l]) => (
            <button key={v} onClick={() => setSort(v)} className={`chip ${sort === v ? 'chip-active' : ''}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card divide-y divide-ink-100">
        {data.offers.map((o, i) => (
          <OfferRow key={o.id} o={o} idx={i} min={st.min} max={st.max} serviceId={s.id}
            serviceName={s.name} onAddClinic={() => onAdd({ service_id: s.id, name: s.name })} onBook={onBook} />
        ))}
        {!data.offers.length && <div className="p-8 text-center text-ink-400">{t('noOffers')}</div>}
      </div>
    </div>
  )
}
