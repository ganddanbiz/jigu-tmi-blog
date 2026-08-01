import { SITE_URL, SITE_NAME } from "@/lib/seo";
import { Post } from "@/types";

interface JsonLdProps {
  post: Post;
}

export default function JsonLd({ post }: JsonLdProps) {
  const siteUrl = SITE_URL;
  const siteName = SITE_NAME;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.meta_description || "",
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at,
    author: {
      "@type": "Person",
      name: SITE_NAME,
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
    },
    url: `${siteUrl}/posts/${post.slug}`,
    ...(post.thumbnail_url && { image: post.thumbnail_url }),
    keywords: post.keywords || "",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
