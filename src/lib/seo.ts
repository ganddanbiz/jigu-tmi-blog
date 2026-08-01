/**
 * 슬러그 생성: 영문/숫자는 그대로, 한국어는 그대로 유지 (URL encode 허용)
 * 특수문자/공백은 하이픈으로 변환, 고유성을 위해 타임스탬프 접미사 추가
 */
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\uAC00-\uD7A3-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const suffix = Date.now().toString(36);
  return base ? `${base}-${suffix}` : suffix;
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1"
  );
}

export function verifyAdminKey(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  return token === process.env.ADMIN_API_KEY;
}

/**
 * 사이트 정본 URL.
 *
 * NEXT_PUBLIC_SITE_URL이 없으면 Vercel이 자동 주입하는 VERCEL_PROJECT_PRODUCTION_URL을 쓴다.
 * (커스텀 도메인을 붙이면 그 도메인으로 자동 갱신된다.)
 *
 * ⚠️ 이 폴백이 없던 시절, Vercel에 NEXT_PUBLIC_SITE_URL이 미설정이라
 *    sitemap.xml·robots.txt가 통째로 http://localhost:3000을 가리켰다(2026-08-01 발견).
 *    크롤러가 접근할 수 없어 색인이 원천 차단된 상태였다. localhost는 로컬 개발에서만 나와야 한다.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

/** 사이트 표시명. 환경변수 미설정 시에도 템플릿 기본값("내 블로그")이 새지 않도록 실명을 기본값으로 둔다. */
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "지구촌 TMI";
