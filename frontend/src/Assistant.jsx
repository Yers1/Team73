import { useState, useRef, useEffect } from 'react'
import { api, fmt } from './api'
import { Icon } from './ui'
import { useLang } from './i18n'

function BotCard({ data, onOpenService, onOpenBasket }) {
  const { t } = useLang()
  return (
    <div className="space-y-2">
      <div className="whitespace-pre-line text-sm text-ink-800">{data.reply}</div>

      {data.kind === 'price' && data.offers?.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-ink-100">
          {data.offers.map((o, i) => (
            <button key={i} onClick={() => onOpenService(data.service_id)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-brand-50 ${i === 0 ? 'bg-brand-50/50' : 'bg-white'}`}>
              <span className="min-w-0 truncate text-ink-700">{i === 0 && '★ '}{o.clinic} · {o.city}</span>
              <span className="ml-2 shrink-0 font-bold text-ink-900">{fmt(o.price_kzt)}</span>
            </button>
          ))}
          <button onClick={() => onOpenService(data.service_id)}
            className="w-full bg-white px-3 py-2 text-center text-xs font-semibold text-brand-600 hover:bg-ink-50">
            {t('ai.compareAll')}
          </button>
        </div>
      )}

      {data.kind === 'checkup' && data.basket?.length > 0 && (
        <button onClick={() => onOpenBasket(data.basket)} className="btn-primary w-full">
          <Icon name="basket" size={16} strokeWidth={2} />{t('ai.openBasket')}
          <span className="tabular-nums opacity-90">({fmt(data.split_total)})</span>
        </button>
      )}
    </div>
  )
}

export default function Assistant({ onOpenService, onOpenBasket }) {
  const { t, lang } = useLang()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState(() => [{
    role: 'bot',
    data: { kind: 'greeting', reply: t('ai.hello'), suggestions: [t('ai.sug1'), t('ai.sug2'), t('ai.sug3')] },
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const end = useRef(null)

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, open, loading])

  // пере-перевести приветствие при смене языка (если диалог ещё не начат)
  useEffect(() => {
    setMsgs((m) => (m.length === 1 && m[0].role === 'bot' && m[0].data.kind === 'greeting')
      ? [{ role: 'bot', data: { kind: 'greeting', reply: t('ai.hello'), suggestions: [t('ai.sug1'), t('ai.sug2'), t('ai.sug3')] } }]
      : m)
  }, [lang]) // eslint-disable-line

  const send = async (text) => {
    const q = (text ?? input).trim()
    if (!q || loading) return
    setInput('')
    setMsgs((m) => [...m, { role: 'user', data: { reply: q } }])
    setLoading(true)
    try {
      const res = await api.assistant(q, '', lang)
      setMsgs((m) => [...m, { role: 'bot', data: res }])
    } catch {
      setMsgs((m) => [...m, { role: 'bot', data: { kind: 'error', reply: t('ai.err') } }])
    } finally { setLoading(false) }
  }

  const openService = (id) => { setOpen(false); onOpenService(id) }
  const openBasket = (items) => { setOpen(false); onOpenBasket(items) }
  const lastBot = [...msgs].reverse().find((m) => m.role === 'bot')

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full bg-brand-600 py-3.5 pl-4 pr-5 text-sm font-semibold text-white shadow-lift transition-colors hover:bg-brand-700">
          <Icon name="sparkle" size={18} solid />
          {t('ai.btn')}
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[560px] w-[92vw] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-lift fade-in">
          <div className="flex items-center justify-between bg-gradient-to-br from-brand-600 to-brand-700 px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"><Icon name="sparkle" size={17} solid /></span>
              <div>
                <div className="text-sm font-bold leading-tight">{t('ai.title')}</div>
                <div className="text-[11px] text-brand-100">{t('ai.subtitle')}</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="×" className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15"><Icon name="close" size={16} /></button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-ink-50 p-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'user' ? (
                  <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-brand-600 px-3.5 py-2 text-sm text-white">{m.data.reply}</div>
                ) : (
                  <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 shadow-card">
                    <BotCard data={m.data} onOpenService={openService} onOpenBasket={openBasket} />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex gap-1.5 rounded-2xl rounded-bl-sm bg-white px-4 py-3.5 shadow-card">
                  <span className="typing-dot h-2 w-2 rounded-full bg-ink-300" style={{ animationDelay: '0ms' }} />
                  <span className="typing-dot h-2 w-2 rounded-full bg-ink-300" style={{ animationDelay: '180ms' }} />
                  <span className="typing-dot h-2 w-2 rounded-full bg-ink-300" style={{ animationDelay: '360ms' }} />
                </div>
              </div>
            )}
            <div ref={end} />
          </div>

          {lastBot?.data?.suggestions?.length > 0 && !loading && (
            <div className="flex flex-wrap gap-1.5 border-t border-ink-100 bg-white px-3 py-2">
              {lastBot.data.suggestions.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="rounded-full border border-ink-200 px-2.5 py-1 text-xs text-ink-600 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700">{s}</button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-ink-100 bg-white p-2.5">
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={t('ai.input')}
              className="field flex-1" />
            <button onClick={() => send()} disabled={loading} aria-label="send"
              className="btn-primary px-2.5 py-2.5"><Icon name="arrow" size={16} strokeWidth={2} /></button>
          </div>
        </div>
      )}
    </>
  )
}
