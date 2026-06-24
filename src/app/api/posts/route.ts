import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import pool from "@/lib/db";
import { generateSlug, verifyAdminKey } from "@/lib/seo";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 10));
    const category = searchParams.get("category") || null;
    const offset = (page - 1) * limit;

    let countQuery = "SELECT COUNT(*) as total FROM posts WHERE status = 'published'";
    let dataQuery = `
      SELECT id, title, slug, category, thumbnail_url, meta_description,
             published_at, created_at, view_count
      FROM posts WHERE status = 'published'
    `;
    const countParams: (string | number)[] = [];
    const dataParams: (string | number)[] = [];
    let paramIdx = 1;

    if (category) {
      countQuery += ` AND category = $${paramIdx}`;
      dataQuery += ` AND category = $${paramIdx}`;
      countParams.push(category);
      dataParams.push(category);
      paramIdx++;
    }

    dataQuery += ` ORDER BY published_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    dataParams.push(limit, offset);

    const { rows: [{ total }] } = await pool.query(countQuery, countParams);
    const { rows: posts } = await pool.query(dataQuery, dataParams);

    return NextResponse.json({
      posts,
      pagination: {
        total: Number(total),
        page,
        limit,
        totalPages: Math.ceil(Number(total) / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/posts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, content, slug, category, thumbnail_url, meta_description, keywords, status, published_at } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "title and content are required" }, { status: 400 });
    }

    const finalSlug = slug || generateSlug(title);

    const { rows: [result] } = await pool.query(
      `INSERT INTO posts (title, content, slug, category, thumbnail_url, meta_description, keywords, status, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        title,
        content,
        finalSlug,
        category || "general",
        thumbnail_url || null,
        meta_description || null,
        keywords || null,
        status || "draft",
        published_at || null,
      ]
    );

    revalidatePath("/");
    if (status === "published") {
      revalidatePath(`/posts/${finalSlug}`);
    }

    return NextResponse.json({ id: result.id, slug: finalSlug }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && (error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "slug already exists" }, { status: 409 });
    }
    console.error("POST /api/posts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
