@echo off
REM Script para ejecutar ALFABOT en Windows

echo 🚀 Iniciando ALFABOT...

REM Verificar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js no está instalado
    exit /b 1
)

REM Instalar dependencias si es necesario
if not exist "node_modules" (
    echo 📦 Instalando dependencias...
    call npm ci --only=production
)

REM Cargar variables de entorno
if exist ".env" (
    echo ✅ Cargando variables de entorno
    for /f "delims== tokens=1,2" %%A in (.env) do set %%A=%%B
) else (
    echo ⚠️ Archivo .env no encontrado, usando valores por defecto
)

REM Crear directorio para sesiones si no existe
if not exist ".wwebjs_auth" mkdir .wwebjs_auth

REM Ejecutar el bot
echo 🤖 ALFABOT está en línea...
node index.js
