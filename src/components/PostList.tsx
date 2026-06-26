import Link from "next/link";
import Image from "next/image";
import { Post } from "@/types";
import PostShareButton from "./PostShareButton";
import AdBanner from "./AdBanner";

interface PostListProps {
  posts: Partial<Post>[];
}

const catBadgeClass: Record<string, string> = {
  before: "badge badge-before",
  bidding: "badge badge-bidding",
  after:   "badge badge-after",
  tax:     "badge badge-tax",
  law:     "badge badge-law",
  ai:      "badge badge-ai",
};

const catLabels: Record<string, string> = {
  before:  "세계 이슈",
  bidding: "동물·자연",
  after:   "사람·사회",
  tax:     "음식·문화",
  law:     "기록·도전",
  ai:      "기술·발명",
};

function getLevelBadge(slug?: string): { cls: string; label: string } | null {
  if (!slug) return null;
  if (slug.startsWith("basic-")) return { cls: "badge badge-basic", label: "기초" };
  if (slug.startsWith("mid-"))   return { cls: "badge badge-mid",   label: "중급" };
  if (slug.startsWith("adv-"))   return { cls: "badge badge-adv",   label: "고급" };
  return null;
}

export default function PostList({ posts }: PostListProps) {
  if (posts.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "5rem 1rem", color: "var(--ink-muted)" }}>
        <p style={{ fontSize: "1rem" }}>아직 게시된 글이 없습니다.</p>
      </div>
    );
  }

  const adSlot = process.env.NEXT_PUBLIC_ADSENSE_SLOT_LIST || "";

  return (
    <div>
      {posts.map((post, index) => {
        const cat = post.category || "before";
        const level = getLevelBadge(post.slug);
        const publishedDate = post.published_at
          ? new Date(post.published_at).toLocaleDateString("ko-KR", {
              year: "numeric", month: "long", day: "numeric",
            })
          : "";

        return (
          <div key={post.id}>
          <article className="feed-article">

            {/* 메타 */}
            <div style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              marginBottom: "0.875rem", flexWrap: "wrap",
            }}>
              <span className={catBadgeClass[cat] || "badge"}>
                {catLabels[cat] || cat}
              </span>
              {level && <span className={level.cls}>{level.label}</span>}
              {publishedDate && (
                <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)", marginLeft: "0.25rem" }}>
                  {publishedDate}
                </span>
              )}
              <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>
                · 조회 {(post.view_count || 0).toLocaleString()}
              </span>
            </div>

            {/* 제목 */}
            <Link href={`/posts/${post.slug}`} className="feed-title">
              {post.title}
            </Link>

            {/* 썸네일 */}
            {post.thumbnail_url && (
              <div style={{
                position: "relative", width: "100%", height: "18rem",
                margin: "1.25rem 0", borderRadius: "10px", overflow: "hidden",
                border: "1px solid var(--border)",
              }}>
                <Image
                  src={post.thumbnail_url}
                  alt={post.title || ""}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 800px"
                />
              </div>
            )}

            {/* 본문 */}
            {post.content && (
              <div
                className="prose"
                style={{ marginTop: "1.25rem" }}
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            )}

            {/* 하단 */}
            <div style={{
              marginTop: "1.75rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid var(--border-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}>
              <Link href={`/posts/${post.slug}`} className="feed-more-link">
                댓글 · 좋아요 보기 →
              </Link>
              <PostShareButton slug={post.slug || ""} title={post.title || ""} />
            </div>
          </article>
          {index % 3 === 2 && index < posts.length - 1 && (
            <div className="feed-ad-slot">
              <AdBanner slot={adSlot} format="horizontal" />
            </div>
          )}
          </div>
        );
      })}
    </div>
  );
}
