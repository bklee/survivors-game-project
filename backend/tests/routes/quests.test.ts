import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
    clientQuery: vi.fn(),
    clientRelease: vi.fn(),
}));

vi.mock('../../src/db/pool.js', () => ({
    pool: {
        query: vi.fn(),
        on: vi.fn(),
        connect: vi.fn(() =>
            Promise.resolve({
                query: mocks.clientQuery,
                release: mocks.clientRelease,
            }),
        ),
    },
}));

const { clientQuery, clientRelease } = mocks;

import app from '../../src/server.js';

const DEVICE_ID = 'device-12345678';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('GET /api/quests/:device_id', () => {
    it('할당 없으면 풀에서 3개 INSERT 후 반환', async () => {
        clientQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 42 }], rowCount: 1 }) // player upsert
            .mockResolvedValueOnce({ rows: [{ today: '2026-05-21' }], rowCount: 1 }) // today
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // 1차 quests 조회 — 비어있음
            // 3 INSERT (ON CONFLICT)
            .mockResolvedValueOnce({ rowCount: 1 })
            .mockResolvedValueOnce({ rowCount: 1 })
            .mockResolvedValueOnce({ rowCount: 1 })
            // 2차 quests 조회 — 3개
            .mockResolvedValueOnce({
                rows: [
                    {
                        id: 1,
                        quest_id: 'kill_100',
                        target_value: 100,
                        reward_essence: 20,
                        current_value: null,
                        completed_at: null,
                        claimed_at: null,
                    },
                    {
                        id: 2,
                        quest_id: 'stage_3',
                        target_value: 3,
                        reward_essence: 30,
                        current_value: null,
                        completed_at: null,
                        claimed_at: null,
                    },
                    {
                        id: 3,
                        quest_id: 'synergy_5',
                        target_value: 5,
                        reward_essence: 25,
                        current_value: null,
                        completed_at: null,
                        claimed_at: null,
                    },
                ],
                rowCount: 3,
            })
            .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app).get(`/api/quests/${DEVICE_ID}`);

        expect(res.status).toBe(200);
        expect(res.body.date).toBe('2026-05-21');
        expect(res.body.quests).toHaveLength(3);
        expect(res.body.quests[0].current_value).toBe(0); // null → 0
        expect(res.body.combo_bonus_coins).toBe(500);
        expect(res.body.combo_claimed).toBe(false);
        expect(clientRelease).toHaveBeenCalledTimes(1);
    });

    it('이미 할당된 quests 가 있으면 INSERT 없이 그대로 반환', async () => {
        clientQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 42 }], rowCount: 1 }) // player
            .mockResolvedValueOnce({ rows: [{ today: '2026-05-21' }], rowCount: 1 })
            .mockResolvedValueOnce({
                rows: [
                    {
                        id: 1,
                        quest_id: 'kill_100',
                        target_value: 100,
                        reward_essence: 20,
                        current_value: 50,
                        completed_at: null,
                        claimed_at: null,
                    },
                    {
                        id: 2,
                        quest_id: 'stage_3',
                        target_value: 3,
                        reward_essence: 30,
                        current_value: 3,
                        completed_at: '2026-05-21T05:00:00Z',
                        claimed_at: '2026-05-21T05:30:00Z',
                    },
                    {
                        id: 3,
                        quest_id: 'synergy_5',
                        target_value: 5,
                        reward_essence: 25,
                        current_value: 5,
                        completed_at: '2026-05-21T06:00:00Z',
                        claimed_at: '2026-05-21T06:01:00Z',
                    },
                ],
                rowCount: 3,
            })
            .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app).get(`/api/quests/${DEVICE_ID}`);

        expect(res.status).toBe(200);
        expect(res.body.quests).toHaveLength(3);
        expect(res.body.quests[1].completed).toBe(true);
        expect(res.body.quests[1].claimed).toBe(true);
        // INSERT 호출 없어야 함 (BEGIN + player + today + quests + COMMIT = 5)
        expect(clientQuery).toHaveBeenCalledTimes(5);
    });

    it('짧은 device_id 는 400', async () => {
        const res = await request(app).get('/api/quests/short');
        expect(res.status).toBe(400);
        expect(clientQuery).not.toHaveBeenCalled();
    });
});

