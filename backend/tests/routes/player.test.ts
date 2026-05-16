import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../src/db/pool.js', () => ({
    pool: {
        query: vi.fn(),
        on: vi.fn(),
    },
}));

import app from '../../src/server.js';
import { pool } from '../../src/db/pool.js';

describe('GET /api/player/:device_id', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('존재하는 플레이어는 exists:true + 필드 반환', async () => {
        (pool.query as any).mockResolvedValueOnce({
            rows: [
                {
                    id: 7,
                    no_ads_pass: true,
                    total_essence: 1234,
                    created_at: '2026-05-01T00:00:00Z',
                    last_seen_at: '2026-05-16T10:00:00Z',
                },
            ],
            rowCount: 1,
        });

        const res = await request(app).get('/api/player/device-12345678');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            exists: true,
            no_ads_pass: true,
            total_essence: 1234,
            created_at: '2026-05-01T00:00:00Z',
            last_seen_at: '2026-05-16T10:00:00Z',
        });
        expect((pool.query as any).mock.calls[0][1]).toEqual(['device-12345678']);
    });

    it('미존재 플레이어는 exists:false + no_ads_pass:false', async () => {
        (pool.query as any).mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const res = await request(app).get('/api/player/device-unknown-xyz');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ exists: false, no_ads_pass: false });
    });

    it('device_id 너무 짧으면 400', async () => {
        const res = await request(app).get('/api/player/short');
        expect(res.status).toBe(400);
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('device_id 너무 길면 400', async () => {
        const longId = 'a'.repeat(65);
        const res = await request(app).get(`/api/player/${longId}`);
        expect(res.status).toBe(400);
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('DB 에러 시 500', async () => {
        (pool.query as any).mockRejectedValueOnce(new Error('boom'));
        const res = await request(app).get('/api/player/device-12345678');
        expect(res.status).toBe(500);
    });
});
