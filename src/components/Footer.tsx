import Link from "next/link";

export default function Footer() {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "지구촌 TMI";
  const year = new Date().getFullYear();

  return (
    <footer style={{
      background: "var(--header-bg)",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      marginTop: "auto",
    }}>
      <div style={{
        maxWidth: "72rem",
        margin: "0 auto",
        padding: "2rem 1.5rem",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1.25rem",
      }}>

        {/* 좌측: 사이트명 + 저작권 */}
        <div>
          <p style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 700,
            fontSize: "0.9375rem",
            color: "var(--header-text)",
            marginBottom: "0.3rem",
          }}>
            {siteName}
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--header-muted)" }}>
            © {year} {siteName}. All rights reserved.
          </p>
        </div>

        {/* 우측: 링크 */}
        <nav style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexWrap: "wrap" }}>
          {[
            { href: "/about", label: "블로그 소개" },
            { href: "/contact", label: "문의하기" },
            { href: "/privacy", label: "개인정보처리방침" },
          ].map(({ href, label }, i) => (
            <span key={href} style={{ display: "inline-flex", alignItems: "center" }}>
              {i > 0 && (
                <span style={{ color: "var(--header-muted)", padding: "0 0.4rem", fontSize: "0.75rem" }}>·</span>
              )}
              <Link
                href={href}
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--header-muted)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {label}
              </Link>
            </span>
          ))}
        </nav>

      </div>
    </footer>
  );
}
