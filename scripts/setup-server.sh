#!/bin/bash
# ============================================================
# AI 자동 블로그 - 서버 초기 세팅 스크립트
# Ubuntu 20.04 / 22.04 기준
# 사용법: sudo bash scripts/setup-server.sh
# ============================================================

set -e  # 오류 발생 시 즉시 중단

# ── 색상 출력 ───────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── 설정값 (실행 전 반드시 수정) ────────────────────────────
DOMAIN="your-domain.com"        # ← 실제 도메인으로 변경
APP_DIR="/var/www/my-blog"    # ← 배포 경로
DB_USER="my_blog"
DB_NAME="my_blog"
DB_PASS=""                         # ← 실행 시 자동 생성됨
GITHUB_REPO="https://github.com/YOUR_GITHUB_USER/YOUR_REPO.git"
NODE_VERSION="20"

echo ""
echo "============================================"
echo "  지구촌 TMI 서버 세팅 시작"
echo "  도메인: $DOMAIN"
echo "  경로:   $APP_DIR"
echo "============================================"
echo ""

# ── 루트 확인 ───────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  err "sudo로 실행해주세요: sudo bash scripts/setup-server.sh"
fi

# ── 1. 시스템 패키지 업데이트 ───────────────────────────────
log "시스템 패키지 업데이트 중..."
apt-get update -qq
apt-get upgrade -y -qq

# ── 2. Node.js 20 설치 ──────────────────────────────────────
log "Node.js ${NODE_VERSION} 설치 중..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
else
  warn "Node.js 이미 설치됨: $(node -v)"
fi
log "Node.js: $(node -v), npm: $(npm -v)"

# ── 3. PM2 설치 ─────────────────────────────────────────────
log "PM2 설치 중..."
npm install -g pm2 --quiet
log "PM2: $(pm2 -v)"

# ── 4. MySQL 설치 및 설정 ───────────────────────────────────
log "MySQL 설치 중..."
if ! command -v mysql &> /dev/null; then
  apt-get install -y mysql-server
  systemctl start mysql
  systemctl enable mysql
else
  warn "MySQL 이미 설치됨"
fi

# DB 비밀번호 자동 생성
DB_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 20)

log "MySQL DB 및 사용자 생성 중..."
mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS ${DB_NAME}
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost'
  IDENTIFIED BY '${DB_PASS}';

GRANT ALL PRIVILEGES ON ${DB_NAME}.*
  TO '${DB_USER}'@'localhost';

FLUSH PRIVILEGES;
SQL
log "DB 생성 완료: ${DB_NAME} / 사용자: ${DB_USER}"

# ── 5. Nginx 설치 ───────────────────────────────────────────
log "Nginx 설치 중..."
if ! command -v nginx &> /dev/null; then
  apt-get install -y nginx
  systemctl enable nginx
else
  warn "Nginx 이미 설치됨"
fi

# ── 6. Certbot 설치 (SSL) ───────────────────────────────────
log "Certbot 설치 중..."
if ! command -v certbot &> /dev/null; then
  apt-get install -y certbot python3-certbot-nginx
else
  warn "Certbot 이미 설치됨"
fi

# ── 7. 프로젝트 클론 ────────────────────────────────────────
log "프로젝트 클론 중: $GITHUB_REPO"
if [ -d "$APP_DIR" ]; then
  warn "디렉토리가 이미 존재합니다. git pull로 업데이트합니다."
  cd "$APP_DIR" && git pull
else
  git clone "$GITHUB_REPO" "$APP_DIR"
fi
cd "$APP_DIR"

# ── 8. npm 패키지 설치 ──────────────────────────────────────
log "npm 패키지 설치 중..."
npm install --production=false

# ── 9. DB 스키마 초기화 ─────────────────────────────────────
log "DB 테이블 생성 중..."
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < sql/init.sql
log "DB 테이블 생성 완료"

# ── 10. .env.local 생성 ─────────────────────────────────────
log ".env.local 생성 중..."
ADMIN_KEY=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)

cat > "$APP_DIR/.env.local" <<ENV
# ============================================
# .env.local - 운영 환경
# 생성일: $(date '+%Y-%m-%d %H:%M:%S')
# ============================================

