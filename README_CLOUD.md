# 🚀 Guía de Deployment en la Nube

## Problema: Autenticación WhatsApp

El bot requiere escanear un QR de WhatsApp en la primera ejecución. Esto NO es posible en un servidor sin UI.

### Soluciones:

#### Opción 1: Ejecutar Local → Nube (Recomendado)
1. Ejecuta el bot localmente (`npm start`)
2. Escanea el QR con WhatsApp
3. Los archivos de sesión se guardan en `.wwebjs_auth/`
4. Comprime esta carpeta y súbela con el código a la nube
5. El bot funcionará sin necesidad de QR nuevamente

#### Opción 2: Usar Remote Auth (Avanzado)
Implementar un servidor con UI para generar QR en la nube.

## Opciones de Deployment

### 1. Railway.app (Más fácil)
```bash
# Instala Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway link
railway up
```

### 2. Heroku (Requiere tarjeta)
```bash
# Instala Heroku CLI
heroku login
git push heroku main
```

### 3. AWS / Google Cloud / Azure
Usa Docker para deployar:
```bash
docker build -t alfabot .
docker run -it alfabot
```

## Configuración Requerida

1. Copia `.env.example` a `.env`:
```bash
cp .env.example .env
```

2. Rellena las variables (si usas variables de entorno)

3. Asegúrate de que `.wwebjs_auth/` esté incluido en el deploy si ya escaneaste el QR

## Monitoring

Agregar logs para monitoreo en la nube es altamente recomendado.

## Persistencia de Sesión

IMPORTANTE: El directorio `.wwebjs_auth/` debe persistir entre reinicios. Configura volumes en tu servicio de nube.
