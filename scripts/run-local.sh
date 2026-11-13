#!/bin/bash
# launchd(com.aios.jigutmi)가 화·금 16:00에 실행 — 검수관이 재지시할 때도 이 작업을 깨운다(launchctl kickstart).
# 2026-11-14 GitHub Actions(daily-post.yml)에서 맥미니 로컬 실행으로 이전. 워크플로는 수동 예비용.
set -u
cd "$(dirname "$0")/.." || exit 1
MEDIA="$HOME/My World/Media"
export PATH="$HOME/.local/bin:$HOME/.nvm/versions/node/v24.18.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
echo "── $(date '+%F %T') 실행 (jigutmi)"

# 검수관 localRunning()이 보는 잠금 파일 (90분 이내면 '실행 중')
LOCK=".generate.lock"
touch "$LOCK"
trap 'rm -f "$LOCK"' EXIT

git pull -q --ff-only origin main || echo "git pull 실패 — 로컬 사본으로 진행"

# npm ci: package-lock.json이 설치본보다 새로울 때만
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  npm ci --no-audit --no-fund || { echo "npm ci 실패"; exit 1; }
fi

# 환경변수 (값은 출력하지 않는다)
# .env.local을 source하지 않고 한 줄씩 읽는다 — 값에 공백·&가 있어도(예: SITE_NAME=지구촌 TMI, DATABASE_URL=...&...) 깨지지 않게
while IFS= read -r line || [ -n "$line" ]; do
  line="${line%$'\r'}"
  case "$line" in ''|'#'*) continue;; esac
  k="${line%%=*}"; v="${line#*=}"
  [[ "$k" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
  v="${v#\"}"; v="${v%\"}"
  export "$k=$v"
done < ./.env.local
for NAME in CLAUDE_CODE_OAUTH_TOKEN PEXELS_API_KEY; do
  if [ -z "${!NAME:-}" ]; then
    export "$NAME=$(grep -E "^$NAME=" "$MEDIA/.env" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"
  fi
done
# 구독 토큰만 쓴다 — 로컬 .env.local의 API 키가 구독 인증을 덮어쓰지 않게 비운다(비어 있으면 dotenv도 덮어쓰지 않음)
export ANTHROPIC_API_KEY="" BLOG_ANTHROPIC_API_KEY=""
export POST_STATUS=draft   # 검수관(컨트롤타워)이 검수 후 공개
export NEXT_PUBLIC_SITE_NAME="지구촌 TMI"

if npm run generate; then exit 0; fi
echo "1차 실패 — 120초 후 재시도"; sleep 120
npm run generate
