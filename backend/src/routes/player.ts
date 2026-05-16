import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

// GET /api/player/:device_id — 보유 IAP/메타 조회
router.get('/:device_id', async (req, res) => {
    const { device_id } = req.params;
    if (!device_id || device_id.length < 8 || device_id.length > 64) {
        return res.status(400).json({ error: 'invalid device_id' });
    }

    try {
        const result = await pool.query(
            `SELECT id, no_ads_pass, total_essence, created_at, last_seen_at
             FROM players WHERE device_id = $1`,
            [device_id],
        );

        if (result.rowCount === 0) {
            return res.json({ exists: false, no_ads_pass: false });
        }

        const player = result.rows[0];
        res.json({
            exists: true,
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

export default router;
