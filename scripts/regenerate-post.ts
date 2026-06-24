/**
 * 특정 글 재생성 스크립트
 * 사용법: npx tsx scripts/regenerate-post.ts basic-002
 *         npx tsx scripts/regenerate-post.ts basic-002 --new-image  (썸네일도 교체)
 */

import Anthropic from "@anthropic-ai/sdk";
import { Pool } from "@neondatabase/serverless";
import { allTopics, Topic } from "./topics";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("❌ ANTHROPIC_API_KEY가 .env.local에 설정되어 있지 않습니다.");
  process.exit(1);
}
const anthropic = new Anthropic({ apiKey });

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

async function getUsedImageIds(): Promise<Set<string>> {
  const { rows } = await pool.query(
    "SELECT thumbnail_url, content FROM posts WHERE status = 'published'"
  );
  const ids = new Set<string>();
  const inlineRegex = /src="(https:\/\/(?:images\.unsplash\.com|images\.pexels\.com)\/[^"?]+)/g;
  for (const row of rows) {
    if (row.thumbnail_url) ids.add((row.thumbnail_url as string).split("?")[0]);
    if (row.content) {
      let match;
      while ((match = inlineRegex.exec(row.content as string)) !== null) ids.add(match[1]);
      inlineRegex.lastIndex = 0;
    }
  }
  return ids;
}

async function fetchUnsplashImages(category: string, count: number, usedIds: Set<string> = new Set()): Promise<ImageResult[]> {
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!unsplashKey) return [];
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
      const res = await fetch(url.toString(), { headers: { Authorization: `Client-ID ${unsplashKey}` } });
      if (!res.ok) break;
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
  } catch { return []; }
}

function injectImagesIntoContent(html: string, images: ImageResult[]): string {
  if (!images.length) return html;
  const DELIMITER = "</h2>";
  const parts = html.split(DELIMITER);
  const targets: Array<[number, number]> = [[1, 0], [2, 1], [3, 2], [4, 3]];
  for (const [partIdx, imgIdx] of targets) {
    if (partIdx >= parts.length || !images[imgIdx]) continue;
    const img = images[imgIdx];
    const figure = [
      `<figure style="margin:1.75em 0;position:relative;display:block;">`,
      `<img src="${img.url}" alt="관련 이미지" loading="lazy"`,
      ` style="width:100%;max-height:400px;object-fit:cover;border-radius:10px;border:1px solid var(--border);display:block;" />`,
      `<figcaption style="position:absolute;bottom:8px;right:10px;font-size:0.65rem;color:rgba(255,255,255,0.85);background:rgba(0,0,0,0.45);padding:2px 7px;border-radius:4px;line-height:1.5;white-space:nowrap;">`,
      img.attribution,
      `</figcaption></figure>`,
    ].join("");
    parts[partIdx] = parts[partIdx] + figure;
  }
  return parts.join(DELIMITER);
}

function buildPrompt(topic: Topic): string {
  return `당신은 "지구촌 TMI" 블로그의 작가 '잡학왕 TMI'입니다.
아래 주제로 블로그 글을 작성해주세요.
주제: ${topic.title}
[작성 규칙] 가볍고 친근한 말투, 존댓말, 2000자 내외, 첫 문장 후킹, 경제/정치/전쟁 제외, 마지막에 💡 TMI 한 줄 요약
[출력] 순수 HTML만, <h2><h3><p><ul><ol><li><table><strong><blockquote> 사용, <h1> 금지`;
}

function cleanHtml(raw: string): string {
  return raw
    .replace(/```html\s*/gi, "").replace(/```\s*/g, "")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^#{1,6}\s+(.+)$/gm, "<p>$1</p>")
    .trim();
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("❌ slug를 인자로 전달하세요. 예: npx tsx scripts/regenerate-post.ts basic-002");
    process.exit(1);
  }

  const topic = allTopics.find((t) => t.slug === slug);
  if (!topic) {
    console.error(`❌ slug '${slug}'에 해당하는 주제를 찾을 수 없습니다.`);
    process.exit(1);
  }

  const forceNewImage = process.argv.includes("--new-image");
  console.log(`📝 재생성 대상: [${topic.level}] ${topic.title}`);
  console.log("🤖 Claude로 글 생성 중...");

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    messages: [{ role: "user", content: buildPrompt(topic) }],
  });
  const rawContent = (msg.content[0] as { text: string }).text;
  const content = cleanHtml(rawContent);
  console.log(`✍️  생성 완료 (${content.length}자)`);

  const usedIds = await getUsedImageIds();
  const allImages = await fetchUnsplashImages(topic.category, 5, usedIds);
  const inlineImages = allImages.slice(forceNewImage ? 1 : 0);
  const contentWithImages = injectImagesIntoContent(content, inlineImages);

  if (forceNewImage) {
    const thumbnail = allImages[0] ?? null;
    if (thumbnail) console.log(`🖼️  새 썸네일: ${thumbnail.url}`);
    await pool.query(
      `UPDATE posts SET content = $1, thumbnail_url = $2, updated_at = NOW() WHERE slug = $3`,
      [contentWithImages, thumbnail?.url ?? null, slug]
    );
  } else {
    await pool.query(
      `UPDATE posts SET content = $1, updated_at = NOW() WHERE slug = $2`,
      [contentWithImages, slug]
    );
  }

  console.log(`💾 DB 업데이트 완료 (slug: ${slug})`);
  console.log(`🌐 URL: ${process.env.NEXT_PUBLIC_SITE_URL}/posts/${slug}`);
  await pool.end();
}

main().catch((err) => {
  console.error("❌ 오류:", err);
  process.exit(1);
});
