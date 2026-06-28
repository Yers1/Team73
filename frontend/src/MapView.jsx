import { useEffect, useState } from 'react'
import { api } from './api'
import { useLang } from './i18n'
import { CITY, yandexPoints, yandexOpen, gisRoute } from './geo'
import { Icon } from './ui'

export default function MapView({ onOpenClinic }) {
  const { t } = useLang()
  const [clinics, setClinics] = useState([])

  useEffect(() => { api.clinics().then(setClinics) }, [])

  const pts = yandexPoints(clinics)
  const nCities = new Set(clinics.map((c) => c.city)).size
  const widget = `https://yandex.ru/map-widget/v1/?ll=68,48.5&z=4&pt=${pts}`

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{t('map.title')}</h1>
          <p className="mt-1 text-ink-500">{clinics.length} {t('map.subA')} {nCities} {t('map.subB')}</p>
        </div>
        <a href={`https://yandex.ru/maps/?ll=68,48.5&z=5&pt=${pts}`} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:border-ink-300">
          {t('map.openY')}<Icon name="source" size={14} />
        </a>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-ink-100 shadow-card">
        {pts
          ? <iframe title="Яндекс.Карты — клиники" src={widget} loading="lazy" className="h-[460px] w-full" />
          : <div className="flex h-[460px] items-center justify-center text-ink-300">…</div>}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold text-ink-900">{t('map.list')}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {clinics.map((cl) => {
          const b = CITY[cl.city]
          return (
            <div key={cl.id} className="card flex items-center gap-3 p-4 transition-colors hover:border-ink-300">
              <button onClick={() => onOpenClinic(cl)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon name="building" size={20} /></span>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-ink-900">{cl.name}</div>
                  <div className="text-xs text-ink-400">{cl.city} · {cl.n_services} {t('map.svc')} · ★ {cl.rating}</div>
                </div>
              </button>
              {b && (
                <a href={gisRoute(b[1], b[0])} target="_blank" rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50">
                  <Icon name="mapPin" size={13} />{t('g2.route')}
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
