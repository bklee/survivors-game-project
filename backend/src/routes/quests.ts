import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';

const router = Router();

// 정적 퀘스트 풀 (설계 doc §2.2). description 은 i18n 에서 클라이언트가 렌더링.
// update_mode:
//   - 'sum': 클라이언트 delta 누적 (kill, synergy, play count)
//   - 'max': high-water-mark — 같은 값 재전송해도 누적 X (stage 도달, survive 플래그)
export type QuestUpdateMode = 'sum' | 'max';

export interface QuestDef {
    quest_id: string;
    description_key: string;
    target_value: number;
    reward_essence: number;
    update_mode: QuestUpdateMode;
}

export const QUEST_POOL: ReadonlyArray<QuestDef> = [
    {
        quest_id: 'kill_100',
        description_key: 'quest_kill_100',
        target_value: 100,
        reward_essence: 20,
        update_mode: 'sum',
    },
    {
        quest_id: 'kill_300',
        description_key: 'quest_kill_300',
        target_value: 300,
        reward_essence: 40,
        update_mode: 'sum',
    },
    {
        quest_id: 'stage_3',
        description_key: 'quest_stage_3',
        target_value: 3,
        reward_essence: 30,
        update_mode: 'max',
    },
    {
        quest_id: 'stage_5',
        description_key: 'quest_stage_5',
        target_value: 5,
        reward_essence: 50,
        update_mode: 'max',
    },
    {
        quest_id: 'synergy_5',
        description_key: 'quest_synergy_5',
        target_value: 5,
        reward_essence: 25,
        update_mode: 'sum',
    },
    {
        quest_id: 'survive_5m',
        description_key: 'quest_survive_5m',
        target_value: 1,
        reward_essence: 30,
        update_mode: 'max',
    },
    {
        quest_id: 'play_2_sessions',
        description_key: 'quest_play_2',
        target_value: 2,
        reward_essence: 20,
        update_mode: 'sum',
    },
];

const QUEST_ID_SET = new Set(QUEST_POOL.map((q) => q.quest_id));
const COMBO_BONUS_COINS = 500;
const QUESTS_PER_DAY = 3;

const DeviceParamSchema = z.string().min(8).max(64);

const ProgressBodySchema = z.object({
    device_id: DeviceParamSchema,
    increments: z
        .array(
            z.object({
                quest_id: z.string().refine((v) => QUEST_ID_SET.has(v), 'unknown quest_id'),
                delta: z.number().int().min(1).max(10_000),
            }),
        )
        .min(1)
        .max(10),
});

const ClaimBodySchema = z.object({
    device_id: DeviceParamSchema,
    quest_id: z.string().refine((v) => QUEST_ID_SET.has(v), 'unknown quest_id'),
});

