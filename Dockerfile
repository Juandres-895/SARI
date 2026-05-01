FROM node:18.17.1-slim

# Instalar dependencias de Puppeteer/Chromium y librerías necesarias
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-common \
    chromium-sandbox \
    libnss3 \
    libgconf-2-4 \
    libxss1 \
    libappindicator1 \
    libindicator7 \
    libxext6 \
    libxrender-dev \
    libxrandr2 \
    libgbm1 \
    libpango1.0-0 \
    libasound2 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdrm2 \
    libfontconfig1 \
    libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

# Crear directorio para auth
RUN mkdir -p .wwebjs_auth

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

EXPOSE 3000

CMD ["node", "index.js"]
