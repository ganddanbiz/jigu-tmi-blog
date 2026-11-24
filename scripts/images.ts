// 사진 고르기 — 소제목마다 맞는 사진을 찾고 ChatGPT(Codex 구독)가 글과 맞는지 본다 (2026-11-24 대표님 지시).
//
// 배경: 예전엔 카테고리 검색어 하나("animals wildlife nature")로 5장을 받아 아무 데나 넣었다.
// 문어 글에 새·거미·멧돼지 사진이 들어가 검수관 보류가 반복됐다(11-24 「문어는 색맹인데…」 등).
// 이제 ① ChatGPT가 제목·소제목마다 영어 사진 검색어를 정하고 ② Unsplash·Pexels에서 후보를 받아
// ③ ChatGPT가 사진을 직접 보고 맞는 것만 쓴다. 맞는 게 없으면 그 칸은 비운다.
// Codex가 없거나(깃허브 예비 실행) 한도에 걸리면 예전처럼 검사 없이 첫 후보를 쓴다 — 발행이 멈추지 않게.
//   IMAGE_VISION=0 → 판정 끄기
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface ImageResult { url: string; attribution: string }

const CODEX = [process.env.CODEX_BIN, path.join(os.homedir(), ".local/bin/codex"), "/opt/homebrew/bin/codex"]
  .find((p) => p && fs.existsSync(p));
const WORK = path.join(os.tmpdir(), "aios-headless", "jigutmi-image"); // ~/Desktop 밖 (컨트롤타워 절대 규칙 10)
let codexDown = !CODEX || !!process.env.GITHUB_ACTIONS;

function codex(prompt: string, effort: "low" | "medium", image?: string): string {
  if (codexDown) throw new Error("codex unavailable");
  fs.mkdirSync(WORK, { recursive: true });
  const out = path.join(WORK, `out-${process.pid}-${Date.now()}.txt`);
  const args = ["exec", "--skip-git-repo-check", "--ephemeral", "-s", "read-only", "-C", WORK,
    "-c", `model_reasoning_effort="${effort}"`, ...(image ? ["-i", image] : []), "-o", out, "-"];
  const r = spawnSync(CODEX!, args, {
    input: prompt, encoding: "utf8", timeout: 4 * 60_000, maxBuffer: 16 << 20,
    env: { ...process.env, PATH: `${path.dirname(CODEX!)}:/opt/homebrew/bin:${process.env.PATH ?? "/usr/bin:/bin"}`, OPENAI_API_KEY: "" },
  });
  try {
    if (!fs.existsSync(out)) {
      const tail = (r.stderr || "").split("\n").filter(Boolean).slice(-2).join(" | ").slice(0, 200);
      if (/login|auth|usage limit|rate limit|quota/i.test(tail)) codexDown = true;
      throw new Error(`codex exit ${r.status}: ${tail}`);
    }
    return fs.readFileSync(out, "utf8").trim();
  } finally {
    fs.rmSync(out, { force: true });
  }
}

