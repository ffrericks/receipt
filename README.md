# Kassabon App

PWA voor het scannen en archiveren van kassabonnen via je telefoon.
Draait volledig lokaal in Docker op een eigen server (bijv. CasaOS / NAS).

## Snelle installatie

```bash
curl -fsSL https://raw.githubusercontent.com/ffrericks/receipt/master/install.sh | bash
```

Het script doet automatisch:
- Bestanden downloaden
- Veilige wachtwoorden genereren
- SSL certificaat aanvragen (Let's Encrypt)
- Containers starten

Na installatie is de app bereikbaar op `https://jouw-domein.nl`.

---

## Vereisten

- Server met Docker + Docker Compose v2
- Eigen domeinnaam gericht op het IP van je server
- Poort 80 en 443 open op je router

---

## Handmatige installatie

```bash
# 1. Repo klonen
git clone https://github.com/ffrericks/receipt.git kassabon-app
cd kassabon-app

# 2. Omgevingsvariabelen instellen
cp .env.example .env
nano .env

# 3. SSL certificaat aanvragen
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d jouw-domein.nl \
  --email jouw@email.nl --agree-tos

# 4. Starten
docker compose up -d
```

---

## Updaten

```bash
cd kassabon-app
docker compose pull
docker compose up -d
```

---

## n8n integratie

**Push** — direct bij elke nieuwe bon:
- Stel `N8N_WEBHOOK_URL` in `.env` in op jouw n8n webhook-URL

**Pull** — periodiek pollen (elk uur / elke dag):
```
GET https://jouw-domein.nl/api/n8n/receipts?since=2026-05-29T10:00:00Z
Header: X-API-Key: <N8N_API_KEY uit .env>
```

**Dagelijkse statistieken:**
```
GET https://jouw-domein.nl/api/n8n/stats
Header: X-API-Key: <N8N_API_KEY uit .env>
```

---

## Database backup

```bash
# Handmatig
./scripts/backup-db.sh

# Automatisch dagelijks om 03:00
crontab -e
0 3 * * * /pad/naar/kassabon-app/scripts/backup-db.sh
```

---

## Projectstructuur

```
kassabon-app/
├── backend/          Node.js Express API + OCR (Tesseract.js)
├── frontend/         Vue 3 PWA
├── nginx/            Reverse proxy + SSL config
├── presets/          JSON winkel-presets (aanpasbaar zonder herstart)
├── scripts/          backup-db.sh
├── docker-compose.yml          (bouwen vanuit broncode)
├── docker-compose.prod.yml     (kant-en-klare images van ghcr.io)
└── install.sh        Automatisch installatieScript
```

---

## Technische stack

| Laag | Keuze |
|---|---|
| Frontend | Vue 3 + Vite (PWA) |
| Backend | Node.js + Express |
| OCR | Tesseract.js + Sharp.js |
| Database | MySQL 8 |
| Containers | Docker Compose |
| SSL | Let's Encrypt via Certbot |
