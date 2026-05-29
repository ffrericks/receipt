# architect.md — Kassabon PWA Archief App

> Versie: 1.1  
> Datum: 2026-05-29  
> Status: Concept / ter goedkeuring  
> Repository: github.com/[jouw-gebruikersnaam]/kassabon-app

---

## 1. Projectomschrijving

Een Progressive Web App (PWA) waarmee de gebruiker via zijn telefoon een foto kan maken van een kassabon. De app verwerkt de foto via OCR (Tesseract, lokaal in Docker), herkent de winkel, past een winkel-preset toe en slaat de relevante gegevens op in een lokale MySQL database. De app draait als Docker container in CasaOS en is bereikbaar via een eigen domeinnaam (bon.frericksonline.nl) met HTTPS.

De volledige applicatie is open-source deelbaar via GitHub — geen secrets in de repo, configuratie via `.env`.

---

## 2. Doelstellingen

- Compleet digitaal archief van alle kassabonnen
- Punten- en loyaliteitssaldi per winkel bijhouden (bijv. slager)
- Per winkel configureerbare presets: wat wordt er opgeslagen?
- Bevestigingsscherm na verwerking: winkelnaam, totaalbedrag, aantal items
- Inzicht per winkel (aparte weergave per categorie/winkel)
- Deelbaar via GitHub, reproduceerbaar via Docker Compose

---

## 3. Systeemoverzicht

```
[ Telefoon / Browser ]
        |
        |  HTTPS — bon.frericksonline.nl (fixed IP + eigen domein)
        v
[ Nginx reverse proxy — poort 443 ]
        |
        ├──▶ [ Frontend container  — Vue 3 PWA        ]
        └──▶ [ Backend container   — Node.js Express  ]
                        |
                        ├──▶ [ Tesseract OCR   — lokaal in container ]
                        └──▶ [ MySQL container — lokale data         ]

[ n8n — optionele zijlijn ]
   └──▶ Kan via webhook de ruwe tekst ontvangen voor extra verwerking
        (bijv. AI-gestuurde parsing, notificaties, exports)
```

---

## 4. Technische Stack

| Laag | Keuze | Reden |
|---|---|---|
| Frontend | Vue 3 + Vite (PWA) | Lichtgewicht, mobiel-vriendelijk, offline-capable |
| Backend | Node.js + Express | Eenvoudig, goede Tesseract-integratie |
| OCR | Tesseract.js (server-side) | Gratis, privacy, lokaal in container |
| Afbeelding pre-processing | Sharp.js | Contrast, rotatie, grijswaarden — betere OCR resultaten |
| Database | MySQL 8 | Al bekend bij gebruiker |
| ORM | Sequelize | Leesbaar, geen raw SQL nodig |
| Webserver / proxy | Nginx (Alpine) | SSL termination, routing frontend/backend |
| SSL | Let's Encrypt via Certbot | Gratis HTTPS op eigen domein |
| Containerisatie | Docker Compose | Reproduceerbaar, CasaOS-compatibel |
| Extern bereik | Fixed IP + bon.frericksonline.nl | Eigen domein, professioneel, geen tunnel nodig |
| Authenticatie | JWT + bcrypt login | Simpel, veilig voor persoonlijk gebruik |
| n8n integratie | Optionele webhook vanuit backend | Ruwe tekst doorsturen voor eigen workflows |

---

## 5. Docker Compose Opzet

```yaml
# docker-compose.yml
version: "3.9"

services:

  frontend:
    build: ./frontend
    restart: unless-stopped

  backend:
    build: ./backend
    restart: unless-stopped
    environment:
      - DB_HOST=db
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
      - JWT_SECRET=${JWT_SECRET}
      - N8N_WEBHOOK_URL=${N8N_WEBHOOK_URL}   # optioneel, mag leeg
    volumes:
      - ./data/uploads:/app/uploads          # bonafbeeldingen
      - ./presets:/app/presets               # JSON presets
    depends_on:
      - db

  db:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
      - MYSQL_DATABASE=${DB_NAME}
      - MYSQL_USER=${DB_USER}
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - ./data/mysql:/var/lib/mysql          # data blijft bij update
      - ./backend/db/schema.sql:/docker-entrypoint-initdb.d/schema.sql

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./data/certbot/conf:/etc/letsencrypt
      - ./data/certbot/www:/var/www/certbot

  certbot:
    image: certbot/certbot
    volumes:
      - ./data/certbot/conf:/etc/letsencrypt
      - ./data/certbot/www:/var/www/certbot
    # Handmatig uitvoeren voor eerste certificaat:
    # docker compose run certbot certonly --webroot ...
```

