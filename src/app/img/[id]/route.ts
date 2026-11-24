import pool from "@/lib/db";

// AI로 만든 그림(scripts/ai-image.ts → Neon ai_images). id의 내용은 바뀌지 않는다 — 엣지에 1년 캐시.
export const revalidate = false;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) return new Response("Not found", { status: 404 });
  let row: { bytes: unknown; mime: string } | undefined;
  try {
    row = (await pool.query("select bytes, mime from ai_images where id = $1", [id])).rows[0];
  } catch (e) {
    console.error("image DB error", e);
    return new Response("Unavailable", { status: 503 });
  }
  if (!row) return new Response("Not found", { status: 404 });
  const buf = typeof row.bytes === "string"
    ? Buffer.from(row.bytes.replace(/^\\x/, ""), "hex")
    : Buffer.from(row.bytes as Uint8Array);
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": row.mime || "image/jpeg",
      "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "content-length": String(buf.length),
    },
  });
}
