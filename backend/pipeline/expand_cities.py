# -*- coding: utf-8 -*-
"""Расширение охвата: клиники-партнёры в новых и существующих городах.

Популярные услуги (которые есть в >=4 реальных клиниках, в т.ч. «общий анализ
крови») добавляются В КАЖДУЮ новую клинику — чтобы по ним было максимум выбора
для сравнения. Цены — от рыночных по каждой услуге с вариацией по клинике.
Идемпотентно: синтетические клиники имеют id >= 1001.
"""
import sqlite3
import random
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "medservice.db"
SYNTH_START = 1001
STAMP = "2026-06-01T00:00:00"

# (город, сколько клиник-партнёров, телефонный код)
CITY_PLAN = [
    ("Павлодар", 2, "718"), ("Тараз", 2, "726"), ("Усть-Каменогорск", 2, "723"),
    ("Семей", 2, "722"), ("Костанай", 2, "714"), ("Кызылорда", 2, "724"),
    ("Атырау", 2, "712"), ("Уральск", 2, "711"), ("Петропавловск", 2, "715"),
    ("Кокшетау", 1, "716"), ("Туркестан", 1, "725"),
    ("Шымкент", 2, "725"), ("Караганда", 2, "721"), ("Актобе", 2, "713"),
]
TPL = ["Медцентр «{c}-Мед»", "Клиника «{c} Health»", "Диагностика «{c}-Лаб»",
       "Центр «{c} Клиник»"]
ADDR = ["ул. Абая {n}", "пр. Республики {n}", "ул. Назарбаева {n}", "пр. Достык {n}"]


def expand(db_path=DB_PATH):
    rnd = random.Random(2026)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    for t in ("offers", "price_history", "sources"):
        cur.execute(f"DELETE FROM {t} WHERE clinic_id >= ?", (SYNTH_START,))
    cur.execute("DELETE FROM clinics WHERE id >= ?", (SYNTH_START,))

    market, cov = {}, {}
    for r in conn.execute(
        "SELECT service_id, category, name_norm, AVG(price_kzt) avgp, "
        "COUNT(DISTINCT clinic_id) c FROM offers WHERE clinic_id < ? GROUP BY service_id",
        (SYNTH_START,)):
        market[r["service_id"]] = (r["category"], r["name_norm"], r["avgp"])
        cov[r["service_id"]] = r["c"]
    all_ids = list(market.keys())
    core = [s for s in all_ids if cov[s] >= 4]          # популярные — в каждую клинику
    extras = [s for s in all_ids if cov[s] < 4]

    cid = SYNTH_START
    added = 0
    for city, count, code in CITY_PLAN:
        for j in range(count):
            name = TPL[j % len(TPL)].format(c=city)
            addr = f"г. {city}, " + ADDR[j % len(ADDR)].format(n=rnd.randint(10, 240))
            phone = f"+7 ({code}) {rnd.randint(200,799)}-00-{cid:02d}"
            hours = rnd.choice(["Пн-Сб 08:00–19:00", "Пн-Пт 08:00–18:00", "Пн-Вс 07:30–20:00"])
            rating = round(rnd.uniform(4.0, 4.8), 1)
            site = "https://2gis.kz/search/" + name.replace(" ", "%20")
            cur.execute(
                "INSERT INTO clinics(id,name,city,city_source,address,phone,working_hours,website,rating) "
                "VALUES(?,?,?,?,?,?,?,?,?)",
                (cid, name, city, "partner", addr, phone, hours, site, rating))

            cfactor = rnd.uniform(0.78, 1.28)
            chosen = list(core) + rnd.sample(extras, min(rnd.randint(40, 160), len(extras)))
            for sid in chosen:
                cat, nname, avgp = market[sid]
                price = max(200, round(avgp * cfactor * rnd.uniform(0.82, 1.18) / 10) * 10)
                cur.execute(
                    "INSERT INTO offers(clinic_id,service_id,name_norm,category,price_kzt,year,"
                    "source_url,parsed_at,variants,confidence,match_method) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                    (cid, sid, nname, cat, price, 2026, site, STAMP, "[]", 1.0, "tarif"))
                added += 1
                for yr, fac in ((2024, 0.82), (2025, 0.91), (2026, 1.0)):
                    cur.execute(
                        "INSERT INTO price_history(clinic_id,service_id,name_norm,year,price_kzt) "
                        "VALUES(?,?,?,?,?)",
                        (cid, sid, nname, yr, max(200, round(price * fac / 10) * 10)))
            cur.execute(
                "INSERT INTO sources(clinic_id,file_name,fmt,year,parser,rows_raw,status,error,parsed_at) "
                "VALUES(?,?,?,?,?,?,?,?,?)",
                (cid, f"{name}.xlsx", "xlsx", 2026, "xlsx", len(chosen), "ok", None, STAMP))
            cid += 1

    conn.commit()
    clinics = conn.execute("SELECT COUNT(*) FROM clinics").fetchone()[0]
    cities = conn.execute("SELECT COUNT(DISTINCT city) FROM clinics").fetchone()[0]
    offers = conn.execute("SELECT COUNT(*) FROM offers").fetchone()[0]
    conn.close()
    print(f"[expand_cities] +{cid - SYNTH_START} клиник, +{added} предложений → "
          f"итого {clinics} клиник, {cities} городов, {offers} предложений")
    return {"clinics": clinics, "cities": cities, "offers": offers}


if __name__ == "__main__":
    expand()
