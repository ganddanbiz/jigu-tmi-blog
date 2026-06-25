# 140 지구촌 TMI — CLAUDE.md

## 블로그 기본 정보
| 항목 | 내용 |
|------|------|
| 블로그명 | 지구촌 TMI |
| URL | https://jigu-tmi.vercel.app |
| 언어 | 한국어 |
| 주제 | 세계 잡학 TMI (신기한 사실, 기록, 동물, 음식, 문화 등) |
| 캐릭터 | 잡학왕 TMI |
| 타겟 독자 | 20~40대, 출퇴근 중 스마트폰으로 읽는 독자 |
| AI 모델 | Claude Haiku (claude-haiku-4-5-20251001) |
| 이미지 | Unsplash (최대 3장) + Pexels (부족분 보완) |
| DB | Neon PostgreSQL (ap-southeast-1) |

## 현재 상태 ✅ 운영 중
- 발행: 2편 (basic-001, basic-002)
- 자동 발행: GitHub Actions 평일 KST 09:00
- Vercel 프로젝트: tugman77-8039s-projects/jigu-tmi
- GitHub 저장소: ganddanbiz/jigu-tmi-blog

## 배포 방식
- **Vercel**: `vercel build --prod` → `vercel deploy --prebuilt --prod` (로컬 빌드 후 배포)
- **GitHub Actions**: 글 자동 생성만 담당 (daily-post.yml)
- ⚠️ `vercel --prod` 직접 실행 시 BLOCKED 발생 — 반드시 prebuilt 방식 사용

## 코드베이스 출처
- **110 재테크스토리 코드를 그대로 복사해서 수정**한 프로젝트
- 코드 구조, DB 스키마, 카테고리명(`before/bidding/after/tax/law/ai`), 워크플로우 등 동일
- 재테크스토리 코드 참조 시: `010 Blog_Manger/110 Blog_Jaetechstory/`
- 차이점: AI 모델(Gemini→Claude Haiku), 주제(재테크→세계 TMI), 이미지(Unsplash→Unsplash+Pexels)

## 프로젝트 구조
```
140 Blog_World News/
├── scripts/
│   ├── generate-post.ts  ← AI 글 자동 생성 (ws 패키지로 Neon WebSocket 설정)
│   ├── topics.ts         ← 주제 목록 (130개)
│   └── generate.log      ← 발행 로그
├── .github/workflows/
│   └── daily-post.yml    ← 평일 KST 09:00 자동 발행
├── .env.local            ← 환경변수
└── src/
```

## 발행 명령
```bash
cd "140 Blog_World News"
npm run generate
```

## 재배포 명령 (사이트 이름 변경 등)
```bash
cd "140 Blog_World News"
# .vercel/.env.production.local을 .env.local로 덮어쓴 후
cp .env.local .vercel/.env.production.local
echo "VERCEL=1" >> .vercel/.env.production.local
vercel build --prod
vercel deploy --prebuilt --prod
```

## 글 작성 규칙

### 핵심 컨셉
- 가볍게 읽는 세계 잡학 TMI
- 친구에게 신기한 이야기 전해주듯 편안하게
- 정치, 경제, 전쟁 관련 내용 **금지**

### 문체
- 가볍고 친근한 존댓말 (반말 금지)
- "여러분", "독자님", "친구" 등 직접 호칭 금지
- 첫 문장: 강한 후킹 (놀라운 사실 or 의문)
- "안녕하세요", "오늘은 ~에 대해 알아보겠습니다" 금지

### 분량 및 구성
- **2000자 내외** (스마트폰으로 5분 내 읽을 분량)
- 재미있는 사실, 신기한 수치, 예상을 깨는 반전 필수 포함
- 표와 목록으로 눈으로 읽기 편하게

### 금지 주제
- 경제, 정치, 전쟁, 분쟁

### 필수 마지막 섹션
```html
<h2>💡 TMI 한 줄 요약</h2>
<blockquote>핵심 내용을 재미있고 임팩트 있게 한두 줄로 요약</blockquote>
```

### HTML 출력 규칙
- 순수 HTML만 출력, 마크다운 금지
- 허용 태그: `<h2> <h3> <p> <ul> <ol> <li> <table> <thead> <tbody> <tr> <th> <td> <strong> <blockquote>`
- `<h1>` 사용 금지

## 이미지 처리
- Unsplash 최대 3장 + Pexels로 부족분 보완 (총 5장 목표: 썸네일1 + 인라인4)
- h2 섹션 1~4번째 뒤에 순서대로 삽입

## 카테고리 분류 (이미지 검색어 기준)
| category | 이미지 검색어 |
|----------|-------------|
| before | world news people street crowd |
| bidding | animals wildlife nature outdoor |
| after | people community culture lifestyle |
| tax | food cooking culture restaurant |
| law | sport achievement competition record |
| ai | technology science innovation gadget |

## 환경변수 (.env.local)
- `ANTHROPIC_API_KEY` — Claude API
- `DATABASE_URL` — Neon PostgreSQL
- `UNSPLASH_ACCESS_KEY` — Unsplash 이미지
- `PEXELS_API_KEY` — Pexels 이미지
- `NEXT_PUBLIC_SITE_URL=https://jigu-tmi.vercel.app`
- `NEXT_PUBLIC_SITE_NAME=지구촌 TMI`

## GitHub Actions 시크릿 (ganddanbiz/jigu-tmi-blog)
- `ANTHROPIC_API_KEY` ✅
- `DATABASE_URL` ✅
- `UNSPLASH_ACCESS_KEY` ✅
- `PEXELS_API_KEY` ✅
- `NEXT_PUBLIC_SITE_URL` ✅

## 발행 현황
- 총 2편 발행 (2026-06-25 기준, basic-002까지)
- 다음 주제: basic-003 (3/130)
