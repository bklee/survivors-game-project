import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
    poolQuery: vi.fn(),
    clientQuery: vi.fn(),
    clientRelease: vi.fn(),
}));

vi.mock('../../src/db/pool.js', () => ({
    pool: {
        query: mocks.poolQuery,
        on: vi.fn(),
        connect: vi.fn(() =>
            Promise.resolve({
                query: mocks.clientQuery,
                release: mocks.clientRelease,
            }),
        ),
    },
}));

const { poolQuery, clientQuery, clientRelease } = mocks;

import app from '../../src/server.js';

const DEVICE_ID = 'device-12345678';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('GET /api/daily-reward/:device_id', () => {
    it('처음 청구하는 플레이어 → can_claim:true + Day 1 미리보기', async () => {
        poolQuery
            .mockResolvedValueOnce({ rows: [{ today: '2026-05-21' }], rowCount: 1 }) // today
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // last claim 없음
            .mockResolvedValueOnce({
                rows: [{ next_midnight: '2026-05-22T15:00:00.000Z' }],
                rowCount: 1,
            }); // next midnight

        const res = await request(app).get(`/api/daily-reward/${DEVICE_ID}`);

        expect(res.status).toBe(200);
        expect(res.body.can_claim).toBe(true);
        expect(res.body.next_day).toBe(1);
        expect(res.body.streak_count).toBe(1);
        expect(res.body.preview_reward).toEqual({ essence: 10, coins: 0 });
    });

    it('어제 청구한 플레이어 → can_claim:true + 다음 day', async () => {
        poolQuery
            .mockResolvedValueOnce({ rows: [{ today: '2026-05-21' }], rowCount: 1 })
            .mockResolvedValueOnce({
                rows: [{ streak_day: 2, streak_count: 2, claim_date: '2026-05-20' }],
                rowCount: 1,
            })
            .mockResolvedValueOnce({
                rows: [{ next_midnight: '2026-05-22T15:00:00.000Z' }],
                rowCount: 1,
            });

        const res = await request(app).get(`/api/daily-reward/${DEVICE_ID}`);

        expect(res.status).toBe(200);
        expect(res.body.can_claim).toBe(true);
        expect(res.body.next_day).toBe(3);
        expect(res.body.streak_count).toBe(3);
        expect(res.body.preview_reward).toEqual({ essence: 25, coins: 0 });
    });

    it('오늘 이미 청구한 플레이어 → can_claim:false', async () => {
        poolQuery
            .mockResolvedValueOnce({ rows: [{ today: '2026-05-21' }], rowCount: 1 })
            .mockResolvedValueOnce({
                rows: [{ streak_day: 3, streak_count: 3, claim_date: '2026-05-21' }],
                rowCount: 1,
            })
            .mockResolvedValueOnce({
                rows: [{ next_midnight: '2026-05-22T15:00:00.000Z' }],
                rowCount: 1,
            });

        const res = await request(app).get(`/api/daily-reward/${DEVICE_ID}`);

        expect(res.status).toBe(200);
        expect(res.body.can_claim).toBe(false);
        expect(res.body.next_claim_available_at).toBe('2026-05-22T15:00:00.000Z');
    });

    it('3일 gap → streak reset (Day 1 부터)', async () => {
        poolQuery
            .mockResolvedValueOnce({ rows: [{ today: '2026-05-21' }], rowCount: 1 })
            .mockResolvedValueOnce({
                rows: [{ streak_day: 4, streak_count: 12, claim_date: '2026-05-18' }],
                rowCount: 1,
            })
            .mockResolvedValueOnce({
                rows: [{ next_midnight: '2026-05-22T15:00:00.000Z' }],
                rowCount: 1,
            });

        const res = await request(app).get(`/api/daily-reward/${DEVICE_ID}`);

        expect(res.body.can_claim).toBe(true);
        expect(res.body.next_day).toBe(1);
        expect(res.body.streak_count).toBe(1);
    });

    it('Day 7 다음은 Day 1 (cycle)', async () => {
        poolQuery
            .mockResolvedValueOnce({ rows: [{ today: '2026-05-21' }], rowCount: 1 })
            .mockResolvedValueOnce({
                rows: [{ streak_day: 7, streak_count: 7, claim_date: '2026-05-20' }],
                rowCount: 1,
            })
            .mockResolvedValueOnce({
                rows: [{ next_midnight: '2026-05-22T15:00:00.000Z' }],
                rowCount: 1,
            });

        const res = await request(app).get(`/api/daily-reward/${DEVICE_ID}`);

        expect(res.body.can_claim).toBe(true);
        expect(res.body.next_day).toBe(1);
        expect(res.body.streak_count).toBe(8);
        expect(res.body.preview_reward).toEqual({ essence: 10, coins: 0 });
    });

    it('짧은 device_id 는 400', async () => {
        const res = await request(app).get('/api/daily-reward/short');
        expect(res.status).toBe(400);
        expect(poolQuery).not.toHaveBeenCalled();
    });
});

