/**
 * 지구촌 TMI — AI 블로그 자동 글 생성 스크립트
 * 사용법: npx tsx scripts/generate-post.ts
 * GitHub Actions: 평일 오전 9시 KST 자동 실행
 */

import Anthropic from "@anthropic-ai/sdk";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { allTopics, Topic } from "./topics";

neonConfig.webSocketConstructor = ws;
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ── Neon DB 연결 ──────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

// ── Claude 클라이언트 ─────────────────────────────
// ANTHROPIC_API_KEY는 Claude Code CLI가 자동으로 읽어 구독 인증을 덮어쓰므로 사용하지 않음.
// 우선순위: CLAUDE_CODE_OAUTH_TOKEN(구독) → BLOG_ANTHROPIC_API_KEY(스크립트 전용 API 키)
const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
const apiKey = process.env.BLOG_ANTHROPIC_API_KEY;
if (!oauthToken && !apiKey) {
  console.error(
    "❌ CLAUDE_CODE_OAUTH_TOKEN 또는 BLOG_ANTHROPIC_API_KEY가 .env.local에 필요합니다.\n" +
      "   구독 사용: `claude setup-token` 실행 후 CLAUDE_CODE_OAUTH_TOKEN에 토큰 입력"
  );
  process.exit(1);
}
const anthropic = oauthToken
  ? new Anthropic({ authToken: oauthToken, maxRetries: 3, timeout: 90_000 })
  : new Anthropic({ apiKey: apiKey!, maxRetries: 3, timeout: 90_000 });

// ── 카테고리 → 이미지 검색어 맵 ──────────────────
const CATEGORY_QUERY: Record<string, string> = {
  before:  "world news people street crowd",
  bidding: "animals wildlife nature outdoor",
  after:   "people community culture lifestyle",
  tax:     "food cooking culture restaurant",
  law:     "sport achievement competition record",
  ai:      "technology science innovation gadget",
};

interface ImageResult {
  url: string;
  attribution: string;
}

// ── DB에서 이미 사용된 이미지 URL 조회 ───────────
async function getUsedImageIds(): Promise<Set<string>> {
  const { rows } = await pool.query(
    "SELECT thumbnail_url, content FROM posts WHERE status = 'published'"
  );
  const ids = new Set<string>();
  const inlineRegex = /src="(https:\/\/(?:images\.unsplash\.com|images\.pexels\.com)\/[^"?]+)/g;

  for (const row of rows) {
    if (row.thumbnail_url) {
      ids.add((row.thumbnail_url as string).split("?")[0]);
    }
    if (row.content) {
      let match;
      while ((match = inlineRegex.exec(row.content as string)) !== null) {
        ids.add(match[1]);
      }
      inlineRegex.lastIndex = 0;
    }
  }
  return ids;
}

