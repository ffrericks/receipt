# Kassabon App

PWA voor het scannen en archiveren van kassabonnen. Draait als Docker container op CasaOS.

## Vereisten

- Docker + Docker Compose
- Eigen domeinnaam (bijv. bon.frericksonline.nl) met fixed IP
- Poort 80 en 443 open op de router

## Installatie

```bash
# 1. Repo klonen
git clone https://github.com/[gebruikersnaam]/kassabon-app.git
cd kassabon-app

# 2. Omgevingsvariabelen instellen
cp .env.example .env
nano .env   # vul wachtwoorden en JWT secret in

# 3. SSL certificaat aanvragen (eenmalig)
docker compose run --rm certbot certonly --webroot \
  -w /var/www/certbot \
  -d bon.frericksonline.nl \
  --email jouw@email.nl --agree-tos

# 4. Starten
docker compose up -d

# 5. Controleren
docker compose logs -f backend
```

## Updates

```bash
git pull
docker compose build
docker compose up -d
```

## Structuur

```
kassabon-app/
├── backend/      Node.js Express API + OCR
├── frontend/     Vue 3 PWA
├── nginx/        Reverse proxy config
├── presets/      JSON winkel-presets
└── data/         Uploads + database (niet in git)
```

## Presets

Winkelpresets staan als `.json` bestanden in `/presets`. Aanpasbaar zonder herstart.
Zie `presets/default.json` en `presets/slager.json` voor voorbeelden.
