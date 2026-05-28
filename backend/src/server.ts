import express from 'express';
import { pool } from './db/pool.js';
import leaderboardRouter from './routes/leaderboard.js';
import eventsRouter from './routes/events.js';
import webhookRouter from './routes/webhook.js';
import playerRouter from './routes/player.js';
import dailyRewardRouter from './routes/daily-reward.js';
import questsRouter from './routes/quests.js';
import adminRouter from './routes/admin.js';

const app = express();

// LS webhook HMAC 검증을 위해 raw body 보존
app.use(
    express.json({
        limit: '256kb',
        verify: (req: express.Request, _res, buf) => {
            (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
        },
    }),
);

// CORS — 콤마 구분 다중 origin 지원 (e.g. "https://games.blocktalker.co.kr,https://revision.gamedistribution.com").
// GameDistribution CDN 등 외부 호스팅에서도 백엔드 API 호출 가능하게.
// '*' 단독 시 wildcard (개발용). 그 외엔 요청 Origin 이 화이트리스트에 있을 때만 echo.
app.use((req, res, next) => {
    const corsRaw = process.env.CORS_ORIGIN || '*';
    const corsAllowList = corsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const isWildcard = corsAllowList.length === 1 && corsAllowList[0] === '*';
    const origin = (req.headers.origin as string) || '';
    if (isWildcard) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (origin && corsAllowList.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
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
app.use('/api/events', eventsRouter);
app.use('/api/ls-webhook', webhookRouter);
app.use('/api/player', playerRouter);
app.use('/api/daily-reward', dailyRewardRouter);
app.use('/api/quests', questsRouter);
app.use('/api/admin', adminRouter);

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
