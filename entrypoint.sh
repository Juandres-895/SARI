#!/bin/bash

# Limpiar locks del navegador ANTES de iniciar Node
echo "🧹 Limpiando locks del navegador..."

SESSION_PATH="/app/.wwebjs_auth/session"

# Crear directorio si no existe
mkdir -p "$SESSION_PATH"

# Eliminar archivos de lock conocidos
rm -f "$SESSION_PATH/SingletonLock" 2>/dev/null || true
rm -f "$SESSION_PATH/SingletonCookie" 2>/dev/null || true
rm -f "$SESSION_PATH/SingletonSocket" 2>/dev/null || true

# Eliminar cualquier archivo con "lock" en el nombre (más agresivo)
find "$SESSION_PATH" -iname "*lock*" -delete 2>/dev/null || true
find "$SESSION_PATH" -iname "*socket*" -delete 2>/dev/null || true

echo "✅ Locks limpiados. Iniciando bot..."

# Ejecutar Node.js
exec node index.js
