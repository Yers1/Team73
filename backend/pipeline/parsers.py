# -*- coding: utf-8 -*-
"""Pluggable-парсеры прайсов. Контракт: parse_source(meta) -> list[dict].

Каждая строка raw: code_raw, name_raw, unit_raw, price_raw, price_kzt,
section, tarif_code, page. Добавить источник = добавить парсер сюда.
"""
import re
import warnings
warnings.filterwarnings("ignore")
import pdfplumber
import docx
import pandas as pd
from .common import (clean_price, clean_price_first, norm_tarif,
                     looks_like_section, split_name_prices)
from .config import SOURCE_DIR


def _row(name, price, *, code=None, unit=None, price_raw=None, section=None,
         tarif=None, page=None):
    return dict(code_raw=code, name_raw=name, unit_raw=unit,
                price_raw=price_raw, price_kzt=price, section=section,
                tarif_code=tarif, page=page)


def _ok_name(name):
    return name and len([c for c in name if c.isalpha()]) >= 3


# ---------------------------------------------------------------------------
# Клиника 1 — docx, одна таблица [Код, Наименование, Стоимость]
# ---------------------------------------------------------------------------
def parse_docx_table(path, meta):
    doc = docx.Document(str(path))
    out, section = [], None
    for table in doc.tables:
        for r in table.rows:
            cells = [c.text.strip() for c in r.cells]
            if not cells:
                continue
            # схлопнутые ячейки (раздел) — все одинаковые
            if len(set(cells)) == 1:
                txt = cells[0]
                if _ok_name(txt) and 'наимен' not in txt.lower():
                    section = txt
                continue
            # 3-колоночная структура
            code = cells[0] if len(cells) > 0 else ''
            name = cells[1] if len(cells) > 1 else ''
            price_raw = cells[2] if len(cells) > 2 else ''
            if 'наимен' in name.lower() or 'стоим' in price_raw.lower():
                continue
            price = clean_price(price_raw)
            if price and _ok_name(name):
                out.append(_row(name, price, code=code or None,
                                price_raw=price_raw, section=section))
            elif _ok_name(name) and not price and looks_like_section(name, False):
                section = name
    return out


# ---------------------------------------------------------------------------
# Текстовые PDF: код-имя-цена (Клиника 1 2026) и № -имя-тариф (Клиника 2,4)
# ---------------------------------------------------------------------------
def _pdf_text_lines(path):
    with pdfplumber.open(str(path)) as pdf:
        for pno, page in enumerate(pdf.pages):
            txt = page.extract_text() or ''
            for line in txt.split('\n'):
                line = line.strip()
                if line:
                    yield pno, line


def parse_pdf_lines(path, meta):
    """Общий построчный парсер: имя + цены, первая цена = тариф РК."""
    out, section = [], None
    for pno, line in _pdf_text_lines(path):
        name, prices, code = split_name_prices(line)
        if not prices:
            if looks_like_section(line, False) and len(line) < 60:
                section = line
            continue
        if not _ok_name(name):
            continue
        out.append(_row(name, float(prices[0]), code=code,
                        price_raw=line, section=section, page=pno))
    return out


# ---------------------------------------------------------------------------
# Клиника 3 — PDF с кодами тарификатора (точный якорь нормализации)
# ---------------------------------------------------------------------------
def parse_pdf_tarif_table(path, meta):
    out, section = [], None
    pending_name = None
    for pno, line in _pdf_text_lines(path):
        tarif = norm_tarif(line)
        # убрать код из строки перед разбором имени/цен
        line_wo = line
        if tarif:
            line_wo = re.sub(r'[A-DА-Я][0-9OОЗз]{2}\.[0-9OОЗз]{3}\.[0-9OОЗз]{1,3}', ' ', line, count=1)
        name, prices, code = split_name_prices(line_wo)
        if tarif and prices:
            # имя: с этой строки, иначе из предыдущей (в Клинике 3 имя бывает рядом)
            nm = name if _ok_name(name) else (pending_name or '')
            out.append(_row(nm, float(prices[0]), tarif=tarif,
                            price_raw=line, section=section, page=pno))
            pending_name = None
        elif prices and _ok_name(name):
            out.append(_row(name, float(prices[0]), section=section, page=pno))
            pending_name = None
        elif _ok_name(name) and not prices:
            if looks_like_section(name, False):
                section = name
            else:
                pending_name = name
    return out


# ---------------------------------------------------------------------------
# Клиника 5 — свободная вёрстка «<услуга> <цена> тг»
# ---------------------------------------------------------------------------
_TG_RE = re.compile(r'([А-Яа-яA-Za-z][А-Яа-яA-Za-z \-\.,()]{3,45}?)\s+([\d  ОоOoСс]{2,9})\s*тг', re.IGNORECASE)


def parse_pdf_freeform_tg(path, meta):
    out, seen = [], set()
    with pdfplumber.open(str(path)) as pdf:
        for pno, page in enumerate(pdf.pages):
            txt = page.extract_text() or ''
            for m in _TG_RE.finditer(txt):
                name = m.group(1).strip(' .,-')
                price = clean_price_first(m.group(2))
                if price and _ok_name(name):
                    key = (name.lower(), price)
                    if key not in seen:
                        seen.add(key)
                        out.append(_row(name, price, price_raw=m.group(0), page=pno))
    return out


