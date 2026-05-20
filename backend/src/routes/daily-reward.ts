import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';

const router = Router();

// Day 1~7 보상 테이블. Day 7 = 100 essence + 1000 coins 보너스.
export const REWARD_TABLE: ReadonlyArray<{ essence: number; coins: number }> = [
    { essence: 10, coins: 0 },
    { essence: 15, coins: 0 },
    { essence: 25, coins: 0 },
    { essence: 30, coins: 0 },
    { essence: 40, coins: 0 },
    { essence: 50, coins: 0 },
    { essence: 100, coins: 1000 },
];

const DeviceParamSchema = z.string().min(8).max(64);
const ClaimBodySchema = z.object({ device_id: DeviceParamSchema });

interface LastClaimRow {
    streak_day: number;
    streak_count: number;
    claim_date: string;
}

// KST 기준 오늘 날짜 (YYYY-MM-DD) 와 마지막 claim 의 KST 날짜를 비교하여 다음 streak 결정.
// 1일 (어제) = streak 유지, 2일+ = reset, 같은 날 = already claimed.
type NextStreak =
    | { kind: 'already_claimed' }
    | { kind: 'fresh'; nextDay: number; nextCount: number };

function computeNextStreak(last: LastClaimRow | null, todayKst: string): NextStreak {
    if (!last) return { kind: 'fresh', nextDay: 1, nextCount: 1 };

    if (last.claim_date === todayKst) return { kind: 'already_claimed' };

    // claim_date 와 todayKst 사이 일수 차이
    const lastDate = new Date(last.claim_date + 'T00:00:00Z');
    const todayDate = new Date(todayKst + 'T00:00:00Z');
    const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / 86400000);

    if (diffDays === 1) {
        // streak 유지 — 다음 day, count+1
        const nextDay = (last.streak_day % 7) + 1;
        return { kind: 'fresh', nextDay, nextCount: last.streak_count + 1 };
    }

    // 2일 이상 gap → reset
    return { kind: 'fresh', nextDay: 1, nextCount: 1 };
}

// KST(Asia/Seoul) 기준 오늘 날짜 문자열을 DB 에서 받음 (서버 OS 시간대와 무관).
async function getTodayKst(): Promise<string> {
    const r = await pool.query(`SELECT (NOW() AT TIME ZONE 'Asia/Seoul')::date::text AS today`);
    return r.rows[0].today as string;
}

// KST 다음 자정의 UTC ISO 문자열 (next_claim_available_at 표시용)
async function getNextKstMidnightIso(): Promise<string> {
    const r = await pool.query(
        `SELECT ((((NOW() AT TIME ZONE 'Asia/Seoul')::date + INTERVAL '1 day')
                  AT TIME ZONE 'Asia/Seoul')::timestamptz) AS next_midnight`,
    );
    return new Date(r.rows[0].next_midnight).toISOString();
}

// 플레이어의 마지막 claim 조회 (없으면 null)
async function getLastClaim(deviceId: string): Promise<LastClaimRow | null> {
    const r = await pool.query(
        `SELECT dr.streak_day, dr.streak_count, dr.claim_date::text AS claim_date
         FROM daily_rewards dr
         JOIN players p ON p.id = dr.player_id
         WHERE p.device_id = $1
         ORDER BY dr.claimed_at DESC
         LIMIT 1`,
        [deviceId],
    );
    return r.rowCount && r.rowCount > 0 ? (r.rows[0] as LastClaimRow) : null;
}

