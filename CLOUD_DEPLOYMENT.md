# 📱 ALFABOT - Guía de Deployment en la Nube

## ✅ Estado de Preparación

Tu proyecto ahora está **casi listo** para la nube. Hemos agregado:
- ✅ Scripts de inicio en `package.json`
- ✅ Dockerfile para containerización
- ✅ Docker-compose para desarrollo local
- ✅ Variables de entorno (.env)
- ✅ Manejo de errores global
- ✅ Health checks
- ✅ Especificación de Node.js (.nvmrc)

## ⚠️ Requisito Crítico: Autenticación de WhatsApp

**El mayor desafío es que WhatsApp requiere escanear un código QR**, lo cual NO es posible directamente en una nube sin interfaz gráfica.

### Soluciones:

#### ✅ Opción 1: Pre-autenticar localmente (RECOMENDADO)
```bash
# 1. Ejecuta el bot localmente
npm install
npm start

# 2. Escanea el código QR con WhatsApp
# 3. El bot guardará la sesión en .wwebjs_auth/

# 4. Sube el código + la carpeta .wwebjs_auth a la nube
git add .
git commit -m "Add WhatsApp session"
git push
```

#### ❌ Opción 2: Usar Remote Auth
Más complejo, requiere servidor web separado para QR.

---

## 🚀 Deployment Paso a Paso

### Opción A: Railway.app (MÁS FÁCIL - RECOMENDADO)

```bash
# 1. Ve a railway.app y regístrate
# 2. Instala Railway CLI
npm install -g @railway/cli

# 3. Login
railway login

# 4. Deploy
railway link
railway up
```

**Ventajas:**
- Muy fácil de usar
- Gratis hasta cierto límite
- Despliega desde GitHub automáticamente
- Manejo de secrets en la UI

**Desventajas:**
- Plane pagado después del limite

### Opción B: Heroku (DEPRECATED pero funciona)

```bash
heroku login
heroku create alfabot-sari
git push heroku main
```

### Opción C: Docker en AWS/Google Cloud/Azure

```bash
# Build local
docker build -t alfabot .
docker run -it alfabot

# Subir a registry
docker tag alfabot gcr.io/YOUR_PROJECT/alfabot
docker push gcr.io/YOUR_PROJECT/alfabot
```

---

## 🔧 Configuración en la Nube

### Variables de Entorno Necesarias:

En tu plataforma de nube, configura:

```
NODE_ENV=production
SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### Volúmenes Persistentes (IMPORTANTE):

El bot necesita conservar la sesión entre reinicios:

```yaml
volumes:
  - ./.wwebjs_auth:/app/.wwebjs_auth
  - ./.wwebjs_cache:/app/.wwebjs_cache
```

---

## 🧪 Testing en Desarrollo

```bash
# Local
npm start

# Con Docker
docker build -t alfabot .
docker run -it -v $(pwd)/.wwebjs_auth:/app/.wwebjs_auth alfabot
```

---

## 📊 Monitoreo

El bot registra:
- ✅ Memoria usada cada minuto
- ✅ Eventos de conexión
- ✅ Errores no capturados
- ✅ Reconexiones automáticas

Revisa los logs en tu plataforma de nube.

---

## 🆘 Troubleshooting

### El bot se desconecta
- Verifica que `.wwebjs_auth/` persista
- Aumenta los reintentos de conexión
- Revisa la consola de WhatsApp

### "Timeout de inicialización"
- La sesión expiró, vuelve a escanear QR localmente

### "Port already in use"
- Cambia el puerto en tu config de nube

---

## ✨ Próximos Pasos

1. **Autentica localmente** (escanea QR)
2. **Haz commit** de `.wwebjs_auth/` 
3. **Elige plataforma** de nube
4. **Deploy** automático desde GitHub
5. **Monitores** logs en producción

¡Listo! El bot funcionará 24/7 sin interrupción. 🚀
