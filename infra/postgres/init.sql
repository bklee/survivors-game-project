-- Survivors Game DB schema v1
-- 2026-05-16

-- ============================================================
-- Players (게스트 디바이스 ID 기반, 옵션 이메일 가입)
-- ============================================================
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    device_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    nickname TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    no_ads_pass BOOLEAN DEFAULT FALSE,
    total_essence INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_players_device ON players(device_id);
CREATE INDEX IF NOT EXISTS idx_players_email ON players(email) WHERE email IS NOT NULL;

-- ============================================================
-- Purchases (Lemon Squeezy webhook 수신용 -- Phase 2)
-- ============================================================
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    product_id TEXT NOT NULL,           -- 'no_ads_pass', 'character_pack', ...
    amount_cents INTEGER NOT NULL,      -- 원화는 cents 단위 사용 (예: 5500원 = 550000)
    currency TEXT NOT NULL DEFAULT 'KRW',
    ls_order_id TEXT UNIQUE NOT NULL,   -- Lemon Squeezy order ID
    ls_event_id TEXT,                   -- LS webhook event ID (idempotency)
    status TEXT NOT NULL DEFAULT 'completed', -- 'completed' | 'refunded' | 'failed'
    raw_payload JSONB,                   -- LS webhook 원본 payload
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_player ON purchases(player_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status_time ON purchases(status, created_at DESC);

-- ============================================================
-- Leaderboard (엔드리스 모드 점수)
-- ============================================================
CREATE TABLE IF NOT EXISTS leaderboard (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    stage_reached INTEGER,
    character_id TEXT,               -- 'knight', 'wizard', 'elf', 'necromancer', ...
    duration_seconds INTEGER,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_player_score ON leaderboard(player_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_time ON leaderboard(submitted_at DESC);

-- ============================================================
-- Events (분석 이벤트, 가벼운 telemetry)
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    player_id INTEGER,
    event_type TEXT NOT NULL,
    -- 'session_start', 'session_end', 'card_select', 'iap_funnel_view',
    -- 'iap_funnel_click', 'iap_funnel_complete', 'ad_view', 'ad_skip',
    -- 'synergy_discover', 'character_unlock', ...
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_type_time ON events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_player_time ON events(player_id, created_at DESC) WHERE player_id IS NOT NULL;

-- 30일 이상된 이벤트 자동 삭제 (옵션 -- 데이터 폭주 방지)
-- CRON으로 매일 실행하거나 pg_cron 확장 사용:
-- DELETE FROM events WHERE created_at < NOW() - INTERVAL '30 days';

-- ============================================================
-- Daily Rewards (M4 Phase 3 — Sprint 1)
-- 하루 1회 청구, UNIQUE(player_id, claim_date) 로 중복 차단.
-- claim_date 는 KST(Asia/Seoul) 기준 자동 계산 (DB GENERATED).
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_rewards (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    streak_day INTEGER NOT NULL,            -- 1..7 (cycle)
    streak_count INTEGER NOT NULL,          -- 누적 streak 길이
    essence_granted INTEGER NOT NULL,
    coins_granted INTEGER NOT NULL DEFAULT 0,
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    claim_date DATE GENERATED ALWAYS AS ((claimed_at AT TIME ZONE 'Asia/Seoul')::date) STORED
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_rewards_unique_per_day
    ON daily_rewards(player_id, claim_date);

CREATE INDEX IF NOT EXISTS idx_daily_rewards_player_time
    ON daily_rewards(player_id, claimed_at DESC);

-- ============================================================
-- Daily Quests (M4 Phase 3 — Sprint 3)
-- quests: 매일 KST 자정 3개 랜덤 할당. 동일 day 의 동일 quest_id 중복 차단.
-- quest_progress: lock contention 분리를 위해 별도 테이블.
-- ============================================================
CREATE TABLE IF NOT EXISTS quests (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    quest_id TEXT NOT NULL,
    target_value INTEGER NOT NULL,
    reward_essence INTEGER NOT NULL,
    assigned_date DATE NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quests_player_date_questid
    ON quests(player_id, assigned_date, quest_id);

CREATE INDEX IF NOT EXISTS idx_quests_player_date
    ON quests(player_id, assigned_date DESC);

CREATE TABLE IF NOT EXISTS quest_progress (
    quest_db_id INTEGER PRIMARY KEY REFERENCES quests(id) ON DELETE CASCADE,
    current_value INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 헬퍼 함수: 플레이어 last_seen_at 자동 갱신
-- ============================================================
CREATE OR REPLACE FUNCTION update_player_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE players SET last_seen_at = NOW() WHERE id = NEW.player_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_events_last_seen
    AFTER INSERT ON events
    FOR EACH ROW
    WHEN (NEW.player_id IS NOT NULL)
    EXECUTE FUNCTION update_player_last_seen();

-- Migration tracking — deploy-stack.exp 가 idempotent 하게 운영하기 위한 ledger
CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO schema_migrations (filename)
VALUES ('2026-05-21-phase3-tables.sql')
ON CONFLICT (filename) DO NOTHING;
