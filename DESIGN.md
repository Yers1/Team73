# DESIGN.md — MedPrice.kz design system

Register: **product** (tool that serves the task). Trust-grade, clinical-precise.

## Color (OKLCH-reasoned, preserve teal identity)
- **Primary (teal-green):** action, current selection, best-price signal only — never decoration.
  `brand-600 #0E9F6E` / hover `brand-700 #057A55`. Tints `brand-50/100` for selected rows.
- **Ink (cool slate ramp):** structure + text. Body `ink-700 #334155`+, headings `ink-900 #0F172A`.
  Body text never lighter than `ink-500` on white (contrast ≥ 4.5:1).
- **Surface:** content `#ffffff`, app bg cool `ink-50 #f7f9fb` (NOT warm/cream). Borders `ink-100/200` hairline.
- **Signals:** below-market = brand, above-market = amber-600, alert = rose-600. Muted/inactive = ink, never saturated.

## Typography
- One family: **Inter** (system-ui fallback). No display pairing.
- Fixed rem scale for app UI: 12 / 13 / 14 / 16 / 18 / 20 / 24 / 30 / 36 px. Hero may go larger but fixed, not fluid clamp that shrinks in panels.
- Numbers (prices): tabular, semibold/extrabold. `font-variant-numeric: tabular-nums`.
- `text-wrap: balance` on h1–h3. Headings tracking ≥ -0.02em.

## Iconography
- **One line-icon set.** 24px viewBox, `stroke=currentColor`, width 1.75, round caps/joins, `fill=none`.
- Categories: лаборатория=flask, приём врача=stethoscope, диагностика=activity, процедура=syringe.
- UI: search, basket, message (assistant), map-pin, clock, phone, star, check, arrow, trend, building/cross (brand).
- **No emoji anywhere.** Icon inherits text color; sizing via `size` prop.

## Layout & spacing
- 4px base. Section rhythm varied (not uniform). Max content 1152px.
- Cards used only as genuine affordance; never nested. Hairline borders + soft shadow, radius 14–16px.
- Responsive is structural (stack columns, collapse), not fluid type.

## Motion
- 150–220 ms, ease-out. State only: hover, focus, selection, load, reveal-once.
- No decorative pulse/ping. `prefers-reduced-motion` honored.

## Components — states
Every interactive element: default / hover / focus-visible (ring) / active / disabled.
Best-price = solid brand tag. Above-market = amber tag. Provenance (tariff code) = quiet ink tag.
