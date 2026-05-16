import express from 'express';
import { pool } from './db/pool.js';
import leaderboardRouter from './routes/leaderboard.js';

const app = express();
app.use(express.json({ limit: '256kb' }));

// CORS (단순 — 게임 도메인만 허용. 추후 미들웨어 패키지 고려)
app.use((req, res, next) => {
    const allowed = process.env.CORS_ORIGIN || '*';
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Signature');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// Health check
app.get('/api/health', async (_req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', db: 'connected', time: new Date().toISOString() });
    } catch (err) {
        console.error('[Health] DB error:', err);
        res.status(503).json({ status: 'degraded', db: 'error' });
    }
});

app.use('/api/leaderboard', leaderboardRouter);

// 404
app.use((_req, res) => res.status(404).json({ error: 'not found' }));

// 에러 핸들러
app.use(
    (
        err: Error,
        _req: express.Request,
        res: express.Response,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _next: express.NextFunction,
    ) => {
        console.error('[Express] error:', err);
        res.status(500).json({ error: 'internal error' });
    },
);

const PORT = parseInt(process.env.PORT || '3001', 10);

// 테스트 환경에서는 listen 안 함 (supertest용)
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`[Server] listening on :${PORT}`);
    });
}

export default app;
