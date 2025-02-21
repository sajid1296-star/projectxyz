#!/bin/bash

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging Funktionen
log() {
    echo -e "${BLUE}[SETUP]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

prompt() {
    echo -e "${YELLOW}[INPUT]${NC} $1"
}

# OS Detection
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    else
        echo "unsupported"
    fi
}

# Node.js Installation
install_node() {
    log "Installiere Node.js..."
    
    OS=$(detect_os)
    case $OS in
        "linux")
            # Installation via nvm für Linux
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
            nvm install 18
            nvm use 18
            ;;
        "macos")
            # Installation via Homebrew für macOS
            if ! command -v brew &> /dev/null; then
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            brew install node@18
            ;;
        *)
            error "Nicht unterstütztes Betriebssystem"
            ;;
    esac
    
    success "Node.js installiert"
}

# Package Manager Installation
install_package_managers() {
    log "Installiere Package Manager..."
    
    # npm aktualisieren (kommt mit Node.js)
    npm install -g npm@latest
    
    # Yarn installieren
    npm install -g yarn
    
    # pnpm installieren
    npm install -g pnpm
    
    success "Package Manager installiert"
}

# PostgreSQL Installation
install_postgres() {
    log "Installiere PostgreSQL..."
    
    OS=$(detect_os)
    case $OS in
        "linux")
            sudo apt-get update
            sudo apt-get install -y postgresql postgresql-contrib
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            ;;
        "macos")
            brew install postgresql@14
            brew services start postgresql@14
            ;;
    esac
    
    success "PostgreSQL installiert"
}

# Redis Installation
install_redis() {
    log "Installiere Redis..."
    
    OS=$(detect_os)
    case $OS in
        "linux")
            sudo apt-get update
            sudo apt-get install -y redis-server
            sudo systemctl start redis
            sudo systemctl enable redis
            ;;
        "macos")
            brew install redis
            brew services start redis
            ;;
    esac
    
    success "Redis installiert"
}

# Git Installation
install_git() {
    log "Installiere Git..."
    
    OS=$(detect_os)
    case $OS in
        "linux")
            sudo apt-get update
            sudo apt-get install -y git
            ;;
        "macos")
            brew install git
            ;;
    esac
    
    success "Git installiert"
}

# Docker Installation
install_docker() {
    log "Installiere Docker..."
    
    OS=$(detect_os)
    case $OS in
        "linux")
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker $USER
            sudo systemctl start docker
            sudo systemctl enable docker
            ;;
        "macos")
            brew install --cask docker
            ;;
    esac
    
    success "Docker installiert"
}

# Überprüfe und installiere Systemanforderungen
install_prerequisites() {
    log "Überprüfe und installiere Systemanforderungen..."
    
    # OS überprüfen
    OS=$(detect_os)
    if [ "$OS" = "unsupported" ]; then
        error "Nicht unterstütztes Betriebssystem"
    fi
    
    # Node.js überprüfen und installieren
    if ! command -v node &> /dev/null; then
        install_node
    else
        log "Node.js bereits installiert"
    fi
    
    # Package Manager installieren
    install_package_managers
    
    # PostgreSQL überprüfen und installieren
    if ! command -v psql &> /dev/null; then
        install_postgres
    else
        log "PostgreSQL bereits installiert"
    fi
    
    # Redis überprüfen und installieren
    if ! command -v redis-cli &> /dev/null; then
        install_redis
    else
        log "Redis bereits installiert"
    fi
    
    # Git überprüfen und installieren
    if ! command -v git &> /dev/null; then
        install_git
    else
        log "Git bereits installiert"
    fi
    
    # Docker überprüfen und installieren
    if ! command -v docker &> /dev/null; then
        install_docker
    else
        log "Docker bereits installiert"
    fi
    
    success "Alle Systemanforderungen erfüllt"
}

# Konfigurationsvariablen
declare -A config

# Interaktive Konfiguration
get_configuration() {
    log "Projekteinrichtung - Bitte geben Sie die folgenden Informationen ein:"
    echo ""
    
    # Projekt-Informationen
    prompt "Projektname (nur Kleinbuchstaben und Bindestriche):"
    read -r config[PROJECT_NAME]
    
    # Datenbank-Informationen
    prompt "Datenbank Host [localhost]:"
    read -r db_host
    config[DB_HOST]=${db_host:-localhost}
    
    prompt "Datenbank Port [5432]:"
    read -r db_port
    config[DB_PORT]=${db_port:-5432}
    
    prompt "Datenbank Name:"
    read -r config[DB_NAME]
    
    prompt "Datenbank Benutzer:"
    read -r config[DB_USER]
    
    prompt "Datenbank Passwort:"
    read -rs config[DB_PASSWORD]
    echo ""
    
    # Redis-Informationen
    prompt "Redis Host [localhost]:"
    read -r redis_host
    config[REDIS_HOST]=${redis_host:-localhost}
    
    prompt "Redis Port [6379]:"
    read -r redis_port
    config[REDIS_PORT]=${redis_port:-6379}
    
    # JWT Secret
    config[JWT_SECRET]=$(openssl rand -hex 32)
    config[NEXTAUTH_SECRET]=$(openssl rand -hex 32)
    
    # Entwicklungsumgebung
    prompt "Entwicklungsumgebung (development/staging/production) [development]:"
    read -r env
    config[NODE_ENV]=${env:-development}
    
    echo ""
    success "Konfiguration gespeichert"
}