describe('POST /api/daily-reward/claim', () => {
    it('신규 청구 성공 → INSERT + UPDATE + events insert + COMMIT', async () => {
        clientQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 42 }], rowCount: 1 }) // player upsert
            .mockResolvedValueOnce({ rows: [{ today: '2026-05-21' }], rowCount: 1 }) // today
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // last claim 없음
            .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // INSERT daily_rewards
            .mockResolvedValueOnce({ rows: [{ total_essence: 10 }], rowCount: 1 }) // UPDATE players
            .mockResolvedValueOnce({ rowCount: 1 }) // INSERT events
            .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app)
            .post('/api/daily-reward/claim')
            .send({ device_id: DEVICE_ID });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            ok: true,
            granted: { essence: 10, coins: 0 },
            streak_day: 1,
            streak_count: 1,
            total_essence: 10,
        });
        expect(clientQuery.mock.calls[0][0]).toBe('BEGIN');
        expect(clientQuery.mock.calls.at(-1)?.[0]).toBe('COMMIT');
        expect(clientRelease).toHaveBeenCalledTimes(1);
    });

    it('Day 7 청구 → 100 essence + 1000 coins', async () => {
        clientQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 42 }], rowCount: 1 }) // player
            .mockResolvedValueOnce({ rows: [{ today: '2026-05-21' }], rowCount: 1 })
            .mockResolvedValueOnce({
                rows: [{ streak_day: 6, streak_count: 6, claim_date: '2026-05-20' }],
                rowCount: 1,
            })
            .mockResolvedValueOnce({ rows: [{ id: 99 }], rowCount: 1 }) // INSERT
            .mockResolvedValueOnce({ rows: [{ total_essence: 270 }], rowCount: 1 })
            .mockResolvedValueOnce({ rowCount: 1 }) // events
            .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app)
            .post('/api/daily-reward/claim')
            .send({ device_id: DEVICE_ID });

        expect(res.body.granted).toEqual({ essence: 100, coins: 1000 });
        expect(res.body.streak_day).toBe(7);
    });

    it('오늘 이미 청구한 경우 → ok:false + ROLLBACK', async () => {
        clientQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 42 }], rowCount: 1 }) // player
            .mockResolvedValueOnce({ rows: [{ today: '2026-05-21' }], rowCount: 1 })
            .mockResolvedValueOnce({
                rows: [{ streak_day: 3, streak_count: 3, claim_date: '2026-05-21' }],
                rowCount: 1,
            })
            .mockResolvedValueOnce({}); // ROLLBACK
        poolQuery.mockResolvedValueOnce({
            rows: [{ next_midnight: '2026-05-22T15:00:00.000Z' }],
            rowCount: 1,
        });

        const res = await request(app)
            .post('/api/daily-reward/claim')
            .send({ device_id: DEVICE_ID });

        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(false);
        expect(res.body.error).toBe('already_claimed');
        expect(clientQuery.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
    });

    it('동시 청구 race (INSERT ON CONFLICT → 0 rows) → ok:false', async () => {
        clientQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 42 }], rowCount: 1 }) // player
            .mockResolvedValueOnce({ rows: [{ today: '2026-05-21' }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // last claim 없음
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // INSERT → conflict, 0 rows
            .mockResolvedValueOnce({}); // ROLLBACK
        poolQuery.mockResolvedValueOnce({
            rows: [{ next_midnight: '2026-05-22T15:00:00.000Z' }],
            rowCount: 1,
        });

        const res = await request(app)
            .post('/api/daily-reward/claim')
            .send({ device_id: DEVICE_ID });

        expect(res.body.ok).toBe(false);
        expect(res.body.error).toBe('already_claimed');
    });

    it('device_id 누락은 400', async () => {
        const res = await request(app).post('/api/daily-reward/claim').send({});
        expect(res.status).toBe(400);
        expect(clientQuery).not.toHaveBeenCalled();
    });

    it('DB 에러 시 500 + ROLLBACK + release', async () => {
        clientQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockRejectedValueOnce(new Error('boom')) // player upsert 실패
            .mockResolvedValueOnce({}); // ROLLBACK

        const res = await request(app)
            .post('/api/daily-reward/claim')
            .send({ device_id: DEVICE_ID });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('db error');
        expect(clientQuery.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
        expect(clientRelease).toHaveBeenCalledTimes(1);
    });
});
