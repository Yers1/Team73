# -*- coding: utf-8 -*-
"""Матчер нормализации: raw-название -> услуга справочника.

Каскад: код тарификатора (точно) -> точное имя -> синоним -> fuzzy (порог).
Непривязанное уходит в очередь ручной разметки с лучшей догадкой.
"""
import json
from .common import norm_text, norm_tarif

# rapidfuzz — нативный; локально/в пайплайне он есть. На Vercel-serverless его
# не ставим (нет колеса под новый Python) — используем чистый Python-фолбэк.
# Точные/синонимные/код-совпадения от этого не зависят; офферы посчитаны оффлайн.
try:
    from rapidfuzz import process as rf_process, fuzz  # type: ignore
except Exception:  # pragma: no cover - путь Vercel
    import difflib

    def _ratio(a, b):
        return difflib.SequenceMatcher(None, a, b).ratio() * 100.0

    class fuzz:  # noqa: N801 - совместимость API
        @staticmethod
        def token_sort_ratio(a, b):
            return _ratio(' '.join(sorted(a.split())), ' '.join(sorted(b.split())))

        @staticmethod
        def token_set_ratio(a, b):
            A, B = set(a.split()), set(b.split())
            if not A or not B:
                return 100.0 if A == B else 0.0
            inter = ' '.join(sorted(A & B))
            sa = (inter + ' ' + ' '.join(sorted(A - B))).strip()
            sb = (inter + ' ' + ' '.join(sorted(B - A))).strip()
            if not inter:
                return _ratio(' '.join(sorted(A)), ' '.join(sorted(B)))
            return max(_ratio(inter, sa), _ratio(inter, sb), _ratio(sa, sb))

    class rf_process:  # noqa: N801
        @staticmethod
        def extractOne(q, choices, scorer=None, score_cutoff=0):
            best = None
            for i, c in enumerate(choices):
                s = scorer(q, c)
                if s >= score_cutoff and (best is None or s > best[1]):
                    best = (c, s, i)
            return best

        @staticmethod
        def extract(q, choices, scorer=None, limit=5, score_cutoff=0):
            scored = [(c, scorer(q, c), i) for i, c in enumerate(choices)]
            scored = [x for x in scored if x[1] >= score_cutoff]
            scored.sort(key=lambda x: x[1], reverse=True)
            return scored[:limit]


class Index:
    def __init__(self):
        self.by_tarif = {}
        self.by_exact = {}
        self.by_syn = {}
        self.names = []        # нормализованные имена для fuzzy
        self.name_sid = []     # параллельно: sid для каждого имени
        self.svc = {}          # sid -> {name, category, ...}
        self.blob = {}         # sid -> нормализованный текст (имя + все синонимы)


def build_index(conn):
    idx = Index()
    rows = conn.execute("SELECT id, name, category, tarif_code, synonyms FROM services").fetchall()
    for r in rows:
        sid = r['id']
        idx.svc[sid] = dict(name=r['name'], category=r['category'], tarif_code=r['tarif_code'])
        if r['tarif_code']:
            t = norm_tarif(r['tarif_code']) or r['tarif_code'].strip()
            idx.by_tarif.setdefault(t, sid)
        n = norm_text(r['name'])
        if n:
            idx.by_exact.setdefault(n, sid)
            idx.names.append(n)
            idx.name_sid.append(sid)
        syns = json.loads(r['synonyms'] or '[]')
        for syn in syns:
            ns = norm_text(syn)
            if ns:
                idx.by_syn.setdefault(ns, sid)
        # полный текст для подстрочного поиска (имя + все синонимы), per-service
        idx.blob[sid] = norm_text(r['name'] + ' ' + ' '.join(syns))
    return idx


def match(name_raw, tarif, idx):
    """-> dict(service_id, method, confidence, best_guess)."""
    # 1) код тарификатора — точный якорь
    if tarif:
        t = norm_tarif(tarif) or tarif
        if t in idx.by_tarif:
            return dict(service_id=idx.by_tarif[t], method='tarif', confidence=1.0, best_guess=None)
    n = norm_text(name_raw)
    if not n or len([c for c in n if c.isalpha()]) < 3:
        return dict(service_id=None, method='unmatched', confidence=0.0, best_guess=None)
    # 2) точное имя
    if n in idx.by_exact:
        return dict(service_id=idx.by_exact[n], method='exact', confidence=0.98, best_guess=None)
    # 3) синоним
    if n in idx.by_syn:
        return dict(service_id=idx.by_syn[n], method='synonym', confidence=0.92, best_guess=None)
    # 4) fuzzy. token_set ловит кандидатов, token_sort валидирует.
    #    Калибровка на эталонных парах: принимаем, если канон-имя почти
    #    подмножество raw (set>=96) ИЛИ упорядоченное сходство высокое
    #    (set>=86 и sort>=80). Это убивает «...конъюнктивы»->«...из уха».
    if len(n) < 5:
        return dict(service_id=None, method='unmatched', confidence=0.0, best_guess=None)
    cands = rf_process.extract(n, idx.names, scorer=fuzz.token_set_ratio, limit=5, score_cutoff=80)
    best = None
    for cand, set_s, pos in cands:
        sort_s = fuzz.token_sort_ratio(n, cand)
        combined = 0.6 * set_s + 0.4 * sort_s
        if best is None or combined > best[0]:
            best = (combined, set_s, sort_s, pos)
    if best:
        combined, set_s, sort_s, pos = best
        sid = idx.name_sid[pos]
        if set_s >= 96 or (set_s >= 86 and sort_s >= 80):
            return dict(service_id=sid, method='fuzzy', confidence=round(combined / 100, 3), best_guess=None)
        return dict(service_id=None, method='unmatched', confidence=round(set_s / 100, 3),
                    best_guess=idx.svc[sid]['name'])
    return dict(service_id=None, method='unmatched', confidence=0.0, best_guess=None)