// ── Unsplash 이미지 가져오기 ──────────────────────
async function fetchUnsplashImages(
  category: string,
  count: number,
  usedIds: Set<string> = new Set()
): Promise<ImageResult[]> {
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!unsplashKey) {
    writeLog("⚠️  UNSPLASH_ACCESS_KEY 미설정 — Unsplash 스킵");
    return [];
  }
  const query = CATEGORY_QUERY[category] ?? "world news people";
  try {
    const results: ImageResult[] = [];
    let page = 1;
    while (results.length < count && page <= 3) {
      const url = new URL("https://api.unsplash.com/search/photos");
      url.searchParams.set("query", query);
      url.searchParams.set("per_page", "10");
      url.searchParams.set("orientation", "landscape");
      url.searchParams.set("page", String(page));
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Client-ID ${unsplashKey}` },
      });
      if (!res.ok) { writeLog(`⚠️  Unsplash API 오류 (${res.status})`); break; }
      const data = await res.json() as {
        results: Array<{ id: string; urls: { regular: string }; user: { name: string }; links: { html: string } }>;
      };
      if (!data.results?.length) break;
      for (const photo of data.results) {
        const baseUrl = photo.urls.regular.split("?")[0];
        if (usedIds.has(baseUrl)) continue;
        usedIds.add(baseUrl);
        results.push({
          url: photo.urls.regular,
          attribution: `<a href="${photo.links.html}?utm_source=jigu_tmi&utm_medium=referral" rel="noopener noreferrer" style="color:rgba(255,255,255,0.9);">${photo.user.name}</a> / Unsplash`,
        });
        if (results.length >= count) break;
      }
      page++;
    }
    return results;
  } catch (err) {
    writeLog(`⚠️  Unsplash fetch 실패: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

// ── Pexels 이미지 가져오기 ────────────────────────
async function fetchPexelsImages(
  category: string,
  count: number,
  usedIds: Set<string> = new Set()
): Promise<ImageResult[]> {
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (!pexelsKey) {
    writeLog("⚠️  PEXELS_API_KEY 미설정 — Pexels 스킵");
    return [];
  }
  const query = CATEGORY_QUERY[category] ?? "world news people";
  try {
    const results: ImageResult[] = [];
    let page = 1;
    while (results.length < count && page <= 3) {
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&page=${page}&orientation=landscape`;
      const res = await fetch(url, { headers: { Authorization: pexelsKey } });
      if (!res.ok) { writeLog(`⚠️  Pexels API 오류 (${res.status})`); break; }
      const data = await res.json() as {
        photos: Array<{ id: number; src: { large2x: string }; photographer: string; url: string }>;
      };
      if (!data.photos?.length) break;
      for (const photo of data.photos) {
        const baseUrl = photo.src.large2x.split("?")[0];
        if (usedIds.has(baseUrl)) continue;
        usedIds.add(baseUrl);
        results.push({
          url: photo.src.large2x,
          attribution: `<a href="${photo.url}" rel="noopener noreferrer" style="color:rgba(255,255,255,0.9);">${photo.photographer}</a> / Pexels`,
        });
        if (results.length >= count) break;
      }
      page++;
    }
    return results;
  } catch (err) {
    writeLog(`⚠️  Pexels fetch 실패: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

// ── 이미지 최대 5장 수집 (Unsplash + Pexels 혼합) ─
async function fetchImages(category: string, usedIds: Set<string>): Promise<ImageResult[]> {
  const TOTAL_NEEDED = 5; // 썸네일 1 + 인라인 4
  const unsplashImages = await fetchUnsplashImages(category, 3, usedIds);
  const remaining = TOTAL_NEEDED - unsplashImages.length;
  const pexelsImages = remaining > 0
    ? await fetchPexelsImages(category, remaining + 1, usedIds)
    : [];
  return [...unsplashImages, ...pexelsImages].slice(0, TOTAL_NEEDED);
}

// ── 콘텐츠 내 이미지 삽입 (h2 뒤마다 삽입) ───────
function injectImagesIntoContent(html: string, images: ImageResult[]): string {
  if (!images.length) return html;
  const DELIMITER = "</h2>";
  const parts = html.split(DELIMITER);
  // h2 섹션 1, 2, 3, 4 뒤에 이미지 삽입
  const targets: Array<[number, number]> = [[1, 0], [2, 1], [3, 2], [4, 3]];
  for (const [partIdx, imgIdx] of targets) {
    // 마지막 조각은 「💡 TMI 한 줄 요약」 뒤라 사진을 넣지 않는다
    if (partIdx >= parts.length - 1 || !images[imgIdx]) continue;
    const img = images[imgIdx];
    const figure = [
      `<figure style="margin:1.75em 0;position:relative;display:block;">`,
      `<img src="${img.url}" alt="관련 이미지" loading="lazy"`,
      ` style="width:100%;max-height:400px;object-fit:cover;border-radius:10px;border:1px solid var(--border);display:block;" />`,
      `<figcaption style="position:absolute;bottom:8px;right:10px;font-size:0.65rem;`,
      `color:rgba(255,255,255,0.85);background:rgba(0,0,0,0.45);`,
      `padding:2px 7px;border-radius:4px;line-height:1.5;white-space:nowrap;">`,
      img.attribution,
      `</figcaption></figure>`,
    ].join("");
    parts[partIdx] = figure + parts[partIdx]; // </h2> 바로 뒤 — 끝에 붙이면 다음 <h2> 안에 들어간다(2026-11-11)
  }
  return parts.join(DELIMITER);
}

// ── 최근 발행 제목 조회 (중복 방지용) ───────────
async function getRecentTitles(count: number = 7): Promise<string[]> {
  const { rows } = await pool.query(
    "SELECT title FROM posts WHERE status = 'published' ORDER BY published_at DESC LIMIT $1",
    [count]
  );
  return rows.map((r: { title: string }) => r.title);
}

// ── 다음 발행할 주제 결정 ─────────────────────────
async function getNextTopic(): Promise<Topic | null> {
  const { rows } = await pool.query(
    "SELECT slug FROM posts WHERE slug ~ '^(basic|mid|adv)-[0-9]+$'"
  );
  const existingSlugs = new Set(rows.map((r: { slug: string }) => r.slug));
  for (const topic of allTopics) {
    if (!existingSlugs.has(topic.slug)) return topic;
  }
  return null;
}

// ── AI 프롬프트 생성 ──────────────────────────────
function buildPrompt(topic: Topic, recentTitles: string[] = []): string {
  const avoidSection = recentTitles.length > 0
    ? `[최근 발행된 글 — 다른 각도로 작성할 것]\n아래 글들과 핵심 사례·설명 방식이 겹치지 않도록 새로운 관점으로 접근해주세요:\n${recentTitles.map(t => `- ${t}`).join('\n')}\n\n`
    : '';
  return avoidSection + `당신은 "지구촌 TMI" 블로그의 작가 '잡학왕 TMI'입니다.

아래 주제로 블로그 글을 작성해주세요.

주제: ${topic.title}
카테고리: ${topic.category}

[작성 규칙]
1. 타겟 독자: 스마트폰으로 출퇴근 중 가볍게 읽는 20~40대
2. 가볍고 친근한 말투로 작성. 친구에게 신기한 이야기를 전해주듯 편안하게
3. 반드시 존댓말만 사용. 반말 절대 금지
4. "여러분", "독자님", "친구" 등 독자를 직접 부르는 호칭 절대 사용 금지
5. 글의 첫 문장은 호기심을 끄는 사실이나 질문으로 시작
   - "충격", "경악", "소름" 같은 자극적 표현 금지
   - 나쁜 예: "안녕하세요", "오늘은 ~에 대해 알아보겠습니다" → 금지
6. 경제, 정치, 전쟁 관련 내용은 포함하지 않음
7. 2000자 내외로 가볍게 작성 (스마트폰으로 5분 내 읽을 분량)
8. 재미있는 사실과 예상을 깨는 반전을 포함한다 (수치는 출처가 확실한 것만 — 없어도 된다)
9. 표와 목록을 활용해 눈으로 읽기 편하게 구성
10. 글 마지막에 반드시 "💡 TMI 한 줄 요약" 섹션 포함
11. 연구·기록은 범위를 정확히 쓴다 — 누가(어느 기관), 어떤 조건에서, 무엇을 확인했는지.
    좁은 결과를 넓게 일반화하지 않는다 (나쁜 예: "침팬지가 인간보다 기억력이 뛰어나다" ← 실제는 "숫자 순간기억 과제에서 침팬지 아이가 대학생보다 빨랐다")
12. 구체적 수치(인구, 거리, 금액, 기록)에는 반드시 출처를 밝힌다
    좋은 예: "기네스 월드 레코드에 따르면 …", "UN 통계에 의하면 …"
    나쁜 예: "약 53억 명", "시간당 수 킬로바이트" (출처 없는 수치 나열)
    확실하지 않은 수치는 쓰지 않는다 — 빼거나 "~로 알려져 있다"로 완화한다
13. 존재하지 않는 것을 만들지 않는다
    실존하지 않는 기관·장소·인물·기록·가게를 지어내지 않는다
    기네스 기록, TOP N 순위를 쓸 때는 정확한 명칭과 수치를 알 때만 쓴다
    모르면 "~하는 사례들이 있다", "대표적으로 ~가 있다" 식으로 특정 수치 없이 서술한다
14. "왜 / 어떻게"를 설명하는 글이 안전하다
    맞혀야 할 단일 수치·기록보다 현상의 배경·원리·과정을 다룬다
    나쁜 예: "세계에서 가장 매운 음식의 스코빌 지수는?" (정확한 수치를 못 쓰면 날조)
    좋은 예: "매운 음식을 먹으면 우리 몸에서 어떤 일이 벌어질까?" (과정 설명)
15. 검수에서 보류된 실제 유형 — 아래는 절대 쓰지 않는다 (2026-10-27~11-11 보류 18건의 사유)
    - 연구자·대학 이름을 붙인 연구 인용: 저자·연도·학술지까지 확실히 아는 유명 연구만 쓴다
      나쁜 예: "1980년대 윌리엄 제임스가 주도한 돌고래 실험", "듀크·노스웨스턴 대학 추적 연구에 따르면"
      대신: "돌고래가 거울 속 자신을 알아보는지 확인한 실험들이 있다"처럼 특정하지 않는다
    - 연도·장소가 붙은 구체 사건·일화: "2014년 ○○공항에서 두리안 때문에 비행기가 착륙했다" 같은 사건을 만들지 않는다
    - 이름 없는 주체: "전문가들에 따르면", "한 푸드테크 기업이", "홍콩의 한 미슐랭 셰프는" 같은 표현 금지
    - 분포·비율 수치: "세계 인구의 40%는 손으로" 같은 비율, "평당 1억", "5~10배"처럼 꾸민 범위를 쓰지 않는다
    - 숫자 세기: 회사·노선·나라 수처럼 셀 수 있는 것은 확실할 때만 쓴다 (나쁜 예: 도쿄 지하철 운영사 "9개" ← 실제 2곳)
    - 주제 제목의 전제가 사실과 다르면 전제를 바로잡는 글로 쓴다 (예: "인터넷이 없는 나라" → 실제로 완전히 없는 나라는 없다고 먼저 밝힌다)
16. 쓰기 전에 스스로 점검한다: 글에 든 고유명사·연도·수치를 하나씩 보고, 실제로 확인된 사실이라고 확신하지 못하면 문장을 일반 설명으로 바꾸거나 지운다.
    수치·사례가 적어도 원리를 잘 설명한 글이 통과한다. "신기한 수치"(8번)는 확실한 것만 1~2개면 충분하다.

[출력 형식]
- 순수 HTML만 출력 (마크다운 기호 절대 사용 금지)
- 사용 가능한 태그: <h2> <h3> <p> <ul> <ol> <li> <table> <thead> <tbody> <tr> <th> <td> <strong> <blockquote>
- <h1> 태그 사용 금지
- <strong>은 핵심 용어·수치에만 최소 사용 (문장 전체를 감싸거나 연속 사용 금지)
- 인라인 style 속성 절대 사용 금지

[TMI 한 줄 요약 형식]
<h2>💡 TMI 한 줄 요약</h2>
<blockquote>핵심 내용을 재미있고 임팩트 있게 한두 줄로 요약</blockquote>`;
}

// ── HTML 정리 ─────────────────────────────────────
function cleanHtml(raw: string): string {
  return raw
    .replace(/```html\s*/gi, "")
    .replace(/```\s*/g, "")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^#{1,6}\s+(.+)$/gm, "<p>$1</p>")
    .replace(/<i\b[^>]*class="[^"]*(?:material-icons|fa|fas|far|fab)[^"]*"[^>]*>.*?<\/i>/gi, "")
    .replace(/<span\b[^>]*class="[^"]*(?:material-icons|material-symbols)[^"]*"[^>]*>.*?<\/span>/gi, "")
    .trim();
}

// 검수관 게이트(2026-10-14): 워크플로가 POST_STATUS=draft로 저장하면 컨트롤타워 검수관이 검수 후 공개한다. 로컬 수동 실행은 바로 공개.
const POST_STATUS = process.env.POST_STATUS === "draft" ? "draft" : "published";

// ── DB에 글 저장 ──────────────────────────────────
async function savePost(topic: Topic, content: string, thumbnailUrl: string | null): Promise<number> {
  const publishedAt = new Date().toISOString();
  const { rows: [result] } = await pool.query(
    `INSERT INTO posts
      (title, content, slug, category, thumbnail_url, meta_description, keywords, status, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $9, $8)
     RETURNING id`,
    [
      topic.title,
      content,
      topic.slug,
      topic.category,
      thumbnailUrl,
      topic.meta_description,
      topic.keywords,
      publishedAt,
      POST_STATUS,
    ]
  );
  return result.id;
}

// ── API 재시도 래퍼 ───────────────────────────────
async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 8000): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      writeLog(`⚠️  API 호출 실패 (${attempt}/${retries}), ${delayMs / 1000}초 후 재시도...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("unreachable");
}

// ── 로그 기록 ─────────────────────────────────────
function writeLog(message: string): void {
  const logPath = path.resolve(process.cwd(), "scripts/generate.log");
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logPath, line, "utf-8");
  console.log(message);
}

// ── 메인 실행 ─────────────────────────────────────
async function main() {
  writeLog("=== 지구촌 TMI 글 자동 생성 시작 ===");
  try {
    const topic = await getNextTopic();
    if (!topic) {
      writeLog("✅ 모든 주제(130개)가 발행 완료됐습니다!");
      return;
    }
    writeLog(`📝 주제 선택: [${topic.level}] ${topic.index}/130 - ${topic.title}`);

    writeLog("🤖 Claude로 글 생성 중...");
    const recentTitles = await getRecentTitles(7);
    const prompt = buildPrompt(topic, recentTitles);
    const msg = await callWithRetry(() => anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }));
    const rawContent = (msg.content[0] as { text: string }).text;
    const content = cleanHtml(rawContent);
    writeLog(`✍️  생성 완료 (${content.length}자)`);

    writeLog("🖼️  이미지 가져오는 중...");
    const usedIds = await getUsedImageIds();
    const allImages = await fetchImages(topic.category, usedIds);
    const thumbnail = allImages[0] ?? null;
    const inlineImages = allImages.slice(1);
    const contentWithImages = injectImagesIntoContent(content, inlineImages);
    if (thumbnail) writeLog(`🖼️  썸네일: ${thumbnail.url}`);
    writeLog(`🖼️  인라인 이미지: ${inlineImages.length}장`);

    // 이미지 없이 발행 방지: 썸네일과 본문 이미지가 모두 있어야 발행한다.
    // 이미지 수집 실패(레이트리밋/키 문제) 시 slug를 소비하지 않고 중단 → 다음 실행 때 재시도.
    if (!thumbnail || !/<img\s/i.test(contentWithImages)) {
      writeLog("❌ 이미지 없이 발행 방지 — 썸네일 또는 본문 이미지가 없어 발행을 중단합니다 (이미지 API 레이트리밋/키 점검 필요).");
      process.exit(1);
    }

    const postId = await savePost(topic, contentWithImages, thumbnail?.url ?? null);
    writeLog(`💾 DB 저장 완료 (id: ${postId}, slug: ${topic.slug})`);
    writeLog(`🌐 URL: ${process.env.NEXT_PUBLIC_SITE_URL}/posts/${topic.slug}`);
    writeLog("=== 완료 ===\n");

  } catch (error) {
    writeLog(`❌ 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