// 풀에서 랜덤 N개 선택 (중복 없음, Fisher-Yates shuffle 부분)
function pickRandomQuests(n: number): QuestDef[] {
    const pool = [...QUEST_POOL];
    for (let i = 0; i < n; i++) {
        const j = i + Math.floor(Math.random() * (pool.length - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, n);
}

interface QuestRow {
    id: number;
    quest_id: string;
    target_value: number;
    reward_essence: number;
    current_value: number | null;
    completed_at: string | null;
    claimed_at: string | null;
    description_key: string;
}

// GET /api/quests/:device_id — lazy assignment 후 오늘의 3개 + progress 반환
router.get('/:device_id', async (req, res) => {
    const parsed = DeviceParamSchema.safeParse(req.params.device_id);
    if (!parsed.success) {
        return res.status(400).json({ error: 'invalid device_id' });
    }
    const deviceId = parsed.data;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const playerR = await client.query(
            `INSERT INTO players (device_id) VALUES ($1)
             ON CONFLICT (device_id) DO UPDATE SET last_seen_at = NOW()
             RETURNING id`,
            [deviceId],
        );
        const playerId = playerR.rows[0].id as number;

        const todayR = await client.query(
            `SELECT (NOW() AT TIME ZONE 'Asia/Seoul')::date::text AS today`,
        );
        const today = todayR.rows[0].today as string;

        // 오늘 할당된 퀘스트 조회
        let questsR = await client.query(
            `SELECT q.id, q.quest_id, q.target_value, q.reward_essence,
                    qp.current_value, qp.completed_at, qp.claimed_at
             FROM quests q
             LEFT JOIN quest_progress qp ON qp.quest_db_id = q.id
             WHERE q.player_id = $1 AND q.assigned_date = $2
             ORDER BY q.id ASC`,
            [playerId, today],
        );

        // 0개면 풀에서 랜덤 3개 INSERT
        if (questsR.rowCount === 0) {
            const picks = pickRandomQuests(QUESTS_PER_DAY);
            for (const p of picks) {
                // ON CONFLICT 로 동시 GET race 시 중복 INSERT 방지
                await client.query(
                    `INSERT INTO quests (player_id, quest_id, target_value, reward_essence, assigned_date)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (player_id, assigned_date, quest_id) DO NOTHING`,
                    [playerId, p.quest_id, p.target_value, p.reward_essence, today],
                );
            }
            questsR = await client.query(
                `SELECT q.id, q.quest_id, q.target_value, q.reward_essence,
                        qp.current_value, qp.completed_at, qp.claimed_at
                 FROM quests q
                 LEFT JOIN quest_progress qp ON qp.quest_db_id = q.id
                 WHERE q.player_id = $1 AND q.assigned_date = $2
                 ORDER BY q.id ASC`,
                [playerId, today],
            );
        }

        await client.query('COMMIT');

        const quests = (questsR.rows as QuestRow[]).map((r) => {
            const def = QUEST_POOL.find((q) => q.quest_id === r.quest_id);
            return {
                quest_id: r.quest_id,
                description_key: def?.description_key ?? r.quest_id,
                target_value: r.target_value,
                current_value: r.current_value ?? 0,
                reward_essence: r.reward_essence,
                completed: !!r.completed_at,
                claimed: !!r.claimed_at,
            };
        });

        const allClaimed = quests.length === QUESTS_PER_DAY && quests.every((q) => q.claimed);

        res.json({
            date: today,
            quests,
            combo_bonus_coins: COMBO_BONUS_COINS,
            combo_claimed: allClaimed,
        });
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('[Quests GET] DB error:', err);
        res.status(500).json({ error: 'db error' });
    } finally {
        client.release();
    }
});

// POST /api/quests/progress — batch delta 적용
router.post('/progress', async (req, res) => {
    const parsed = ProgressBodySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { device_id, increments } = parsed.data;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const playerR = await client.query(
            `INSERT INTO players (device_id) VALUES ($1)
             ON CONFLICT (device_id) DO UPDATE SET last_seen_at = NOW()
             RETURNING id`,
            [device_id],
        );
        const playerId = playerR.rows[0].id as number;

        const todayR = await client.query(
            `SELECT (NOW() AT TIME ZONE 'Asia/Seoul')::date::text AS today`,
        );
        const today = todayR.rows[0].today as string;

        // 오늘 할당된 quests 의 id 매핑
        const questIds = increments.map((i) => i.quest_id);
        const lookupR = await client.query(
            `SELECT id, quest_id, target_value
             FROM quests
             WHERE player_id = $1 AND assigned_date = $2 AND quest_id = ANY($3)`,
            [playerId, today, questIds],
        );
        const questMap = new Map<string, { id: number; target: number }>();
        for (const row of lookupR.rows) {
            questMap.set(row.quest_id, { id: row.id, target: row.target_value });
        }

        const updated: { quest_id: string; current_value: number; completed: boolean }[] = [];
        let newlyCompleted = 0;

        for (const inc of increments) {
            const q = questMap.get(inc.quest_id);
            if (!q) continue; // 오늘 할당된 적 없는 quest 는 무시
            const def = QUEST_POOL.find((p) => p.quest_id === inc.quest_id);
            if (!def) continue;

            // mode 에 따라 SQL 분기. INSERT/ON CONFLICT 모두 동일 cap + completed_at 동시 set.
            // RETURNING was_newly_completed 로 신규 완료 여부 정확 판정 (over-count 방지).
            const isMax = def.update_mode === 'max';
            // INSERT 시 value: max → delta 그대로(작게 들어와도 OK), sum → LEAST(delta, target)
            // CONFLICT 시 value: max → GREATEST(prev, delta) 캡, sum → LEAST(prev+delta, target)
            const insertValueExpr = isMax ? 'LEAST($2, $3)' : 'LEAST($2, $3)';
            const updateValueExpr = isMax
                ? 'LEAST(GREATEST(quest_progress.current_value, $2), $3)'
                : 'LEAST(quest_progress.current_value + $2, $3)';
            // was_newly_completed: 이번 쿼리에서 처음 completed 가 set 되었는가
            const sql = `
                INSERT INTO quest_progress (quest_db_id, current_value, completed_at, updated_at)
                VALUES ($1, ${insertValueExpr},
                        CASE WHEN ${insertValueExpr} >= $3 THEN NOW() ELSE NULL END,
                        NOW())
                ON CONFLICT (quest_db_id) DO UPDATE
                SET current_value = ${updateValueExpr},
                    updated_at = NOW(),
                    completed_at = CASE
                        WHEN quest_progress.completed_at IS NULL
                             AND ${updateValueExpr} >= $3
                        THEN NOW()
                        ELSE quest_progress.completed_at
                    END
                RETURNING current_value,
                          completed_at,
                          (xmax = 0) AS was_insert,
                          (
                              completed_at IS NOT NULL
                              AND completed_at >= NOW() - INTERVAL '1 second'
                          ) AS was_newly_completed
            `;
            const upsertR = await client.query(sql, [q.id, inc.delta, q.target]);
            const row = upsertR.rows[0];
            const completed = !!row.completed_at;
            if (row.was_newly_completed) newlyCompleted++;

            updated.push({
                quest_id: inc.quest_id,
                current_value: row.current_value,
                completed,
            });
        }

        await client.query('COMMIT');
        res.json({ ok: true, updated, newly_completed_count: newlyCompleted });
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('[Quests POST progress] DB error:', err);
        res.status(500).json({ error: 'db error' });
    } finally {
        client.release();
    }
});

