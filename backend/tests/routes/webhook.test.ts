import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';

vi.mock('../../src/db/pool.js', () => ({
    pool: {
        query: vi.fn(),
        on: vi.fn(),
        connect: vi.fn(),
    },
}));

import app from '../../src/server.js';
import { pool } from '../../src/db/pool.js';

const TEST_SECRET = 'test-webhook-secret';

function sign(body: string): string {
    return crypto.createHmac('sha256', TEST_SECRET).update(body).digest('hex');
}

const orderCreatedPayload = {
    meta: {
        event_name: 'order_created',
        custom_data: { device_id: 'device-12345678', product_id: 'no_ads_pass' },
    },
    data: {
        id: 'ord_abc123',
        type: 'orders',
        attributes: {
            status: 'paid',
            total: 5500,
            currency: 'KRW',
            test_mode: true,
        },
    },
};

describe('POST /api/ls-webhook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.LS_WEBHOOK_SECRET = TEST_SECRET;
    });

    afterEach(() => {
        delete process.env.LS_WEBHOOK_SECRET;
    });

    it('유효 서명 + order_created + no_ads_pass → 200 + purchases insert + player flag', async () => {
        (pool.query as any)
            .mockResolvedValueOnce({ rows: [{ id: 7 }], rowCount: 1 }) // player upsert
            .mockResolvedValueOnce({ rowCount: 1 }) // purchases insert
            .mockResolvedValueOnce({ rowCount: 1 }); // players no_ads_pass update

        const body = JSON.stringify(orderCreatedPayload);
        const res = await request(app)
            .post('/api/ls-webhook')
            .set('Content-Type', 'application/json')
            .set('X-Signature', sign(body))
            .send(body);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
        expect(pool.query).toHaveBeenCalledTimes(3);

        // purchases insert: amount = 5500 * 100 = 550000, status = 'completed'
        const purchaseArgs = (pool.query as any).mock.calls[1][1];
        expect(purchaseArgs[0]).toBe(7); // player_id
        expect(purchaseArgs[1]).toBe('no_ads_pass'); // product_id
        expect(purchaseArgs[2]).toBe(550000); // amount_cents
        expect(purchaseArgs[3]).toBe('KRW');
        expect(purchaseArgs[4]).toBe('ord_abc123');
        expect(purchaseArgs[5]).toBe('completed');

        // player no_ads_pass = TRUE
        const updateArgs = (pool.query as any).mock.calls[2][1];
        expect(updateArgs).toEqual([7]);
    });

    it('서명 헤더 없으면 401', async () => {
        const res = await request(app)
            .post('/api/ls-webhook')
            .set('Content-Type', 'application/json')
            .send(orderCreatedPayload);
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('missing signature');
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('잘못된 서명은 401', async () => {
        const res = await request(app)
            .post('/api/ls-webhook')
            .set('Content-Type', 'application/json')
            .set('X-Signature', 'a'.repeat(64))
            .send(orderCreatedPayload);
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('invalid signature');
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('서명 길이가 다르면 401 (timing-safe 비교 안전)', async () => {
        const res = await request(app)
            .post('/api/ls-webhook')
            .set('Content-Type', 'application/json')
            .set('X-Signature', 'short')
            .send(orderCreatedPayload);
        expect(res.status).toBe(401);
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('LS_WEBHOOK_SECRET 미설정 시 503', async () => {
        delete process.env.LS_WEBHOOK_SECRET;
        const body = JSON.stringify(orderCreatedPayload);
        const res = await request(app)
            .post('/api/ls-webhook')
            .set('Content-Type', 'application/json')
            .set('X-Signature', 'anything')
            .send(body);
        expect(res.status).toBe(503);
    });

    it('order_created 외 이벤트는 ignored 200', async () => {
        const otherPayload = {
            ...orderCreatedPayload,
            meta: { ...orderCreatedPayload.meta, event_name: 'subscription_created' },
        };
        const body = JSON.stringify(otherPayload);
        const res = await request(app)
            .post('/api/ls-webhook')
            .set('Content-Type', 'application/json')
            .set('X-Signature', sign(body))
            .send(body);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true, ignored: 'subscription_created' });
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('custom_data.device_id 누락 시 400', async () => {
        const noDevicePayload = {
            ...orderCreatedPayload,
            meta: { event_name: 'order_created', custom_data: { product_id: 'no_ads_pass' } },
        };
        const body = JSON.stringify(noDevicePayload);
        const res = await request(app)
            .post('/api/ls-webhook')
            .set('Content-Type', 'application/json')
            .set('X-Signature', sign(body))
            .send(body);
        expect(res.status).toBe(400);
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('스키마 위반(필수 필드 누락) 시 400', async () => {
        const badPayload = { meta: { event_name: 'order_created' } }; // data 없음
        const body = JSON.stringify(badPayload);
        const res = await request(app)
            .post('/api/ls-webhook')
            .set('Content-Type', 'application/json')
            .set('X-Signature', sign(body))
            .send(body);
        expect(res.status).toBe(400);
    });

    it('non-paid 상태에서는 no_ads_pass 플래그 갱신 안 함', async () => {
        const pendingPayload = {
            ...orderCreatedPayload,
            data: {
                ...orderCreatedPayload.data,
                attributes: { ...orderCreatedPayload.data.attributes, status: 'pending' },
            },
        };
        (pool.query as any)
            .mockResolvedValueOnce({ rows: [{ id: 7 }], rowCount: 1 })
            .mockResolvedValueOnce({ rowCount: 1 });

        const body = JSON.stringify(pendingPayload);
        const res = await request(app)
            .post('/api/ls-webhook')
            .set('Content-Type', 'application/json')
            .set('X-Signature', sign(body))
            .send(body);

        expect(res.status).toBe(200);
        // player upsert + purchases insert 만 (UPDATE 호출 없음)
        expect(pool.query).toHaveBeenCalledTimes(2);
        // status = 'pending' 그대로 저장
        expect((pool.query as any).mock.calls[1][1][5]).toBe('pending');
    });

    it('product_id 누락 시 unknown 으로 저장 + no_ads_pass 갱신 안 함', async () => {
        const noProductPayload = {
            ...orderCreatedPayload,
            meta: { event_name: 'order_created', custom_data: { device_id: 'device-12345678' } },
        };
        (pool.query as any)
            .mockResolvedValueOnce({ rows: [{ id: 7 }], rowCount: 1 })
            .mockResolvedValueOnce({ rowCount: 1 });

        const body = JSON.stringify(noProductPayload);
        const res = await request(app)
            .post('/api/ls-webhook')
            .set('Content-Type', 'application/json')
            .set('X-Signature', sign(body))
            .send(body);

        expect(res.status).toBe(200);
        expect(pool.query).toHaveBeenCalledTimes(2);
        expect((pool.query as any).mock.calls[1][1][1]).toBe('unknown');
    });

    it('DB 에러 시 500', async () => {
        (pool.query as any).mockRejectedValueOnce(new Error('boom'));
        const body = JSON.stringify(orderCreatedPayload);
        const res = await request(app)
            .post('/api/ls-webhook')
            .set('Content-Type', 'application/json')
            .set('X-Signature', sign(body))
            .send(body);
        expect(res.status).toBe(500);
    });
});
