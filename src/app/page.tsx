import { Suspense } from "react";
import pool from "@/lib/db";
import PostList from "@/components/PostList";
import PostCard from "@/components/PostCard";
import ViewToggle from "@/components/ViewToggle";
import Pagination from "@/components/Pagination";

const LIMIT = 10;

const categories: { key: string | null; label: string }[] = [
  { key: null,       label: "전체" },
  { key: "before",   label: "세계 이슈" },
  { key: "bidding",  label: "동물·자연" },
  { key: "after",    label: "사람·사회" },
  { key: "tax",      label: "음식·문화" },
  { key: "law",      label: "기록·도전" },
  { key: "ai",       label: "기술·발명" },
];

type SearchParams = Promise<{
  view?: string;
  page?: string;
  category?: string;
}>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const { view = "list", page = "1", category } = await searchParams;

  const currentView = view === "card" ? "card" : "list";
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
    `SELECT id, title, slug, category, thumbnail_url, meta_description, content, published_at, view_count
     FROM posts WHERE status = 'published' ${dataPlaceholders}`,
    dataParams
  );

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>

      {/* ── 헤더 ──────────────────────────────────── */}
      <header style={{ background: "var(--header-bg)" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1.5rem 1.75rem" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <div style={{
                fontSize: "0.6875rem",
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--accent)",
                marginBottom: "0.5rem",
              }}>
                세계 이모저모
              </div>
              <h1 style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
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
                marginTop: "0.5rem",
                letterSpacing: "0.02em",
              }}>
                매일 신기하고 재미있는 세계 뉴스를 전해드려요 🌍
              </p>
            </div>
            <div style={{
              flexShrink: 0,
              width: "3px",
              height: "4.5rem",
              background: "var(--accent)",
              borderRadius: "2px",
            }} />
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
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0 1.5rem" }}>
          <div
            className="scrollbar-hide"
            style={{ display: "flex", overflowX: "auto" }}
          >
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
        </div>
      </div>

      {/* ── 메인 콘텐츠 ───────────────────────────── */}
      <main style={{ maxWidth: "56rem", margin: "0 auto", padding: "0 1.5rem" }}>

        {/* 뷰 토글 + 글 수 */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.25rem 0",
        }}>
          <span style={{ fontSize: "0.8125rem", color: "var(--ink-muted)" }}>
            총{" "}
            <strong style={{ color: "var(--ink)", fontWeight: 700 }}>{total}</strong>
            개의 TMI
          </span>
          <Suspense>
            <ViewToggle currentView={currentView} />
          </Suspense>
        </div>

        {/* 글 목록 */}
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
              <PostCard posts={posts as unknown as Partial<import("@/types").Post>[]} />
            </div>
          ) : (
            <PostList posts={posts as unknown as Partial<import("@/types").Post>[]} />
          )}
        </div>

        {/* 페이지네이션 */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          view={currentView}
          category={category}
        />
        <div style={{ height: "3rem" }} />
      </main>
    </div>
  );
}
