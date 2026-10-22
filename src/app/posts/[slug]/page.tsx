import { SITE_URL } from "@/lib/seo";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import pool from "@/lib/db";
import { Post } from "@/types";
import Image from "next/image";
import JsonLd from "@/components/JsonLd";
import CommentSection from "@/components/CommentSection";
import LikeButton from "@/components/LikeButton";
import ShareButton from "@/components/ShareButton";
import Link from "next/link";
import CoupangAd from "@/components/CoupangAd";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

async function getPost(slug: string): Promise<Post | null> {
  const { rows } = await pool.query(
    "SELECT * FROM posts WHERE slug = $1 AND status = 'published'",
    [slug]
  );
  return (rows[0] as Post) || null;
}

async function getLikeCount(postId: number): Promise<number> {
  const { rows: [row] } = await pool.query(
    "SELECT COUNT(*) as count FROM likes WHERE post_id = $1",
    [postId]
  );
  return Number(row?.count) || 0;
}

async function getRelatedPosts(category: string, excludeId: number) {
  const { rows } = await pool.query(
    `SELECT id, title, slug, category, thumbnail_url, meta_description, published_at
     FROM posts
     WHERE status = 'published' AND category = $1 AND id != $2
     ORDER BY published_at DESC LIMIT 3`,
    [category, excludeId]
  );
  return rows as Partial<Post>[];
}