/** 제목·소제목마다 영어 사진 검색어. 실패하면 fallback 하나로 채운다. */
export function planQueries(title: string, headings: string[], fallback: string): { thumb: string; sections: string[] } {
  const plain = { thumb: fallback, sections: headings.map(() => fallback) };
  if (codexDown) return plain;
  const prompt = `한국어 블로그 글에 넣을 스톡 사진(Unsplash·Pexels)을 찾으려 한다. 제목과 각 소제목에 대해
사진으로 실제로 보일 수 있는 구체적인 대상을 영어 검색어(2~5단어)로 하나씩 정해라.
- 글이 다루는 바로 그 대상을 찍은 사진이어야 한다(문어 글이면 "octopus camouflage reef", 지하철 글이면 "tokyo subway platform").
- 추상적인 소제목이면 글 주제의 대상을 다른 각도로 찍은 검색어를 쓴다. 분위기 단어(amazing, interesting)는 쓰지 않는다.
제목: ${title}
소제목:
${headings.map((h, i) => `${i + 1}. ${h}`).join("\n")}
JSON만 출력: {"thumb": "...", "sections": ["...", ...]} (sections는 정확히 ${headings.length}개)`;
  try {
    const j = JSON.parse(codex(prompt, "low").match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    const clean = (x: unknown) => String(x || "").replace(/[^a-zA-Z0-9 '-]/g, " ").replace(/\s+/g, " ").trim();
    const sections = Array.isArray(j.sections) ? j.sections.map(clean) : [];
    return { thumb: clean(j.thumb) || fallback, sections: headings.map((_, i) => sections[i] || fallback) };
  } catch {
    return plain;
  }
}

async function unsplash(query: string, n: number, used: Set<string>): Promise<ImageResult[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];
  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "10");
    url.searchParams.set("orientation", "landscape");
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
    if (!res.ok) return [];
    const data = await res.json() as { results: Array<{ urls: { regular: string }; user: { name: string }; links: { html: string } }> };
    const out: ImageResult[] = [];
    for (const p of data.results ?? []) {
      const base = p.urls.regular.split("?")[0];
      if (used.has(base)) continue;
      out.push({ url: p.urls.regular, attribution: `<a href="${p.links.html}?utm_source=jigu_tmi&utm_medium=referral" rel="noopener noreferrer" style="color:rgba(255,255,255,0.9);">${p.user.name}</a> / Unsplash` });
      if (out.length >= n) break;
    }
    return out;
  } catch { return []; }
}

async function pexels(query: string, n: number, used: Set<string>): Promise<ImageResult[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`, { headers: { Authorization: key } });
    if (!res.ok) return [];
    const data = await res.json() as { photos: Array<{ src: { large: string }; photographer: string; url: string }> };
    const out: ImageResult[] = [];
    for (const p of data.photos ?? []) {
      const base = p.src.large.split("?")[0];
      if (used.has(base)) continue;
      out.push({ url: p.src.large, attribution: `<a href="${p.url}" rel="noopener noreferrer" style="color:rgba(255,255,255,0.9);">${p.photographer}</a> / Pexels` });
      if (out.length >= n) break;
    }
    return out;
  } catch { return []; }
}

/** 사진이 글의 그 대상과 맞는지. true/false, 판정 못 하면 null. */
async function fits(img: ImageResult, what: string): Promise<boolean | null> {
  if (codexDown || process.env.IMAGE_VISION === "0") return null;
  let file = "";
  try {
    const res = await fetch(img.url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    fs.mkdirSync(WORK, { recursive: true });
    file = path.join(WORK, `img-${process.pid}-${Date.now()}.jpg`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    const ans = codex(`너는 상식 블로그의 사진 편집자다. 첨부 사진을 아래 글 칸에 넣으려 한다.
${what}
사진의 주된 대상이 이 칸이 말하는 대상(또는 그것을 분명히 보여 주는 장면)이면 YES.
다른 동물·물건·장소이거나, 주제와 상관없는 일반 풍경·사람 사진이면 NO. 각도·색감·스타일 차이는 문제 삼지 않는다.
한 단어로만 답하라: YES 또는 NO`, "medium", file);
    const w = ans.toUpperCase().replace(/[^A-Z]/g, " ").trim();
    return w.startsWith("YES") ? true : w.startsWith("NO") ? false : null;
  } catch {
    return null;
  } finally {
    if (file) fs.rmSync(file, { force: true });
  }
}

/** 검색어로 후보를 받아 맞는 첫 사진. 판정이 안 되면 첫 후보, 다 탈락이면 null. */
export async function pickImage(query: string, what: string, used: Set<string>, log: (m: string) => void): Promise<ImageResult | null> {
  const cands = [...await unsplash(query, 2, used), ...await pexels(query, 2, used)];
  for (const c of cands) {
    const ok = await fits(c, what);
    if (ok === null) { used.add(c.url.split("?")[0]); log(`   (판정 불가 — 검사 없이 사용) "${query}"`); return c; }
    if (ok) { used.add(c.url.split("?")[0]); return c; }
  }
  log(`   🚫 "${query}" 후보 ${cands.length}장 모두 안 맞음`);
  return null;
}
