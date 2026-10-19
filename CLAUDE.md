# 104 지구촌 TMI — CLAUDE.md

## 블로그 기본 정보
| 항목 | 내용 |
|------|------|
| 블로그명 | 지구촌 TMI |
| 도메인 | jigu-tmi-blog.vercel.app (2026-08-01 정정 — jigu-tmi.vercel.app은 배포 멈춘 중복 프로젝트) |
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

### ⚠️ 주제를 추가·수정할 때 (2026-10-19 실측)

**"세계에서 가장 ~", "TOP N", "기네스 기록" 형식을 쓰지 않는다.**

이 채널은 검수 통과율이 **0%**였다(hold 2 · pass 0). 다른 채널은 통과했다.
막힌 이유가 사소하지 않았다 — `basic-028`은 **존재하지 않는 '더 리퍼 크로스오버'를
현재 기네스 기록이라 서술**했고(실제는 Pepper X 약 269만 SHU), `basic-027`은
**'장(張)' 9천만 명**(프랑스 인구보다 많다)과 "세계 70억 명"(현재 약 80억)을 썼다.

우연이 아니라 구조적이다. 생성기에는 **웹 검색·사실 검증 장치가 없고**
프롬프트의 `12. 확인되지 않은 수치·일화는 쓰지 않는다` 한 줄에만 의존한다.
모델 기억만으로 세계기록·순위 수치를 쓰게 하면 날조가 나오고, 그 수치가
글의 뼈대라서 부분 수정으로 살릴 수 없다 → `fix`가 아니라 `hold`가 된다.

**대신 "왜 / 어떻게"를 묻는 설명형으로 쓴다.** 맞혀야 할 단일 수치가 없어
날조할 지점이 사라지고, 틀려도 검수관이 고칠 수 있는 종류의 오류가 된다.

| ❌ 쓰지 말 것 | ✅ 이렇게 |
|---|---|
| 세계에서 가장 오래 달린 마라톤 기록 | 울트라마라톤 선수들은 며칠씩 달리며 잠을 어떻게 해결할까? |
| 세상에서 가장 비싼 피자 한 판의 가격은? | 같은 피자인데 가게마다 값이 왜 크게 다를까? |
| 세상에서 가장 오래된 나무, 얼마나 됐을까? | 나무의 나이는 어떻게 알아낼까? |
| 세계에서 가장 이상한 법률 TOP 10 | 이상해 보이는 외국 법에는 어떤 사연이 있을까? |

- 기록·도전(`law`) 카테고리도 **수치가 아니라 과정**을 다루면 안전하다.
  예: `basic-035` "기네스 기록은 누가, 어떤 절차로 인정해줄까?" — 인증 절차라서 남겼다.
- **`index`·`slug`·`level`·`category`는 절대 바꾸지 않는다.** `getNextTopic()`이
  **DB에 없는 slug를 순서대로** 집어가므로, 순서가 밀리면 소진분이 다시 뽑히거나 건너뛴다.
  제목·keywords·meta_description만 고치고, **이미 발행된 번호는 건드리지 않는다.**
- 2026-10-19 작업: 미사용 102개 중 34개 교체(커밋 `0f8322e`). 검증은
  `npx tsc --noEmit` + 항목 130개·인덱스 1~130 연속·slug 중복 없음.

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

## 쿠팡 광고
- 캐러셀(`CoupangAd`)은 쿠팡 `widgets.html` iframe으로만 넣는다 (스크립트 g.js를 동적으로 넣으면 푸터 아래 왼쪽에 붙음). 가운데 정렬
- 날개 배너(`.wing-banner`): 본문 틀(52rem) 오른쪽, 헤더 아래(`top: 7rem`), 1240px 이상에서만 보임 (2026-10-15)

## 발행 현황
- 총 3편 발행 (basic-003까지, 2026-06-25 기준)
- 다음 주제: basic-004
- 스케줄: 평일 KST 09:00 자동 발행

## 환경변수 (.env.local)
- `CLAUDE_CODE_OAUTH_TOKEN` — 구독 인증 (우선). `claude setup-token`으로 발급
- `BLOG_ANTHROPIC_API_KEY` — API 키 폴백. **`ANTHROPIC_API_KEY`라는 이름은 쓰지 않는다** — SDK가 자동으로 집어 구독 인증을 덮어쓴다
- `UNSPLASH_ACCESS_KEY` — Unsplash 이미지
- `PEXELS_API_KEY` — Pexels 이미지 (폴백)
- `DATABASE_URL` — Neon PostgreSQL
- `NEXT_PUBLIC_SITE_URL=https://jigu-tmi-blog.vercel.app`
- `NEXT_PUBLIC_SITE_NAME=지구촌 TMI`
- `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` — 댓글 스팸 방지
- `HCAPTCHA_SECRET_KEY` — 댓글 스팸 방지 서버
- `ADMIN_API_KEY` — 관리자 API
- `COMMENT_RATE_LIMIT` — 댓글 속도 제한 (건수)
- `RATE_LIMIT_WINDOW` — 댓글 속도 제한 (시간창)

## GitHub Actions 시크릿 (ganddanbiz/jigu-tmi-blog)
- `DATABASE_URL`
- `CLAUDE_CODE_OAUTH_TOKEN`
- `BLOG_ANTHROPIC_API_KEY` (폴백, 없어도 동작)
- `UNSPLASH_ACCESS_KEY`
- `NEXT_PUBLIC_SITE_URL`


## 검수 및 수정 절차

### 검수 시점
- 글 발행 후 자동 검수 또는 수동 요청 시 실행

### 검수 항목
| 항목 | 기준 |
|------|------|
| 내용 적합성 | 블로그 주제에 맞는지, 독자에게 유용한지 |
| 이미지 적합성 | 내용과 이미지가 일치하는지, 저작권 문제 없는지 |
| 사실 기반 | 통계·수치·고유명사를 웹 검색으로 팩트체크 |
| 문체·품질 | 맞춤법, 가독성, 블로그 감성 일치 여부 |

### 자주 발생하는 오류 유형
- AI가 그럴듯한 수치를 생성(hallucination) → 반드시 출처 검색 후 대조
- 이미지 키워드 미스매치 → 본문 주제와 이미지 일치 확인
- 시사 내용 outdated → 발행일 기준 최신 정보인지 확인

### 오류 수정 방법 (DB 직접 수정)
```bash
# 1. .env.local에서 DATABASE_URL 로드
source .env.local  # 또는 직접 export

# 2. 특정 slug의 content/thumbnail_url 수정
psql $DATABASE_URL -c "
UPDATE posts
SET content = $content_수정본$,
    updated_at = NOW()
WHERE slug = '수정할-slug';
"

# 3. 썸네일 교체
psql $DATABASE_URL -c "
UPDATE posts SET thumbnail_url = '새이미지URL' WHERE slug = 'slug';
"

# 4. 수정 확인
psql $DATABASE_URL -c "SELECT slug, title, updated_at FROM posts WHERE slug = 'slug';"
```

### 검수 결과 기록
- 검수 후 이슈가 있으면 `scripts/review.log`에 날짜·slug·내용·처리결과 기록
- 형식: `[YYYY-MM-DD] slug | 이슈 | 처리결과`

