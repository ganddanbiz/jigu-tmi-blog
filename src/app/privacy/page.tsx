import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "지구촌 TMI 개인정보처리방침",
};

export default function PrivacyPage() {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "지구촌 TMI";
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>

      {/* 헤더 */}
      <header style={{ background: "var(--header-bg)" }}>
        <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "1.5rem 1.5rem" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.875rem",
              color: "var(--header-muted)",
              textDecoration: "none",
              transition: "color 0.15s",
            }}
          >
            ← {siteName}
          </Link>
        </div>
      </header>

      {/* 본문 */}
      <main style={{ maxWidth: "52rem", margin: "0 auto", padding: "3rem 1.5rem 5rem" }}>
        <h1 style={{
          fontFamily: "var(--font-serif)",
          fontSize: "clamp(1.5rem, 3vw, 2rem)",
          fontWeight: 800,
          color: "var(--ink)",
          marginBottom: "0.5rem",
          lineHeight: 1.3,
        }}>
          개인정보처리방침
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--ink-faint)", marginBottom: "3rem" }}>
          시행일: 2026년 1월 1일 &nbsp;|&nbsp; 최종 수정: {today}
        </p>

        <div className="prose" style={{ fontSize: "0.9375rem", lineHeight: 1.85 }}>

          <p>
            <strong>{siteName}</strong>(이하 "본 사이트")는 이용자의 개인정보를 중요시하며,
            「개인정보 보호법」 등 관련 법령을 준수합니다. 본 방침은 본 사이트가
            어떠한 개인정보를 수집하고, 어떻게 이용·보호하는지 안내합니다.
          </p>

          <h2>1. 수집하는 개인정보 항목</h2>
          <p>본 사이트는 서비스 제공을 위해 아래와 같은 정보를 수집합니다.</p>
          <ul>
            <li>
              <strong>댓글 작성 시:</strong> 닉네임, 댓글 내용, IP 주소(단방향 해시 처리 후 저장 — 스팸·어뷰징 방지 목적)
            </li>
            <li>
              <strong>좋아요 기능 이용 시:</strong> IP 주소(단방향 해시 처리 후 저장 — 중복 방지 목적)
            </li>
            <li>
              <strong>방문 로그:</strong> 접속 IP, 브라우저 정보, 방문 페이지 URL (서버 운영 및 보안 목적)
            </li>
          </ul>
          <p>
            민감정보(사상·신념, 건강정보, 금융정보 등)는 수집하지 않습니다.
            회원가입 없이 대부분의 서비스를 이용할 수 있습니다.
          </p>

          <h2>2. 개인정보의 수집 목적 및 이용</h2>
          <ul>
            <li>댓글·좋아요 등 서비스 제공 및 운영</li>
            <li>불법 이용 행위 방지 및 스팸 댓글 차단</li>
            <li>서비스 개선 및 통계 분석 (비식별 처리 후 활용)</li>
          </ul>

          <h2>3. 개인정보의 보유 및 이용 기간</h2>
          <p>
            수집된 개인정보는 수집 목적 달성 후 즉시 파기합니다.
            단, 관련 법령에 의해 보존이 필요한 경우 해당 기간 동안 보관합니다.
          </p>
          <ul>
            <li>댓글: 삭제 요청 시 즉시 파기</li>
            <li>IP 해시: 수집일로부터 1년 후 자동 파기</li>
            <li>서버 접속 로그: 3개월 (전기통신사업법)</li>
          </ul>

          <h2>4. 제3자 제공 및 위탁</h2>
          <p>본 사이트는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.
          다만, 다음의 경우 예외로 합니다.</p>
          <ul>
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령의 규정에 의거하거나 수사 목적으로 관계기관이 요구하는 경우</li>
          </ul>

          <h2>5. 구글 애드센스 및 쿠키</h2>
          <p>
            본 사이트는 광고 수익을 위해 <strong>구글 애드센스(Google AdSense)</strong>를 사용합니다.
            구글은 쿠키(Cookie)를 사용하여 이용자의 관심사에 맞는 광고를 표시할 수 있습니다.
          </p>
          <ul>
            <li>구글의 광고 쿠키 사용은 <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">구글 개인정보처리방침</a>에 따릅니다.</li>
            <li>이용자는 <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">구글 광고 설정</a>에서 맞춤 광고를 비활성화할 수 있습니다.</li>
            <li>브라우저 설정을 통해 쿠키 수집을 거부할 수 있으나, 일부 서비스 이용에 제한이 생길 수 있습니다.</li>
          </ul>

          <h2>6. 이용자의 권리</h2>
          <p>이용자는 언제든지 자신의 개인정보에 대해 아래 권리를 행사할 수 있습니다.</p>
          <ul>
            <li>개인정보 열람 요청</li>
            <li>오류 정정 요청</li>
            <li>삭제 요청</li>
            <li>처리 정지 요청</li>
          </ul>
          <p>
            권리 행사는 <Link href="/contact" style={{ color: "var(--accent)" }}>Contact 페이지</Link>를 통해 요청하실 수 있으며,
            본 사이트는 요청을 받은 날로부터 10일 이내에 처리합니다.
          </p>

          <h2>7. 개인정보 보호책임자</h2>
          <ul>
            <li><strong>운영자:</strong> 블로그 운영자</li>
            <li><strong>연락처:</strong> <Link href="/contact" style={{ color: "var(--accent)" }}>Contact 페이지</Link> 참조</li>
          </ul>

          <h2>8. 개인정보처리방침 변경</h2>
          <p>
            본 방침은 법령·정책의 변경 또는 서비스 변화에 따라 수정될 수 있습니다.
            변경 시 본 페이지에 공지하며, 중요한 변경 사항은 홈페이지 공지를 통해 안내합니다.
          </p>

        </div>
      </main>
    </div>
  );
}
