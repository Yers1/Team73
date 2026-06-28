import { useState, useEffect } from 'react'
import { api, fmt, fmtN } from './api'
import { Icon } from './ui'
import { useLang } from './i18n'
import { getBookings } from './store'

const METHOD = { tarif: 'код тарификатора', fuzzy: 'нечёткое сравнение', exact: 'точное имя', synonym: 'синоним' }

export default function Admin() {
  const { t } = useLang()
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [sources, setSources] = useState([])
  const [clinics, setClinics] = useState([])
  const [unmatched, setUnmatched] = useState({ total: 0, items: [] })
  const [bookings] = useState(() => getBookings())

  useEffect(() => {
    api.stats().then(setStats).catch(() => {})
    api.adminSources().then(setSources).catch(() => {})
    api.clinics().then(setClinics).catch(() => {})
    api.adminUnmatched({ limit: 40, has_guess: 1 }).then(setUnmatched).catch(() => {})
  }, [])

  const Tab = ({ id, label }) => (
    <button onClick={() => setTab(id)} className={`chip ${tab === id ? 'chip-active' : ''}`}>{label}</button>
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 fade-in">
      <h1 className="text-2xl font-bold text-ink-900">{t('admin.title')}</h1>
      <p className="mt-1 text-ink-500">{t('admin.subtitle')}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Tab id="overview" label={t('admin.overview')} />
        <Tab id="sources" label={`${t('admin.sources')} (${sources.length})`} />
        <Tab id="queue" label={`${t('admin.queue')} (${fmtN(unmatched.total)})`} />
        <Tab id="bookings" label={`${t('admin.bookings')} (${bookings.length})`} />
      </div>

      {/* ОБЗОР — весь flow */}
      {tab === 'overview' && stats && (
        <div className="mt-5 space-y-6">
          <div>
            <div className="mb-2 text-sm font-semibold text-ink-500">{t('fn.pipeline')}</div>
            <div className="flex flex-wrap items-stretch gap-2">
              {[
                [t('fn.raw'), stats.raw_rows, 'ink'],
                [t('fn.norm'), stats.normalized, 'brand'],
                [t('fn.offers'), stats.offers, 'brand'],
                [t('fn.unmatched'), stats.unmatched, 'amber'],
              ].map(([label, val, color], i, arr) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="card min-w-[150px] p-4">
                    <div className={`text-2xl font-extrabold tabular-nums ${color === 'brand' ? 'text-brand-700' : color === 'amber' ? 'text-amber-600' : 'text-ink-900'}`}>{fmtN(val)}</div>
                    <div className="mt-0.5 text-xs text-ink-500">{label}</div>
                  </div>
                  {i < arr.length - 2 && <Icon name="arrow" size={16} className="text-ink-300" />}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-semibold text-ink-500">{t('fn.methods')}</div>
              <div className="card space-y-3 p-5">
                {Object.entries(stats.by_method || {}).sort((a, b) => b[1] - a[1]).map(([m, n]) => (
                  <div key={m}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-ink-700">{METHOD[m] || m}</span>
                      <span className="font-semibold tabular-nums text-ink-900">{fmtN(n)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.round(n / stats.normalized * 100)}%` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-1 text-xs text-ink-400">из них {fmtN(stats.tarif_matches)} — точные по коду тарификатора (100%)</div>
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold text-ink-500">{t('fn.coverage')}</div>
              <div className="card space-y-2.5 p-5">
                {[...clinics].sort((a, b) => b.n_services - a.n_services).map((cl) => {
                  const max = Math.max(...clinics.map((x) => x.n_services), 1)
                  return (
                    <div key={cl.id}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="truncate pr-2 text-ink-700">{cl.name}</span>
                        <span className="font-semibold tabular-nums text-ink-900">{cl.n_services}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                        <div className="h-full rounded-full bg-brand-400" style={{ width: `${Math.round(cl.n_services / max * 100)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ИСТОЧНИКИ */}
      {tab === 'sources' && (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-ink-100 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase text-ink-400">
              <tr>
                <th className="px-4 py-3">{t('th.clinic')}</th><th className="px-4 py-3">{t('th.file')}</th>
                <th className="px-4 py-3">{t('th.format')}</th><th className="px-4 py-3">{t('th.year')}</th>
                <th className="px-4 py-3">{t('th.parser')}</th><th className="px-4 py-3 text-right">{t('th.rows')}</th>
                <th className="px-4 py-3">{t('th.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {sources.map((s) => (
                <tr key={s.id} className="hover:bg-ink-50">
                  <td className="px-4 py-3 font-medium text-ink-800">{s.clinic_name}</td>
                  <td className="px-4 py-3 text-ink-500">{s.file_name}</td>
                  <td className="px-4 py-3"><span className="tag bg-ink-100 text-ink-600 uppercase">{s.fmt}</span></td>
                  <td className="px-4 py-3 text-ink-500">{s.year}</td>
                  <td className="px-4 py-3 text-xs text-ink-400">{s.parser}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-800">{fmtN(s.rows_raw)}</td>
                  <td className="px-4 py-3">
                    <span className={`tag gap-1 ${s.status === 'ok' ? 'bg-brand-50 text-brand-700' : 'bg-rose-50 text-rose-700'}`}>
                      <Icon name={s.status === 'ok' ? 'check' : 'close'} size={12} strokeWidth={2.4} />{s.status === 'ok' ? 'ok' : 'error'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ОЧЕРЕДЬ РАЗМЕТКИ */}
      {tab === 'queue' && (
        <div className="mt-5">
          <p className="mb-3 text-sm text-ink-400">{t('admin.queueHint')}</p>
          <div className="grid gap-2 md:grid-cols-2">
            {unmatched.items.map((u) => (
              <div key={u.id} className="card flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink-800">{u.name_raw}</div>
                  <div className="text-xs text-ink-400">{u.clinic_name} · {fmt(u.price_kzt)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-ink-400">{t('admin.looksLike')}</div>
                  <div className="text-xs font-semibold text-brand-600">{u.best_guess || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ЗАЯВКИ */}
      {tab === 'bookings' && (
        <div className="mt-5">
          {!bookings.length ? (
            <div className="card p-12 text-center text-ink-400">{t('admin.noBookings')}</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white shadow-card divide-y divide-ink-100">
              {bookings.map((b, i) => (
                <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                  <div className="font-semibold text-ink-900">{b.service}</div>
                  <div className="text-ink-500">{b.clinic}</div>
                  <div className="ml-auto text-ink-600">{b.name} · {b.phone}{b.date ? ` · ${b.date}` : ''}</div>
                  <div className="w-full text-xs text-ink-300 sm:w-auto">{b.at}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
