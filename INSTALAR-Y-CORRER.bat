@echo off
echo.
echo  ==========================================
echo   🎤 KARAOKE NIGHT - Instalador Windows
echo  ==========================================
echo.

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js no está instalado.
    echo    Descárgalo en: https://nodejs.org
    echo    Instala la version LTS y vuelve a correr este archivo.
    pause
    exit /b 1
)

echo ✅ Node.js detectado
echo.
echo 📦 Instalando dependencias... (puede tardar 2-3 minutos)
echo.

npm install

if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias
    pause
    exit /b 1
)

echo.
echo ✅ Instalación completa!
echo.
echo 🚀 Iniciando la app...
echo.
echo    Abre tu navegador en:  http://localhost:3000
echo    Para celulares en WiFi: busca tu IP con "ipconfig"
echo.
echo    Presiona Ctrl+C para detener la app
echo.

npm start
pause
