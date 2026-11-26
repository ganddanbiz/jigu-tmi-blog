// AI 이미지 만들기 — 맞는 사진을 못 찾은 칸에 ChatGPT(Codex 구독)로 그림을 만든다 (2026-11-24 대표님 지시:
// "적당한 사진을 찾을 수 없으면 이미지를 만들도록").
// 만든 그림은 Neon `ai_images` 표에 저장하고 사이트의 `/img/<id>`(src/app/img/[id]/route.ts)로 보여 준다.
// 캡션은 반드시 AI 생성임을 밝힌다(AI_CAPTION). 실제 인물·상표·글자는 넣지 않는다.
// 이 파일은 지구촌TMI·KoreaSpots에 같은 내용으로 있다(사이트별 차이는 호출부의 prompt·caption).
//   AI_IMAGE=0 → 끄기 · Codex가 없거나(깃허브 예비) 한도면 null을 돌려준다.
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import sharp from "sharp";

// 토큰 A단계(2026-11-26): AI 호출 1번마다 ~/Library/Logs/aios-usage.jsonl에 한 줄 기록. 기록 실패는 무시(발행에 영향 없음).
function aiSpawn(job: string, bin: string, args: string[], opts: any): any {
  const t0 = Date.now();
  const r: any = spawnSync(bin, args, opts);
  try {
    const err = String(r.stderr || "");
    const tok = err.match(/tokens used\s*:?\s*([\d,]+)/i)?.[1];
    fs.appendFileSync(path.join(os.homedir(), "Library/Logs/aios-usage.jsonl"), JSON.stringify({
      t: new Date().toISOString(), who: "codex", job: `jigutmi:${job}`, sec: Math.round((Date.now() - t0) / 1000),
      ok: r.status === 0, limit: /usage limit|rate limit|quota/i.test(err), tokens: tok ? Number(tok.replace(/,/g, "")) : null,
    }) + "\n");
  } catch {}
  return r;
}


const CODEX = [process.env.CODEX_BIN, path.join(os.homedir(), ".local/bin/codex"), "/opt/homebrew/bin/codex"]
  .find((p) => p && fs.existsSync(p));
const GEN_DIR = path.join(os.homedir(), ".codex/generated_images");
let down = !CODEX || !!process.env.GITHUB_ACTIONS || process.env.AI_IMAGE === "0";

export const aiImageAvailable = () => !down;

const listImgs = (dir: string) => (fs.existsSync(dir)
  ? fs.readdirSync(dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).map((f) => path.join(dir, f)) : []);

export type Jpeg = { bytes: Buffer; width: number; height: number };

/** 그림 1장(16:9, 가로 1600px JPEG). 1~3분 걸린다. 실패하면 null. */
export async function codexImage(prompt: string, log: (m: string) => void = console.log): Promise<Jpeg | null> {
  if (down) return null;
  const work = path.join(os.tmpdir(), "aios-headless", "ai-image"); // ~/Desktop 밖 (컨트롤타워 절대 규칙 10)
  fs.mkdirSync(work, { recursive: true });
  const before = new Set(fs.existsSync(GEN_DIR) ? fs.readdirSync(GEN_DIR) : []);
  const t0 = Date.now();
  const r = aiSpawn("image", CODEX!, ["exec", "--skip-git-repo-check", "--ephemeral", "-s", "read-only", "-C", work,
    prompt + " Generate the image now with your image generation tool and do not ask any questions."], {
    encoding: "utf8", timeout: 10 * 60_000, maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PATH: `${path.dirname(CODEX!)}:/opt/homebrew/bin:${process.env.PATH ?? "/usr/bin:/bin"}`, OPENAI_API_KEY: "" },
  });
  const text = `${r.stdout || ""}\n${r.stderr || ""}`;
  if (r.status !== 0 && /usage limit|rate limit|quota|login|unauthorized/i.test(text)) down = true;
  const sid = text.match(/session id:\s*([0-9a-f-]{36})/i)?.[1];
  let files = sid ? listImgs(path.join(GEN_DIR, sid)) : [];
  if (!files.length && fs.existsSync(GEN_DIR)) {
    for (const d of fs.readdirSync(GEN_DIR)) if (!before.has(d)) files.push(...listImgs(path.join(GEN_DIR, d)));
  }
  log(`🎨 AI 이미지: 종료 ${r.status}, ${Math.round((Date.now() - t0) / 1000)}초, ${files.length}장`);
  if (!files.length) return null;
  files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  const img = sharp(fs.readFileSync(files[0])).rotate();
  const out = await img.resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  if (out.info.width < 600 || out.data.length < 5000) return null;
  return { bytes: out.data, width: out.info.width, height: out.info.height };
}

type Query = (text: string, params: unknown[]) => Promise<Array<Record<string, unknown>>>;

/** ai_images 표에 저장하고 사이트 주소(/img/<id>)를 돌려준다. */
export async function storeAiImage(query: Query, slug: string, jpg: Jpeg, prompt: string): Promise<string> {
  await query(`create table if not exists ai_images (
    id bigserial primary key, post_slug text, bytes bytea not null, mime text not null default 'image/jpeg',
    width int, height int, prompt text, created_at timestamptz not null default now())`, []);
  const rows = await query(
    "insert into ai_images (post_slug, bytes, mime, width, height, prompt) values ($1, $2::bytea, 'image/jpeg', $3, $4, $5) returning id",
    [slug, "\\x" + jpg.bytes.toString("hex"), jpg.width, jpg.height, prompt.slice(0, 2000)]);
  return `/img/${rows[0].id}`;
}