export async function generateStaticParams() {
  try {
    const { rows } = await pool.query(
      "SELECT slug FROM posts WHERE status = 'published'"
    );
    return rows.map((row: { slug: string }) => ({ slug: row.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  const siteUrl = SITE_URL;
  if (!post) return { title: "글을 찾을 수 없습니다" };
  return {
    title: post.title,
    description: post.meta_description || post.title,
    keywords: post.keywords || undefined,
    openGraph: {
      title: post.title,
      description: post.meta_description || post.title,
      url: `${siteUrl}/posts/${post.slug}`,
      type: "article",
      publishedTime: post.published_at || post.created_at,
      modifiedTime: post.updated_at,
      ...(post.thumbnail_url && { images: [{ url: post.thumbnail_url }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.meta_description || post.title,
      ...(post.thumbnail_url && { images: [post.thumbnail_url] }),
    },
  };
}

const catLabels: Record<string, string> = {
  before:  "세계 이슈",
  bidding: "동물·자연",
  after:   "사람·사회",
  tax:     "음식·문화",
  law:     "기록·도전",
  ai:      "기술·발명",
};
const catBadgeClass: Record<string, string> = {
  before:  "badge badge-before",
  bidding: "badge badge-bidding",
  after:   "badge badge-after",
  tax:     "badge badge-tax",
  law:     "badge badge-law",
  ai:      "badge badge-ai",
};

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  await pool.query("UPDATE posts SET view_count = view_count + 1 WHERE id = $1", [post.id]);
  const [likeCount, relatedPosts] = await Promise.all([
    getLikeCount(post.id),
    getRelatedPosts(post.category, post.id),
  ]);

  const publishedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString("ko-KR", {
        year: "numeric", month: "long", day: "numeric",
      })
    : null;

  const updatedDate = post.updated_at && post.published_at && post.updated_at !== post.published_at
    ? new Date(post.updated_at).toLocaleDateString("ko-KR", {
        year: "numeric", month: "long", day: "numeric",
      })
    : null;

  return (
    <>
      <JsonLd post={post} />
      <div style={{ background: "var(--bg)", minHeight: "100vh" }}>

        {/* ── 상단 내비 ─────────────────────────── */}
        <header style={{
          background: "var(--header-bg)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{
            maxWidth: "52rem", margin: "0 auto",
            padding: "0.875rem 1.5rem",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <Link href="/" style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--header-text)",
              textDecoration: "none",
              letterSpacing: "-0.01em",
            }}>
              지구촌 TMI
            </Link>
            <Link href="/" style={{
              fontSize: "0.75rem",
              color: "var(--header-muted)",
              textDecoration: "none",
              display: "flex", alignItems: "center", gap: "0.3rem",
            }}>
              ← 목록으로
            </Link>
          </div>
        </header>

        <main style={{ maxWidth: "52rem", margin: "0 auto", padding: "0 1.5rem" }}>

          {/* ── 아티클 ─────────────────────────── */}
          <article style={{
            background: "var(--bg-card)",
            borderRadius: "0 0 16px 16px",
            border: "1px solid var(--border)",
            borderTop: "none",
            padding: "2.5rem 2.5rem 3rem",
            marginBottom: "2rem",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}>

            {/* 카테고리 + 날짜 */}
            <div style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              marginBottom: "1.25rem", flexWrap: "wrap",
            }}>
              <Link
                href={`/?category=${post.category}`}
                className={catBadgeClass[post.category] || "badge"}
                style={{ textDecoration: "none" }}
              >
                {catLabels[post.category] || post.category}
              </Link>
              {publishedDate && (
                <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>
                  {publishedDate}
                </span>
              )}
              {updatedDate && (
                <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>
                  (수정: {updatedDate})
                </span>
              )}
              <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>
                · 조회 {post.view_count.toLocaleString()}
              </span>
            </div>

            {/* 제목 */}
            <h1 style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(1.5rem, 3.5vw, 2rem)",
              fontWeight: 800,
              lineHeight: 1.35,
              letterSpacing: "-0.01em",
              color: "var(--ink)",
              marginBottom: "1rem",
            }}>
              {post.title}
            </h1>

            {/* 요약 (meta_description) */}
            {post.meta_description && (
              <p style={{
                fontSize: "1rem",
                lineHeight: 1.7,
                color: "var(--ink-muted)",
                marginBottom: "1.5rem",
                paddingBottom: "1.5rem",
                borderBottom: "2px solid var(--border-light)",
              }}>
                {post.meta_description}
              </p>
            )}

            {/* 썸네일 */}
            {post.thumbnail_url && (
              <div style={{
                marginBottom: "2rem", borderRadius: "12px", overflow: "hidden",
                border: "1px solid var(--border)",
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.thumbnail_url}
                  alt={post.title}
                  style={{ width: "100%", height: "auto", maxHeight: "24rem", objectFit: "cover", display: "block" }}
                />
              </div>
            )}

            {/* 쿠팡 다이내믹 광고 */}
            <CoupangAd />

            {/* 본문 */}
            <div
              className="prose"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* 좋아요 & 공유 */}
            <div style={{
              marginTop: "2.5rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid var(--border)",
              display: "flex", alignItems: "center", gap: "0.75rem",
            }}>
              <LikeButton postId={post.id} initialCount={likeCount} />
              <ShareButton title={post.title} />
            </div>
          </article>

          {/* ── 관련 기사 ─────────────────────────── */}
          {relatedPosts.length > 0 && (
            <section style={{
              background: "var(--bg-card)",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              padding: "1.5rem",
              marginBottom: "2rem",
            }}>
              <h2 style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--ink)",
                marginBottom: "1rem",
                display: "flex", alignItems: "center", gap: "0.5rem",
              }}>
                <span style={{ color: "var(--accent)" }}>|</span>
                {catLabels[post.category] || post.category} 관련 이야기
              </h2>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "1rem",
              }}>
                {relatedPosts.map((rp) => (
                  <Link
                    key={rp.id}
                    href={`/posts/${rp.slug}`}
                    style={{
                      textDecoration: "none", color: "inherit",
                      borderRadius: "10px", overflow: "hidden",
                      border: "1px solid var(--border-light)",
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                    className="related-card"
                  >
                    {rp.thumbnail_url && (
                      <div style={{ position: "relative", width: "100%", height: "8rem" }}>
                        <Image
                          src={rp.thumbnail_url}
                          alt={rp.title || ""}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 250px"
                        />
                      </div>
                    )}
                    <div style={{ padding: "0.75rem" }}>
                      <h3 style={{
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                        lineHeight: 1.45,
                        color: "var(--ink)",
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        overflow: "hidden",
                      }}>
                        {rp.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── 쿠팡 리더보드 광고 ─────────────── */}
          <CoupangAd variant="leaderboard" />

          {/* ── 쿠팡 스퀘어 광고 ───────────────── */}
          <CoupangAd variant="square" />

          {/* ── 댓글 ────────────────────────────── */}
          <CommentSection postId={post.id} />
          <div style={{ height: "3rem" }} />
        </main>
      </div>
    </>
  );
}
