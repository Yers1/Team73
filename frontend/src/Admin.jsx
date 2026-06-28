import { useState, useEffect } from 'react'
import { api, fmt, fmtN } from './api'
import { Icon } from './ui'
import { useLang } from './i18n'

export default function Admin() {
  const { t } = useLang()
  const [sources, setSources] = useState([])
  const [unmatched, setUnmatched] = useState({ total: 0, items: [] })
  const [tab, setTab] = useState('sources')

  useEffect(() => {
    api.adminSources().then(setSources).catch(() => {})
    api.adminUnmatched({ limit: 40, has_guess: 1 }).then(setUnmatched).catch(() => {})
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 fade-in">
      <h1 className="text-2xl font-bold text-ink-900">{t('admin.title')}</h1>
      <p className="mt-1 text-ink-500">{t('admin.subtitle')}</p>

      <div className="mt-6 flex gap-2">
        <button onClick={() => setTab('sources')} className={`chip ${tab === 'sources' ? 'chip-active' : ''}`}>{t('admin.sources')} ({sources.length})</button>
        <button onClick={() => setTab('queue')} className={`chip ${tab === 'queue' ? 'chip-active' : ''}`}>{t('admin.queue')} ({fmtN(unmatched.total)})</button>
      </div>

      {tab === 'sources' && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
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
                      <Icon name={s.status === 'ok' ? 'check' : 'close'} size={12} strokeWidth={2.4} />
                      {s.status === 'ok' ? 'ok' : 'error'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                  {u.best_score > 0 && <div className="text-[10px] text-ink-300">{Math.round(u.best_score * 100)}%</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