describe('POST /api/quests/progress', () => {
    it('유효한 increment → upsert + 응답', async () => {
        clientQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 42 }], rowCount: 1 }) // player
            .mockResolvedValueOnce({ rows: [{ today: '2026-05-21' }], rowCount: 1 })
            // quest lookup
            .mockResolvedValueOnce({
                rows: [
                    { id: 1, quest_id: 'kill_100', target_value: 100 },
                    { id: 3, quest_id: 'synergy_5', target_value: 5 },
                ],
                rowCount: 2,
            })
            // upsert 1 (kill_100 +50 → 50, not completed yet)
            .mockResolvedValueOnce({
                rows: [
                    {
                        current_value: 50,
                        completed_at: null,
                        was_insert: true,
                        was_newly_completed: false,
                    },
                ],
                rowCount: 1,
            })
            // upsert 2 (synergy_5 +5 → 5, completed 신규)
            .mockResolvedValueOnce({
                rows: [
                    {
                        current_value: 5,
                        completed_at: '2026-05-21T07:00:00Z',
                        was_insert: true,
                        was_newly_completed: true,
                    },
                ],
                rowCount: 1,
            })
            .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app)
            .post('/api/quests/progress')
            .send({
                device_id: DEVICE_ID,
                increments: [
                    { quest_id: 'kill_100', delta: 50 },
                    { quest_id: 'synergy_5', delta: 5 },
                ],
            });

        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(res.body.updated).toHaveLength(2);
        expect(res.body.updated[0]).toEqual({
            quest_id: 'kill_100',
            current_value: 50,
            completed: false,
        });
        expect(res.body.updated[1]).toEqual({
            quest_id: 'synergy_5',
            current_value: 5,
            completed: true,
        });
        expect(res.body.newly_completed_count).toBe(1);
    });

    it('오늘 할당되지 않은 quest_id 는 무시 (응답에서 빠짐)', async () => {
        clientQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 42 }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ today: '2026-05-21' }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // lookup 0
            .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app)
            .post('/api/quests/progress')
            .send({
                device_id: DEVICE_ID,
                increments: [{ quest_id: 'kill_100', delta: 10 }],
            });

        expect(res.status).toBe(200);
        expect(res.body.updated).toHaveLength(0);
        expect(res.body.newly_completed_count).toBe(0);
    });

    it('알 수 없는 quest_id 는 400', async () => {
        const res = await request(app)
            .post('/api/quests/progress')
            .send({
                device_id: DEVICE_ID,
                increments: [{ quest_id: 'mystery', delta: 1 }],
            });
        expect(res.status).toBe(400);
        expect(clientQuery).not.toHaveBeenCalled();
    });

    it('delta 0 이하는 400', async () => {
        const res = await request(app)
            .post('/api/quests/progress')
            .send({
                device_id: DEVICE_ID,
                increments: [{ quest_id: 'kill_100', delta: 0 }],
            });
        expect(res.status).toBe(400);
    });

    it('빈 increments 는 400', async () => {
        const res = await request(app)
            .post('/api/quests/progress')
            .send({ device_id: DEVICE_ID, increments: [] });
        expect(res.status).toBe(400);
    });

    it('DB 에러 시 500 + ROLLBACK', async () => {
        clientQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockRejectedValueOnce(new Error('boom'))
            .mockResolvedValueOnce({}); // ROLLBACK
        const res = await request(app)
            .post('/api/quests/progress')
            .send({
                device_id: DEVICE_ID,
                increments: [{ quest_id: 'kill_100', delta: 1 }],
            });
        expect(res.status).toBe(500);
        expect(clientQuery.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
    });
});