### .env (nooit in GitHub!)
```env
DB_USER=kassabon
DB_PASSWORD=kies_een_sterk_wachtwoord
DB_ROOT_PASSWORD=kies_een_root_wachtwoord
DB_NAME=kassabon_db
JWT_SECRET=lange_willekeurige_string
N8N_WEBHOOK_URL=                           # leeg laten als je n8n niet gebruikt
```

### .gitignore
```
.env
data/
*.log
node_modules/
```

---

## 6. Databaseschema

### Tabel: `stores` (winkels)
```sql
id            INT AUTO_INCREMENT PRIMARY KEY
name          VARCHAR(100)          -- "Slager De Vries"
slug          VARCHAR(50)           -- "slager-de-vries"
preset_id     INT                   -- koppeling naar preset
created_at    DATETIME
```

### Tabel: `presets` (wat moet er worden opgeslagen per winkel)
```sql
id            INT AUTO_INCREMENT PRIMARY KEY
name          VARCHAR(100)          -- "Standaard", "Slager", "Supermarkt"
config        JSON                  -- zie sectie 7
created_at    DATETIME
```

### Tabel: `receipts` (kassabonnen)
```sql
id            INT AUTO_INCREMENT PRIMARY KEY
store_id      INT
receipt_date  DATE
scan_date     DATETIME
total_amount  DECIMAL(10,2)
raw_text      TEXT                  -- altijd opslaan, nooit weggooien
image_path    VARCHAR(255)
status        ENUM('ok','review')   -- 'review' = OCR onzeker
```

### Tabel: `receipt_items` (bonregels)
```sql
id            INT AUTO_INCREMENT PRIMARY KEY
receipt_id    INT
description   VARCHAR(255)
quantity      DECIMAL(6,2)
unit_price    DECIMAL(10,2)
line_total    DECIMAL(10,2)
category      VARCHAR(50)
```

### Tabel: `loyalty_points` (punten per winkel)
```sql
id            INT AUTO_INCREMENT PRIMARY KEY
store_id      INT
receipt_id    INT
points_earned INT
points_balance INT
scan_date     DATETIME
notes         TEXT
```

---

## 7. Preset Configuratie (JSON)

Presets staan als `.json` bestanden in de `/presets` map. Ze zijn bewerkbaar zonder herstart.

```json
{
  "name": "Slager",
  "store_name_keywords": ["slager", "vlees", "butcher"],
  "fields": {
    "total_amount": true,
    "items": true,
    "receipt_date": true,
    "loyalty_points": {
      "enabled": true,
      "regex": "punten[:\\s]+(\\d+)",
      "balance_regex": "saldo[:\\s]+(\\d+)"
    }
  },
  "item_categories": {
    "default": "Vlees",
    "keywords": {
      "gehakt": "Rund",
      "kip": "Gevogelte",
      "worst": "Worst"
    }
  }
}
```

**Standaard preset:** datum, winkel (handmatige invoer als fallback), totaalbedrag, ruwe tekst.

---

## 8. n8n Integratie (optioneel)

De backend stuurt na elke succesvolle scan een webhook naar n8n — alleen als `N8N_WEBHOOK_URL` is ingesteld in `.env`.

### Payload naar n8n:
```json
{
  "receipt_id": 42,
  "store": "Slager De Vries",
  "scan_date": "2026-05-29T14:32:00",
  "total_amount": 18.45,
  "raw_text": "...volledige OCR tekst...",
  "items": [
    { "description": "Gehakt 500g", "price": 4.99 }
  ],
  "loyalty_points": {
    "earned": 12,
    "balance": 340
  }
}
```

### Mogelijke n8n workflows:
- Extra AI-parsing van de ruwe tekst (bijv. via OpenAI node)
- Notificatie via Telegram / e-mail bij hoog bedrag
- Export naar Google Sheets of Notion
- Maandelijkse uitgaven-samenvatting

