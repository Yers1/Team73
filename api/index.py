# -*- coding: utf-8 -*-
"""Vercel serverless entrypoint — отдаёт ASGI-приложение FastAPI.

Бэкенд лежит в backend/; парсинг в рантайме не нужен — БД собрана заранее
и читается read-only. Vercel @vercel/python сам обслуживает объект `app`.
"""
import os
import sys

_BACKEND = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, os.path.abspath(_BACKEND))

from app.main import app  # noqa: E402

# Vercel ищет переменную `app` (ASGI).
