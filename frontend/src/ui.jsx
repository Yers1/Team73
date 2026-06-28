import { fmt } from './api'
import { useLang } from './i18n'

/* ── Единый набор line-иконок (stroke, currentColor, без эмодзи) ───────────── */
const ICONS = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  flask: <><path d="M9 3h6" /><path d="M10 3v6L5.2 17.3A2 2 0 0 0 7 20.4h10a2 2 0 0 0 1.8-3.1L14 9V3" /><path d="M7.5 14h9" /></>,
  stethoscope: <><path d="M5 3v5a4 4 0 0 0 8 0V3" /><path d="M4.5 3H6M12 3h1.5" /><path d="M9 16a5 5 0 0 0 5 5 4 4 0 0 0 4-4v-2.5" /><circle cx="18" cy="11" r="2" /></>,
  activity: <path d="M3 12h3.5l2.5 7 4-15 2.5 8H21" />,
  syringe: <><path d="m18 2 4 4" /><path d="m17 7 3-3" /><path d="M18.5 8.5 8 19a2.1 2.1 0 0 1-3-3L15.5 5.5z" /><path d="m9 11 4 4" /><path d="m5.5 18.5-3 3" /><path d="m13.5 4.5 6 6" /></>,
  basket: <><path d="M5.5 9h13l-1.1 9.2a2 2 0 0 1-2 1.8H8.6a2 2 0 0 1-2-1.8z" /><path d="M9 9l3-5 3 5" /><path d="M9.7 12.5v4M14.3 12.5v4" /></>,
  message: <path d="M21 11.5A8 8 0 0 1 9.5 19L4 20.5l1.5-5A8 8 0 1 1 21 11.5z" />,
  sparkle: <path d="M12 3c.4 3.6 1.4 4.6 5 5-3.6.4-4.6 1.4-5 5-.4-3.6-1.4-4.6-5-5 3.6-.4 4.6-1.4 5-5z" />,
  mapPin: <><path d="M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10z" /><circle cx="12" cy="11" r="2.2" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></>,
  phone: <path d="M6 4h2.5l1.4 4-2 1.4a10 10 0 0 0 4.7 4.7l1.4-2 4 1.4V18a2 2 0 0 1-2.2 2A15 15 0 0 1 4 6.2 2 2 0 0 1 6 4z" />,
  star: <path d="m12 3.5 2.5 5.2 5.7.8-4.1 4 1 5.6L12 21.5 6.9 19l1-5.6-4.1-4 5.7-.8z" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  arrow: <><path d="M5 12h13" /><path d="m12.5 6 6 6-6 6" /></>,
  trendUp: <><path d="M3 17 9.5 10.5l3.5 3.5L21 6" /><path d="M21 11V6h-5" /></>,
  trendDown: <><path d="M3 7 9.5 13.5l3.5-3.5L21 18" /><path d="M21 13v5h-5" /></>,
  cross: <path d="M10.5 3.5h3a1 1 0 0 1 1 1v4h4a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-4v4a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-4h-4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h4v-4a1 1 0 0 1 1-1z" />,
  building: <><path d="M3 21h18" /><path d="M5 21V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v15" /><path d="M9.5 9h1M13.5 9h1M9.5 13h1M13.5 13h1M11 21v-4h2v4" /></>,
  sliders: <><path d="M4 7h16M4 12h16M4 17h16" /><circle cx="9" cy="7" r="2" fill="var(--bg,#fff)" /><circle cx="15" cy="12" r="2" fill="var(--bg,#fff)" /><circle cx="8" cy="17" r="2" fill="var(--bg,#fff)" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  chevron: <path d="m6 9.5 6 6 6-6" />,
  heart: <path d="M12 20.5S4 15.5 4 9.8C4 7 6 5 8.5 5c1.7 0 3.1.9 3.5 2 .4-1.1 1.8-2 3.5-2C20 5 22 7 22 9.8c0 5.7-8 10.7-10 10.7z" />,
  baby: <><circle cx="12" cy="11" r="7" /><path d="M9.5 10.5h.01M14.5 10.5h.01" /><path d="M9.5 14a3.5 3.5 0 0 0 5 0" /></>,
  pulse: <path d="M3 12h3l2 5 3.5-11 2.5 8 1.5-2H21" />,
  source: <><path d="M14 4h5v5" /><path d="M19 4 9.5 13.5" /><path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" /></>,
}