# Projekt initialisieren
init_project() {
    log "Initialisiere neues Next.js Projekt..."
    
    # Projekt mit Next.js erstellen
    npx create-next-app@latest . --typescript --tailwind --eslint || error "Fehler beim Erstellen des Next.js Projekts"
    
    success "Next.js Projekt erstellt"
}

# Dependencies installieren
install_dependencies() {
    log "Installiere Dependencies..."
    
    # Produktions-Dependencies
    npm install \
        ioredis \
        @prisma/client \
        zod \
        next-auth \
        @opentelemetry/sdk-node \
        @aws-sdk/client-s3 \
        @aws-sdk/client-ssm \
        helmet \
        jsonwebtoken \
        redis \
        bull \
        @sentry/node \
        swagger-jsdoc \
        typedoc \
        axios \
        date-fns \
        uuid \
        bcryptjs \
        || error "Fehler beim Installieren der Produktions-Dependencies"

    # Development Dependencies
    npm install -D \
        prisma \
        typescript \
        @types/node \
        @types/react \
        jest \
        @types/jest \
        ts-jest \
        supertest \
        @testing-library/react \
        @testing-library/jest-dom \
        cypress \
        eslint \
        prettier \
        husky \
        lint-staged \
        || error "Fehler beim Installieren der Development Dependencies"
        
    success "Dependencies installiert"
}

# Projektstruktur erstellen
create_structure() {
    log "Erstelle Projektstruktur..."
    
    # Hauptverzeichnisse
    mkdir -p \
        lib/{auth,search,validation,i18n,rate-limit,analytics,monitoring,security,config,testing,deployment,documentation,compliance} \
        app/api \
        scripts \
        tests/{unit,integration,e2e} \
        docs \
        templates \
        public \
        || error "Fehler beim Erstellen der Verzeichnisstruktur"
        
    success "Projektstruktur erstellt"
}

# Konfigurationsdateien mit den eingegebenen Werten erstellen
create_config_files() {
    log "Erstelle Konfigurationsdateien..."
    
    # .env Datei erstellen
    cat > .env << EOF
# Environment
NODE_ENV=${config[NODE_ENV]}
APP_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://${config[DB_USER]}:${config[DB_PASSWORD]}@${config[DB_HOST]}:${config[DB_PORT]}/${config[DB_NAME]}"

# Redis
REDIS_URL="redis://${config[REDIS_HOST]}:${config[REDIS_PORT]}"

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${config[NEXTAUTH_SECRET]}
JWT_SECRET=${config[JWT_SECRET]}

# API
API_URL=http://localhost:3000/api

# Add your other config variables here
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SENTRY_DSN=
EOF

    # Git Ignore
    echo "node_modules
.env
.next
coverage
dist
.DS_Store" > .gitignore
    
    # Prettier Config
    echo '{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}' > .prettierrc
    
    success "Konfigurationsdateien erstellt"
}

# Git initialisieren
init_git() {
    log "Initialisiere Git Repository..."
    
    git init
    git add .
    git commit -m "Initial commit" || true
    
    success "Git Repository initialisiert"
}

# Datenbank Setup
setup_database() {
    log "Überprüfe Datenbankverbindung..."
    
    if command -v psql &> /dev/null; then
        # Versuche Datenbank zu erstellen
        PGPASSWORD="${config[DB_PASSWORD]}" createdb -h "${config[DB_HOST]}" -p "${config[DB_PORT]}" -U "${config[DB_USER]}" "${config[DB_NAME]}" 2>/dev/null || {
            log "Datenbank existiert bereits oder konnte nicht erstellt werden"
        }
        
        # Prisma initialisieren
        npx prisma init || error "Fehler beim Initialisieren von Prisma"
        npx prisma generate || error "Fehler beim Generieren des Prisma Clients"
        
        success "Datenbank Setup abgeschlossen"
    else
        log "PostgreSQL Client nicht gefunden - Überspringe automatische Datenbankerstellung"
        log "Bitte erstellen Sie die Datenbank manuell mit den angegebenen Zugangsdaten"
    fi
}

# Husky Setup für Git Hooks
setup_husky() {
    log "Konfiguriere Husky..."
    
    npx husky install || error "Fehler beim Installieren von Husky"
    npm set-script prepare "husky install"
    npx husky add .husky/pre-commit "npm run lint && npm test"
    
    success "Husky konfiguriert"
}

# Hauptfunktion
main() {
    log "Starte vollständiges System-Setup..."
    
    # Prerequisites installieren
    install_prerequisites
    
    # Existierende Funktionen
    get_configuration
    init_project
    install_dependencies
    create_structure
    create_config_files
    setup_database
    setup_husky
    init_git
    
    echo ""
    success "System-Setup abgeschlossen! 🚀"
    log "Führe 'npm run dev' aus, um den Entwicklungsserver zu starten."
    
    # Zusammenfassung anzeigen
    echo ""
    log "Systemzusammenfassung:"
    echo "- Node.js Version: $(node -v)"
    echo "- npm Version: $(npm -v)"
    echo "- Yarn Version: $(yarn -v)"
    echo "- PostgreSQL Version: $(psql -V)"
    echo "- Redis Version: $(redis-cli -v)"
    echo "- Git Version: $(git --version)"
    echo "- Docker Version: $(docker -v)"
    echo ""
    log "Alle Konfigurationen wurden in der .env Datei gespeichert"
}

# Skript ausführen
main 