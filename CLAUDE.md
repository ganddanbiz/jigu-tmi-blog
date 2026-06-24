# 140 지구촌 TMI — CLAUDE.md

## 블로그 기본 정보
| 항목 | 내용 |
|------|------|
| 블로그명 | 지구촌 TMI |
| 도메인 | **미설정** (localhost:3000) → 설정 필요 |
| 언어 | 한국어 |
| 주제 | 세계 잡학 TMI (신기한 사실, 기록, 동물, 음식, 문화 등) |
| 캐릭터 | 잡학왕 TMI |
| 타겟 독자 | 20~40대, 출퇴근 중 스마트폰으로 읽는 독자 |
| AI 모델 | Claude Haiku (claude-haiku-4-5-20251001) |
| 이미지 | Unsplash (최대 3장) + Pexels (부족분 보완) |
| DB | Neon PostgreSQL — **DATABASE_URL 미설정 (운영 준비 필요)** |

## 현재 상태 ⚠️
- **DATABASE_URL 비어있음** → `.env.local`에 Neon DB URL 설정 후 운영 가능
- 발행 이력 없음 (0편)
- 도메인 미설정

## 운영 시작 전 필수 작업
1. Neon DB 생성 후 `DATABASE_URL` 설정
2. DB 테이블 생성 (`sql/init.pg.sql` 실행)
3. 도메인 설정 및 `NEXT_PUBLIC_SITE_URL` 업데이트
4. Vercel 배포

## 프로젝트 구조
```
140 Blog_World News/
├── scripts/
│   ├── generate-post.ts  ← AI 글 자동 생성
│   ├── topics.ts         ← 주제 목록 (130개)
│   └── (generate.log 없음 — 미운영)
├── .env.local            ← 환경변수 (DB 미설정)
└── src/
```

## 발행 명령
```bash
cd "140 Blog_World News"
npm run generate
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
- `DATABASE_URL` — **미설정 (필수 설정 필요)**
- `UNSPLASH_ACCESS_KEY` — Unsplash 이미지
- `PEXELS_API_KEY` — Pexels 이미지
- `NEXT_PUBLIC_SITE_URL` — 도메인 (현재 localhost:3000)
- `NEXT_PUBLIC_SITE_NAME=지구촌 TMI`
