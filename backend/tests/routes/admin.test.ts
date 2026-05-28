import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
    poolQuery: vi.fn(),
}));

vi.mock('../../src/db/pool.js', () => ({
    pool: {
        query: mocks.poolQuery,
        on: vi.fn(),
        connect: vi.fn(),
    },
}));

const { poolQuery } = mocks;

import app from '../../src/server.js';

const ADMIN_AUTH = 'admin:test-secret-1234';
const AUTH_HEADER = 'Basic ' + Buffer.from(ADMIN_AUTH).toString('base64');

beforeEach(() => {
    vi.clearAllMocks();
    // 10 개 쿼리 모두 빈 결과로 mock — HTML 응답 구조 검증이 목적
    poolQuery.mockResolvedValue({ rows: [{}], rowCount: 0 });
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('GET /api/admin/dashboard.html — Basic Auth', () => {
    it('ADMIN_AUTH 환경변수 미설정 → 503', async () => {
        vi.stubEnv('ADMIN_AUTH', '');
        const res = await request(app).get('/api/admin/dashboard.html');
        expect(res.status).toBe(503);
        expect(res.body.error).toMatch(/not configured/);
    });

    it('Authorization 헤더 없음 → 401 + WWW-Authenticate', async () => {
        vi.stubEnv('ADMIN_AUTH', ADMIN_AUTH);
        const res = await request(app).get('/api/admin/dashboard.html');
        expect(res.status).toBe(401);
        expect(res.headers['www-authenticate']).toMatch(/Basic/);
    });

    it('잘못된 자격증명 → 401', async () => {
        vi.stubEnv('ADMIN_AUTH', ADMIN_AUTH);
        const bad = 'Basic ' + Buffer.from('admin:wrong').toString('base64');
        const res = await request(app).get('/api/admin/dashboard.html').set('Authorization', bad);
        expect(res.status).toBe(401);
    });

    it('Basic 으로 시작 안 하는 헤더 → 401', async () => {
        vi.stubEnv('ADMIN_AUTH', ADMIN_AUTH);
        const res = await request(app)
            .get('/api/admin/dashboard.html')
            .set('Authorization', 'Bearer some-token');
        expect(res.status).toBe(401);
    });
});

describe('GET /api/admin/dashboard.html — 정상 응답', () => {
    it('정상 자격증명 → 200 + HTML 콘텐츠', async () => {
        vi.stubEnv('ADMIN_AUTH', ADMIN_AUTH);
        // 10 개 쿼리 결과 mock
        poolQuery
            .mockResolvedValueOnce({ rows: [{ dau: 12 }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ wau: 87 }], rowCount: 1 })
            .mockResolvedValueOnce({
                rows: [{ new_yday: 5, retained: 2, d1_pct: 40.0 }],
                rowCount: 1,
            })
            .mockResolvedValueOnce({
                rows: [
                    { character_id: 'knight', runs: 30, avg_score: 1200, avg_stage: 6 },
                    { character_id: 'wizard', runs: 18, avg_score: 1500, avg_stage: 7 },
                ],
                rowCount: 2,
            })
            .mockResolvedValueOnce({ rows: [{ avg_sec: 420 }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ claims_today: 8, dau_today: 12 }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ completed: 3, total_assigned: 36 }], rowCount: 1 })
            .mockResolvedValueOnce({
                rows: [
                    { event_type: 'ad_view', cnt: 45 },
                    { event_type: 'ad_skip', cnt: 12 },
                ],
                rowCount: 2,
            })
            .mockResolvedValueOnce({
                rows: [
                    { synergy_id: 'fire_water', discoveries: 8 },
                    { synergy_id: 'ice_storm', discoveries: 5 },
                ],
                rowCount: 2,
            })
            .mockResolvedValueOnce({
                rows: [
                    { day: '2026-05-21', new_players: 3 },
                    { day: '2026-05-22', new_players: 5 },
                ],
                rowCount: 2,
            });

        const res = await request(app)
            .get('/api/admin/dashboard.html')
            .set('Authorization', AUTH_HEADER);
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/html/);
        // 핵심 섹션 헤더 포함 확인
        expect(res.text).toMatch(/DAU/);
        expect(res.text).toMatch(/WAU/);
        expect(res.text).toMatch(/D1/i);
        expect(res.text).toMatch(/Character/i);
        // 데이터 값도 반영되는지
        expect(res.text).toContain('12'); // dau
        expect(res.text).toContain('knight');
    });

    it('HTML escape — character_id 에 위험 문자 있어도 안전', async () => {
        vi.stubEnv('ADMIN_AUTH', ADMIN_AUTH);
        poolQuery
            .mockResolvedValueOnce({ rows: [{ dau: 0 }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ wau: 0 }], rowCount: 1 })
            .mockResolvedValueOnce({
                rows: [{ new_yday: 0, retained: 0, d1_pct: 0 }],
                rowCount: 1,
            })
            .mockResolvedValueOnce({
                rows: [
                    {
                        character_id: '<script>alert(1)</script>',
                        runs: 1,
                        avg_score: 0,
                        avg_stage: 0,
                    },
                ],
                rowCount: 1,
            })
            .mockResolvedValueOnce({ rows: [{ avg_sec: 0 }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ claims_today: 0, dau_today: 0 }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ completed: 0, total_assigned: 0 }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount: 0 })
            .mockResolvedValueOnce({ rows: [], rowCount: 0 })
            .mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const res = await request(app)
            .get('/api/admin/dashboard.html')
            .set('Authorization', AUTH_HEADER);
        expect(res.status).toBe(200);
        // raw <script> 태그가 HTML 본문에 그대로 들어가면 안 됨
        expect(res.text).not.toContain('<script>alert(1)</script>');
        // escape 된 형태 (&lt;script&gt;) 는 포함되어야 함
        expect(res.text).toMatch(/&lt;script&gt;/);
    });
});
