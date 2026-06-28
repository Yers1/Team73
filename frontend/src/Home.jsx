import { useState, useEffect } from 'react'
import { api, fmt, fmtN } from './api'
import { Stat, CatIcon, Icon, FavHeart } from './ui'
import { useLang } from './i18n'
import SearchBar from './SearchBar'

const PRESET_ICON = { checkup_basic: 'stethoscope', heart: 'heart', thyroid: 'activity', pregnancy: 'baby' }
const CHIPS = [
  { q: 'Общий анализ крови', ru: 'Общий анализ крови', kk: 'Қан жалпы анализі' },
  { q: 'УЗИ', ru: 'УЗИ', kk: 'УДЗ' },
  { q: 'Приём терапевта', ru: 'Приём терапевта', kk: 'Терапевт қабылдауы' },
  { q: 'МРТ', ru: 'МРТ', kk: 'МРТ' },
  { q: 'Глюкоза', ru: 'Глюкоза', kk: 'Глюкоза' },
]

export default function Home({ onSearch, onPickService, onPreset }) {
  const { t, lang } = useLang()
  const [stats, setStats] = useState(null)
  const [popular, setPopular] = useState([])
  const [presets, setPresets] = useState([])

  useEffect(() => {
    api.stats().then(setStats).catch(() => {})
    api.popular().then(setPopular).catch(() => {})
    api.presets().then(setPresets).catch(() => {})
  }, [])

  return (
    <div className="fade-in">
      {/* HERO */}
      <section className="hero border-b border-ink-100">
        <div className="mx-auto max-w-4xl px-4 pt-20 pb-14 text-center md:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-500">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {t('hero.badge')}
          </span>
          <h1 className="mt-5 text-[34px] font-extrabold leading-[1.08] tracking-tight text-ink-900 md:text-[56px]">
            {t('hero.title1')}<br className="hidden md:block" /> {t('hero.title2')}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-500">{t('hero.subtitle')}</p>

          <div className="mx-auto mt-8 max-w-2xl">
            <SearchBar big onSearch={onSearch} onPickService={onPickService} />
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-ink-400">{t('hero.popular')}</span>
              {CHIPS.map((c) => (
                <button key={c.q} className="chip" onClick={() => onSearch(c.q)}>{lang === 'kk' ? c.kk : c.ru}</button>
              ))}
            </div>
          </div>
        </div>

        {stats && (
          <div className="mx-auto max-w-4xl px-4 pb-14">
            <div className="card grid grid-cols-2 gap-x-4 gap-y-6 p-6 sm:grid-cols-3 md:grid-cols-5 md:p-7">
              <Stat accent value={fmtN(stats.offers)} label={t('stat.offers')} />
              <Stat value={stats.clinics} label={t('stat.clinics')} />
              <Stat value={stats.cities} label={t('stat.cities')} />
              <Stat value={fmtN(stats.services_with_price)} label={t('stat.services')} />
              <Stat value={fmtN(stats.tarif_matches)} label={t('stat.tarif')} />
            </div>
          </div>
        )}
      </section>

      {/* PRESETS */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold tracking-tight text-ink-900">{t('presets.title')}</h2>
        <p className="mt-1.5 text-ink-500">{t('presets.subtitle')}</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {presets.map((p) => (
            <button key={p.key} onClick={() => onPreset(p)}
              className="card group p-5 text-left transition-shadow hover:shadow-lift">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon name={PRESET_ICON[p.key] || 'stethoscope'} size={22} />
              </span>
              <div className="mt-4 font-semibold text-ink-900">{t('preset.' + p.key)}</div>
              <div className="mt-0.5 text-sm text-ink-500">{p.services?.length || 0} {t('presets.count')}</div>
              <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                {t('presets.cta')} <Icon name="arrow" size={15} className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* POPULAR */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="text-2xl font-bold tracking-tight text-ink-900">{t('popular.title')}</h2>
        <p className="mt-1.5 text-ink-500">{t('popular.subtitle')}</p>
        <div className="mt-7 grid gap-3 md:grid-cols-2">
          {popular.map((s) => (
            <div key={s.id}
              className="card flex items-center gap-4 p-4 transition-colors hover:border-ink-300">
              <button onClick={() => onPickService(s)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
                  <CatIcon c={s.category} size={20} />
                </span>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-ink-900">{s.name}</div>
                  <div className="text-xs text-ink-400">{s.nclinics} {t('clinicsN')} · {t('cat.' + s.category)}</div>
                </div>
              </button>
              <div className="text-right">
                <div className="text-sm text-ink-500">{t('from')} <b className="tabular-nums text-ink-900">{fmt(s.min_price)}</b></div>
                <div className="text-xs font-semibold tabular-nums text-brand-700">{t('saveUpTo')} {fmt(s.max_price - s.min_price)}</div>
              </div>
              <FavHeart item={{ service_id: s.id, name: s.name, category: s.category, min_price: s.min_price, nclinics: s.nclinics }} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
