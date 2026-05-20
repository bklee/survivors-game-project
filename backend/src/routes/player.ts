import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';

const router = Router();

// 닉네임 규칙: 2~16자, 영숫자/한글/_/공백 허용. 부적절한 단어 필터는 Phase 4 후보.
const NICKNAME_REGEX = /^[가-힣A-Za-z0-9_ ]{2,16}$/;

const NicknameSchema = z.object({
    device_id: z.string().min(8).max(64),
    nickname: z.string().min(2).max(16).regex(NICKNAME_REGEX),
});

// GET /api/player/:device_id — 보유 IAP/메타 조회
router.get('/:device_id', async (req, res) => {
    const { device_id } = req.params;
    if (!device_id || device_id.length < 8 || device_id.length > 64) {
        return res.status(400).json({ error: 'invalid device_id' });
    }

    try {
        const result = await pool.query(
            `SELECT id, nickname, no_ads_pass, total_essence, created_at, last_seen_at
             FROM players WHERE device_id = $1`,
            [device_id],
        );

        if (result.rowCount === 0) {
            return res.json({ exists: false, no_ads_pass: false });
        }

        const player = result.rows[0];
        res.json({
            exists: true,
            nickname: player.nickname ?? null,
            no_ads_pass: !!player.no_ads_pass,
            total_essence: player.total_essence,
            created_at: player.created_at,
            last_seen_at: player.last_seen_at,
        });
    } catch (err) {
        console.error('[Player GET] DB error:', err);
        res.status(500).json({ error: 'db error' });
    }
});

// POST /api/player/nickname — 닉네임 변경 (자동 생성된 닉네임을 사용자가 수정)
router.post('/nickname', async (req, res) => {
    const parsed = NicknameSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { device_id, nickname } = parsed.data;

    try {
        // player 가 없으면 생성하면서 닉네임 부여
        const result = await pool.query(
            `INSERT INTO players (device_id, nickname) VALUES ($1, $2)
             ON CONFLICT (device_id) DO UPDATE
             SET nickname = EXCLUDED.nickname, last_seen_at = NOW()
             RETURNING nickname`,
            [device_id, nickname],
        );
        res.json({ ok: true, nickname: result.rows[0].nickname });
    } catch (err) {
        console.error('[Player POST nickname] DB error:', err);
        res.status(500).json({ error: 'db error' });
    }
});

export default router;
