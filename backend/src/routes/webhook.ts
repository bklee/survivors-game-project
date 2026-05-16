import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { lsSignature } from '../middleware/lsSignature.js';

const router = Router();

// LS webhook payload (orders/created event 기준 — Lemon Squeezy 공식 스키마)
const PayloadSchema = z.object({
    meta: z.object({
        event_name: z.string(),
        custom_data: z
            .object({
                device_id: z.string().optional(),
                product_id: z.string().optional(),
            })
            .optional(),
    }),
    data: z.object({
        id: z.string(),
        type: z.string(),
        attributes: z.object({
            status: z.string(),
            total: z.number(),
            currency: z.string(),
            test_mode: z.boolean().optional(),
        }),
    }),
});

router.post('/', lsSignature, async (req, res) => {
    const parsed = PayloadSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { meta, data } = parsed.data;

    // order_created 외 이벤트는 일단 수신만 (200) 하고 무시
    if (meta.event_name !== 'order_created') {
        return res.json({ ok: true, ignored: meta.event_name });
    }

    const deviceId = meta.custom_data?.device_id;
    const productId = meta.custom_data?.product_id || 'unknown';
    if (!deviceId) {
        return res.status(400).json({ error: 'missing device_id in custom_data' });
    }

    try {
        const playerRes = await pool.query(
            `INSERT INTO players (device_id) VALUES ($1)
             ON CONFLICT (device_id) DO UPDATE SET last_seen_at = NOW()
             RETURNING id`,
            [deviceId],
        );
        const playerId = playerRes.rows[0].id;

        // idempotency: ls_order_id UNIQUE → 중복 webhook 시 NO-OP
        await pool.query(
            `INSERT INTO purchases (player_id, product_id, amount_cents, currency, ls_order_id, status, raw_payload)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (ls_order_id) DO NOTHING`,
            [
                playerId,
                productId,
                Math.round(data.attributes.total * 100),
                data.attributes.currency,
                data.id,
                data.attributes.status === 'paid' ? 'completed' : data.attributes.status,
                req.body,
            ],
        );

        // No-Ads Pass 결제 완료 시 player 플래그 갱신
        if (productId === 'no_ads_pass' && data.attributes.status === 'paid') {
            await pool.query(`UPDATE players SET no_ads_pass = TRUE WHERE id = $1`, [playerId]);
        }

        res.json({ ok: true });
    } catch (err) {
        console.error('[Webhook] DB error:', err);
        res.status(500).json({ error: 'db error' });
    }
});

export default router;
