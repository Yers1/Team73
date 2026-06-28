# -*- coding: utf-8 -*-
"""Слой БД: схема SQLite с разделением raw / normalized (требование ТЗ §3.1)."""
import os
import sqlite3
from contextlib import contextmanager
from .config import DB_PATH, DATA_DIR

SCHEMA = """
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Клиники
CREATE TABLE IF NOT EXISTS clinics (
    id            INTEGER PRIMARY KEY,
    name          TEXT NOT NULL,
    city          TEXT,
    city_source   TEXT,
    address       TEXT,
    phone         TEXT,
    working_hours TEXT,
    website       TEXT,
    rating        REAL
);

-- Источники (файлы/URL), журнал парсинга
CREATE TABLE IF NOT EXISTS sources (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    clinic_id   INTEGER REFERENCES clinics(id),
    file_name   TEXT,
    fmt         TEXT,
    year        INTEGER,
    parser      TEXT,
    rows_raw    INTEGER DEFAULT 0,
    status      TEXT,            -- ok / error
    error       TEXT,
    parsed_at   TEXT
);

-- RAW-слой: сырые строки как в источнике (хранятся отдельно, для аудита)
CREATE TABLE IF NOT EXISTS raw_prices (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id    INTEGER REFERENCES sources(id),
    clinic_id    INTEGER REFERENCES clinics(id),
    code_raw     TEXT,
    name_raw     TEXT,
    unit_raw     TEXT,
    price_raw    TEXT,
    price_kzt    REAL,           -- очищенная цена (тариф РК)
    section      TEXT,           -- заголовок раздела из прайса
    tarif_code   TEXT,           -- код тарификатора, если был в источнике
    year         INTEGER,
    page         INTEGER,
    parsed_at    TEXT
);

-- Справочник услуг (нормализованный таргет)
CREATE TABLE IF NOT EXISTS services (
    id          INTEGER PRIMARY KEY,
    specialty   TEXT,
    code        TEXT,
    name        TEXT NOT NULL,
    category    TEXT,
    tarif_code  TEXT,
    synonyms    TEXT             -- JSON-массив синонимов
);

-- NORMALIZED-слой: цены, привязанные к справочнику
CREATE TABLE IF NOT EXISTS normalized_prices (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    clinic_id        INTEGER REFERENCES clinics(id),
    service_id       INTEGER REFERENCES services(id),
    service_name_raw TEXT,
    name_norm        TEXT,
    category         TEXT,
    price_kzt        REAL,
    currency         TEXT DEFAULT 'KZT',
    duration_days    INTEGER,
    source_url       TEXT,
    year             INTEGER,
    parsed_at        TEXT,
    is_active        INTEGER DEFAULT 1,
    match_method     TEXT,        -- tarif_code / exact / synonym / fuzzy
    confidence       REAL
);

-- История цен по годам (для трендов)
CREATE TABLE IF NOT EXISTS price_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    clinic_id   INTEGER,
    service_id  INTEGER,
    name_norm   TEXT,
    year        INTEGER,
    price_kzt   REAL
);

-- Витрина предложений: агрегированная актуальная цена (clinic × service)
-- = быстрый индекс для поиска и сравнения.
CREATE TABLE IF NOT EXISTS offers (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    clinic_id    INTEGER REFERENCES clinics(id),
    service_id   INTEGER REFERENCES services(id),
    name_norm    TEXT,
    category     TEXT,
    price_kzt    REAL,
    year         INTEGER,
    source_url   TEXT,
    parsed_at    TEXT,
    variants     INTEGER DEFAULT 1,
    confidence   REAL,
    match_method TEXT
);
CREATE INDEX IF NOT EXISTS idx_offers_service ON offers(service_id);
CREATE INDEX IF NOT EXISTS idx_offers_clinic  ON offers(clinic_id);

-- Очередь ручной разметки (непривязанные услуги)
CREATE TABLE IF NOT EXISTS unmatched (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    clinic_id    INTEGER,
    name_raw     TEXT,
    price_kzt    REAL,
    year         INTEGER,
    best_guess   TEXT,
    best_score   REAL,
    reason       TEXT
);

CREATE INDEX IF NOT EXISTS idx_norm_service ON normalized_prices(service_id);
CREATE INDEX IF NOT EXISTS idx_norm_clinic  ON normalized_prices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_hist_service ON price_history(service_id);
"""


def connect():
    # На Vercel ФС read-only: открываем БД immutable, без WAL/локов.
    if os.environ.get("VERCEL"):
        conn = sqlite3.connect(f"file:{DB_PATH.as_posix()}?mode=ro&immutable=1", uri=True)
        conn.row_factory = sqlite3.Row
        return conn
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


@contextmanager
def get_conn():
    conn = connect()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db(reset: bool = False):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if reset and DB_PATH.exists():
        # удаляем все таблицы данных, оставляем файл
        with get_conn() as c:
            for t in ["raw_prices", "normalized_prices", "price_history",
                      "offers", "unmatched", "sources", "services", "clinics"]:
                c.execute(f"DROP TABLE IF EXISTS {t}")
    with get_conn() as c:
        c.executescript(SCHEMA)
    return DB_PATH


if __name__ == "__main__":
    import sys
    reset = "--reset" in sys.argv
    p = init_db(reset=reset)
    print("DB initialized at", p, "(reset)" if reset else "")
