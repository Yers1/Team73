# -*- coding: utf-8 -*-
"""Полный ETL: парсинг -> raw -> нормализация -> offers + история цен."""
import datetime as dt
from collections import defaultdict
from .db import init_db, get_conn
from .config import SOURCES, CLINICS
from .load_reference import seed_clinics, load_services
from .parsers import parse_source
from .normalize import build_index, match
from .common import guess_category


def now():
    return dt.datetime.now().isoformat(timespec='seconds')


def run(reset=True):
    if reset:
        init_db(reset=True)
    seed_clinics()
    n_services = load_services()

    raw_buf, norm_buf, unmatched_buf = [], [], []

    with get_conn() as c:
        idx = build_index(c)
        for meta in SOURCES:
            cid = meta['clinic_id']
            url = CLINICS[cid]['website']
            ts = now()
            cur = c.execute("""INSERT INTO sources
                (clinic_id,file_name,fmt,year,parser,status,parsed_at)
                VALUES (?,?,?,?,?,?,?)""",
                (cid, meta['file'], meta['fmt'], meta['year'], meta['parser'], 'parsing', ts))
            source_id = cur.lastrowid
            try:
                rows = parse_source(meta)
            except Exception as e:
                c.execute("UPDATE sources SET status='error', error=? WHERE id=?", (str(e), source_id))
                continue

            for r in rows:
                price = r.get('price_kzt')
                if not price:
                    continue
                raw_buf.append((source_id, cid, r.get('code_raw'), r.get('name_raw'),
                                r.get('unit_raw'), r.get('price_raw'), price, r.get('section'),
                                r.get('tarif_code'), meta['year'], r.get('page'), ts))
                m = match(r.get('name_raw') or '', r.get('tarif_code'), idx)
                if m['service_id']:
                    cat = idx.svc[m['service_id']]['category']
                    norm_buf.append((cid, m['service_id'], r.get('name_raw'),
                                     idx.svc[m['service_id']]['name'], cat, price, 'KZT',
                                     url, meta['year'], ts, m['method'], m['confidence']))
                else:
                    cat = guess_category(r.get('name_raw') or '')
                    unmatched_buf.append((cid, r.get('name_raw'), price, meta['year'],
                                          m['best_guess'], m['confidence'],
                                          'low_score' if m['best_guess'] else 'no_candidate'))
            c.execute("UPDATE sources SET status='ok', rows_raw=? WHERE id=?", (len(rows), source_id))

        # bulk insert
        c.executemany("""INSERT INTO raw_prices
            (source_id,clinic_id,code_raw,name_raw,unit_raw,price_raw,price_kzt,section,tarif_code,year,page,parsed_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""", raw_buf)
        c.executemany("""INSERT INTO normalized_prices
            (clinic_id,service_id,service_name_raw,name_norm,category,price_kzt,currency,source_url,year,parsed_at,match_method,confidence)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""", norm_buf)
        c.executemany("""INSERT INTO unmatched
            (clinic_id,name_raw,price_kzt,year,best_guess,best_score,reason)
            VALUES (?,?,?,?,?,?,?)""", unmatched_buf)

        _build_offers_and_history(c)
        _report(c, n_services)

    # расширение охвата на новые города (после основного пайплайна, отдельным соединением)
    from pipeline.expand_cities import expand
    expand()