De app werkt volledig zonder n8n — het is een uitbreidingslaag, geen afhankelijkheid.

---

## 9. App-schermen (User Flow)

```
┌─────────────────────────────────┐
│  HOME                           │
│  [Scan bon]   [Recente bons]    │
│  Preset: [Slager ▼]             │
└────────────┬────────────────────┘
             │ tap "Scan bon"
             v
┌─────────────────────────────────┐
│  CAMERA / UPLOAD                │
│  [📷 Foto maken]                │
│  [📁 Afbeelding kiezen]         │
└────────────┬────────────────────┘
             │ foto gekozen
             v
┌─────────────────────────────────┐
│  VERWERKEN...                   │
│  ⏳ OCR bezig...                │
└────────────┬────────────────────┘
             │ klaar
             v
┌─────────────────────────────────┐
│  BEVESTIGING                    │
│  ✅ Winkel: Slager De Vries     │
│  💰 Totaal: €18,45              │
│  📦 Items: 4 opgeslagen         │
│  ⭐ Punten: +12 (saldo: 340)    │
│  [Opslaan] [Aanpassen] [Nieuw]  │
└────────────┬────────────────────┘
             v
┌─────────────────────────────────┐
│  WINKELOVERZICHT — Slager       │
│  Tabs: [Bons] [Items] [Punten]  │
│  Filter op datum / categorie    │
└─────────────────────────────────┘
```

---

## 10. API Endpoints (Backend)

| Method | Endpoint | Beschrijving |
|---|---|---|
| POST | `/api/auth/login` | Inloggen, retourneert JWT |
| POST | `/api/receipts/scan` | Upload afbeelding → OCR → parsed resultaat |
| POST | `/api/receipts` | Definitief opslaan na bevestiging |
| GET | `/api/receipts` | Lijst van alle bons (paginering) |
| GET | `/api/receipts/:id` | Detail van één bon |
| GET | `/api/stores` | Lijst van winkels |
| GET | `/api/stores/:id/receipts` | Bons per winkel |
| GET | `/api/stores/:id/points` | Puntenhistorie per winkel |
| GET | `/api/presets` | Lijst van presets |
| POST | `/api/presets` | Nieuwe preset aanmaken |
| PUT | `/api/presets/:id` | Preset bewerken |

Alle endpoints behalve `/api/auth/login` vereisen een geldig JWT in de `Authorization` header.

---

## 11. OCR Verwerkingspijplijn

```
1. Afbeelding ontvangen (JPEG/PNG, max 10MB)
2. Validatie: bestandstype + grootte
3. Pre-processing via Sharp.js:
   - Grijswaarden conversie
   - Contrast verbetering
   - Auto-rotate op basis van EXIF
4. Tesseract OCR (taal: nld+eng)
5. Ruwe tekst direct opslaan in DB (altijd)
6. Preset-parser toepassen:
   a. Winkelnaam detecteren via keywords
   b. Totaalbedrag (regex: €\d+,\d{2})
   c. Datum (meerdere notaties)
   d. Itemregels parsen
   e. Punten extraheren indien preset actief
7. Confidence score berekenen → status 'ok' of 'review'
8. Optioneel: webhook naar n8n
9. Resultaat teruggeven aan frontend
```

---

## 12. GitHub Repository Structuur

```
kassabon-app/                     ← publieke repo
├── README.md                     ← installatie-instructies
├── docker-compose.yml
├── .env.example                  ← template zonder echte waarden
├── .gitignore
│
├── frontend/                     ← Vue 3 PWA
│   ├── Dockerfile
│   ├── src/
│   │   ├── views/                ← Home, Scan, Bevestiging, Winkel, Instellingen
│   │   ├── components/           ← Camera, PresetSelector, ReceiptCard, PointsBadge
│   │   ├── stores/               ← Pinia (auth, receipts, presets)
│   │   └── api/                  ← Axios client
│   └── public/
│       └── manifest.json         ← PWA manifest (icoontje, naam, thema)
│
├── backend/                      ← Node.js Express API
│   ├── Dockerfile
│   ├── routes/                   ← auth, receipts, stores, presets
│   ├── services/
│   │   ├── ocr.js                ← Tesseract wrapper
│   │   ├── parser.js             ← Bon-parser met preset-logica
│   │   ├── imageProcessor.js     ← Sharp.js pre-processing
│   │   └── webhook.js            ← n8n webhook verzender
│   ├── models/                   ← Sequelize modellen
│   ├── middleware/               ← auth JWT, upload Multer, errorHandler
│   └── db/
│       └── schema.sql            ← initieel schema (auto-geladen bij eerste start)
│
├── nginx/
│   └── nginx.conf                ← reverse proxy + SSL configuratie
│
└── presets/                      ← JSON preset bestanden (deelbaar!)
    ├── default.json
    └── slager.json
```

