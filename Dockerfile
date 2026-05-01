FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

# Crear directorio para auth con permisos correctos
RUN mkdir -p .wwebjs_auth && chmod 777 .wwebjs_auth

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

EXPOSE 3000

CMD ["node", "index.js"]