describe('POST /api/quests/claim', () => {
    it('완료된 quest 청구 성공 → essence 지급 + events insert + combo 미해금', async () => {
        clientQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 42 }], rowCount: 1 }) // player
            .mockResolvedValueOnce({ rows: [{ today: '2026-05-21' }], rowCount: 1 })
            // quest FOR UPDATE
            .mockResolvedValueOnce({
                rows: [
                    {
                        id: 1,
                        reward_essence: 20,
                        completed_at: '2026-05-21T08:00:00Z',
                        claimed_at: null,
                    },
                ],
                rowCount: 1,
            })
            .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE quest_progress claimed_at
            .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE players total_essence
            .mockResolvedValueOnce({ rowCount: 1 }) // INSERT events quest_claim
            .mockResolvedValueOnce({ rows: [{ claimed_count: 1 }], rowCount: 1 }) // combo check
            .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app)
            .post('/api/quests/claim')
            .send({ device_id: DEVICE_ID, quest_id: 'kill_100' });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            ok: true,
            granted_essence: 20,
            combo_unlocked: false,
            combo_bonus_coins: 0,
        });
    });

    it('3개 모두 claimed 직후 → combo_unlocked:true + 보너스 events', async () => {
        clientQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 42 }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ today: '2026-05-21' }], rowCount: 1 })
            .mockResolvedValueOnce({
                rows: [
                    {
                        id: 3,
                        reward_essence: 25,
                        completed_at: '2026-05-21T10:00:00Z',
                        claimed_at: null,
                    },
                ],
                rowCount: 1,
            })
            .mockResolvedValueOnce({ rowCount: 1 })
            .mockResolvedValueOnce({ rowCount: 1 })
            .mockResolvedValueOnce({ rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ claimed_count: 3 }], rowCount: 1 }) // 3개 claim
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // 중복 combo 없음
            .mockResolvedValueOnce({ rowCount: 1 }) // INSERT combo events
            .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app)
            .post('/api/quests/claim')
            .send({ device_id: DEVICE_ID, quest_id: 'synergy_5' });

        expect(res.body).toEqual({
            ok: true,
            granted_essence: 25,
            combo_unlocked: true,
            combo_bonus_coins: 500,
        });
    });

    it('완료되지 않은 quest 청구 → ok:false + ROLLBACK', async () => {
        clientQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 42 }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ today: '2026-05-21' }], rowCount: 1 })
            .mockResolvedValueOnce({
                rows: [{ id: 1, reward_essence: 20, completed_at: null, claimed_at: null }],
                rowCount: 1,
            })
            .mockResolvedValueOnce({}); // ROLLBACK

        const res = await request(app)
            .post('/api/quests/claim')
            .send({ device_id: DEVICE_ID, quest_id: 'kill_100' });

        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(false);
        expect(res.body.error).toBe('not_completed');
    });

    it('이미 claimed → ok:false + ROLLBACK', async () => {
        clientQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 42 }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ today: '2026-05-21' }], rowCount: 1 })
            .mockResolvedValueOnce({
                rows: [
                    {
                        id: 1,
                        reward_essence: 20,
                        completed_at: '2026-05-21T08:00:00Z',
                        claimed_at: '2026-05-21T08:05:00Z',
                    },
                ],
                rowCount: 1,
            })
            .mockResolvedValueOnce({}); // ROLLBACK

        const res = await request(app)
            .post('/api/quests/claim')
            .send({ device_id: DEVICE_ID, quest_id: 'kill_100' });

        expect(res.body.ok).toBe(false);
        expect(res.body.error).toBe('already_claimed');
    });

    it('오늘 할당되지 않은 quest → 404', async () => {
        clientQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 42 }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ today: '2026-05-21' }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount: 0 })
            .mockResolvedValueOnce({}); // ROLLBACK

        const res = await request(app)
            .post('/api/quests/claim')
            .send({ device_id: DEVICE_ID, quest_id: 'kill_100' });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('quest_not_found');
    });

    it('알 수 없는 quest_id 는 400', async () => {
        const res = await request(app)
            .post('/api/quests/claim')
            .send({ device_id: DEVICE_ID, quest_id: 'mystery' });
        expect(res.status).toBe(400);
    });
});