export function Icon({ name, size = 20, className = '', strokeWidth = 1.75, solid = false }) {
  const p = ICONS[name]
  if (!p) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={solid ? 'currentColor' : 'none'}
      stroke={solid ? 'none' : 'currentColor'} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {p}
    </svg>
  )
}

export const CAT_ICON = {
  'лаборатория': 'flask', 'приём врача': 'stethoscope',
  'диагностика': 'activity', 'процедура': 'syringe',
}
export function CatIcon({ c, size = 20, className = '' }) {
  return <Icon name={CAT_ICON[c] || 'pulse'} size={size} className={className} />
}

export function Spinner({ label }) {
  const { t } = useLang()
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600" />
      <span className="text-sm">{label || t('loading')}</span>
    </div>
  )
}

export function Stat({ value, label, accent }) {
  return (
    <div>
      <div className={`text-2xl font-extrabold tabular-nums tracking-tight md:text-[28px] ${accent ? 'text-brand-700' : 'text-ink-900'}`}>{value}</div>
      <div className="mt-1 text-[13px] text-ink-500">{label}</div>
    </div>
  )
}

/* Бейдж «честной цены» относительно медианы рынка */
export function FairBadge({ pct, cheapest }) {
  const { t } = useLang()
  if (cheapest)
    return <span className="tag gap-1 bg-brand-600 text-white"><Icon name="check" size={13} strokeWidth={2.4} />{t('fair.best')}</span>
  if (pct <= -12)
    return <span className="tag gap-1 bg-brand-50 text-brand-700"><Icon name="trendDown" size={13} strokeWidth={2.2} />{Math.abs(pct)}{t('fair.below')}</span>
  if (pct >= 20)
    return <span className="tag gap-1 bg-amber-50 text-amber-700"><Icon name="trendUp" size={13} strokeWidth={2.2} />{pct}{t('fair.above')}</span>
  return <span className="tag bg-ink-100 text-ink-500">{t('fair.market')}</span>
}

/* Позиция цены на шкале min..max */
export function PriceBar({ value, min, max }) {
  const pos = max > min ? ((value - min) / (max - min)) * 100 : 50
  return (
    <div className="relative h-1.5 w-full rounded-full bg-gradient-to-r from-brand-200 via-ink-200 to-amber-200">
      <div className="absolute -top-[5px] h-4 w-4 -translate-x-1/2 rounded-full border-[3px] border-white bg-ink-900 shadow-sm"
        style={{ left: `${Math.max(2, Math.min(98, pos))}%` }} />
    </div>
  )
}

/* Звёздный рейтинг */
export function Rating({ value }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-ink-500">
      <Icon name="star" size={13} solid className="text-amber-400" />
      <span className="tabular-nums">{value}</span>
    </span>
  )
}

/* SVG-спарклайн истории цен */
export function Spark({ points, w = 196, h = 52 }) {
  if (!points || points.length < 2) return null
  const ys = points.map((p) => p.price_kzt)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const span = maxY - minY || 1
  const px = (i) => (i / (points.length - 1)) * (w - 10) + 5
  const py = (v) => h - 10 - ((v - minY) / span) * (h - 20)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(p.price_kzt).toFixed(1)}`).join(' ')
  const first = ys[0], last = ys[ys.length - 1]
  const up = last > first
  const chg = first ? Math.round(((last - first) / first) * 100) : 0
  const color = up ? '#e11d48' : '#0E9F6E'
  return (
    <div className="flex items-center gap-3">
      <svg width={w} height={h} className="overflow-visible">
        <path d={`${d} L${px(points.length - 1)},${h} L${px(0)},${h} Z`} fill={color} opacity="0.07" />
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={px(i)} cy={py(p.price_kzt)} r="2.5" fill={color} />
            <text x={px(i)} y={h - 1} fontSize="9" fill="#94a3b8" textAnchor="middle">{p.year}</text>
          </g>
        ))}
      </svg>
      <div className={`flex items-center gap-1 text-sm font-bold ${up ? 'text-rose-600' : 'text-brand-700'}`}>
        <Icon name={up ? 'trendUp' : 'trendDown'} size={15} strokeWidth={2.2} />
        <div>
          <div className="tabular-nums leading-none">{Math.abs(chg)}%</div>
          <div className="mt-0.5 text-[10px] font-medium tabular-nums text-ink-400">{fmt(first)} → {fmt(last)}</div>
        </div>
      </div>
    </div>
  )
}
