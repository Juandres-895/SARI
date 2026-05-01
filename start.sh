#!/bin/bash
# Script para ejecutar ALFABOT en la nube

echo "🚀 Iniciando ALFABOT..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    exit 1
fi

# Instalar dependencias si es necesario
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm ci --only=production
fi

# Cargar variables de entorno
if [ -f ".env" ]; then
    echo "✅ Cargando variables de entorno"
    set -a
    source .env
    set +a
else
    echo "⚠️ Archivo .env no encontrado, usando valores por defecto"
fi

# Crear directorio para sesiones si no existe
mkdir -p .wwebjs_auth

# Ejecutar el bot
echo "🤖 ALFABOT está en línea..."
node index.js
