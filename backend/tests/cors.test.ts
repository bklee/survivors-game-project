import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/db/pool.js', () => ({
    pool: {
        query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
        on: vi.fn(),
    },
}));

import app from '../src/server.js';

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('CORS — 콤마 구분 다중 origin', () => {
    it('화이트리스트 origin 요청 → echo + Vary: Origin', async () => {
        vi.stubEnv(
            'CORS_ORIGIN',
            'https://games.blocktalker.co.kr,https://revision.gamedistribution.com',
        );
        const res = await request(app)
            .get('/api/health')
            .set('Origin', 'https://revision.gamedistribution.com');
        expect(res.headers['access-control-allow-origin']).toBe(
            'https://revision.gamedistribution.com',
        );
        expect(res.headers['vary']).toMatch(/Origin/);
    });

    it('화이트리스트 외 origin → ACL 헤더 set 안 함', async () => {
        vi.stubEnv('CORS_ORIGIN', 'https://games.blocktalker.co.kr');
        const res = await request(app).get('/api/health').set('Origin', 'https://evil.example.com');
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('OPTIONS preflight → 204', async () => {
        vi.stubEnv('CORS_ORIGIN', 'https://games.blocktalker.co.kr');
        const res = await request(app)
            .options('/api/health')
            .set('Origin', 'https://games.blocktalker.co.kr');
        expect(res.status).toBe(204);
        expect(res.headers['access-control-allow-origin']).toBe('https://games.blocktalker.co.kr');
    });

    it('CORS_ORIGIN=* → wildcard 허용 (개발 모드)', async () => {
        vi.stubEnv('CORS_ORIGIN', '*');
        const res = await request(app)
            .get('/api/health')
            .set('Origin', 'https://anywhere.example.com');
        expect(res.headers['access-control-allow-origin']).toBe('*');
    });
});
