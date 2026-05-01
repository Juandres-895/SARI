# 🎯 PASOS PARA LLEVAR TU BOT A LA NUBE

## PASO 1: Autenticar el Bot Localmente (CRÍTICO)

Tu bot necesita escanear el QR de WhatsApp. Esto **SOLO se puede hacer localmente**.

```bash
# En tu computadora:
cd "c:\Users\Juan Andrés Londoño\Desktop\SARI"
npm install
npm start
```

Verás un código QR. **Escanéalo con tu teléfono** (como cuando inicias sesión en WhatsApp Web).

El bot se autenticará y guardará los archivos de sesión en `.wwebjs_auth/`

---

## PASO 2: Verificar que Funcione Localmente

```bash
# Si funcionó, verás:
✅ Iniciando bot en modo: development
📶 Cargando WhatsApp Web: 100%
🚀 ALFABOT en línea
```

**Si ves errores**: Revisa los logs, pueden haber problemas con dependencias.

---

## PASO 3: Subir a GitHub (Lo que ya hicimos)

```bash
git add .
git commit -m "Add WhatsApp authentication"
git push
```

---

## PASO 4: Elegir Plataforma de Nube

### ⭐ OPCIÓN 1: Railway (RECOMENDADO - Más fácil)

1. Ve a **https://railway.app**
2. Haz login con GitHub
3. Crea nuevo proyecto
4. Selecciona tu repositorio SARI
5. Railway detectará automáticamente que es Node.js
6. En "Variables", agrega:
   ```
   NODE_ENV=production
   SCRIPT_URL=tu_url_script
   ```
7. **Deploy** (Railway hace todo automáticamente)

**¡Listo!** Tu bot estará corriendo 24/7 sin detenerse.

---

### OPCIÓN 2: Google Cloud Run (Gratis primeros 2M de solicitudes/mes)

1. Instala Google Cloud CLI
2. Autentica: `gcloud auth login`
3. Ejecuta:
   ```bash
   gcloud run deploy alfabot \
     --source . \
     --platform managed \
     --region us-central1 \
     --memory 512Mi
   ```

---

### OPCIÓN 3: AWS Lambda + Elasticsearch (Más costoso pero robusto)

Configuración más compleja, contacta si necesitas ayuda.

---

## PASO 5: Monitoreo

Una vez desplegado en la nube:

1. Revisa los **logs** de tu plataforma cada día
2. Verifica que el bot responda mensajes
3. Si se desconecta, la plataforma lo reiniciará automáticamente

---

## 🆘 PROBLEMAS COMUNES

### ❌ "El bot no responde mensajes"
- Verifica que escaneó el QR correctamente localmente
- Revisa los logs en la plataforma de nube
- Reinicia el servicio manualmente

### ❌ "Port in use"
- Railway y Google Cloud asignan puertos automáticamente, no hay problema

### ❌ "Auth failed"
- La sesión expiró, vuelve a ejecutar localmente y escanea QR nuevamente

---

## ✨ RESUMEN FINAL

| Paso | ¿Completo? |
|------|-----------|
| 1️⃣ Autenticar localmente | ⏳ Todavía por hacer |
| 2️⃣ Verificar funcionamiento | ⏳ Todavía por hacer |
| 3️⃣ Subir a GitHub | ✅ HECHO |
| 4️⃣ Elegir plataforma nube | ⏳ Todavía por hacer |
| 5️⃣ Desplegar | ⏳ Todavía por hacer |
| 6️⃣ Monitorear | ⏳ Todavía por hacer |

---

## 📞 PRÓXIMAS ACCIONES

1. **Ejecuta localmente**: `npm start` y escanea QR
2. **Haz test**: Envía mensajes al bot desde WhatsApp
3. **Sube a la nube**: Elige Railway o Google Cloud
4. **¡Disfruta!** 🎉 Tu bot ahora corre sin detenerse
