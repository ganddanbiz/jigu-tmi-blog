export const metadata = {
  title: "소개",
};

export default function AboutPage() {
  return (
    <main style={{ maxWidth: "56rem", margin: "0 auto", padding: "3rem 1.5rem" }}>
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", marginBottom: "1.5rem", color: "var(--ink)" }}>
        지구촌 TMI 소개
      </h1>
      <p style={{ lineHeight: 1.9, color: "var(--ink-mid)", marginBottom: "1.25rem" }}>
        세계 곳곳에서 일어나는 재미있고 신기한 뉴스를 매일 전달합니다.
        경제나 정치 같은 무거운 이야기는 잠시 내려두고, 출퇴근길에 가볍게 읽을 수 있는 흥미로운 세상 이야기를 골라드려요.
      </p>
      <p style={{ lineHeight: 1.9, color: "var(--ink-mid)", marginBottom: "1.25rem" }}>
        동물의 놀라운 능력, 세계 각지의 기상천외한 음식, 기네스 기록 도전기, 신기한 과학 발견까지—
        <strong style={{ color: "var(--ink)" }}>잡학왕 TMI</strong>가 매일 새롭고 흥미로운 이야기를 찾아 전해드립니다.
      </p>
      <p style={{ lineHeight: 1.9, color: "var(--ink-mid)" }}>
        스마트폰으로 5분이면 읽을 수 있는 분량으로, 20~40대 직장인이 출퇴근 중에도 부담 없이 즐길 수 있게 구성했어요.
        매일 아침 새로운 지구촌 TMI를 만나보세요! 🌍
      </p>
    </main>
  );
}
