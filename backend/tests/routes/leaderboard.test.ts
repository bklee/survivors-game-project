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

    it('신규 player 제출 → 닉네임 자동 부여 + insert', async () => {
        (pool.query as any)
            // INSERT player ON CONFLICT — nickname 자동 생성
            .mockResolvedValueOnce({
                rows: [{ id: 42, nickname: 'Player_12345' }],
                rowCount: 1,
            })
            // leaderboard insert
            .mockResolvedValueOnce({ rowCount: 1 });

        const res = await request(app).post('/api/leaderboard').send(validSubmit);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
        expect((pool.query as any).mock.calls).toHaveLength(2);
        // device_id + 자동 닉네임 2개 인자
        expect((pool.query as any).mock.calls[0][1][0]).toBe('device-12345678');
        expect((pool.query as any).mock.calls[0][1][1]).toMatch(/^Player_\d{5}$/);
        // leaderboard insert
        expect((pool.query as any).mock.calls[1][1]).toEqual([42, 12345, 7, 'knight', 600]);
    });

    it('기존 player nickname NULL 이면 UPDATE 로 보충', async () => {
        (pool.query as any)
            // INSERT player ON CONFLICT — 기존 player, nickname 컬럼 NULL
            .mockResolvedValueOnce({ rows: [{ id: 7, nickname: null }], rowCount: 1 })
            // UPDATE nickname
            .mockResolvedValueOnce({ rowCount: 1 })
            // leaderboard insert
            .mockResolvedValueOnce({ rowCount: 1 });

        const res = await request(app).post('/api/leaderboard').send({
            device_id: 'device-abcdefgh',
            score: 100,
            character_id: 'wizard',
        });

        expect(res.status).toBe(200);
        expect((pool.query as any).mock.calls).toHaveLength(3);
        // UPDATE 인자
        expect((pool.query as any).mock.calls[1][1][0]).toMatch(/^Player_\d{5}$/);
        expect((pool.query as any).mock.calls[1][1][1]).toBe(7);
        // leaderboard insert (optional 필드 null)
        expect((pool.query as any).mock.calls[2][1]).toEqual([7, 100, null, 'wizard', null]);
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
            rank: '1',
        },
        {
            score: 50000,
            stage_reached: 12,
            character_id: 'knight',
            duration_seconds: 800,
            submitted_at: '2026-05-15T10:00:00Z',
            nickname: 'Player_99999',
            rank: '2',
        },
    ];

    it('기본 window=all, limit=20, me=null', async () => {
        (pool.query as any)
            .mockResolvedValueOnce({ rows: sampleRows, rowCount: sampleRows.length }) // entries
            .mockResolvedValueOnce({ rows: [{ total: 2 }], rowCount: 1 }); // count
        const res = await request(app).get('/api/leaderboard');

        expect(res.status).toBe(200);
        expect(res.body.entries).toHaveLength(2);
        expect(res.body.me).toBeNull();
        expect(res.body.window).toBe('all');
        expect(res.body.total_entries_in_window).toBe(2);
        // entries 쿼리에 INTERVAL 미포함 (window=all)
        expect((pool.query as any).mock.calls[0][0]).not.toContain('INTERVAL');
    });

    it('window=weekly → INTERVAL 7 days 필터', async () => {
        (pool.query as any)
            .mockResolvedValueOnce({ rows: sampleRows, rowCount: 2 })
            .mockResolvedValueOnce({ rows: [{ total: 2 }], rowCount: 1 });
        const res = await request(app).get('/api/leaderboard?window=weekly');

        expect(res.status).toBe(200);
        expect(res.body.window).toBe('weekly');
        expect((pool.query as any).mock.calls[0][0]).toContain(`INTERVAL '7 days'`);
    });

    it('window 잘못 주면 all 로 fallback', async () => {
        (pool.query as any)
            .mockResolvedValueOnce({ rows: [], rowCount: 0 })
            .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });
        const res = await request(app).get('/api/leaderboard?window=garbage');

        expect(res.status).toBe(200);
        expect(res.body.window).toBe('all');
    });

    it('character_id=knight 필터 적용', async () => {
        (pool.query as any)
            .mockResolvedValueOnce({ rows: [sampleRows[1]], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 });
        const res = await request(app).get('/api/leaderboard?character_id=knight');

        expect(res.status).toBe(200);
        expect(res.body.character_id).toBe('knight');
        expect((pool.query as any).mock.calls[0][0]).toContain('l.character_id =');
        expect((pool.query as any).mock.calls[0][1][0]).toBe('knight');
    });

    it('device_id 제공 시 me.rank 포함', async () => {
        (pool.query as any)
            .mockResolvedValueOnce({ rows: sampleRows, rowCount: 2 }) // entries
            .mockResolvedValueOnce({ rows: [{ score: 50000, rank: '2' }], rowCount: 1 }) // me
            .mockResolvedValueOnce({ rows: [{ total: 2 }], rowCount: 1 }); // count

        const res = await request(app).get('/api/leaderboard?device_id=device-12345678');

        expect(res.status).toBe(200);
        expect(res.body.me).toEqual({ rank: 2, score: 50000 });
    });

    it('device_id 있어도 점수 없으면 me=null', async () => {
        (pool.query as any)
            .mockResolvedValueOnce({ rows: [], rowCount: 0 })
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // me 쿼리 — 0 rows
            .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });

        const res = await request(app).get('/api/leaderboard?device_id=device-99999999');
        expect(res.body.me).toBeNull();
    });

    it('limit 상한 100', async () => {
        (pool.query as any)
            .mockResolvedValueOnce({ rows: [], rowCount: 0 })
            .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 });
        await request(app).get('/api/leaderboard?limit=9999');

        const entriesCall = (pool.query as any).mock.calls[0];
        const lastParam = entriesCall[1][entriesCall[1].length - 1];
        expect(lastParam).toBe(100);
    });

    it('DB 에러 시 500', async () => {
        (pool.query as any).mockRejectedValueOnce(new Error('boom'));
        const res = await request(app).get('/api/leaderboard');
        expect(res.status).toBe(500);
    });
});
