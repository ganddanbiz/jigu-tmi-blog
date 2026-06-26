const COUPANG_URL = "https://link.coupang.com/a/eJzg1eIyu4";

export default function CoupangBanner() {
  return (
    <div style={{ margin: "1.5rem 0" }}>
      <div style={{
        padding: "14px 20px",
        background: "linear-gradient(135deg, #e4003a 0%, #ff4d6d 100%)",
        borderRadius: "10px 10px 0 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "10px",
      }}>
        <span style={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem" }}>
          쿠팡에서 다양한 상품을 만나보세요
        </span>
        <a
          href={COUPANG_URL}
          target="_blank"
          rel="noopener noreferrer sponsored"
          style={{
            display: "inline-block",
            padding: "8px 22px",
            background: "#fff",
            color: "#e4003a",
            fontSize: "0.88rem",
            fontWeight: 700,
            borderRadius: "6px",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          쿠팡 바로가기 →
        </a>
      </div>
      <p style={{
        margin: 0,
        padding: "8px 14px",
        background: "#fff5f7",
        border: "1px solid #ffd0d8",
        borderTop: "none",
        borderRadius: "0 0 10px 10px",
        fontSize: "0.75rem",
        color: "#888",
        lineHeight: 1.5,
      }}>
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </p>
    </div>
  );
}
