@echo off
chcp 65001 >nul
echo Запуск MedPrice.kz...
start "MedPrice API"  cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
start "MedPrice Web"  cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 5 >nul
start http://127.0.0.1:5173
echo.
echo  API:  http://127.0.0.1:8000/docs
echo  Сайт: http://127.0.0.1:5173
echo  (Закройте окна API и Web, чтобы остановить)
