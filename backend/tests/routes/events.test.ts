import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const clientQuery = vi.fn();
const clientRelease = vi.fn();

vi.mock('../../src/db/pool.js', () => ({
    pool: {
        query: vi.fn(),
        on: vi.fn(),
        connect: vi.fn(() =>
            Promise.resolve({
                query: clientQuery,
                release: clientRelease,
            }),
        ),
    },
}));

import app from '../../src/server.js';

const baseEvent = {
    device_id: 'device-12345678',
    event_type: 'session_start',
    payload: { stage: 1 },
};

describe('POST /api/events', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('단일 이벤트 배치는 200 + count', async () => {
        clientQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 99 }], rowCount: 1 }) // player upsert
            .mockResolvedValueOnce({ rowCount: 1 }) // event insert
            .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app)
            .post('/api/events')
            .send({ events: [baseEvent] });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true, count: 1 });
        expect(clientRelease).toHaveBeenCalledTimes(1);
        // BEGIN → player upsert → event insert → COMMIT
        expect(clientQuery.mock.calls[0][0]).toBe('BEGIN');
        expect(clientQuery.mock.calls[3][0]).toBe('COMMIT');
    });

    it('동일 device_id 의 이벤트 2개는 player upsert 1회만', async () => {
        clientQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 42 }], rowCount: 1 }) // player upsert (1회)
            .mockResolvedValueOnce({ rowCount: 1 }) // event 1
            .mockResolvedValueOnce({ rowCount: 1 }) // event 2
            .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app)
            .post('/api/events')
            .send({
                events: [
                    baseEvent,
                    { ...baseEvent, event_type: 'session_end', payload: { duration: 30 } },
                ],
            });

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(2);
        // BEGIN + 1 upsert + 2 inserts + COMMIT = 5 calls
        expect(clientQuery).toHaveBeenCalledTimes(5);
        // event insert player_id = 42
        expect(clientQuery.mock.calls[2][1]?.[0]).toBe(42);
        expect(clientQuery.mock.calls[3][1]?.[0]).toBe(42);
    });

    it('다른 device_id 두 개는 player upsert 두 번', async () => {
        clientQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // player A
            .mockResolvedValueOnce({ rows: [{ id: 2 }], rowCount: 1 }) // player B
            .mockResolvedValueOnce({ rowCount: 1 })
            .mockResolvedValueOnce({ rowCount: 1 })
            .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app)
            .post('/api/events')
            .send({
                events: [
                    { ...baseEvent, device_id: 'device-aaaaaaaa' },
                    { ...baseEvent, device_id: 'device-bbbbbbbb' },
                ],
            });

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(2);
        expect(clientQuery).toHaveBeenCalledTimes(6);
    });

    it('payload 미포함 시 빈 객체로 저장', async () => {
        clientQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 7 }], rowCount: 1 })
            .mockResolvedValueOnce({ rowCount: 1 })
            .mockResolvedValueOnce({}); // COMMIT

        const res = await request(app)
            .post('/api/events')
            .send({
                events: [{ device_id: 'device-12345678', event_type: 'pwa_install' }],
            });

        expect(res.status).toBe(200);
        // event insert 의 payload 파라미터 = {}
        expect(clientQuery.mock.calls[2][1]?.[2]).toEqual({});
    });

    it('빈 events 배열은 400', async () => {
        const res = await request(app).post('/api/events').send({ events: [] });
        expect(res.status).toBe(400);
        expect(clientQuery).not.toHaveBeenCalled();
    });

    it('알 수 없는 event_type 은 400', async () => {
        const res = await request(app)
            .post('/api/events')
            .send({ events: [{ ...baseEvent, event_type: 'mystery_event' }] });
        expect(res.status).toBe(400);
    });

    it('51 개 이벤트는 400 (상한 50)', async () => {
        const events = Array.from({ length: 51 }, () => baseEvent);
        const res = await request(app).post('/api/events').send({ events });
        expect(res.status).toBe(400);
    });

    it('DB 에러 시 500 + ROLLBACK + release', async () => {
        clientQuery
            .mockResolvedValueOnce({}) // BEGIN
            .mockRejectedValueOnce(new Error('boom')) // player upsert 실패
            .mockResolvedValueOnce({}); // ROLLBACK

        const res = await request(app)
            .post('/api/events')
            .send({ events: [baseEvent] });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('db error');
        expect(clientQuery.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
        expect(clientRelease).toHaveBeenCalledTimes(1);
    });
});
