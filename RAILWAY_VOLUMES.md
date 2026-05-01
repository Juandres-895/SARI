# Railway - Configurar Volumen Persistente 🔒

## ¿Por qué es necesario?

El bot guarda la sesión de WhatsApp en `.wwebjs_auth/`. Sin un volumen persistente, cada redeploy pierde esta sesión y pide un nuevo QR.

**Solución**: Configurar un volumen en Railway que persista estos archivos.

---

## Pasos para Configurar Volumen en Railway

### 1️⃣ Accede a tu servicio en Railway
- Ve a: https://railway.app/dashboard
- Selecciona tu proyecto **SARI**
- Haz clic en el servicio bot

### 2️⃣ Ve a la pestaña "Volumes"
- Busca la sección **Volumes** en el panel lateral izquierdo
- Click en "Create Volume"

### 3️⃣ Configura el volumen
| Campo | Valor |
|-------|-------|
| **Mount Path** | `/app/.wwebjs_auth` |
| **Size** | `1 GB` (o más) |

### 4️⃣ Confirma y redeploy
- Click en **Create**
- Railway automáticamente redeploy el servicio
- El volumen ahora persistirá los datos entre redeploys

---

## Verificar que Funciona

1. **Primer deploy**: El bot mostrará un **QR en los logs**
2. **Escanea el QR** desde tu teléfono con WhatsApp
3. **Segundo deploy** (o reinicio): No debería pedir QR
   - Deberías ver: `🚀 ALFABOT en línea` sin código QR

Si después de hacer redeploy sigue pidiendo QR:
- Verifica que el volumen esté asignado correctamente
- Revisa que la ruta sea exactamente `/app/.wwebjs_auth`
- Si sigue fallando, contacta soporte

---

## Comandos útiles (CLI)

Si tienes Railway CLI instalado:

```bash
# Listar volúmenes
railway volume list

# Ver información del volumen
railway volume info <volume-id>
```

---

## Alternativa: Sin Volumen (No recomendado)

Si no puedes configurar volumen:
1. Cada redeploy pedirá QR
2. Escanea el QR desde tu teléfono
3. El bot funcionará hasta el próximo redeploy

**Esta no es una solución 24/7 real.** Usa volúmenes para funcionamiento continuo.
