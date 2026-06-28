# -*- coding: utf-8 -*-
"""MedServicePrice.kz — REST API (FastAPI)."""
import statistics
from collections import defaultdict
from fastapi import FastAPI, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pipeline.db import get_conn
from pipeline.normalize import build_index, match
from pipeline.common import norm_text
from pipeline import assistant as assistant_mod

app = FastAPI(title="MedServicePrice.kz API", version="1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

# Индекс нормализации для матчинга запросов (строится при старте)
IDX = None


def get_index():
    global IDX
    if IDX is None:
        with get_conn() as c:
            IDX = build_index(c)
    return IDX


def rows(cur):
    return [dict(r) for r in cur.fetchall()]


def price_stats(prices):
    """Статистика рынка по услуге: медиана, перцентили, разброс."""
    if not prices:
        return {}
    ps = sorted(prices)
    n = len(ps)
    def pct(p):
        return ps[min(n - 1, int(p * n))]
    return dict(
        count=n, min=ps[0], max=ps[-1],
        median=statistics.median(ps),
        p25=pct(0.25), p75=pct(0.75),
        spread_pct=round((ps[-1] - ps[0]) / ps[0] * 100) if ps[0] else 0,
    )


# ---------------------------------------------------------------------------
@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/stats")
def stats():
    with get_conn() as c:
        one = lambda q: c.execute(q).fetchone()[0]
        by_method = {r["match_method"]: r["n"] for r in c.execute(
            "SELECT match_method, COUNT(*) n FROM normalized_prices GROUP BY match_method")}
        return {
            "clinics": one("SELECT COUNT(*) FROM clinics"),
            "cities": one("SELECT COUNT(DISTINCT city) FROM clinics"),
            "services_ref": one("SELECT COUNT(*) FROM services"),
            "services_with_price": one("SELECT COUNT(DISTINCT service_id) FROM offers"),
            "offers": one("SELECT COUNT(*) FROM offers"),
            "raw_rows": one("SELECT COUNT(*) FROM raw_prices"),
            "normalized": one("SELECT COUNT(*) FROM normalized_prices"),
            "unmatched": one("SELECT COUNT(*) FROM unmatched"),
            "history_points": one("SELECT COUNT(*) FROM price_history"),
            "tarif_matches": by_method.get("tarif", 0),
            "by_method": by_method,
            "sources": one("SELECT COUNT(*) FROM sources"),
        }


@app.get("/api/cities")
def cities():
    with get_conn() as c:
        return [r["city"] for r in c.execute(
            "SELECT DISTINCT city FROM clinics WHERE city IS NOT NULL ORDER BY city")]


@app.get("/api/clinics")
def clinics_list():
    with get_conn() as c:
        return rows(c.execute("""
            SELECT cl.*, COUNT(o.id) n_services, MIN(o.price_kzt) min_price
            FROM clinics cl LEFT JOIN offers o ON o.clinic_id = cl.id
            GROUP BY cl.id ORDER BY n_services DESC"""))


@app.get("/api/categories")
def categories():
    with get_conn() as c:
        return [r["category"] for r in c.execute(
            "SELECT category, COUNT(*) n FROM offers GROUP BY category ORDER BY n DESC") if r["category"]]


def _match_service_ids(idx, q):
    """ID услуг по запросу: сильный индекс-матч + подстрочное совпадение по
    нормализованным именам и синонимам. Регистронезависимо для кириллицы
    (Python .lower() в norm_text), в отличие от SQLite LIKE."""
    qn = norm_text(q)
    ids = set()
    m = match(q, None, idx)
    if m.get("service_id"):
        ids.add(m["service_id"])
    if len(qn) >= 2:
        for sid, blob in idx.blob.items():
            if qn in blob:
                ids.add(sid)
    return ids


@app.get("/api/autocomplete")
def autocomplete(q: str = Query(""), limit: int = 8):
    q = q.strip()
    if len(q) < 2:
        return []
    ids = _match_service_ids(get_index(), q)
    if not ids:
        return []
    with get_conn() as c:
        ph = ",".join("?" * len(ids))
        cur = c.execute(f"""
            SELECT s.id, s.name, s.category, COUNT(DISTINCT o.clinic_id) nclinics,
                   MIN(o.price_kzt) min_price
            FROM services s JOIN offers o ON o.service_id = s.id
            WHERE s.id IN ({ph})
            GROUP BY s.id ORDER BY nclinics DESC, LENGTH(s.name) ASC LIMIT ?""",
            list(ids) + [limit])
        return rows(cur)


@app.get("/api/search")
def search(q: str = Query(""), city: str = "", category: str = "",
           sort: str = "popular", price_min: float = 0, price_max: float = 0,
           limit: int = 40):
    q = q.strip()
    with get_conn() as c:
        params, where = [], []
        if q:
            ids = _match_service_ids(get_index(), q)
            if not ids:
                return []
            where.append(f"s.id IN ({','.join('?' * len(ids))})")
            params += list(ids)
        if category:
            where.append("o.category = ?"); params.append(category)
        if city:
            where.append("cl.city = ?"); params.append(city)
        if price_min > 0:
            where.append("o.price_kzt >= ?"); params.append(price_min)
        if price_max > 0:
            where.append("o.price_kzt <= ?"); params.append(price_max)
        wsql = (" WHERE " + " AND ".join(where)) if where else ""
        order = {
            "popular": "nclinics DESC, spread DESC",
            "price_asc": "min_price ASC",
            "price_desc": "max_price DESC",
        }.get(sort, "nclinics DESC")
        cur = c.execute(f"""
            SELECT s.id, s.name, s.category, s.tarif_code,
                   COUNT(DISTINCT o.clinic_id) nclinics,
                   MIN(o.price_kzt) min_price, MAX(o.price_kzt) max_price,
                   AVG(o.price_kzt) avg_price, (MAX(o.price_kzt)-MIN(o.price_kzt)) spread
            FROM services s
            JOIN offers o ON o.service_id = s.id
            JOIN clinics cl ON cl.id = o.clinic_id
            {wsql}
            GROUP BY s.id ORDER BY {order} LIMIT ?""", params + [limit])
        res = rows(cur)
        for r in res:
            r["avg_price"] = round(r["avg_price"]) if r["avg_price"] else None
            r["savings"] = round(r["max_price"] - r["min_price"])
        return res


@app.get("/api/service/{service_id}")
def service_detail(service_id: int, city: str = "", sort: str = "price_asc"):
    with get_conn() as c:
        svc = c.execute("SELECT * FROM services WHERE id=?", (service_id,)).fetchone()
        if not svc:
            return JSONResponse({"error": "not found"}, status_code=404)
        params = [service_id]
        wcity = ""
        if city:
            wcity = " AND cl.city = ?"; params.append(city)
        order = {"price_asc": "o.price_kzt ASC", "price_desc": "o.price_kzt DESC",
                 "rating": "cl.rating DESC"}.get(sort, "o.price_kzt ASC")
        offers = rows(c.execute(f"""
            SELECT o.id, o.price_kzt, o.year, o.confidence, o.match_method, o.variants,
                   cl.id clinic_id, cl.name clinic, cl.city, cl.address, cl.phone,
                   cl.working_hours, cl.website, cl.rating
            FROM offers o JOIN clinics cl ON cl.id = o.clinic_id
            WHERE o.service_id = ?{wcity} ORDER BY {order}""", params))
        st = price_stats([o["price_kzt"] for o in offers])
        med = st.get("median")
        for o in offers:
            o["vs_median_pct"] = round((o["price_kzt"] - med) / med * 100) if med else 0
            # есть ли история цен у этой клиники
            o["has_history"] = c.execute(
                "SELECT COUNT(DISTINCT year) FROM price_history WHERE clinic_id=? AND service_id=?",
                (o["clinic_id"], service_id)).fetchone()[0] > 1
        return {
            "service": dict(svc),
            "stats": st,
            "offers": offers,
        }


@app.get("/api/clinic/{clinic_id}")
def clinic_detail(clinic_id: int, q: str = "", category: str = ""):
    with get_conn() as c:
        cl = c.execute("SELECT * FROM clinics WHERE id=?", (clinic_id,)).fetchone()
        if not cl:
            return JSONResponse({"error": "not found"}, status_code=404)
        params = [clinic_id]
        where = ""
        if q:
            where += " AND s.name LIKE ?"; params.append(f"%{q}%")
        if category:
            where += " AND o.category = ?"; params.append(category)
        offers = rows(c.execute(f"""
            SELECT o.service_id, s.name, o.category, o.price_kzt, o.year
            FROM offers o JOIN services s ON s.id = o.service_id
            WHERE o.clinic_id = ?{where} ORDER BY o.category, s.name""", params))
        by_cat = defaultdict(list)
        for o in offers:
            by_cat[o["category"]].append(o)
        return {"clinic": dict(cl), "n_services": len(offers),
                "by_category": by_cat}


@app.get("/api/history")
def history(service_id: int, clinic_id: int = 0):
    with get_conn() as c:
        if clinic_id:
            pts = rows(c.execute("""
                SELECT year, price_kzt FROM price_history
                WHERE service_id=? AND clinic_id=? ORDER BY year""",
                (service_id, clinic_id)))
            label = c.execute("SELECT name FROM clinics WHERE id=?", (clinic_id,)).fetchone()
            return {"service_id": service_id, "clinic": label["name"] if label else None,
                    "points": pts}
        # рыночная медиана по годам
        raw = rows(c.execute("""
            SELECT year, price_kzt FROM price_history WHERE service_id=? ORDER BY year""",
            (service_id,)))
        by_year = defaultdict(list)
        for r in raw:
            by_year[r["year"]].append(r["price_kzt"])
        pts = [{"year": y, "price_kzt": round(statistics.median(v))}
               for y, v in sorted(by_year.items())]
        return {"service_id": service_id, "clinic": "Рынок (медиана)", "points": pts}


@app.post("/api/basket/optimize")
def basket_optimize(payload: dict = Body(...)):
    """Медкорзина: дешёвая раскладка по клиникам + лучшая одна клиника + экономия."""
    service_ids = payload.get("service_ids", [])
    city = payload.get("city", "")
    if not service_ids:
        return {"items": [], "split": {"total": 0, "plan": []}}
    with get_conn() as c:
        items, split_plan = [], []
        split_total, worst_total = 0, 0
        clinic_cov = defaultdict(lambda: {"sum": 0, "count": 0, "items": []})
        for sid in service_ids:
            params = [sid]
            wcity = ""
            if city:
                wcity = " AND cl.city=?"; params.append(city)
            offers = rows(c.execute(f"""
                SELECT o.price_kzt, cl.id clinic_id, cl.name clinic, cl.city
                FROM offers o JOIN clinics cl ON cl.id=o.clinic_id
                WHERE o.service_id=?{wcity} ORDER BY o.price_kzt""", params))
            svc = c.execute("SELECT name, category FROM services WHERE id=?", (sid,)).fetchone()
            name = svc["name"] if svc else f"#{sid}"
            if not offers:
                items.append({"service_id": sid, "name": name, "found": False})
                continue
            cheapest, dearest = offers[0], offers[-1]
            split_total += cheapest["price_kzt"]
            worst_total += dearest["price_kzt"]
            split_plan.append({"service_id": sid, "name": name,
                               "clinic_id": cheapest["clinic_id"], "clinic": cheapest["clinic"],
                               "city": cheapest["city"], "price_kzt": cheapest["price_kzt"]})
            items.append({"service_id": sid, "name": name, "found": True,
                          "n_clinics": len(offers), "min": cheapest["price_kzt"],
                          "max": dearest["price_kzt"]})
            for o in offers:
                cc = clinic_cov[o["clinic_id"]]
                cc["sum"] += o["price_kzt"]; cc["count"] += 1
                cc["clinic"] = o["clinic"]; cc["city"] = o["city"]
        found = [i for i in items if i.get("found")]
        # лучшая одна клиника: максимум покрытия, затем минимум суммы
        single = None
        if clinic_cov:
            best_id = max(clinic_cov, key=lambda k: (clinic_cov[k]["count"], -clinic_cov[k]["sum"]))
            cc = clinic_cov[best_id]
            single = {"clinic_id": best_id, "clinic": cc["clinic"], "city": cc["city"],
                      "covered": cc["count"], "total_covered": cc["sum"],
                      "missing": len(found) - cc["count"]}
        return {
            "items": items,
            "found_count": len(found),
            "split": {"total": round(split_total), "plan": split_plan},
            "single_clinic": single,
            "worst_total": round(worst_total),
            "savings": round(worst_total - split_total),
            "savings_pct": round((worst_total - split_total) / worst_total * 100) if worst_total else 0,
        }


@app.get("/api/popular")
def popular(limit: int = 10):
    with get_conn() as c:
        return rows(c.execute("""
            SELECT s.id, s.name, s.category, COUNT(DISTINCT o.clinic_id) nclinics,
                   MIN(o.price_kzt) min_price, MAX(o.price_kzt) max_price
            FROM services s JOIN offers o ON o.service_id=s.id
            GROUP BY s.id HAVING nclinics >= 4
            ORDER BY nclinics DESC, (MAX(o.price_kzt)-MIN(o.price_kzt)) DESC LIMIT ?""",
            (limit,)))


# Готовые чек-ап корзины (presets) — bridge intent->services
@app.get("/api/presets")
def presets():
    presets = [
        {"key": "checkup_basic", "title": "Базовый чек-ап",
         "queries": ["общий анализ крови", "общий анализ мочи", "глюкоза", "прием терапевта"]},
        {"key": "heart", "title": "Здоровье сердца",
         "queries": ["прием кардиолога", "ЭКГ", "эхокардиография", "холестерин"]},
        {"key": "thyroid", "title": "Щитовидная железа",
         "queries": ["ТТГ", "Т4 свободный", "УЗИ щитовидной железы", "прием эндокринолога"]},
        {"key": "pregnancy", "title": "Беременность",
         "queries": ["ведение беременности", "УЗИ плода", "общий анализ крови", "прием акушер-гинеколога"]},
    ]
    with get_conn() as c:
        for p in presets:
            sids = []
            for qq in p["queries"]:
                sid = _resolve_service(c, qq)
                if sid:
                    sids.append({"service_id": sid, "query": qq})
            p["services"] = sids
        return presets


def _resolve_service(c, q):
    """Резолв запроса в услугу, у которой ЕСТЬ предложения (для пресетов/поиска)."""
    idx = get_index()
    m = match(q, None, idx)
    if m["service_id"]:
        if c.execute("SELECT 1 FROM offers WHERE service_id=? LIMIT 1", (m["service_id"],)).fetchone():
            return m["service_id"]
    ids = _match_service_ids(idx, q)
    if not ids:
        return m["service_id"]
    ph = ",".join("?" * len(ids))
    r = c.execute(f"""SELECT s.id FROM services s JOIN offers o ON o.service_id=s.id
        WHERE s.id IN ({ph}) GROUP BY s.id
        ORDER BY COUNT(DISTINCT o.clinic_id) DESC LIMIT 1""", list(ids)).fetchone()
    return r["id"] if r else m["service_id"]


@app.post("/api/assistant")
def assistant(payload: dict = Body(...)):
    """AI-ассистент: цена/симптом/чек-ап. Опционально усиливается бесплатным LLM."""
    message = (payload.get("message") or "").strip()
    city = payload.get("city") or None
    lang = payload.get("lang") or "ru"
    with get_conn() as c:
        res = assistant_mod.answer(c, get_index(), message, city, lang)
    # если задан бесплатный ключ (GEMINI_API_KEY/GROQ_API_KEY) — живой язык
    if res.get("kind") in ("price", "checkup", "fallback"):
        ctx = {k: res.get(k) for k in ("kind", "reply", "service_name", "stats", "offers", "items", "split_total", "topic")}
        nicer = assistant_mod.llm_rephrase(message, ctx, lang)
        if nicer:
            res["reply"] = nicer
            res["llm"] = True
    return res


@app.get("/api/admin/sources")
def admin_sources():
    with get_conn() as c:
        return rows(c.execute("""
            SELECT s.*, cl.name clinic_name FROM sources s
            JOIN clinics cl ON cl.id=s.clinic_id ORDER BY s.id"""))


@app.get("/api/admin/unmatched")
def admin_unmatched(limit: int = 50, offset: int = 0, has_guess: int = 0):
    with get_conn() as c:
        where = "WHERE best_guess IS NOT NULL" if has_guess else ""
        total = c.execute(f"SELECT COUNT(*) FROM unmatched {where}").fetchone()[0]
        items = rows(c.execute(f"""
            SELECT u.*, cl.name clinic_name FROM unmatched u
            JOIN clinics cl ON cl.id=u.clinic_id {where}
            ORDER BY u.best_score DESC LIMIT ? OFFSET ?""", (limit, offset)))
        return {"total": total, "items": items}
