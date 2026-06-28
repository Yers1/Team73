import { useState, useEffect, useRef } from 'react'
import { api, fmt } from './api'
import { CatIcon } from './ui'
import { useLang } from './i18n'

export default function SearchBar({ onSearch, onPickService, big }) {
  const { t } = useLang()
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(-1)
  const box = useRef(null)
  const timer = useRef(null)

  useEffect(() => {
    if (q.trim().length < 2) { setItems([]); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try { setItems(await api.autocomplete(q)); setOpen(true) } catch { /* ignore */ }
    }, 160)
    return () => clearTimeout(timer.current)
  }, [q])

  useEffect(() => {
    const h = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const submit = (val) => { setOpen(false); onSearch(val ?? q) }
  const key = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, -1)) }
    else if (e.key === 'Enter') {
      if (hi >= 0 && items[hi]) onPickService(items[hi]); else submit()
    } else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={box} className="relative w-full">
      <div className={`flex items-center gap-2 rounded-2xl border bg-white transition
        ${big ? 'px-5 py-4 shadow-lift border-ink-200' : 'px-4 py-2.5 shadow-card border-ink-200'}`}>
        <svg className={`${big ? 'h-6 w-6' : 'h-5 w-5'} text-ink-400`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input
          value={q} onChange={(e) => { setQ(e.target.value); setHi(-1) }} onKeyDown={key}
          onFocus={() => items.length && setOpen(true)}
          placeholder={big ? t('search.big') : t('search.small')}
          className={`flex-1 bg-transparent outline-none placeholder:text-ink-400 ${big ? 'text-lg' : 'text-base'}`}
        />
        <button onClick={() => submit()} className={`btn-primary ${big ? '' : 'px-3 py-1.5 text-sm'}`}>{t('search.btn')}</button>
      </div>

      {open && items.length > 0 && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-lift fade-in">
          {items.map((it, i) => (
            <button key={it.id} onMouseEnter={() => setHi(i)} onClick={() => onPickService(it)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${i === hi ? 'bg-brand-50' : 'hover:bg-ink-50'}`}>
              <CatIcon c={it.category} className="text-lg" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-ink-800">{it.name}</div>
                <div className="text-xs text-ink-400">{t('cat.' + it.category)} · {it.nclinics} {t('clinicsN')}</div>
              </div>
              <div className="whitespace-nowrap text-sm font-semibold text-brand-600">{t('from')} {fmt(it.min_price)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
