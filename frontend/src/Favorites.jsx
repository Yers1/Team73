import { fmt } from './api'
import { useLang } from './i18n'
import { useFav } from './store'
import { CatIcon, Icon, FavHeart } from './ui'

export default function Favorites({ onPickService, go }) {
  const { t } = useLang()
  const { list } = useFav()

  if (!list.length)
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center fade-in">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-400">
          <Icon name="heart" size={30} />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink-900">{t('fav.empty')}</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-500">{t('fav.emptyHint')}</p>
        <button onClick={() => go({ name: 'home' })} className="btn-primary mt-6">{t('search.btn')}</button>
      </div>
    )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 fade-in">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold tracking-tight text-ink-900">
        <Icon name="heart" size={22} solid className="text-rose-500" />{t('nav.fav')}
        <span className="text-base font-normal text-ink-400">· {list.length}</span>
      </h1>
      <div className="grid gap-3">
        {list.map((s) => (
          <div key={s.service_id}
            className="card flex items-center gap-4 p-4 transition-colors hover:border-ink-300">
            <button onClick={() => onPickService(s)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
                <CatIcon c={s.category} size={20} />
              </span>
              <div className="min-w-0">
                <div className="truncate font-semibold text-ink-900">{s.name}</div>
                <div className="text-xs text-ink-400">{s.category}{s.nclinics ? ` · ${s.nclinics} клиник` : ''}</div>
              </div>
            </button>
            {s.min_price != null && <div className="text-right text-sm text-ink-500">{t('from')} <b className="tabular-nums text-ink-900">{fmt(s.min_price)}</b></div>}
            <FavHeart item={s} />
          </div>
        ))}
      </div>
    </div>
  )
}