---

## 13. Installatie op CasaOS (stappenplan)

```bash
# 1. SSH naar je CasaOS machine
ssh gebruiker@192.168.x.x

# 2. Repo ophalen
git clone https://github.com/[jouw-gebruikersnaam]/kassabon-app.git
cd kassabon-app

# 3. Omgevingsvariabelen instellen
cp .env.example .env
nano .env   # vul wachtwoorden en JWT secret in

# 4. SSL certificaat aanvragen (eenmalig)
docker compose run --rm certbot certonly --webroot \
  -w /var/www/certbot \
  -d bon.frericksonline.nl \
  --email jouw@email.nl --agree-tos

# 5. Starten
docker compose up -d

# 6. Controleren
docker compose logs -f backend
```

**Updates ophalen van GitHub:**
```bash
git pull
docker compose build
docker compose up -d
```

---

## 14. Beveiliging

| Risico | Maatregel |
|---|---|
| Ongeautoriseerde toegang | JWT op alle API endpoints |
| Secrets in GitHub | `.env` in `.gitignore`, `.env.example` zonder waarden |
| Uploads | Multer: type-validatie + max 10MB |
| SQL injection | Sequelize ORM (geparametriseerd) |
| Brute force | express-rate-limit op login endpoint |
| HTTPS | Let's Encrypt via Certbot + Nginx |
| Open poorten | Alleen 80 en 443 open op router/firewall |

---

## 15. Gefaseerde Ontwikkeling (Roadmap)

### Fase 1 — Docker fundament
- [ ] Repository aanmaken op GitHub met README en `.env.example`
- [ ] `docker-compose.yml` met MySQL + backend + frontend + nginx
- [ ] Database schema + Sequelize modellen
- [ ] Basis login (JWT)

### Fase 2 — OCR pipeline
- [ ] Upload endpoint + Sharp.js pre-processing
- [ ] Tesseract integratie (ruwe tekst terug)
- [ ] Standaard preset parser (totaalbedrag, datum)
- [ ] Bon opslaan + lijst tonen in app

### Fase 3 — Presets & winkels
- [ ] Preset JSON systeem + parser
- [ ] Winkeldetectie op basis van keywords
- [ ] Preset-beheer via UI
- [ ] Winkeloverzicht met tabs

### Fase 4 — Loyaliteit & punten
- [ ] Punten-module
- [ ] Puntenhistorie per winkel
- [ ] Saldo-weergave op homescherm

### Fase 5 — n8n & afwerking
- [ ] Optionele webhook naar n8n
- [ ] PWA installeerbaar op telefoon (manifest + service worker)
- [ ] Favicon voor website en PWA: 🧾
- [ ] Statistieken: uitgaven per maand/winkel
- [ ] Automatische DB-backup script

---

## 16. Bekende Risico's & Aandachtspunten

| Risico | Impact | Mitigatie |
|---|---|---|
| Tesseract nauwkeurigheid thermische bon | Hoog | Ruwe tekst altijd opslaan; handmatige correctie in UI |
| Winkelnaam niet herkend | Middel | Fallback: handmatig kiezen op bevestigingsscherm |
| Scheef/onscherp gefotografeerd | Hoog | UI-instructie + Sharp auto-rotate |
| Certbot SSL verlenging | Laag | Cronjob in docker-compose voor automatisch verlengen |
| NAS offline → app onbereikbaar | Middel | Geen oplossing zonder server; Tailscale als backup-toegang |

---

*Dit document is het startpunt voor ontwikkeling. Begin bij Fase 1 — elke fase is onafhankelijk te bouwen en te testen.*
