import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';

const router = Router();

const EVENT_TYPES = [
    'session_start',
    'session_end',
    'card_select',
    'character_select',
    'synergy_discover',
    'ad_view',
    'ad_skip',
    'iap_funnel_view',
    'iap_funnel_click',
    'iap_funnel_complete',
    'pwa_install',
] as const;

const EventSchema = z.object({
    device_id: z.string().min(8).max(64),
    event_type: z.enum(EVENT_TYPES),
    payload: z.record(z.string(), z.unknown()).optional(),
});

const BatchSchema = z.object({
    events: z.array(EventSchema).min(1).max(50),
});

// POST /api/events — 배치 이벤트 (단일 트랜잭션, device_id 당 1회 upsert)
router.post('/', async (req, res) => {
    const parsed = BatchSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { events } = parsed.data;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // device_id 당 player upsert 1회 (배치 내 중복 device_id 캐시)
        const playerIdByDevice = new Map<string, number>();
        for (const evt of events) {
            if (playerIdByDevice.has(evt.device_id)) continue;
            const r = await client.query(
                `INSERT INTO players (device_id) VALUES ($1)
                 ON CONFLICT (device_id) DO UPDATE SET last_seen_at = NOW()
                 RETURNING id`,
                [evt.device_id],
            );
            playerIdByDevice.set(evt.device_id, r.rows[0].id);
        }

        for (const evt of events) {
            const playerId = playerIdByDevice.get(evt.device_id)!;
            await client.query(
                `INSERT INTO events (player_id, event_type, payload)
                 VALUES ($1, $2, $3)`,
                [playerId, evt.event_type, evt.payload ?? {}],
            );
        }

        await client.query('COMMIT');
        res.json({ ok: true, count: events.length });
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('[Events POST] DB error:', err);
        res.status(500).json({ error: 'db error' });
    } finally {
        client.release();
    }
});

export default router;
