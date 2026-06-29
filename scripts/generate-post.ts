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
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("❌ ANTHROPIC_API_KEY가 .env.local에 설정되어 있지 않습니다.");
  process.exit(1);
}
const anthropic = new Anthropic({ apiKey, maxRetries: 3, timeout: 90_000 });

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
    if (partIdx >= parts.length || !images[imgIdx]) continue;
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
    parts[partIdx] = parts[partIdx] + figure;
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
5. 글의 첫 문장은 반드시 강한 후킹으로 시작
   - 놀랍거나 충격적인 사실, 의문을 던지는 문장으로 시작
   - 나쁜 예: "안녕하세요", "오늘은 ~에 대해 알아보겠습니다" → 금지
6. 경제, 정치, 전쟁 관련 내용은 포함하지 않음
7. 2000자 내외로 가볍게 작성 (스마트폰으로 5분 내 읽을 분량)
8. 재미있는 사실, 신기한 수치, 예상을 깨는 반전 내용 반드시 포함
9. 표와 목록을 활용해 눈으로 읽기 편하게 구성
10. 글 마지막에 반드시 "💡 TMI 한 줄 요약" 섹션 포함

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

// ── DB에 글 저장 ──────────────────────────────────
async function savePost(topic: Topic, content: string, thumbnailUrl: string | null): Promise<number> {
  const publishedAt = new Date().toISOString();
  const { rows: [result] } = await pool.query(
    `INSERT INTO posts
      (title, content, slug, category, thumbnail_url, meta_description, keywords, status, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'published', $8)
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