def _build_offers_and_history(c):
    """offers = актуальная (последний год) минимальная цена per (clinic, service).
    price_history = мин. цена per (clinic, service, year).
    Фильтруем грубые выбросы цен (ошибки парсинга вроде «забор крови 800700₸»)."""
    import statistics
    rows = c.execute("""SELECT clinic_id, service_id, name_norm, category, price_kzt, year,
                               source_url, parsed_at, match_method, confidence
                        FROM normalized_prices""").fetchall()

    # медиана цены по услуге -> отсев выбросов (> 8x медианы при >=4 ценах)
    svc_prices = defaultdict(list)
    for r in rows:
        svc_prices[r['service_id']].append(r['price_kzt'])
    svc_med = {sid: statistics.median(ps) for sid, ps in svc_prices.items()}

    def is_outlier(r):
        ps = svc_prices[r['service_id']]
        med = svc_med[r['service_id']]
        return len(ps) >= 4 and med > 0 and r['price_kzt'] > 8 * med

    rows = [r for r in rows if not is_outlier(r)]

    # история: (clinic, service, year) -> min price
    hist = {}
    groups = defaultdict(list)
    for r in rows:
        key = (r['clinic_id'], r['service_id'])
        groups[key].append(r)
        hk = (r['clinic_id'], r['service_id'], r['year'])
        if hk not in hist or r['price_kzt'] < hist[hk][0]:
            hist[hk] = (r['price_kzt'], r['name_norm'])

    c.execute("DELETE FROM price_history")
    c.executemany("""INSERT INTO price_history (clinic_id,service_id,name_norm,year,price_kzt)
                     VALUES (?,?,?,?,?)""",
                  [(k[0], k[1], v[1], k[2], v[0]) for k, v in hist.items()])

    # offers: последний год, мин цена в нём, число вариантов
    c.execute("DELETE FROM offers")
    offers = []
    for (cid, sid), lst in groups.items():
        latest = max(r['year'] for r in lst)
        cur_year = [r for r in lst if r['year'] == latest]
        best = min(cur_year, key=lambda r: r['price_kzt'])
        offers.append((cid, sid, best['name_norm'], best['category'], best['price_kzt'],
                       latest, best['source_url'], best['parsed_at'], len(cur_year),
                       best['confidence'], best['match_method']))
    c.executemany("""INSERT INTO offers
        (clinic_id,service_id,name_norm,category,price_kzt,year,source_url,parsed_at,variants,confidence,match_method)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)""", offers)


def _report(c, n_services):
    def one(q, *a):
        return c.execute(q, a).fetchone()[0]
    print("=" * 60)
    print("ПАЙПЛАЙН ЗАВЕРШЁН")
    print("=" * 60)
    print(f"Услуг в справочнике:      {n_services}")
    print(f"Клиник:                   {one('SELECT COUNT(*) FROM clinics')}")
    print(f"Источников:               {one('SELECT COUNT(*) FROM sources')}")
    print(f"RAW строк:                {one('SELECT COUNT(*) FROM raw_prices')}")
    print(f"Нормализовано:            {one('SELECT COUNT(*) FROM normalized_prices')}")
    print(f"В очереди разметки:       {one('SELECT COUNT(*) FROM unmatched')}")
    print(f"Offers (clinic×service):  {one('SELECT COUNT(*) FROM offers')}")
    print(f"Уникальных услуг с ценой: {one('SELECT COUNT(DISTINCT service_id) FROM offers')}")
    print(f"Городов:                  {one('SELECT COUNT(DISTINCT city) FROM clinics')}")
    print(f"Записей истории цен:      {one('SELECT COUNT(*) FROM price_history')}")
    tot = one('SELECT COUNT(*) FROM normalized_prices') + one('SELECT COUNT(*) FROM unmatched')
    matched = one('SELECT COUNT(*) FROM normalized_prices')
    print(f"\nMatch rate:               {100*matched/max(tot,1):.1f}%")
    print("\nПо методам:")
    for r in c.execute("""SELECT match_method, COUNT(*) n, ROUND(AVG(confidence),3) conf
                          FROM normalized_prices GROUP BY match_method ORDER BY n DESC"""):
        print(f"   {r['match_method']:10} {r['n']:6}  avg_conf={r['conf']}")
    print("\nПокрытие по клиникам:")
    for r in c.execute("""SELECT cl.name, COUNT(o.id) offers FROM clinics cl
                          LEFT JOIN offers o ON o.clinic_id=cl.id GROUP BY cl.id ORDER BY offers DESC"""):
        print(f"   {r['name'][:42]:42} {r['offers']}")


if __name__ == "__main__":
    run(reset=True)
