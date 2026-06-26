# 104 지구촌 TMI — CLAUDE.md

## 블로그 기본 정보
| 항목 | 내용 |
|------|------|
| 블로그명 | 지구촌 TMI |
| 도메인 | jigu-tmi.vercel.app |
| 언어 | 한국어 |
| 주제 | 세계의 신기하고 재미있는 뉴스·이야기 (지구촌 TMI) |
| 타겟 독자 | 세계 뉴스에 관심 있는 한국 독자 |
| AI 모델 | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) |
| 이미지 | Unsplash API + Pexels API (폴백) |
| DB | Neon PostgreSQL (ap-southeast-1) |
| GitHub | ganddanbiz/jigu-tmi-blog |

## 코드베이스 출처
- **110 재테크스토리 코드를 복사·수정한 프로젝트**
- DB 라이브러리: `Pool` from `@neondatabase/serverless`
- 코드 참조 시: `100 Blog_Manger/101 Blog_Jaetechstory/`
- 댓글 시스템 추가 (CommentForm, CommentList, CommentSection)
- hCaptcha 스팸 방지 적용 (`NEXT_PUBLIC_HCAPTCHA_SITE_KEY`, `HCAPTCHA_SECRET_KEY`)

## 프로젝트 구조
```
104 Blog_World News/
├── scripts/
│   ├── generate-post.ts    ← AI 글 자동 생성
│   ├── regenerate-post.ts  ← 기존 포스트 재생성
│   ├── topics.ts           ← 주제 목록 (130개)
│   └── setup-server.sh     ← 서버 설정 스크립트
├── src/
│   ├── app/                ← Next.js 라우팅 (page.tsx, posts/[slug], api/*)
│   ├── components/         ← 공통 컴포넌트 (PostCard, CommentSection 등)
│   └── lib/                ← db.ts, seo.ts, spam.ts, hash.ts
├── .env.local              ← 환경변수
└── .github/workflows/
    ├── daily-post.yml      ← 평일 KST 09:00 자동 발행
    └── vercel-deploy.yml   ← Vercel 배포
```

## 발행 명령
```bash
cd "100 Blog_Manger/104 Blog_World News"
npm run generate
```

## Vercel 배포 방식 (중요)
```bash
# 직접 git push 불가 — prebuilt 배포 필수
vercel build --prod
vercel deploy --prebuilt --prod
```

## topics.ts 위치
`scripts/topics.ts` (주의: src/lib/ 아님)

## 주제 구조 (130개)
| 레벨 | slug 패턴 | 개수 | 주제 분야 |
|------|-----------|------|-----------|
| 기초편 | basic-001 ~ basic-043 | 43개 | 세계 신기한 이야기 |
| 중급편 | mid-001 ~ mid-043 | 43개 | 심층 세계 이야기 |
| 고급편 | adv-001 ~ adv-044 | 44개 | 과학·문명·AI 심층 |

## 카테고리 분류
| category | 의미 |
|----------|------|
| before | 세계 이슈 (신기한 세계 뉴스) |
| bidding | 동물·자연 (동물과 자연의 놀라운 이야기) |
| after | 사람·사회 (사람과 사회의 흥미로운 이야기) |
| tax | 음식·문화 (음식과 문화의 별별 이야기) |
| law | 기록·도전 (세계 기록과 도전 이야기) |
| ai | 기술·발명 (기술과 발명의 신기한 이야기) |

## 글 작성 규칙 (AI 프롬프트 기준)

### 문체
- 친근하고 재미있는 존댓말
- 첫 문장: 강한 후킹 (의외의 사실·흥미로운 질문)
- "안녕하세요", "오늘은 ~에 대해" 금지
- h2 섹션 4개 필수 (이미지 4장 삽입 보장)

### 분량 및 구성
- 2500~3000자
- h2 섹션 4개 구성
- 표와 목록 적극 활용

### HTML 출력 규칙
- 순수 HTML만 출력, 마크다운 기호 금지
- 허용 태그: `<h2> <h3> <p> <ul> <ol> <li> <table> <thead> <tbody> <tr> <th> <td> <strong> <blockquote>`
- `<h1>` 사용 금지

## 이미지 처리
- 이미지 소스: Unsplash → Pexels (폴백)
- 카테고리별 검색어 맵 (`CATEGORY_QUERY`)
- 썸네일: allImages[0], 인라인: h2 섹션별 삽입

## 발행 현황
- 총 3편 발행 (basic-003까지, 2026-06-25 기준)
- 다음 주제: basic-004
- 스케줄: 평일 KST 09:00 자동 발행

## 환경변수 (.env.local)
- `ANTHROPIC_API_KEY` — Claude API
- `UNSPLASH_ACCESS_KEY` — Unsplash 이미지
- `PEXELS_API_KEY` — Pexels 이미지 (폴백)
- `DATABASE_URL` — Neon PostgreSQL
- `NEXT_PUBLIC_SITE_URL=https://jigu-tmi.vercel.app`
- `NEXT_PUBLIC_SITE_NAME=지구촌 TMI`
- `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` — 댓글 스팸 방지
- `HCAPTCHA_SECRET_KEY` — 댓글 스팸 방지 서버
- `ADMIN_API_KEY` — 관리자 API
- `COMMENT_RATE_LIMIT` — 댓글 속도 제한 (건수)
- `RATE_LIMIT_WINDOW` — 댓글 속도 제한 (시간창)

## GitHub Actions 시크릿 (ganddanbiz/jigu-tmi-blog)
- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- `UNSPLASH_ACCESS_KEY`
- `NEXT_PUBLIC_SITE_URL`
