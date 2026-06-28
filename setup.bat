@echo off
chcp 65001 >nul
echo ============================================
echo   MedPrice.kz — установка зависимостей
echo ============================================
echo.
echo [1/3] Python-зависимости...
cd backend
python -m pip install -r requirements.txt
echo.
echo [2/3] Сборка базы данных (парсинг прайсов)...
python -m pipeline.run_pipeline
cd ..
echo.
echo [3/3] Frontend-зависимости...
cd frontend
call npm install
cd ..
echo.
echo ============================================
echo   Готово! Запустите run.bat
echo ============================================
pause
