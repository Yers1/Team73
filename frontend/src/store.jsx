import { createContext, useContext, useState, useCallback } from 'react'

/* ---- Избранное (localStorage) ---- */
const FavCtx = createContext({ list: [], ids: new Set(), toggle: () => {}, isFav: () => false })

export function FavProvider({ children }) {
  const [list, setList] = useState(() => {
    try { return JSON.parse(localStorage.getItem('medprice_fav')) || [] } catch { return [] }
  })
  const toggle = useCallback((item) => {
    setList((prev) => {
      const has = prev.some((x) => x.service_id === item.service_id)
      const next = has ? prev.filter((x) => x.service_id !== item.service_id) : [item, ...prev]
      localStorage.setItem('medprice_fav', JSON.stringify(next))
      return next
    })
  }, [])
  const ids = new Set(list.map((x) => x.service_id))
  return (
    <FavCtx.Provider value={{ list, ids, toggle, isFav: (id) => ids.has(id) }}>
      {children}
    </FavCtx.Provider>
  )
}
export const useFav = () => useContext(FavCtx)

/* ---- Заявки на запись (localStorage) ---- */
export function addBooking(b) {
  const l = getBookings()
  l.unshift(b)
  localStorage.setItem('medprice_bookings', JSON.stringify(l))
}
export function getBookings() {
  try { return JSON.parse(localStorage.getItem('medprice_bookings')) || [] } catch { return [] }
}
