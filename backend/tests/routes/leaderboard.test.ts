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

const validSubmit = {
    device_id: 'device-12345678',
    score: 12345,
    stage_reached: 7,
    character_id: 'knight',
    duration_seconds: 600,
};

describe('POST /api/leaderboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('유효한 페이로드는 200 + ok', async () => {
        (pool.query as any)
            .mockResolvedValueOnce({ rows: [{ id: 42 }], rowCount: 1 }) // player upsert
            .mockResolvedValueOnce({ rowCount: 1 }); // leaderboard insert

        const res = await request(app).post('/api/leaderboard').send(validSubmit);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
        expect((pool.query as any).mock.calls).toHaveLength(2);

        // player upsert 호출 인자 검증
        expect((pool.query as any).mock.calls[0][1]).toEqual(['device-12345678']);
        // leaderboard insert: [playerId, score, stage_reached, character_id, duration_seconds]
        expect((pool.query as any).mock.calls[1][1]).toEqual([42, 12345, 7, 'knight', 600]);
    });

    it('optional 필드 미포함도 200', async () => {
        (pool.query as any)
            .mockResolvedValueOnce({ rows: [{ id: 7 }], rowCount: 1 })
            .mockResolvedValueOnce({ rowCount: 1 });

        const res = await request(app).post('/api/leaderboard').send({
            device_id: 'device-abcdefgh',
            score: 100,
            character_id: 'wizard',
        });

        expect(res.status).toBe(200);
        expect((pool.query as any).mock.calls[1][1]).toEqual([7, 100, null, 'wizard', null]);
    });

    it('score 음수면 400', async () => {
        const res = await request(app)
            .post('/api/leaderboard')
            .send({ ...validSubmit, score: -1 });
        expect(res.status).toBe(400);
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('알 수 없는 character_id는 400', async () => {
        const res = await request(app)
            .post('/api/leaderboard')
            .send({ ...validSubmit, character_id: 'ghost' });
        expect(res.status).toBe(400);
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('device_id 너무 짧으면 400', async () => {
        const res = await request(app)
            .post('/api/leaderboard')
            .send({ ...validSubmit, device_id: 'abc' });
        expect(res.status).toBe(400);
    });

    it('DB 에러 시 500', async () => {
        (pool.query as any).mockRejectedValueOnce(new Error('connection refused'));
        const res = await request(app).post('/api/leaderboard').send(validSubmit);
        expect(res.status).toBe(500);
        expect(res.body.error).toBe('db error');
    });
});

describe('GET /api/leaderboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const sampleRows = [
        {
            score: 99999,
            stage_reached: 20,
            character_id: 'wizard',
            duration_seconds: 1200,
            submitted_at: '2026-05-16T10:00:00Z',
            nickname: 'Alice',
        },
        {
            score: 50000,
            stage_reached: 12,
            character_id: 'knight',
            duration_seconds: 800,
            submitted_at: '2026-05-15T10:00:00Z',
            nickname: null,
        },
    ];

    it('기본 limit=20', async () => {
        (pool.query as any).mockResolvedValueOnce({
            rows: sampleRows,
            rowCount: sampleRows.length,
        });
        const res = await request(app).get('/api/leaderboard');
        expect(res.status).toBe(200);
        expect(res.body.entries).toHaveLength(2);
        expect((pool.query as any).mock.calls[0][1]).toEqual([20]);
    });

    it('?limit=5 적용', async () => {
        (pool.query as any).mockResolvedValueOnce({ rows: sampleRows.slice(0, 1), rowCount: 1 });
        const res = await request(app).get('/api/leaderboard?limit=5');
        expect(res.status).toBe(200);
        expect((pool.query as any).mock.calls[0][1]).toEqual([5]);
    });

    it('limit 상한은 100', async () => {
        (pool.query as any).mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const res = await request(app).get('/api/leaderboard?limit=9999');
        expect(res.status).toBe(200);
        expect((pool.query as any).mock.calls[0][1]).toEqual([100]);
    });

    it('limit 음수/NaN은 기본 20', async () => {
        (pool.query as any).mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const res = await request(app).get('/api/leaderboard?limit=-3');
        expect(res.status).toBe(200);
        expect((pool.query as any).mock.calls[0][1]).toEqual([20]);
    });

    it('DB 에러 시 500', async () => {
        (pool.query as any).mockRejectedValueOnce(new Error('boom'));
        const res = await request(app).get('/api/leaderboard');
        expect(res.status).toBe(500);
    });
});
