FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-nld \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --production

COPY . .

RUN mkdir -p /app/uploads

EXPOSE 3000

CMD ["node", "server.js"]
