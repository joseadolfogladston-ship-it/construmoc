@echo off
setlocal
cd /d "%~dp0"
set "PY_CMD=python"
python --version >nul 2>&1
if errorlevel 1 (
  set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
  if not exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    echo.
    echo Python nao foi encontrado.
    echo Instala Python 3 ou abre site\index.html para uma visualizacao limitada.
    pause
    exit /b 1
  )
)
echo.
echo AUTOMATONIA DIGITAL - SERVIDOR LOCAL
echo Apenas no teu computador: http://127.0.0.1:8000/
echo Para encerrar, carrega Ctrl+C nesta janela.
echo.
start "" "http://127.0.0.1:8000/"
if "%PY_CMD%"=="python" (
  python -m http.server 8000 --bind 127.0.0.1 --directory site
) else (
  "%PY_CMD%" -m http.server 8000 --bind 127.0.0.1 --directory site
)
pause
