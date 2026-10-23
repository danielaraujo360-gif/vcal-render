# Imagem oficial do Playwright (Chromium e dependências já instalados) + ffmpeg + Python para a trilha.
FROM mcr.microsoft.com/playwright:v1.62.1-noble

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg python3 python3-numpy python3-scipy \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .

ENV NODE_ENV=production PORT=8080 PYTHON=python3
EXPOSE 8080
CMD ["node", "server.mjs"]
