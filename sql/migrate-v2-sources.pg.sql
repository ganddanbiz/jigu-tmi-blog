-- ============================================
-- 지구촌TMI 2.0 마이그레이션: 출처/검증 필드 추가
-- 파일: sql/migrate-v2-sources.pg.sql
-- 실행: psql $DATABASE_URL -f sql/migrate-v2-sources.pg.sql
-- ============================================

-- 출처 배열 (JSONB: [{name, url, publisher, published_at, verified_at}])
ALTER TABLE posts ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]';

-- 검증 상태: needs_review (기본) / reviewed / approved
ALTER TABLE posts ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT 'needs_review';

-- 마지막 팩트체크 일시
ALTER TABLE posts ADD COLUMN IF NOT EXISTS last_fact_checked_at TIMESTAMPTZ DEFAULT NULL;

-- 검증 상태 인덱스
CREATE INDEX IF NOT EXISTS idx_review_status ON posts (review_status);
