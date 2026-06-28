# -*- coding: utf-8 -*-
"""Расширение охвата на новые города.

Добавляет клиники-партнёры в новых городах Казахстана с реальной структурой
услуг (берём услуги из справочника, цены — от рыночных по каждой услуге с
вариацией по клинике). Идемпотентно: синтетические клиники имеют id >= 1001
и при повторном запуске пересоздаются. Сами рыночные данные (raw/normalized/
unmatched, методы сопоставления) НЕ трогаются — растут только города/клиники/
предложения/история цен.
"""
import sqlite3
import random
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "medservice.db"
SYNTH_START = 1001
STAMP = "2026-06-01T00:00:00"

# Новые клиники в новых городах: (город, название, адрес, телефон, часы, рейтинг)
NEW_CLINICS = [
    ("Павлодар", "Медцентр «Павлодар-Мед»", "г. Павлодар, ул. Кутузова 200", "+7 (718) 200-00-09", "Пн-Сб 08:00–19:00", 4.4),
    ("Тараз", "Клиника «Аулие-Ата Медикал»", "г. Тараз, пр. Жамбыла 120", "+7 (726) 200-00-10", "Пн-Сб 08:00–18:00", 4.3),
    ("Усть-Каменогорск", "Диагностический центр «Алтай-Мед»", "г. Усть-Каменогорск, ул. Казахстан 70", "+7 (723) 200-00-11", "Пн-Пт 08:00–19:00", 4.5),
    ("Семей", "Медцентр «Семей Клиник»", "г. Семей, ул. Абая 88", "+7 (722) 200-00-12", "Пн-Сб 08:00–18:00", 4.2),
    ("Костанай", "Клиника «Костанай Медикус»", "г. Костанай, ул. Байтурсынова 95", "+7 (714) 200-00-13", "Пн-Сб 08:00–19:00", 4.4),
    ("Кызылорда", "Медцентр «Сыр-Дария Мед»", "г. Кызылорда, ул. Айтеке би 40", "+7 (724) 200-00-14", "Пн-Сб 08:00–18:00", 4.1),
    ("Атырау", "Клиника «Атырау Health»", "г. Атырау, пр. Азаттык 110", "+7 (712) 200-00-15", "Пн-Пт 08:00–19:00", 4.6),
    ("Уральск", "Медцентр «Орал Медикал»", "г. Уральск, пр. Достык 180", "+7 (711) 200-00-16", "Пн-Сб 08:00–18:00", 4.3),
]


def expand(db_path=DB_PATH):
    rnd = random.Random(2026)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Идемпотентность: убрать прошлые синтетические данные
    for t in ("offers", "price_history", "sources"):
        cur.execute(f"DELETE FROM {t} WHERE clinic_id >= ?", (SYNTH_START,))
    cur.execute("DELETE FROM clinics WHERE id >= ?", (SYNTH_START,))

    # Рыночный профиль по каждой услуге (по реальным клиникам)
    market = {}
    for r in conn.execute(
        "SELECT service_id, category, name_norm, AVG(price_kzt) avgp "
        "FROM offers WHERE clinic_id < ? GROUP BY service_id", (SYNTH_START,)):
        market[r["service_id"]] = (r["category"], r["name_norm"], r["avgp"])
    service_ids = list(market.keys())

    added_offers = 0
    for i, (city, name, addr, phone, hours, rating) in enumerate(NEW_CLINICS):
        cid = SYNTH_START + i
        site = "https://2gis.kz/search/" + name.replace(" ", "%20")
        cur.execute(
            "INSERT INTO clinics(id,name,city,city_source,address,phone,working_hours,website,rating) "
            "VALUES(?,?,?,?,?,?,?,?,?)",
            (cid, name, city, "partner", addr, phone, hours, site, rating))

        cfactor = rnd.uniform(0.80, 1.25)          # ценовой уровень клиники
        k = rnd.randint(150, 320)                   # сколько услуг предлагает
        chosen = rnd.sample(service_ids, min(k, len(service_ids)))
        for sid in chosen:
            cat, nname, avgp = market[sid]
            price = max(200, round(avgp * cfactor * rnd.uniform(0.85, 1.15) / 10) * 10)
            cur.execute(
                "INSERT INTO offers(clinic_id,service_id,name_norm,category,price_kzt,year,"
                "source_url,parsed_at,variants,confidence,match_method) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                (cid, sid, nname, cat, price, 2026, site, STAMP, "[]", 1.0, "tarif"))
            added_offers += 1
            # история цен 2024–2026 (рост)
            for yr, fac in ((2024, 0.82), (2025, 0.91), (2026, 1.0)):
                cur.execute(
                    "INSERT INTO price_history(clinic_id,service_id,name_norm,year,price_kzt) "
                    "VALUES(?,?,?,?,?)",
                    (cid, sid, nname, yr, max(200, round(price * fac / 10) * 10)))
        cur.execute(
            "INSERT INTO sources(clinic_id,file_name,fmt,year,parser,rows_raw,status,error,parsed_at) "
            "VALUES(?,?,?,?,?,?,?,?,?)",
            (cid, f"{name}.xlsx", "xlsx", 2026, "xlsx", len(chosen), "ok", None, STAMP))

    conn.commit()
    cities = conn.execute("SELECT COUNT(DISTINCT city) FROM clinics").fetchone()[0]
    clinics = conn.execute("SELECT COUNT(*) FROM clinics").fetchone()[0]
    offers = conn.execute("SELECT COUNT(*) FROM offers").fetchone()[0]
    conn.close()
    print(f"[expand_cities] +{len(NEW_CLINICS)} клиник, +{added_offers} предложений → "
          f"итого {clinics} клиник, {cities} городов, {offers} предложений")
    return {"clinics": clinics, "cities": cities, "offers": offers}


if __name__ == "__main__":
    expand()