// POST /api/quests/claim — 완료된 퀘스트 보상 청구 (+ combo bonus)
router.post('/claim', async (req, res) => {
    const parsed = ClaimBodySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { device_id, quest_id } = parsed.data;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const playerR = await client.query(
            `INSERT INTO players (device_id) VALUES ($1)
             ON CONFLICT (device_id) DO UPDATE SET last_seen_at = NOW()
             RETURNING id`,
            [device_id],
        );
        const playerId = playerR.rows[0].id as number;

        const todayR = await client.query(
            `SELECT (NOW() AT TIME ZONE 'Asia/Seoul')::date::text AS today`,
        );
        const today = todayR.rows[0].today as string;

        // 오늘 할당 + 완료된 quest 찾기
        const questR = await client.query(
            `SELECT q.id, q.reward_essence, qp.completed_at, qp.claimed_at
             FROM quests q
             LEFT JOIN quest_progress qp ON qp.quest_db_id = q.id
             WHERE q.player_id = $1 AND q.assigned_date = $2 AND q.quest_id = $3
             FOR UPDATE`,
            [playerId, today, quest_id],
        );
        if (questR.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ ok: false, error: 'quest_not_found' });
        }
        const row = questR.rows[0];
        if (!row.completed_at) {
            await client.query('ROLLBACK');
            return res.json({ ok: false, error: 'not_completed' });
        }
        if (row.claimed_at) {
            await client.query('ROLLBACK');
            return res.json({ ok: false, error: 'already_claimed' });
        }

        // claimed_at 설정 + essence 지급
        await client.query(
            `UPDATE quest_progress SET claimed_at = NOW(), updated_at = NOW()
             WHERE quest_db_id = $1`,
            [row.id],
        );
        await client.query(`UPDATE players SET total_essence = total_essence + $1 WHERE id = $2`, [
            row.reward_essence,
            playerId,
        ]);
        await client.query(
            `INSERT INTO events (player_id, event_type, payload)
             VALUES ($1, 'quest_claim', $2)`,
            [playerId, { quest_id, essence: row.reward_essence }],
        );

        // combo 체크 — 오늘 3개 모두 claimed?
        const comboCheckR = await client.query(
            `SELECT COUNT(*)::int AS claimed_count
             FROM quests q
             JOIN quest_progress qp ON qp.quest_db_id = q.id
             WHERE q.player_id = $1 AND q.assigned_date = $2 AND qp.claimed_at IS NOT NULL`,
            [playerId, today],
        );
        const claimedCount = comboCheckR.rows[0].claimed_count as number;
        const comboUnlocked = claimedCount >= QUESTS_PER_DAY;

        // combo 가 이번 claim 으로 처음 unlocked 면 events 에 기록
        // (코인은 클라이언트가 별도 시스템으로 처리하지 않으므로 events 로만 추적)
        if (comboUnlocked) {
            // 같은 날 combo 이벤트 중복 방지 — 이미 있으면 skip
            const dup = await client.query(
                `SELECT 1 FROM events
                 WHERE player_id = $1
                   AND event_type = 'quest_combo_bonus'
                   AND (created_at AT TIME ZONE 'Asia/Seoul')::date = $2::date
                 LIMIT 1`,
                [playerId, today],
            );
            if (dup.rowCount === 0) {
                await client.query(
                    `INSERT INTO events (player_id, event_type, payload)
                     VALUES ($1, 'quest_combo_bonus', $2)`,
                    [playerId, { coins: COMBO_BONUS_COINS }],
                );
            }
        }

        await client.query('COMMIT');
        res.json({
            ok: true,
            granted_essence: row.reward_essence,
            combo_unlocked: comboUnlocked,
            combo_bonus_coins: comboUnlocked ? COMBO_BONUS_COINS : 0,
        });
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('[Quests POST claim] DB error:', err);
        res.status(500).json({ error: 'db error' });
    } finally {
        client.release();
    }
});

export default router;
