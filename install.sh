#!/bin/bash
# Kassabon App — installatiescript
# Gebruik: curl -fsSL https://raw.githubusercontent.com/ffrericks/receipt/master/install.sh -o install.sh && bash install.sh
# Of lokaal: chmod +x install.sh && ./install.sh

set -euo pipefail

RAW="https://raw.githubusercontent.com/ffrericks/receipt/master"
INSTALL_DIR="${KASSABON_DIR:-$HOME/kassabon-app}"

# Altijd lezen van /dev/tty zodat curl | bash ook werkt
TTY=/dev/tty

# ── kleuren ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'
RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}▸${NC} $*"; }
success() { echo -e "${GREEN}✓${NC} $*"; }
warn()    { echo -e "${YELLOW}!${NC} $*"; }
error()   { echo -e "${RED}✗${NC} $*"; exit 1; }
header()  { echo -e "\n${BOLD}$*${NC}"; }

# ── genereer willekeurige string ──────────────────────────────────────────────
gen_secret() {
  local len="${1:-32}"
  openssl rand -base64 64 | tr -dc 'A-Za-z0-9' | head -c "$len"
}

# ── controleer vereisten ──────────────────────────────────────────────────────
check_deps() {
  header "Vereisten controleren"
  command -v docker  >/dev/null 2>&1 || error "Docker is niet geïnstalleerd."
  command -v curl    >/dev/null 2>&1 || error "curl is niet geïnstalleerd."
  command -v openssl >/dev/null 2>&1 || error "openssl is niet geïnstalleerd."
  docker compose version >/dev/null 2>&1 || error "Docker Compose (v2) is niet gevonden."
  success "Docker en Compose aanwezig"
}

# ── installatiemap aanmaken ───────────────────────────────────────────────────
setup_dir() {
  header "Installatiemap aanmaken"
  if [ -d "$INSTALL_DIR" ]; then
    warn "Map $INSTALL_DIR bestaat al."
    read -rp "Doorgaan en eventueel overschrijven? [j/N] " confirm <"$TTY"
    [[ "$confirm" =~ ^[jJyY]$ ]] || error "Installatie afgebroken."
  fi
  mkdir -p "$INSTALL_DIR"/{data/uploads,data/certbot/conf,data/certbot/www,data/backups,presets,nginx,scripts}
  success "Map aangemaakt: $INSTALL_DIR"
}

# ── bestanden downloaden ──────────────────────────────────────────────────────
download_files() {
  header "Bestanden downloaden"
  cd "$INSTALL_DIR"

  info "docker-compose.yml"
  curl -fsSL "$RAW/docker-compose.prod.yml" -o docker-compose.yml

  info "nginx.conf"
  curl -fsSL "$RAW/nginx/nginx.conf" -o nginx/nginx.conf

  info "presets"
  curl -fsSL "$RAW/presets/default.json" -o presets/default.json
  curl -fsSL "$RAW/presets/slager.json"  -o presets/slager.json

  info "schema.sql"
  curl -fsSL "$RAW/backend/db/schema.sql" -o data/schema.sql

  info "backup script"
  curl -fsSL "$RAW/scripts/backup-db.sh" -o scripts/backup-db.sh
  chmod +x scripts/backup-db.sh

  success "Bestanden gedownload"
}

