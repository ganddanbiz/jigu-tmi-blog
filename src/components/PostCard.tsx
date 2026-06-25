import Link from "next/link";
import Image from "next/image";
import { Post } from "@/types";
import PostShareButton from "./PostShareButton";
import AdBanner from "./AdBanner";

interface PostCardProps {
  posts: Partial<Post>[];
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
  before: "badge badge-before",
  bidding: "badge badge-bidding",
  after:   "badge badge-after",
  tax:     "badge badge-tax",
  law:     "badge badge-law",
  ai:      "badge badge-ai",
};

// Top border accent per category
const catAccent: Record<string, string> = {
  before: "var(--cat-before-c)",
  bidding: "var(--cat-bidding-c)",
  after:   "var(--cat-after-c)",
  tax:     "var(--cat-tax-c)",
  law:     "var(--cat-law-c)",
  ai:      "var(--cat-ai-c)",
};

function getLevelBadge(slug?: string): { cls: string; label: string } | null {
  if (!slug) return null;
  if (slug.startsWith("basic-")) return { cls: "badge badge-basic", label: "기초" };
  if (slug.startsWith("mid-"))   return { cls: "badge badge-mid",   label: "중급" };
  if (slug.startsWith("adv-"))   return { cls: "badge badge-adv",   label: "고급" };
  return null;
}

const CHUNK_SIZE = 6;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export default function PostCard({ posts }: PostCardProps) {
  if (posts.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "5rem 1rem", color: "var(--ink-muted)" }}>
        <p>아직 게시된 글이 없습니다.</p>
      </div>
    );
  }

  const adSlot = process.env.NEXT_PUBLIC_ADSENSE_SLOT_LIST || "";
  const chunks = chunkArray(posts, CHUNK_SIZE);
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "1rem",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {chunks.map((chunk, chunkIndex) => (
        <div key={chunkIndex}>
          <div style={gridStyle}>
            {chunk.map((post) => {
              const cat = post.category || "before";
              const level = getLevelBadge(post.slug);
              const accent = catAccent[cat] || "var(--accent)";
              const publishedDate = post.published_at
                ? new Date(post.published_at).toLocaleDateString("ko-KR")
                : "";

              return (
                <Link
                  key={post.id}
                  href={`/posts/${post.slug}`}
                  className="post-card"
                  style={{ borderTop: `3px solid ${accent}` }}
                >
                  {post.thumbnail_url ? (
                    <div className="post-card-thumb">
                      <Image
                        src={post.thumbnail_url}
                        alt={post.title || ""}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="post-card-placeholder">
                      <span style={{ fontSize: "2rem", opacity: 0.4 }}>🏛</span>
                    </div>
                  )}

                  <div className="post-card-body">
                    <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.6rem", flexWrap: "wrap" }}>
                      <span className={catBadgeClass[cat] || "badge"}>{catLabels[cat] || cat}</span>
                      {level && <span className={level.cls}>{level.label}</span>}
                    </div>

                    <h2 className="post-card-title">{post.title}</h2>

                    {post.meta_description && (
                      <p style={{
                        fontSize: "0.75rem",
                        color: "var(--ink-muted)",
                        lineHeight: 1.6,
                        marginBottom: "0.75rem",
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        overflow: "hidden",
                      }}>
                        {post.meta_description}
                      </p>
                    )}

                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      fontSize: "0.6875rem", color: "var(--ink-faint)", marginTop: "auto",
                      paddingTop: "0.5rem", borderTop: "1px solid var(--border-light)",
                    }}>
                      <span>{publishedDate || ""} · 조회 {(post.view_count || 0).toLocaleString()}</span>
                      <PostShareButton slug={post.slug || ""} title={post.title || ""} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          {chunkIndex < chunks.length - 1 && (
            <div style={{ marginTop: "1rem" }}>
              <AdBanner slot={adSlot} format="horizontal" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
