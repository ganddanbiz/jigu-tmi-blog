import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { sha256 } from "@/lib/hash";
import { getClientIp } from "@/lib/seo";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number(id);

    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const { rows: [post] } = await pool.query(
      "SELECT id FROM posts WHERE id = $1",
      [postId]
    );

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const ip = getClientIp(request);
    const ua = request.headers.get("user-agent") || "";
    const visitorHash = sha256(ip + ua);

    let liked = false;
    try {
      await pool.query(
        "INSERT INTO likes (post_id, visitor_hash) VALUES ($1, $2)",
        [postId, visitorHash]
      );
      liked = true;
    } catch (err: unknown) {
      if (err instanceof Error && (err as { code?: string }).code === "23505") {
        await pool.query(
          "DELETE FROM likes WHERE post_id = $1 AND visitor_hash = $2",
          [postId, visitorHash]
        );
        liked = false;
      } else {
        throw err;
      }
    }

    const { rows: [{ count }] } = await pool.query(
      "SELECT COUNT(*) as count FROM likes WHERE post_id = $1",
      [postId]
    );

    return NextResponse.json({ liked, count: Number(count) });
  } catch (error) {
    console.error("POST /api/posts/[id]/like error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