# ---------------------------------------------------------------------------
# Excel — универсальный экстрактор (ищет колонку названия + цену РК)
# ---------------------------------------------------------------------------
def _price_col_by_numbers(rows, hdr, exclude):
    """Колонка цены = та (не из exclude), где больше всего правдоподобных цен."""
    ncol = max((len(r) for r in rows[hdr + 1:hdr + 120]), default=0)
    hits = [0] * ncol
    for row in rows[hdr + 1:hdr + 400]:
        for ci in range(min(ncol, len(row))):
            if ci in exclude:
                continue
            p = clean_price(row[ci])
            if p and 200 <= p <= 5_000_000:
                hits[ci] += 1
    if not any(hits):
        return None
    return max(range(ncol), key=lambda i: hits[i])


def _find_table(rows):
    for ri, row in enumerate(rows):
        cells = ['' if x is None else str(x) for x in row]
        low = [c.lower() for c in cells]
        joined = ' '.join(low)
        if 'наимен' in joined or ('услуг' in joined and 'цена' in joined):
            name_col = next((ci for ci, c in enumerate(low) if 'наимен' in c), None)
            if name_col is None:
                name_col = next((ci for ci, c in enumerate(low) if 'услуг' in c), None)
            code_col = next((ci for ci, c in enumerate(low)
                             if 'код' in c or 'тарификатор' in c or 'мкб' in c), None)
            # колонки-цены по заголовку (НЕ путать с «код по тарификатору»)
            price_cols = [ci for ci, c in enumerate(low)
                          if any(k in c for k in ('цена', 'стоим', 'прайс'))
                          and 'без' not in c and 'код' not in c and 'тарификатор' not in c]
            rk = None
            for ci in price_cols:
                if any(k in low[ci] for k in ('казахстан', 'граждан республики', ' рк', 'рк,')):
                    rk = ci; break
            if rk is None and price_cols:
                rk = price_cols[0]
            # фолбэк: заголовок цены пустой/смещён — ищем по числам
            if rk is None or rk == code_col:
                exclude = {name_col, code_col} - {None}
                rk = _price_col_by_numbers(rows, ri, exclude)
            if name_col is not None and rk is not None:
                return ri, name_col, rk, code_col
    return None


def _numeric_fallback(rows):
    """Если заголовок не найден — угадать колонки имени и цены по содержимому."""
    ncol = max((len(r) for r in rows), default=0)
    text_score = [0] * ncol
    price_col_hits = [0] * ncol
    for row in rows:
        for ci in range(min(ncol, len(row))):
            v = row[ci]
            if v is None:
                continue
            s = str(v)
            if any(c.isalpha() for c in s) and len(s) > 6:
                text_score[ci] += 1
            p = clean_price(s)
            if p and 100 <= p <= 5_000_000:
                price_col_hits[ci] += 1
    if not any(text_score) or not any(price_col_hits):
        return None
    name_col = max(range(ncol), key=lambda i: text_score[i])
    price_candidates = [i for i in range(ncol) if i != name_col]
    rk = max(price_candidates, key=lambda i: price_col_hits[i])
    return 0, name_col, rk, None


def parse_excel_generic(path, meta):
    engine = 'xlrd' if str(path).lower().endswith('.xls') else 'openpyxl'
    xls = pd.ExcelFile(path, engine=engine)
    out = []
    for sheet in xls.sheet_names:
        df = pd.read_excel(path, sheet_name=sheet, engine=engine, header=None)
        rows = df.values.tolist()
        tbl = _find_table(rows) or _numeric_fallback(rows)
        if not tbl:
            continue
        hdr, name_col, rk, code_col = tbl
        section = None
        for row in rows[hdr + 1:]:
            if name_col >= len(row):
                continue
            name = row[name_col]
            name = '' if name is None else str(name).strip()
            if not name or name.lower() == 'nan':
                continue
            price = clean_price(row[rk]) if rk < len(row) else None
            code = None
            if code_col is not None and code_col < len(row) and row[code_col] is not None:
                code = str(row[code_col]).strip()
            if price and _ok_name(name):
                out.append(_row(name, price, code=code, section=section,
                                price_raw=str(row[rk])))
            elif _ok_name(name) and not price and looks_like_section(name, False):
                section = name
    return out


# ---------------------------------------------------------------------------
PARSERS = {
    "docx_table": parse_docx_table,
    "pdf_code_name_price": parse_pdf_lines,
    "pdf_num_name_price": parse_pdf_lines,
    "pdf_tarif_table": parse_pdf_tarif_table,
    "pdf_freeform_tg": parse_pdf_freeform_tg,
    "xlsx_gov": parse_excel_generic,
    "xls_gov": parse_excel_generic,
    "xlsx_insurance": parse_excel_generic,
}


def parse_source(meta):
    path = SOURCE_DIR / meta["file"]
    fn = PARSERS[meta["parser"]]
    rows = fn(path, meta)
    # код услуги в формате тарификатора -> tarif_code (точный якорь нормализации)
    from .common import norm_tarif
    for r in rows:
        if not r.get('tarif_code') and r.get('code_raw'):
            t = norm_tarif(r['code_raw'])
            if t:
                r['tarif_code'] = t
    # дедуп внутри источника по (name, price, tarif)
    seen, dedup = set(), []
    for r in rows:
        key = ((r.get('name_raw') or '').lower().strip(), r.get('price_kzt'), r.get('tarif_code'))
        if key in seen:
            continue
        seen.add(key)
        dedup.append(r)
    return dedup
