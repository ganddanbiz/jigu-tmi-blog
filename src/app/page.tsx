import { Suspense } from "react";
import pool from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import PostList from "@/components/PostList";
import PostCard from "@/components/PostCard";
import ViewToggle from "@/components/ViewToggle";
import Pagination from "@/components/Pagination";
import PostShareButton from "@/components/PostShareButton";

const LIMIT = 9;

const categories: { key: string | null; label: string }[] = [
  { key: null,       label: "전체" },
  { key: "before",   label: "세계 이슈" },
  { key: "bidding",  label: "동물·자연" },
  { key: "after",    label: "사람·사회" },
  { key: "tax",      label: "음식·문화" },
  { key: "law",      label: "기록·도전" },
  { key: "ai",       label: "기술·발명" },
];

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

type SearchParams = Promise<{
  view?: string;
  page?: string;
  category?: string;
}>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const { view = "card", page = "1", category } = await searchParams;

  const currentView = view === "list" ? "list" : "card";
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * LIMIT;

  const whereCategory = category ? " AND category = $1" : "";
  const countParams = category ? [category] : [];
  const dataParams = category ? [category, LIMIT, offset] : [LIMIT, offset];
  const dataPlaceholders = category
    ? "AND category = $1 ORDER BY published_at DESC LIMIT $2 OFFSET $3"
    : "ORDER BY published_at DESC LIMIT $1 OFFSET $2";

  const { rows: [{ total }] } = await pool.query(
    `SELECT COUNT(*) as total FROM posts WHERE status = 'published'${whereCategory}`,
    countParams
  );

  const { rows: posts } = await pool.query(
    `SELECT id, title, slug, category, thumbnail_url, meta_description, published_at, view_count
     FROM posts WHERE status = 'published' ${dataPlaceholders}`,
    dataParams
  );

  const totalPages = Math.ceil(total / LIMIT);

  // 히어로: 첫 페이지 + 전체 카테고리일 때만 최신 1개
  const isFirstPageAll = currentPage === 1 && !category;
  const heroPost = isFirstPageAll && posts.length > 0 ? posts[0] : null;

  // Quick TMI: 첫 페이지 + 전체일 때 2~4번째 글
  const quickTmiPosts = isFirstPageAll ? posts.slice(1, 4) : [];

  // 카테고리별 탐험: 첫 페이지 + 전체일 때 각 카테고리 최신 2개
  let categoryPreviews: { key: string; label: string; posts: typeof posts }[] = [];
  if (isFirstPageAll && posts.length > 4) {
    const { rows: catPosts } = await pool.query(
      `SELECT DISTINCT ON (category, rn) * FROM (
        SELECT id, title, slug, category, thumbnail_url, meta_description, published_at, view_count,
               ROW_NUMBER() OVER (PARTITION BY category ORDER BY published_at DESC) as rn
        FROM posts WHERE status = 'published'
      ) sub WHERE rn <= 2 ORDER BY category, rn`
    );
    const grouped = new Map<string, typeof posts>();
    for (const p of catPosts) {
      const arr = grouped.get(p.category) || [];
      arr.push(p);
      grouped.set(p.category, arr);
    }
    categoryPreviews = categories
      .filter(c => c.key && grouped.has(c.key))
      .map(c => ({ key: c.key!, label: c.label, posts: grouped.get(c.key!)! }));
  }

  // 최신 글 목록 (히어로+QuickTMI 제외)
  const latestPosts = isFirstPageAll ? posts.slice(4) : posts;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>

      {/* ── 헤더 ──────────────────────────────────── */}
      <header style={{ background: "var(--header-bg)" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "1.75rem 1.5rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <h1 style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(1.5rem, 3.5vw, 2rem)",
                fontWeight: 800,
                color: "var(--header-text)",
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
              }}>
                {process.env.NEXT_PUBLIC_SITE_NAME || "지구촌 TMI"}
              </h1>
              <p style={{
                fontSize: "0.8125rem",
                color: "var(--header-muted)",
                marginTop: "0.35rem",
                letterSpacing: "0.02em",
              }}>
                세상은 생각보다 훨씬 흥미롭다
              </p>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              fontSize: "0.6875rem", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: "var(--accent)",
            }}>
              GLOBAL CURIOSITY
            </div>
          </div>
        </div>
      </header>

      {/* ── 카테고리 탭 ───────────────────────────── */}
      <div style={{
        background: "var(--bg-card)",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 40,
        boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
      }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.5rem" }}>
          <div
            className="scrollbar-hide"
            style={{ display: "flex", overflowX: "auto", alignItems: "center", justifyContent: "space-between" }}
          >
            <div style={{ display: "flex" }}>
              {categories.map(({ key, label }) => {
                const isActive = (!key && !category) || key === category;
                const href = key
                  ? `/?view=${currentView}&category=${key}`
                  : `/?view=${currentView}`;
                return (
                  <a
                    key={key ?? "all"}
                    href={href}
                    className={`cat-tab${isActive ? " active" : ""}`}
                  >
                    {label}
                  </a>
                );
              })}
            </div>
            <Suspense>
              <ViewToggle currentView={currentView} />
            </Suspense>
          </div>
        </div>
      </div>

      <main style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.5rem" }}>

        {/* ── 히어로: Today's Curiosity ──────────── */}
        {heroPost && (
          <section style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
            <Link href={`/posts/${heroPost.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="hero-card" style={{
                position: "relative",
                borderRadius: "16px",
                overflow: "hidden",
                background: "var(--header-bg)",
                minHeight: "20rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
              }}>
                {heroPost.thumbnail_url && (
                  <Image
                    src={heroPost.thumbnail_url}
                    alt={heroPost.title || ""}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 1152px"
                    style={{ opacity: 0.55 }}
                    priority
                  />
                )}
                <div style={{
                  position: "relative", zIndex: 1,
                  padding: "2rem 2.5rem",
                  background: "linear-gradient(transparent, rgba(16,38,59,0.85))",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    <span style={{
                      fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em",
                      textTransform: "uppercase", color: "var(--accent)",
                    }}>
                      TODAY&apos;S CURIOSITY
                    </span>
                    <span className={catBadgeClass[heroPost.category] || "badge"} style={{ fontSize: "0.65rem" }}>
                      {catLabels[heroPost.category] || heroPost.category}
                    </span>
                  </div>
                  <h2 style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "clamp(1.25rem, 3vw, 1.875rem)",
                    fontWeight: 800,
                    color: "#fff",
                    lineHeight: 1.35,
                    marginBottom: "0.5rem",
                  }}>
                    {heroPost.title}
                  </h2>
                  {heroPost.meta_description && (
                    <p style={{
                      fontSize: "0.875rem",
                      color: "rgba(255,255,255,0.8)",
                      lineHeight: 1.6,
                      maxWidth: "40rem",
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2,
                      overflow: "hidden",
                    }}>
                      {heroPost.meta_description}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* ── Quick TMI: 30초 핵심 사실 ─────────── */}
        {quickTmiPosts.length > 0 && (
          <section style={{ marginBottom: "2.5rem" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              marginBottom: "1rem",
            }}>
              <span style={{
                fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", color: "var(--amber)",
              }}>
                QUICK TMI
              </span>
              <span style={{ fontSize: "0.8125rem", color: "var(--ink-muted)" }}>
                30초 만에 읽는 핵심 이야기
              </span>
            </div>
            <div className="quick-tmi-grid" style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1rem",
            }}>
              {quickTmiPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.slug}`}
                  style={{
                    textDecoration: "none", color: "inherit",
                    background: "var(--bg-card)",
                    borderRadius: "12px",
                    padding: "1.25rem 1.25rem 1rem",
                    border: "1px solid var(--border)",
                    borderLeft: "3px solid var(--accent)",
                    transition: "transform 0.15s, box-shadow 0.15s",
                    display: "flex", flexDirection: "column",
                  }}
                  className="quick-tmi-card"
                >
                  <span className={catBadgeClass[post.category] || "badge"} style={{ alignSelf: "flex-start", marginBottom: "0.5rem", fontSize: "0.65rem" }}>
                    {catLabels[post.category] || post.category}
                  </span>
                  <h3 style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                    lineHeight: 1.45,
                    color: "var(--ink)",
                    marginBottom: "0.5rem",
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                    overflow: "hidden",
                  }}>
                    {post.title}
                  </h3>
                  {post.meta_description && (
                    <p style={{
                      fontSize: "0.8rem",
                      color: "var(--ink-muted)",
                      lineHeight: 1.55,
                      flex: 1,
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2,
                      overflow: "hidden",
                    }}>
                      {post.meta_description}
                    </p>
                  )}
                  <span style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--accent)",
                    marginTop: "0.75rem",
                  }}>
                    자세히 읽기 →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── 카테고리별 탐험 ──────────────────── */}
        {categoryPreviews.length > 0 && (
          <section style={{ marginBottom: "2.5rem" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              marginBottom: "1.25rem",
            }}>
              <span style={{
                fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", color: "var(--ink-muted)",
              }}>
                EXPLORE BY TOPIC
              </span>
              <span style={{ fontSize: "0.8125rem", color: "var(--ink-muted)" }}>
                주제별 탐험
              </span>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "1.25rem",
            }}>
              {categoryPreviews.map(({ key, label, posts: catPosts }) => (
                <div key={key} style={{
                  background: "var(--bg-card)",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  overflow: "hidden",
                }}>
                  <div style={{
                    padding: "0.875rem 1.25rem",
                    borderBottom: "1px solid var(--border-light)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <span className={catBadgeClass[key] || "badge"} style={{ fontSize: "0.75rem" }}>
                      {label}
                    </span>
                    <a
                      href={`/?view=${currentView}&category=${key}`}
                      style={{ fontSize: "0.75rem", color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
                    >
                      더보기 →
                    </a>
                  </div>
                  {catPosts.map((p, i) => (
                    <Link
                      key={p.id}
                      href={`/posts/${p.slug}`}
                      style={{
                        display: "flex", gap: "0.875rem",
                        padding: "0.875rem 1.25rem",
                        textDecoration: "none", color: "inherit",
                        borderBottom: i < catPosts.length - 1 ? "1px solid var(--border-light)" : "none",
                        transition: "background 0.15s",
                      }}
                    >
                      {p.thumbnail_url && (
                        <div style={{
                          width: "5rem", height: "3.5rem", borderRadius: "8px",
                          overflow: "hidden", flexShrink: 0,
                          position: "relative",
                        }}>
                          <Image
                            src={p.thumbnail_url}
                            alt={p.title || ""}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{
                          fontSize: "0.8125rem",
                          fontWeight: 700,
                          lineHeight: 1.4,
                          color: "var(--ink)",
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 2,
                          overflow: "hidden",
                        }}>
                          {p.title}
                        </h4>
                        <span style={{ fontSize: "0.6875rem", color: "var(--ink-faint)", marginTop: "0.25rem", display: "block" }}>
                          {p.published_at ? new Date(p.published_at).toLocaleDateString("ko-KR") : ""}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 최신 이야기 ──────────────────────── */}
        <section>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 0",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {isFirstPageAll && (
                <span style={{
                  fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em",
                  textTransform: "uppercase", color: "var(--ink-muted)",
                }}>
                  LATEST
                </span>
              )}
              <span style={{ fontSize: "0.8125rem", color: "var(--ink-muted)" }}>
                {category ? `${catLabels[category] || category} ` : ""}총{" "}
                <strong style={{ color: "var(--ink)", fontWeight: 700 }}>{total}</strong>
                개의 TMI
              </span>
            </div>
          </div>

          <div style={{
            background: "var(--bg-card)",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            overflow: "hidden",
            marginBottom: "1.5rem",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            {currentView === "card" ? (
              <div style={{ padding: "1.25rem" }}>
                <PostCard posts={latestPosts as unknown as Partial<import("@/types").Post>[]} />
              </div>
            ) : (
              <PostList posts={latestPosts as unknown as Partial<import("@/types").Post>[]} />
            )}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            view={currentView}
            category={category}
          />
          <div style={{ height: "3rem" }} />
        </section>

      </main>
    </div>
  );
}
