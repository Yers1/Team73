# -*- coding: utf-8 -*-
"""Загрузка справочника услуг и сидирование клиник."""
import json
import re
import datetime as dt
import pandas as pd
from .db import get_conn
from .config import REFERENCE_FILE, CLINICS
from .common import guess_category, norm_text

# Синонимы по ключевым словам (regex -> доп. синонимы). Канонические имена
# справочника технические («ОАК 5 классов»), а ищут «общий анализ крови».
ALIAS_RULES = [
    (r'\bоак\b', ['общий анализ крови', 'клинический анализ крови', 'анализ крови общий', 'ОАК', 'CBC', 'кровь общий анализ']),
    (r'\bоам\b', ['общий анализ мочи', 'клинический анализ мочи', 'анализ мочи общий', 'ОАМ']),
    (r'биохими', ['биохимия', 'биохимия крови', 'БХ крови', 'биохимический анализ']),
    (r'глюкоз', ['сахар крови', 'сахар в крови', 'глюкоза крови', 'уровень сахара']),
    (r'гликозилированн|гликированн', ['HbA1c', 'гликированный гемоглобин', 'гликозилированный гемоглобин']),
    (r'холестерин', ['общий холестерин', 'холестерин крови']),
    (r'тиреотроп|\bттг\b', ['ТТГ', 'тиреотропный гормон']),
    (r'тироксин|\bт4\b', ['Т4', 'тироксин', 'свободный т4']),
    (r'витамин\s*d|витамин\s*д|25-oh', ['витамин Д', 'витамин D', '25-OH витамин D']),
    (r'коагулограмм', ['гемостазиограмма', 'свертываемость крови', 'коагулограмма']),
    (r'ферритин', ['ферритин', 'запасы железа']),
    (r'электрокардиограф|\bэкг\b', ['ЭКГ', 'электрокардиография', 'экг с расшифровкой']),
    (r'эхокардиограф', ['ЭхоКГ', 'УЗИ сердца', 'эхо сердца']),
    (r'флюорограф', ['ФЛГ', 'ФГ', 'флюорография']),
    (r'рентген', ['рентгенография', 'ренген']),
    (r'компьютерн\w*\s*томограф|\bкт\b', ['КТ', 'компьютерная томография']),
    (r'магнитно-резонанс|\bмрт\b', ['МРТ', 'магнитно-резонансная томография']),
    (r'ультразвук|\bузи\b', ['УЗИ', 'ультразвуковое исследование']),
    (r'кардиотокограф', ['КТГ', 'кардиотокография']),
    (r'\bпса\b|простатспециф|простат-специф', ['ПСА', 'онкомаркер простаты']),
]
_ALIAS = [(re.compile(rx, re.IGNORECASE), syns) for rx, syns in ALIAS_RULES]


def paren_synonyms(name):
    syn = set()
    for m in re.finditer(r'\(([^)]{1,40})\)', name):
        inner = m.group(1).strip()
        # аббревиатуры / короткие альтернативы
        for part in re.split(r'[,/;]| или ', inner):
            part = part.strip(' .')
            if 2 <= len(part) <= 30:
                syn.add(part)
    return syn


def base_without_paren(name):
    return re.sub(r'\s*\([^)]*\)', '', name).strip()


def seed_clinics():
    now = dt.datetime.now().isoformat(timespec='seconds')
    with get_conn() as c:
        for cid, m in CLINICS.items():
            c.execute("""INSERT OR REPLACE INTO clinics
                (id,name,city,city_source,address,phone,working_hours,website,rating)
                VALUES (?,?,?,?,?,?,?,?,?)""",
                (cid, m['name'], m['city'], m['city_source'], m['address'],
                 m['phone'], m['working_hours'], m['website'], m['rating']))
    return len(CLINICS)


def load_services():
    df = pd.read_excel(REFERENCE_FILE, sheet_name=0, header=0, engine='openpyxl')
    df.columns = [str(c).strip() for c in df.columns]
    # ожидаем: ID, Специальность, Code, Name_ru, TarificatrCode
    colmap = {}
    for c in df.columns:
        cl = c.lower()
        if cl.startswith('id'): colmap['spec_id'] = c
        elif 'специаль' in cl: colmap['specialty'] = c
        elif cl == 'code' or cl.startswith('code'): colmap['code'] = c
        elif 'name' in cl: colmap['name'] = c
        elif 'tarif' in cl or 'тариф' in cl: colmap['tarif'] = c

    rows = []
    sid = 0
    seen = set()
    for _, r in df.iterrows():
        name = str(r.get(colmap.get('name', ''), '') or '').strip()
        if not name or name.lower() == 'nan':
            continue
        specialty = str(r.get(colmap.get('specialty', ''), '') or '').strip()
        code = str(r.get(colmap.get('code', ''), '') or '').strip()
        tarif = str(r.get(colmap.get('tarif', ''), '') or '').strip()
        if tarif.lower() == 'nan':
            tarif = ''
        key = norm_text(name)
        if key in seen:
            continue
        seen.add(key)
        sid += 1

        syn = paren_synonyms(name)
        base = base_without_paren(name)
        if base and norm_text(base) != key:
            syn.add(base)
        # синонимы по ключевым словам
        nb = norm_text(base) + ' ' + key
        for rx, extra in _ALIAS:
            if rx.search(nb):
                syn.update(extra)
        category = guess_category(name, specialty)
        rows.append((sid, specialty, code, name, category, tarif, json.dumps(sorted(syn), ensure_ascii=False)))

    with get_conn() as c:
        c.execute("DELETE FROM services")
        c.executemany("""INSERT INTO services
            (id,specialty,code,name,category,tarif_code,synonyms)
            VALUES (?,?,?,?,?,?,?)""", rows)
    return len(rows)


if __name__ == "__main__":
    n_cl = seed_clinics()
    n_sv = load_services()
    print(f"clinics seeded: {n_cl}")
    print(f"services loaded: {n_sv}")
    # быстрая сводка
    with get_conn() as c:
        cats = c.execute("SELECT category, COUNT(*) n FROM services GROUP BY category ORDER BY n DESC").fetchall()
        print("categories:", {r['category']: r['n'] for r in cats})
        withtarif = c.execute("SELECT COUNT(*) n FROM services WHERE tarif_code != ''").fetchone()['n']
        print("services with tarif_code:", withtarif)
        sample = c.execute("SELECT name, category, tarif_code, synonyms FROM services WHERE synonyms != '[]' LIMIT 8").fetchall()
        for s in sample:
            print(" ", s['name'], "|", s['category'], "|", s['tarif_code'], "|", s['synonyms'])
