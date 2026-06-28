import { useState } from 'react'
import { useLang } from './i18n'
import { addBooking } from './store'
import { Icon } from './ui'

export default function Booking({ target, onClose }) {
  const { t } = useLang()
  const [done, setDone] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState('')
  if (!target) return null

  const submit = (e) => {
    e.preventDefault()
    addBooking({
      clinic: target.clinic, clinic_id: target.clinic_id, service: target.service,
      name, phone, date, at: new Date().toLocaleString('ru-RU'),
    })
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-900/40 p-4 fade-in" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="py-4 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Icon name="check" size={28} strokeWidth={2.5} />
            </span>
            <h3 className="mt-4 text-xl font-bold text-ink-900">{t('bk.done')}</h3>
            <p className="mt-1 text-sm text-ink-500">{t('bk.doneHint')}</p>
            <button onClick={onClose} className="btn-primary mt-5 w-full">OK</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink-900">{t('bk.title')}</h3>
              <button type="button" onClick={onClose} aria-label="×" className="rounded-lg p-1 text-ink-400 hover:bg-ink-100"><Icon name="close" size={18} /></button>
            </div>
            <div className="mt-3 rounded-xl bg-ink-50 p-3 text-sm">
              <div className="text-ink-500">{t('bk.clinic')}: <b className="text-ink-800">{target.clinic}</b></div>
              <div className="mt-0.5 text-ink-500">{t('bk.service')}: <b className="text-ink-800">{target.service}</b></div>
            </div>
            <div className="mt-4 space-y-3">
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t('bk.name')} className="field w-full" />
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('bk.phone')} className="field w-full" type="tel" />
              <input value={date} onChange={(e) => setDate(e.target.value)} className="field w-full" type="date" />
            </div>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={onClose} className="btn-ghost flex-1">{t('bk.cancel')}</button>
              <button type="submit" className="btn-primary flex-1">{t('bk.submit')}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
