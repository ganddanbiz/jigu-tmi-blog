export interface Post {
  id: number;
  title: string;
  content: string;
  slug: string;
  category: string;
  thumbnail_url: string | null;
  meta_description: string | null;
  keywords: string | null;
  status: "draft" | "published" | "scheduled";
  published_at: string | null;
  created_at: string;
  updated_at: string;
  view_count: number;
  sources?: { name: string; url?: string; publisher?: string; published_at?: string; verified_at?: string }[];
  review_status?: "needs_review" | "reviewed" | "approved";
  last_fact_checked_at?: string | null;
}

export interface Comment {
  id: number;
  post_id: number;
  nickname: string;
  content: string;
  ip_hash: string;
  is_approved: number;
  created_at: string;
}

export interface Like {
  id: number;
  post_id: number;
  visitor_hash: string;
  created_at: string;
}