# ── .env aanmaken ─────────────────────────────────────────────────────────────
create_env() {
  header ".env aanmaken"
  cd "$INSTALL_DIR"

  if [ -f ".env" ]; then
    warn ".env bestaat al — wordt overgeslagen (verwijder handmatig om opnieuw in te stellen)"
    return
  fi

  echo -e "\nVul je installatiegegevens in:"
  echo "  (druk Enter voor de standaardwaarde tussen [ ])"
  echo ""

  read -rp "  Domeinnaam [bon.frericksonline.nl]: " DOMAIN <"$TTY"
  DOMAIN="${DOMAIN:-bon.frericksonline.nl}"

  read -rp "  Jouw e-mailadres (voor SSL certificaat): " EMAIL <"$TTY"
  [ -z "$EMAIL" ] && error "E-mailadres is verplicht voor SSL."

  read -rp "  App gebruikersnaam [admin]: " APP_USER <"$TTY"
  APP_USER="${APP_USER:-admin}"

  read -rsp "  App wachtwoord (Enter = automatisch genereren): " APP_PASSWORD <"$TTY"
  echo
  if [ -z "$APP_PASSWORD" ]; then
    APP_PASSWORD=$(gen_secret 16)
    warn "Gegenereerd wachtwoord: ${BOLD}${APP_PASSWORD}${NC} — bewaar dit!"
  fi

  info "Geheime sleutels genereren..."
  DB_PASSWORD=$(gen_secret 24)
  DB_ROOT_PASSWORD=$(gen_secret 24)
  JWT_SECRET=$(gen_secret 48)
  N8N_API_KEY=$(gen_secret 32)

  sed -i "s/bon\.frericksonline\.nl/$DOMAIN/g" nginx/nginx.conf

  cat > .env <<ENVEOF
APP_USER=${APP_USER}
APP_PASSWORD=${APP_PASSWORD}

DB_USER=kassabon
DB_PASSWORD=${DB_PASSWORD}
DB_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
DB_NAME=kassabon_db

JWT_SECRET=${JWT_SECRET}

N8N_WEBHOOK_URL=
N8N_API_KEY=${N8N_API_KEY}

DOMAIN=${DOMAIN}
EMAIL=${EMAIL}
ENVEOF

  success ".env aangemaakt"
  echo ""
  echo -e "${YELLOW}  Bewaar je gegevens op een veilige plek!${NC}"
  echo "  App wachtwoord : ${APP_PASSWORD}"
  echo "  n8n API key    : ${N8N_API_KEY}"
}

# ── SSL certificaat ───────────────────────────────────────────────────────────
setup_ssl() {
  header "SSL certificaat aanvragen"
  cd "$INSTALL_DIR"

  set -a; source .env; set +a

  info "Nginx tijdelijk starten voor ACME challenge..."
  docker compose up -d nginx

  sleep 3

  info "Certbot aanroepen voor ${DOMAIN}..."
  docker compose run --rm certbot certonly \
    --webroot \
    -w /var/www/certbot \
    -d "${DOMAIN}" \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --non-interactive || {
      warn "SSL aanvragen mislukt."
      warn "Controleer of ${DOMAIN} naar dit IP wijst en poort 80 open is."
      warn "Later opnieuw proberen:"
      warn "  cd ${INSTALL_DIR} && docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d ${DOMAIN} --email ${EMAIL} --agree-tos"
      return 1
    }

  success "SSL certificaat aangevraagd"
}

# ── starten ───────────────────────────────────────────────────────────────────
start_app() {
  header "App starten"
  cd "$INSTALL_DIR"

  docker compose pull
  docker compose up -d

  info "Wachten op database (30 seconden)..."
  sleep 30

  success "App gestart!"
}

# ── samenvatting ──────────────────────────────────────────────────────────────
print_summary() {
  cd "$INSTALL_DIR"
  set -a; source .env; set +a

  echo ""
  echo -e "${GREEN}${BOLD}════════════════════════════════════════${NC}"
  echo -e "${GREEN}${BOLD}  Kassabon App is geïnstalleerd!         ${NC}"
  echo -e "${GREEN}${BOLD}════════════════════════════════════════${NC}"
  echo ""
  echo -e "  URL        : ${BOLD}https://${DOMAIN}${NC}"
  echo -e "  Gebruiker  : ${BOLD}${APP_USER}${NC}"
  echo -e "  Wachtwoord : ${BOLD}${APP_PASSWORD}${NC}"
  echo -e "  Map        : ${INSTALL_DIR}"
  echo ""
  echo "  Logs         : docker compose -f ${INSTALL_DIR}/docker-compose.yml logs -f"
  echo "  Updaten      : cd ${INSTALL_DIR} && docker compose pull && docker compose up -d"
  echo "  Backup       : ${INSTALL_DIR}/scripts/backup-db.sh"
  echo ""
  echo -e "${YELLOW}  n8n pull endpoint:${NC}"
  echo "  GET https://${DOMAIN}/api/n8n/receipts?since=<ISO-datum>"
  echo "  Header: X-API-Key: ${N8N_API_KEY}"
  echo ""
}

# ── main ──────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}Kassabon App — Installatie${NC}\n"

check_deps
setup_dir
download_files
create_env
setup_ssl && start_app || {
  warn "SSL overgeslagen. App starten zonder HTTPS..."
  cd "$INSTALL_DIR" && docker compose up -d
}
print_summary