# ── MySQL ──
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_USER=${DB_USER}
DATABASE_PASSWORD=${DB_PASS}
DATABASE_NAME=${DB_NAME}

# ── 사이트 ──
NEXT_PUBLIC_SITE_URL=https://${DOMAIN}
NEXT_PUBLIC_SITE_NAME=지구촌 TMI

# ── hCaptcha (발급 후 교체) ──
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=CHANGE_ME
HCAPTCHA_SECRET_KEY=CHANGE_ME

# ── 관리자 API 인증 ──
ADMIN_API_KEY=${ADMIN_KEY}

# ── Rate Limit ──
COMMENT_RATE_LIMIT=3
RATE_LIMIT_WINDOW=60

# ── 연락처 ──
NEXT_PUBLIC_CONTACT_EMAIL=your-email@example.com

# ── Google Analytics ──
NEXT_PUBLIC_GA_ID=G-LQC7MLGKJV

# ── Google AdSense (승인 후 교체) ──
# NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
# NEXT_PUBLIC_ADSENSE_SLOT_LIST=1234567890

# ── Gemini API ──
GEMINI_API_KEY=CHANGE_ME
ENV

warn ".env.local 생성 완료. Gemini API 키와 hCaptcha 키는 직접 입력 필요:"
warn "  nano $APP_DIR/.env.local"

# ── 11. Next.js 빌드 ────────────────────────────────────────
log "Next.js 빌드 중..."
npm run build
log "빌드 완료"

# ── 12. PM2 등록 ────────────────────────────────────────────
log "PM2 등록 중..."
pm2 delete my-blog 2>/dev/null || true
pm2 start npm --name "my-blog" -- start
pm2 save
pm2 startup | tail -1 | bash
log "PM2 등록 완료"

# ── 13. Nginx 설정 ──────────────────────────────────────────
log "Nginx 설정 중..."
cat > /etc/nginx/sites-available/my-blog <<NGINX
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    client_max_body_size 10M;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    # Next.js 정적 파일 캐시
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # 업로드 파일
    location /uploads/ {
        alias ${APP_DIR}/public/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # Next.js 앱
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/my-blog /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
log "Nginx 설정 완료"

# ── 14. SSL 인증서 ──────────────────────────────────────────
warn "SSL 인증서 발급을 진행합니다. 도메인이 이 서버 IP를 가리키고 있어야 합니다."
read -p "SSL 인증서를 지금 발급할까요? (y/n): " ssl_confirm
if [ "$ssl_confirm" = "y" ]; then
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "admin@${DOMAIN}"
  log "SSL 인증서 발급 완료"
else
  warn "SSL 발급 건너뜀. 나중에 실행: sudo certbot --nginx -d ${DOMAIN}"
fi

# ── 15. 크론탭 등록 (평일 오전 9시 자동 글 발행) ───────────
log "크론탭 등록 중..."
CRON_JOB="0 9 * * 1-5 cd ${APP_DIR} && /usr/bin/npx tsx scripts/generate-post.ts >> ${APP_DIR}/scripts/generate.log 2>&1"
(crontab -l 2>/dev/null | grep -v "generate-post"; echo "$CRON_JOB") | crontab -
log "크론탭 등록 완료 (평일 오전 9시 자동 발행)"

# ── 완료 요약 ───────────────────────────────────────────────
echo ""
echo "============================================"
echo "  세팅 완료!"
echo "============================================"
echo ""
echo "  사이트:      https://${DOMAIN}"
echo "  앱 경로:     ${APP_DIR}"
echo "  DB 사용자:   ${DB_USER}"
echo "  DB 비밀번호: ${DB_PASS}"
echo "  Admin Key:   ${ADMIN_KEY}"
echo ""
echo "  ※ 아래 두 가지는 직접 입력 필요:"
echo "    - Gemini API 키"
echo "    - hCaptcha 키"
echo "  → nano ${APP_DIR}/.env.local"
echo ""
echo "  입력 후 재빌드 & 재시작:"
echo "    cd ${APP_DIR} && npm run build && pm2 restart my-blog"
echo ""
echo "  PM2 상태 확인: pm2 status"
echo "  로그 확인:     pm2 logs my-blog"
echo "  글 수동 생성:  cd ${APP_DIR} && npm run generate"
echo "============================================"
