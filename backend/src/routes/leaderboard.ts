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

const SubmitSchema = z.object({
    device_id: z.string().min(8).max(64),
    score: z.number().int().min(0).max(1_000_000),
    stage_reached: z.number().int().min(1).max(1000).optional(),
    character_id: z.enum(CHARACTER_IDS),
    duration_seconds: z.number().int().min(0).max(7200).optional(),
});

// POST /api/leaderboard — 점수 제출
router.post('/', async (req, res) => {
    const parsed = SubmitSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { device_id, score, stage_reached, character_id, duration_seconds } = parsed.data;

    try {
        const playerRes = await pool.query(
            `INSERT INTO players (device_id) VALUES ($1)
             ON CONFLICT (device_id) DO UPDATE SET last_seen_at = NOW()
             RETURNING id`,
            [device_id],
        );
        const playerId = playerRes.rows[0].id;

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

// GET /api/leaderboard?limit=20 — Top N
router.get('/', async (req, res) => {
    const limitRaw = parseInt(req.query.limit as string, 10);
    const limit = Math.min(Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 20, 100);

    try {
        const result = await pool.query(
            `SELECT l.score, l.stage_reached, l.character_id, l.duration_seconds, l.submitted_at, p.nickname
             FROM leaderboard l
             JOIN players p ON p.id = l.player_id
             ORDER BY l.score DESC
             LIMIT $1`,
            [limit],
        );
        res.json({ entries: result.rows });
    } catch (err) {
        console.error('[Leaderboard GET] DB error:', err);
        res.status(500).json({ error: 'db error' });
    }
});

export default router;
