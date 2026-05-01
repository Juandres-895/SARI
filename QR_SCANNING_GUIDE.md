# 🔐 Guía para Escanear el QR en Railway

El bot genera automáticamente un código QR **grande y visible** en un archivo HTML. Aquí te explico 3 formas de accederlo:

---

## **Opción 1: Desde el navegador (RECOMENDADO) ✅**

### Si el bot está en Railway:

1. Ve a tu dashboard: https://railway.app/dashboard
2. Abre tu proyecto **SARI** → servicio bot
3. Busca la URL pública (algo como: `https://sari-production-abc123.up.railway.app`)
4. **Accede a**: `https://tu-url-railway.com/qr`
   - Por ejemplo: `https://sari-production-abc123.up.railway.app/qr`
5. Deberías ver un **QR grande y limpio** ✨

### Si el bot está en tu PC (desarrollo):

1. Ejecuta el bot: `npm start`
2. Accede a: http://localhost:3000/qr
3. Escanea el código desde tu teléfono

---

## **Opción 2: Desde los Logs de Railway**

1. En Railway dashboard, abre tu servicio
2. Ve a **"Deployments"** → último deployment
3. Abre los **"Logs"**
4. Busca el mensaje:
   ```
   ██████████████████████████████████████████████
   █  ESCANEA ESTE CÓDIGO QR CON WHATSAPP  █
   ██████████████████████████████████████████████
   ```
5. El QR aparecerá **más grande** que antes
6. Escanea con WhatsApp desde tu teléfono

---

## **Opción 3: Archivo qr.html (Local)**

Si estás corriendo el bot localmente:

1. Ejecuta: `npm start`
2. Busca en la carpeta del proyecto el archivo: **`qr.html`**
3. Abre el archivo en tu navegador
4. ¡QR grande y perfecto! 🎉

---

## **✅ Pasos para Autenticar**

1. **Abre el QR** (elige una opción arriba)
2. En tu teléfono, abre **WhatsApp**
3. Ve a: **Configuración** → **WhatsApp Web**
4. **Escanea el código** con tu cámara
5. Espera **2-5 segundos** a que se conecte
6. En los logs de Railway deberías ver:
   ```
   🚀 ALFABOT en línea
   ```

---

## **⚠️ Si no funciona**

### El QR sigue siendo muy pequeño:
- Abre la URL `/qr` en tu navegador en lugar de mirar los logs
- Amplía el navegador (Ctrl + Plus)
- El QR en el archivo HTML es **10 veces más grande**

### El código QR no escanea:
- Acerca más el código a tu cámara
- Asegúrate de tener **buena iluminación**
- Cierra otras apps que usen la cámara
- Intenta desde otra app (Google Lens, Instagram, etc.)

### El bot pide QR constantemente:
- Configura un **Volumen Persistente** en Railway
  - Ruta: `/app/.wwebjs_auth`
  - Tamaño: 1GB
- Así la sesión se guarda entre redeploys

---

## **🔍 Verificar que Funciona**

Después de escanear el QR:

✅ **Correcto**: 
- Logs muestran `🚀 ALFABOT en línea`
- No hay más códigos QR
- Bot responde mensajes normalmente

❌ **Problema**:
- Sigue pidiendo QR
- Muestra errores en los logs
- Bot no responde

Si hay problema, contacta con soporte o revisa la sesión en Railway.
