import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// pg 모킹
vi.mock('../src/db/pool.js', () => ({
    pool: {
        query: vi.fn(),
        on: vi.fn(),
    },
}));

import app from '../src/server.js';
import { pool } from '../src/db/pool.js';

describe('GET /api/health', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('DB 정상 시 200', async () => {
        (pool.query as any).mockResolvedValue({ rows: [{ '?column?': 1 }] });
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    it('DB 에러 시 503', async () => {
        (pool.query as any).mockRejectedValue(new Error('connection refused'));
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(503);
        expect(res.body.status).toBe('degraded');
    });
});