// GET /api/daily-reward/:device_id — 청구 가능 여부 + 미리보기
router.get('/:device_id', async (req, res) => {
    const parsed = DeviceParamSchema.safeParse(req.params.device_id);
    if (!parsed.success) {
        return res.status(400).json({ error: 'invalid device_id' });
    }
    const deviceId = parsed.data;

    try {
        const todayKst = await getTodayKst();
        const last = await getLastClaim(deviceId);
        const next = computeNextStreak(last, todayKst);
        const nextMidnight = await getNextKstMidnightIso();

        if (next.kind === 'already_claimed') {
            return res.json({
                can_claim: false,
                next_day: (last!.streak_day % 7) + 1,
                streak_count: last!.streak_count,
                preview_reward: REWARD_TABLE[last!.streak_day % 7],
                last_claimed_at: null,
                next_claim_available_at: nextMidnight,
            });
        }

        return res.json({
            can_claim: true,
            next_day: next.nextDay,
            streak_count: next.nextCount,
            preview_reward: REWARD_TABLE[next.nextDay - 1],
            last_claimed_at: last?.claim_date ?? null,
            next_claim_available_at: nextMidnight,
        });
    } catch (err) {
        console.error('[DailyReward GET] DB error:', err);
        res.status(500).json({ error: 'db error' });
    }
});

// POST /api/daily-reward/claim — 청구 (트랜잭션)
router.post('/claim', async (req, res) => {
    const parsed = ClaimBodySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { device_id } = parsed.data;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // player upsert (events 라우터와 동일 패턴)
        const playerR = await client.query(
            `INSERT INTO players (device_id) VALUES ($1)
             ON CONFLICT (device_id) DO UPDATE SET last_seen_at = NOW()
             RETURNING id`,
            [device_id],
        );
        const playerId = playerR.rows[0].id as number;

        // 트랜잭션 내에서 todayKst 1회 계산 + 마지막 claim 조회 (FOR UPDATE 로 race 방지)
        const todayR = await client.query(
            `SELECT (NOW() AT TIME ZONE 'Asia/Seoul')::date::text AS today`,
        );
        const todayKst = todayR.rows[0].today as string;

        const lastR = await client.query(
            `SELECT streak_day, streak_count, claim_date::text AS claim_date
             FROM daily_rewards
             WHERE player_id = $1
             ORDER BY claimed_at DESC
             LIMIT 1
             FOR UPDATE`,
            [playerId],
        );
        const last: LastClaimRow | null =
            lastR.rowCount && lastR.rowCount > 0 ? (lastR.rows[0] as LastClaimRow) : null;
        const next = computeNextStreak(last, todayKst);

        if (next.kind === 'already_claimed') {
            await client.query('ROLLBACK');
            const nextMidnight = await getNextKstMidnightIso();
            return res.json({
                ok: false,
                error: 'already_claimed',
                next_claim_available_at: nextMidnight,
            });
        }

        const reward = REWARD_TABLE[next.nextDay - 1];

        // INSERT ON CONFLICT DO NOTHING — 동시 청구 race 시 0 rows 반환
        const insertR = await client.query(
            `INSERT INTO daily_rewards
               (player_id, streak_day, streak_count, essence_granted, coins_granted)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (player_id, claim_date) DO NOTHING
             RETURNING id`,
            [playerId, next.nextDay, next.nextCount, reward.essence, reward.coins],
        );

        if (insertR.rowCount === 0) {
            await client.query('ROLLBACK');
            const nextMidnight = await getNextKstMidnightIso();
            return res.json({
                ok: false,
                error: 'already_claimed',
                next_claim_available_at: nextMidnight,
            });
        }

        const updateR = await client.query(
            `UPDATE players SET total_essence = total_essence + $1
             WHERE id = $2
             RETURNING total_essence`,
            [reward.essence, playerId],
        );
        const totalEssence = updateR.rows[0].total_essence as number;

        await client.query(
            `INSERT INTO events (player_id, event_type, payload)
             VALUES ($1, 'daily_reward_claim', $2)`,
            [
                playerId,
                {
                    streak_day: next.nextDay,
                    streak_count: next.nextCount,
                    essence: reward.essence,
                    coins: reward.coins,
                },
            ],
        );

        await client.query('COMMIT');
        res.json({
            ok: true,
            granted: { essence: reward.essence, coins: reward.coins },
            streak_day: next.nextDay,
            streak_count: next.nextCount,
            total_essence: totalEssence,
        });
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('[DailyReward POST] DB error:', err);
        res.status(500).json({ error: 'db error' });
    } finally {
        client.release();
    }
});

export default router;
