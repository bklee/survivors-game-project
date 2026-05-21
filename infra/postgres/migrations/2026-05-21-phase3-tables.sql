-- Phase 3: Sprint 1 (daily_rewards) + Sprint 3 (quests, quest_progress) 테이블

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
