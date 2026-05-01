# 🚀 Desplegar ALFABOT en Railway.app (5 minutos)

## ✅ Paso 1: Ir a Railway.app

Abre en tu navegador: https://railway.app

## ✅ Paso 2: Login con GitHub

1. Haz click en **"Login"**
2. Selecciona **"Login with GitHub"**
3. Autoriza la aplicación
4. Verás el dashboard

## ✅ Paso 3: Crear Nuevo Proyecto

1. Click en **"Create New Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Busca y selecciona tu repositorio **"SARI"**
4. Railroad creará automáticamente:
   - Node.js runtime
   - Puerto asignado
   - Variables de entorno

## ✅ Paso 4: Configurar Variables de Entorno

En Railway, ve a **"Variables"** y agrega:

```
NODE_ENV=production
```

El `SCRIPT_URL` ya está en el código, así que no es necesario configurarlo aquí.

## ✅ Paso 5: Deploy

Railway hace todo automáticamente:
1. Clona tu repositorio de GitHub
2. Instala dependencias (`npm install`)
3. Ejecuta `npm start`
4. Tu bot estará online en la nube ☁️

---

## 🔍 Verificar que Funciona

Una vez desplegado:

1. Ve a **"View logs"** en Railway para ver los logs en tiempo real
2. Busca el mensaje: `🚀 ALFABOT en línea`
3. Prueba enviándole un mensaje al bot desde WhatsApp
4. El bot responderá automáticamente 24/7 sin detenerse

---

## 💾 Actualizaciones Futuras

Cada vez que hagas cambios en GitHub:

```bash
git add .
git commit -m "Mensaje del cambio"
git push
```

Railway automáticamente:
1. Detecta el push a GitHub
2. Clona los cambios
3. Redeploya el bot (sin downtime)

---

## 🆘 Problemas Comunes

### ❌ "Bot no responde"
- Revisa los logs en Railway (Ver logs)
- Verifica que `.wwebjs_auth/` esté en el repo
- Reinicia el servicio desde Railway

### ❌ "Build failed"
- Revisa que todas las dependencias están en package.json
- Verifica que node_modules NO esté en .gitignore

### ❌ "Memory exceeded"
- Railway automáticamente aumenta la memoria según necesidad

---

## ✨ ¡Listo!

Tu bot ahora corre **24/7 sin detenerse** en Railway.app ☁️🎉

**Próximas veces que quieras actualizar el bot:**
- Haz cambios en tu código local
- `git push` a GitHub
- Railway automáticamente redeploya en menos de 1 minuto
