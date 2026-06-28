import { useState, useEffect } from 'react'
import SearchBar from './SearchBar'
import Home from './Home'
import Results from './Results'
import ServiceDetail from './ServiceDetail'
import Basket from './Basket'
import MapView from './MapView'
import ClinicView from './ClinicView'
import Favorites from './Favorites'
import Admin from './Admin'
import Assistant from './Assistant'
import Booking from './Booking'
import { Icon } from './ui'
import { useLang } from './i18n'
import { useFav } from './store'

const LS = 'medprice_basket'

export default function App() {
  const { t, lang, setLang } = useLang()
  const { ids: favIds } = useFav()
  const [view, setView] = useState({ name: 'home' })
  const [booking, setBooking] = useState(null)
  const [basket, setBasket] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS)) || [] } catch { return [] }
  })

  useEffect(() => { localStorage.setItem(LS, JSON.stringify(basket)) }, [basket])
  useEffect(() => { window.scrollTo(0, 0) }, [view])

  const go = (v) => setView(v)
  const onSearch = (q) => q?.trim() && setView({ name: 'results', query: q.trim() })
  const onPickService = (s) => setView({ name: 'service', id: s.id })
  const onOpenClinic = (cl) => setView({ name: 'clinic', id: cl.id || cl.clinic_id })
  const openBooking = (clinicName, clinicId, service) =>
    setBooking({ clinic: clinicName, clinic_id: clinicId, service })

  const addToBasket = (item) =>
    setBasket((b) => b.some((x) => x.service_id === item.service_id) ? b : [...b, item])
  const removeFromBasket = (id) => setBasket((b) => b.filter((x) => x.service_id !== id))
  const clearBasket = () => setBasket([])
  const addMany = (items) => setBasket((b) => {
    const ids = new Set(b.map((x) => x.service_id))
    return [...b, ...items.filter((x) => !ids.has(x.service_id))]
  })
  const onPreset = (p) => {
    addMany((p.services || []).map((s) => ({ service_id: s.service_id, name: s.query })))
    setView({ name: 'basket' })
  }
  const openBasketWith = (items) => { addMany(items); setView({ name: 'basket' }) }

  const NavLink = ({ to, children }) => (
    <button onClick={() => go({ name: to })}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${view.name === to ? 'text-brand-700' : 'text-ink-500 hover:text-ink-900'}`}>
      {children}
    </button>
  )

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <button onClick={() => go({ name: 'home' })} className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Icon name="cross" size={20} solid />
            </span>
            <span className="text-[19px] font-extrabold tracking-tight text-ink-900">MedPrice<span className="text-brand-600">.kz</span></span>
          </button>

          {view.name !== 'home' && (
            <div className="ml-2 hidden max-w-md flex-1 md:block">
              <SearchBar onSearch={onSearch} onPickService={onPickService} />
            </div>
          )}

          <nav className="ml-auto flex items-center gap-1">
            <NavLink to="home">{t('nav.search')}</NavLink>
            <NavLink to="map">{t('nav.map')}</NavLink>
            <NavLink to="admin">{t('nav.data')}</NavLink>
            <button onClick={() => go({ name: 'favorites' })}
              title={t('nav.fav')} aria-label={t('nav.fav')}
              className={`relative rounded-lg p-2 transition ${view.name === 'favorites' ? 'text-rose-500' : 'text-ink-400 hover:text-rose-500'}`}>
              <Icon name="heart" size={19} solid={favIds.size > 0} />
              {favIds.size > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{favIds.size}</span>
              )}
            </button>
            <div className="mx-1 flex items-center rounded-lg border border-ink-200 p-0.5 text-xs font-semibold">
              {['ru', 'kk'].map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className={`rounded-md px-2 py-1 transition-colors ${lang === l ? 'bg-brand-600 text-white' : 'text-ink-500 hover:text-ink-900'}`}>
                  {l === 'ru' ? 'РУ' : 'ҚАЗ'}
                </button>
              ))}
            </div>
            <button onClick={() => go({ name: 'basket' })}
              className="relative inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700">
              <Icon name="basket" size={17} strokeWidth={2} />
              <span className="hidden sm:inline">{t('nav.basket')}</span>
              {basket.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold tabular-nums text-brand-700">{basket.length}</span>
              )}
            </button>
          </nav>
        </div>
      </header>

      <main>
        {view.name === 'home' && <Home onSearch={onSearch} onPickService={onPickService} onPreset={onPreset} go={go} />}
        {view.name === 'results' && <Results query={view.query} onPickService={onPickService} />}
        {view.name === 'service' && <ServiceDetail serviceId={view.id} onAdd={addToBasket} onBook={openBooking} go={go} />}
        {view.name === 'basket' && <Basket basket={basket} onRemove={removeFromBasket} onClear={clearBasket} go={go} />}
        {view.name === 'map' && <MapView onOpenClinic={onOpenClinic} />}
        {view.name === 'clinic' && <ClinicView clinicId={view.id} onBook={(cl, name) => openBooking(cl.name, cl.id, name)} go={go} />}
        {view.name === 'favorites' && <Favorites onPickService={onPickService} go={go} />}
        {view.name === 'admin' && <Admin />}
      </main>

      <footer className="border-t border-ink-100 py-8 text-center text-sm text-ink-400">
        {t('footer')}
      </footer>

      <Assistant
        onOpenService={(id) => go({ name: 'service', id })}
        onOpenBasket={openBasketWith}
      />
      {booking && <Booking target={booking} onClose={() => setBooking(null)} />}
    </div>
  )
}
