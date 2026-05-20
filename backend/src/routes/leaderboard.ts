import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';

const router = Router();

const CHARACTER_IDS = [
    'knight',
    'wizard',
    'elf',
    'necromancer',
    'druid',
    'engineer',
    'dwarf',
] as const;

const WINDOWS = ['all', 'weekly', 'daily'] as const;

const SubmitSchema = z.object({
    device_id: z.string().min(8).max(64),
    score: z.number().int().min(0).max(1_000_000),
    stage_reached: z.number().int().min(1).max(1000).optional(),
    character_id: z.enum(CHARACTER_IDS),
    duration_seconds: z.number().int().min(0).max(7200).optional(),
});

// 닉네임 NULL 인 player 에 자동 생성 (`Player_${5digit}`). 동시성 race 는 같은 player_id 라
// 마지막 UPDATE 만 살아남으며 무해 (자동 생성된 닉네임이 어떤 5자리든 차이 없음).
function generateNickname(): string {
    const n = Math.floor(10000 + Math.random() * 90000);
    return `Player_${n}`;
}

// POST /api/leaderboard — 점수 제출 (닉네임 자동 부여 포함)
router.post('/', async (req, res) => {
    const parsed = SubmitSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { device_id, score, stage_reached, character_id, duration_seconds } = parsed.data;

    try {
        const playerRes = await pool.query(
            `INSERT INTO players (device_id, nickname)
             VALUES ($1, $2)
             ON CONFLICT (device_id) DO UPDATE SET last_seen_at = NOW()
             RETURNING id, nickname`,
            [device_id, generateNickname()],
        );
        const playerId = playerRes.rows[0].id as number;

        // 기존 player 인데 nickname 이 NULL 인 경우 보충
        if (!playerRes.rows[0].nickname) {
            await pool.query(
                `UPDATE players SET nickname = $1 WHERE id = $2 AND nickname IS NULL`,
                [generateNickname(), playerId],
            );
        }

        await pool.query(
            `INSERT INTO leaderboard (player_id, score, stage_reached, character_id, duration_seconds)
             VALUES ($1, $2, $3, $4, $5)`,
            [playerId, score, stage_reached ?? null, character_id, duration_seconds ?? null],
        );

        res.json({ ok: true });
    } catch (err) {
        console.error('[Leaderboard POST] DB error:', err);
        res.status(500).json({ error: 'db error' });
    }
});

// SQL WHERE 절을 window + character_id 로 동적 구성. 파라미터는 $N 으로 번호 매김.
function buildWhereClause(
    window: (typeof WINDOWS)[number],
    characterId?: string,
): { sql: string; params: unknown[] } {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (window === 'weekly') {
        clauses.push(`l.submitted_at >= NOW() - INTERVAL '7 days'`);
    } else if (window === 'daily') {
        clauses.push(`l.submitted_at >= NOW() - INTERVAL '1 day'`);
    }

    if (characterId) {
        params.push(characterId);
        clauses.push(`l.character_id = $${params.length}`);
    }

    const sql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    return { sql, params };
}

// GET /api/leaderboard?limit=20&window=all&character_id=knight&device_id=abc
router.get('/', async (req, res) => {
    const limitRaw = parseInt(req.query.limit as string, 10);
    const limit = Math.min(Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 20, 100);

    const windowParam = (req.query.window as string) || 'all';
    const window: (typeof WINDOWS)[number] = (WINDOWS as readonly string[]).includes(windowParam)
        ? (windowParam as (typeof WINDOWS)[number])
        : 'all';

    const characterIdRaw = req.query.character_id as string | undefined;
    const characterId = (CHARACTER_IDS as readonly string[]).includes(characterIdRaw ?? '')
        ? characterIdRaw
        : undefined;

    const deviceIdRaw = req.query.device_id as string | undefined;
    const deviceId =
        deviceIdRaw && deviceIdRaw.length >= 8 && deviceIdRaw.length <= 64
            ? deviceIdRaw
            : undefined;

    try {
        const { sql: whereSql, params: whereParams } = buildWhereClause(window, characterId);

        // Top N entries
        const limitParam = whereParams.length + 1;
        const entriesQuery = `
            SELECT l.score, l.stage_reached, l.character_id, l.duration_seconds,
                   l.submitted_at, p.nickname,
                   RANK() OVER (ORDER BY l.score DESC) AS rank
            FROM leaderboard l
            JOIN players p ON p.id = l.player_id
            ${whereSql}
            ORDER BY l.score DESC
            LIMIT $${limitParam}
        `;
        const entriesRes = await pool.query(entriesQuery, [...whereParams, limit]);

        // 본인 순위 — device_id 제공 시
        let me: { rank: number; score: number } | null = null;
        if (deviceId) {
            const deviceParam = whereParams.length + 1;
            const meQuery = `
                WITH ranked AS (
                    SELECT l.player_id, l.score,
                           RANK() OVER (ORDER BY l.score DESC) AS rank
                    FROM leaderboard l
                    ${whereSql}
                )
                SELECT score, rank FROM ranked
                WHERE player_id = (SELECT id FROM players WHERE device_id = $${deviceParam})
                ORDER BY score DESC
                LIMIT 1
            `;
            const meRes = await pool.query(meQuery, [...whereParams, deviceId]);
            if (meRes.rowCount && meRes.rowCount > 0) {
                me = {
                    rank: Number(meRes.rows[0].rank),
                    score: Number(meRes.rows[0].score),
                };
            }
        }

        // 윈도우 내 총 엔트리 (메타데이터)
        const countQuery = `SELECT COUNT(*)::int AS total FROM leaderboard l ${whereSql}`;
        const countRes = await pool.query(countQuery, whereParams);
        const totalEntriesInWindow = countRes.rows[0].total as number;

        res.json({
            entries: entriesRes.rows,
            me,
            window,
            character_id: characterId ?? null,
            total_entries_in_window: totalEntriesInWindow,
        });
    } catch (err) {
        console.error('[Leaderboard GET] DB error:', err);
        res.status(500).json({ error: 'db error' });
    }
});

export default router;
