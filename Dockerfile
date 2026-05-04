FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

# Crear directorio para auth
RUN mkdir -p .wwebjs_auth

# Copiar script de entrypoint que limpia locks
COPY entrypoint.sh /app/entrypoint.sh

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

EXPOSE 3000

# Usar bash para ejecutar el entrypoint script que limpia locks
CMD ["/bin/bash", "/app/entrypoint.sh"]
