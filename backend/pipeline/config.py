# -*- coding: utf-8 -*-
"""
Конфигурация источников MedServicePrice.kz.

Кейс анонимизировал клиники как «Клиника N». Город берём из данных, где он
явно указан (Клиника 2 — «в пределах г.Астаны»; Клиника 6 — University Medical
Center, Астана; Клиника 8 — ННМЦ, Астана), для остальных назначаем как
редактируемые метаданные (city_source='assumed') для демонстрации охвата.
Архитектура поддерживает реальный город при живом парсинге сайтов.
"""
from pathlib import Path

# Корень с исходными прайс-файлами (родитель backend/)
ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT
DATA_DIR = ROOT / "backend" / "data"
DB_PATH = DATA_DIR / "medservice.db"
REFERENCE_FILE = SOURCE_DIR / "Справочник услуг.xlsx"

# Метаданные клиник
CLINICS = {
    1: dict(name="Клиника 1 (многопрофильный медцентр)", city="Алматы", city_source="assumed",
            address="г. Алматы", phone="+7 (727) 000-00-01", working_hours="Пн-Сб 08:00–20:00",
            website="https://example-clinic1.kz", rating=4.6),
    2: dict(name="Клиника 2 (стационар + поликлиника)", city="Астана", city_source="data",
            address="г. Астана", phone="+7 (7172) 00-00-02", working_hours="Круглосуточно",
            website="https://example-clinic2.kz", rating=4.4),
    3: dict(name="Клиника 3 (лаборатория + диагностика)", city="Алматы", city_source="assumed",
            address="г. Алматы", phone="+7 (727) 000-00-03", working_hours="Пн-Вс 07:00–19:00",
            website="https://example-clinic3.kz", rating=4.5),
    4: dict(name="Клиника 4 (многопрофильная)", city="Шымкент", city_source="assumed",
            address="г. Шымкент", phone="+7 (7252) 00-00-04", working_hours="Пн-Сб 08:00–18:00",
            website="https://example-clinic4.kz", rating=4.2),
    5: dict(name="Клиника 5 (медцентр)", city="Караганда", city_source="assumed",
            address="г. Караганда", phone="+7 (7212) 00-00-05", working_hours="Пн-Пт 09:00–18:00",
            website="https://example-clinic5.kz", rating=4.0),
    6: dict(name="University Medical Center", city="Астана", city_source="data",
            address="г. Астана, пр. Туран 38", phone="+7 (7172) 70-80-90", working_hours="Пн-Пт 08:00–18:00",
            website="https://umc.org.kz", rating=4.8),
    7: dict(name="Клиника 7 (областная)", city="Актобе", city_source="assumed",
            address="г. Актобе", phone="+7 (7132) 00-00-07", working_hours="Пн-Сб 08:00–17:00",
            website="https://example-clinic7.kz", rating=4.1),
    8: dict(name="Национальный научный медицинский центр (ННМЦ)", city="Астана", city_source="data",
            address="г. Астана, пр. Абылай хана 42", phone="+7 (7172) 57-77-77", working_hours="Пн-Пт 08:00–18:00",
            website="https://nnmc.kz", rating=4.7),
}

# Источники: какой файл какой клиники, формат, год, стратегия парсинга
SOURCES = [
    dict(clinic_id=1, file="Клиника 1 прайс 2024.docx", fmt="docx", year=2024, parser="docx_table"),
    dict(clinic_id=1, file="Клиника 1 2026.pdf",        fmt="pdf",  year=2026, parser="pdf_code_name_price"),
    dict(clinic_id=2, file="Клиника 2 прайс 2025 год.PDF", fmt="pdf", year=2025, parser="pdf_num_name_price"),
    dict(clinic_id=2, file="Клиника 2 прайс 2026.pdf",  fmt="pdf",  year=2026, parser="pdf_num_name_price"),
    dict(clinic_id=3, file="Клиника 3 прайс 2026.PDF",  fmt="pdf",  year=2026, parser="pdf_tarif_table"),
    dict(clinic_id=4, file="Клиника 4 прайс 2026.pdf",  fmt="pdf",  year=2026, parser="pdf_num_name_price"),
    dict(clinic_id=5, file="Клиника 5 прайс 2025.pdf",  fmt="pdf",  year=2025, parser="pdf_freeform_tg"),
    dict(clinic_id=6, file="Клиника 6 прайс 2026.xlsx", fmt="xlsx", year=2026, parser="xlsx_gov"),
    dict(clinic_id=7, file="Клиника 7_Прайс 2026.xls",  fmt="xls",  year=2026, parser="xls_gov"),
    dict(clinic_id=8, file="Клиника 8 2026.xlsx",       fmt="xlsx", year=2026, parser="xlsx_insurance"),
]

# Категории услуг (enum из ТЗ)
CATEGORIES = ["приём врача", "лаборатория", "диагностика", "процедура"]
