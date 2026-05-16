# M4 Phase 2: Backend API + Nginx + LS Webhook + 분석 이벤트

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development to execute task-by-task.

**Goal:** M4 Phase 1의 인프라 위에 백엔드 API를 올려서 **결제 검증** + **리더보드** + **분석 이벤트** 수집 가능한 상태로. 클라이언트 LocalStorage 신뢰 모델에서 서버 검증 모델로 전환.

**Architecture:** Node.js/Express 백엔드 컨테이너 + Nginx reverse proxy + Let's Encrypt SSL. 게임 클라이언트 → Nginx → API → PostgreSQL. Lemon Squeezy webhook → Nginx → API → 서명 검증 + 결제 영구 저장.

**Tech Stack:**
- 백엔드: Node.js 20 + Express + pg (PostgreSQL 드라이버) + zod (validation) + tsx (실행)
- 프록시: Nginx (Alpine) + Certbot
- 인증: device_id 기반 무인증 또는 단순 token (Phase 2.5에서 정식 JWT)

**Spec:** [2026-05-16-commercialization-plan.md](../specs/2026-05-16-commercialization-plan.md) §3 D60-90 + Phase 1 retrospective 후속 작업.

**Milestone:** 주말 기준 4-5주 (실 작업 16-20시간).

**Prerequisite:** M4 Phase 1 머지 + Contabo 서버에 PostgreSQL 가동.

**도메인**: `games.blocktalker.co.kr/api/*` (API) + `games.blocktalker.co.kr/` (PWA 정적 호스팅).

---

## File Structure

### 신규 디렉토리
| 경로 | 내용 |
|------|------|
| `backend/` | Node.js Express API |
| `backend/src/` | 소스 코드 |
| `backend/src/routes/` | 엔드포인트 |
| `backend/src/db/` | DB 풀 + 마이그레이션 헬퍼 |
| `backend/src/middleware/` | LS webhook 서명 검증 등 |
| `backend/Dockerfile` | 컨테이너 빌드 |
| `backend/package.json` | 의존성 |
| `backend/tsconfig.json` | TS 설정 |
| `infra/nginx/` | Nginx 설정 |

### 신규 파일
| 경로 | 책임 |
|------|------|
| `backend/src/server.ts` | Express 부트스트랩 |
| `backend/src/db/pool.ts` | PostgreSQL 연결 풀 |
| `backend/src/routes/leaderboard.ts` | GET/POST /api/leaderboard |
| `backend/src/routes/events.ts` | POST /api/events (분석 이벤트) |
| `backend/src/routes/webhook.ts` | POST /api/ls-webhook (LS 결제) |
| `backend/src/routes/player.ts` | GET /api/player/:device_id (보유 IAP 조회) |
| `backend/src/middleware/lsSignature.ts` | LS webhook HMAC 서명 검증 |
| `backend/tests/routes/*.test.ts` | API 엔드포인트 통합 테스트 |
| `infra/nginx/nginx.conf` | reverse proxy + SSL |
| `infra/nginx/Dockerfile` | (또는 docker-compose에서 nginx:alpine 직접 사용) |
| `infra/docker-compose.yml` | (수정) API + Nginx 컨테이너 추가 |

### 수정 파일
| 경로 | 변경 |
|------|------|
| `src/integrations/LemonSqueezy.ts` | `hasProduct`를 서버 API `/api/player/:id` 조회로 변경 (캐시 + LocalStorage 폴백) |
| `src/core/Identity.ts` | device_id를 서버 player_id로 매핑 (gameStart 시 API 호출) |
| `src/scenes/MainScene.ts` | 분석 이벤트 전송 (session_start, session_end) |
| `infra/docker-compose.yml` | API + Nginx 서비스 추가 |
| `infra/README.md` | 배포 단계 갱신 |

---

## Task 1: Express 백엔드 부트스트랩

**Files:**
- Create: `backend/package.json`, `backend/tsconfig.json`, `backend/src/server.ts`, `backend/src/db/pool.ts`
- Create: `backend/.env.example`, `backend/.gitignore`

- [ ] **Step 1**: `backend/package.json`

```json
{
  "name": "survivors-backend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "start": "node --enable-source-maps dist/server.js",
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "express": "^4.21.0",
    "pg": "^8.13.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.13.5",
    "@types/pg": "^8.11.10",
    "tsx": "^4.19.0",
    "typescript": "^5.8.2",
    "vitest": "^4.1.6",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.2"
  }
}
```

- [ ] **Step 2**: `backend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

- [ ] **Step 3**: `backend/src/db/pool.ts`

```typescript
import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'postgres',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'survivors',
    user: process.env.POSTGRES_USER || 'survivors_app',
    password: process.env.POSTGRES_PASSWORD,
    max: 10,
    idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
    console.error('[DB Pool] unexpected error:', err);
});
```

- [ ] **Step 4**: `backend/src/server.ts`

```typescript
import express from 'express';
import { pool } from './db/pool.js';
import leaderboardRouter from './routes/leaderboard.js';
import eventsRouter from './routes/events.js';
import webhookRouter from './routes/webhook.js';
import playerRouter from './routes/player.js';

const app = express();
app.use(express.json({ limit: '256kb' }));

// Health check
app.get('/api/health', async (_req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', db: 'connected' });
    } catch (err) {
        res.status(503).json({ status: 'degraded', db: 'error' });
    }
});

app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/events', eventsRouter);
app.use('/api/ls-webhook', webhookRouter);
app.use('/api/player', playerRouter);

// 404
app.use((_req, res) => res.status(404).json({ error: 'not found' }));

const PORT = parseInt(process.env.PORT || '3001', 10);
app.listen(PORT, () => {
    console.log(`[Server] listening on :${PORT}`);
});
```

- [ ] **Step 5**: 검증 (로컬 — Contabo 배포는 Task 7)
```bash
cd backend
npm install
POSTGRES_PASSWORD=test npm run dev  # localhost:3001/api/health
```

- [ ] **Step 6**: 커밋

---

## Task 2: Leaderboard API

**Files:** `backend/src/routes/leaderboard.ts`, `backend/tests/routes/leaderboard.test.ts`

- [ ] **Step 1**: 엔드포인트 정의

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';

const router = Router();

const SubmitSchema = z.object({
    device_id: z.string().min(8).max(64),
    score: z.number().int().min(0).max(1_000_000),
    stage_reached: z.number().int().min(1).max(1000).optional(),
    character_id: z.enum(['knight', 'wizard', 'elf', 'necromancer', 'druid', 'engineer']),
    duration_seconds: z.number().int().min(0).max(7200).optional(),
});

// POST /api/leaderboard — 점수 제출
router.post('/', async (req, res) => {
    const parsed = SubmitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { device_id, score, stage_reached, character_id, duration_seconds } = parsed.data;

    // player_id 조회 또는 생성
    const playerRes = await pool.query(
        `INSERT INTO players (device_id) VALUES ($1)
         ON CONFLICT (device_id) DO UPDATE SET last_seen_at = NOW()
         RETURNING id`,
        [device_id],
    );
    const playerId = playerRes.rows[0].id;

    await pool.query(
        `INSERT INTO leaderboard (player_id, score, stage_reached, character_id, duration_seconds)
         VALUES ($1, $2, $3, $4, $5)`,
        [playerId, score, stage_reached ?? null, character_id, duration_seconds ?? null],
    );

    res.json({ ok: true });
});

// GET /api/leaderboard?limit=20 — Top N
router.get('/', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const result = await pool.query(
        `SELECT l.score, l.stage_reached, l.character_id, l.duration_seconds, l.submitted_at, p.nickname
         FROM leaderboard l
         JOIN players p ON p.id = l.player_id
         ORDER BY l.score DESC
         LIMIT $1`,
        [limit],
    );
    res.json({ entries: result.rows });
});

export default router;
```

- [ ] **Step 2-5**: 통합 테스트 (supertest + mock pool 또는 docker test DB) + 커밋

---

## Task 3: Events API (분석 이벤트)

**Files:** `backend/src/routes/events.ts`, tests

- [ ] **Step 1**:

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';

const router = Router();

const EventSchema = z.object({
    device_id: z.string().min(8).max(64),
    event_type: z.enum([
        'session_start', 'session_end', 'card_select', 'character_select',
        'synergy_discover', 'ad_view', 'ad_skip', 'iap_funnel_view',
        'iap_funnel_click', 'iap_funnel_complete', 'pwa_install',
    ]),
    payload: z.record(z.unknown()).optional(),
});

const BatchSchema = z.object({
    events: z.array(EventSchema).min(1).max(50),
});

// POST /api/events — 배치 (게임이 N개 이벤트 모아서 전송)
router.post('/', async (req, res) => {
    const parsed = BatchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    // batch insert
    for (const evt of parsed.data.events) {
        const playerRes = await pool.query(
            `INSERT INTO players (device_id) VALUES ($1)
             ON CONFLICT (device_id) DO UPDATE SET last_seen_at = NOW()
             RETURNING id`,
            [evt.device_id],
        );
        await pool.query(
            `INSERT INTO events (player_id, event_type, payload)
             VALUES ($1, $2, $3)`,
            [playerRes.rows[0].id, evt.event_type, evt.payload ?? {}],
        );
    }
    res.json({ ok: true, count: parsed.data.events.length });
});

export default router;
```

- [ ] **Step 2-5**: 검증 + 커밋

---

## Task 4: LS Webhook (HMAC 서명 검증)

**Files:** `backend/src/middleware/lsSignature.ts`, `backend/src/routes/webhook.ts`, tests

LS Webhook 가이드: https://docs.lemonsqueezy.com/help/webhooks/signing-webhook-requests

- [ ] **Step 1**: HMAC 서명 검증 미들웨어

```typescript
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function lsSignature(req: Request, res: Response, next: NextFunction) {
    const secret = process.env.LS_WEBHOOK_SECRET;
    if (!secret) return res.status(503).json({ error: 'webhook secret not configured' });

    const signature = req.headers['x-signature'];
    if (typeof signature !== 'string') return res.status(401).json({ error: 'missing signature' });

    const raw = JSON.stringify(req.body);
    const computed = crypto.createHmac('sha256', secret).update(raw).digest('hex');

    // timing-safe 비교
    const sigBuf = Buffer.from(signature, 'utf8');
    const computedBuf = Buffer.from(computed, 'utf8');
    if (sigBuf.length !== computedBuf.length || !crypto.timingSafeEqual(sigBuf, computedBuf)) {
        return res.status(401).json({ error: 'invalid signature' });
    }
    next();
}
```

> 실제 LS 가이드 따라 raw body 사용 권장. Express `json` middleware가 이미 parse한 후라면 별도 raw 보존 필요. 단순화: `express.raw()` 사용 또는 body-parser verify 옵션.

- [ ] **Step 2**: Webhook router

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { lsSignature } from '../middleware/lsSignature.js';

const router = Router();

// LS webhook payload 구조 (orders/created event 기준)
const PayloadSchema = z.object({
    meta: z.object({
        event_name: z.string(),
        custom_data: z.object({
            device_id: z.string().optional(),
            product_id: z.string().optional(),
        }).optional(),
    }),
    data: z.object({
        id: z.string(),
        type: z.literal('orders'),
        attributes: z.object({
            status: z.string(), // 'paid' | 'refunded' | 'failed'
            total: z.number(),
            currency: z.string(),
            test_mode: z.boolean().optional(),
        }),
    }),
});

router.post('/', lsSignature, async (req, res) => {
    const parsed = PayloadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { meta, data } = parsed.data;
    if (meta.event_name !== 'order_created') return res.json({ ok: true, ignored: meta.event_name });

    const deviceId = meta.custom_data?.device_id;
    const productId = meta.custom_data?.product_id || 'unknown';
    if (!deviceId) return res.status(400).json({ error: 'missing device_id in custom_data' });

    // Idempotency: ls_order_id UNIQUE
    try {
        const playerRes = await pool.query(
            `INSERT INTO players (device_id) VALUES ($1)
             ON CONFLICT (device_id) DO UPDATE SET last_seen_at = NOW()
             RETURNING id`,
            [deviceId],
        );
        await pool.query(
            `INSERT INTO purchases (player_id, product_id, amount_cents, currency, ls_order_id, status, raw_payload)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (ls_order_id) DO NOTHING`,
            [
                playerRes.rows[0].id,
                productId,
                Math.round(data.attributes.total * 100),
                data.attributes.currency,
                data.id,
                data.attributes.status === 'paid' ? 'completed' : data.attributes.status,
                req.body,
            ],
        );

        // No-Ads Pass 일 경우 player 플래그 갱신
        if (productId === 'no_ads_pass' && data.attributes.status === 'paid') {
            await pool.query(
                `UPDATE players SET no_ads_pass = TRUE WHERE id = $1`,
                [playerRes.rows[0].id],
            );
        }

        res.json({ ok: true });
    } catch (err) {
        console.error('[Webhook] DB error:', err);
        res.status(500).json({ error: 'db error' });
    }
});

export default router;
```

- [ ] **Step 3-5**: 단위 테스트 (HMAC 모킹 + DB mocking) + 커밋

---

## Task 5: Player API

**Files:** `backend/src/routes/player.ts`

```typescript
import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

// GET /api/player/:device_id — 보유 IAP/메타 조회
router.get('/:device_id', async (req, res) => {
    const { device_id } = req.params;
    if (!device_id || device_id.length < 8) return res.status(400).json({ error: 'invalid device_id' });

    const result = await pool.query(
        `SELECT id, no_ads_pass, total_essence, created_at, last_seen_at
         FROM players WHERE device_id = $1`,
        [device_id],
    );

    if (result.rowCount === 0) {
        return res.json({ exists: false, no_ads_pass: false });
    }

    const player = result.rows[0];
    res.json({
        exists: true,
        no_ads_pass: player.no_ads_pass,
        total_essence: player.total_essence,
        created_at: player.created_at,
    });
});

export default router;
```

---

## Task 6: Nginx reverse proxy + SSL

**Files:** `infra/nginx/nginx.conf`, `infra/docker-compose.yml` (수정)

- [ ] **Step 1**: `infra/nginx/nginx.conf`

```nginx
events { worker_connections 1024; }

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;

    upstream api_upstream {
        server api:3001;
    }

    server {
        listen 80;
        server_name games.blocktalker.co.kr;

        # Let's Encrypt challenge
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # HTTP → HTTPS redirect
        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name games.blocktalker.co.kr;

        ssl_certificate /etc/letsencrypt/live/games.blocktalker.co.kr/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/games.blocktalker.co.kr/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # API
        location /api/ {
            proxy_pass http://api_upstream;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Signature $http_x_signature;  # LS webhook signature 전달
        }

        # PWA 정적 파일 (게임 dist)
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
            
            # Service worker는 캐시 안 함
            location = /sw.js {
                add_header Cache-Control "no-cache, no-store, must-revalidate";
            }
            
            # 빌드 자산은 hash 포함되어 있어 영구 캐시
            location /assets/ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }
    }
}
```

- [ ] **Step 2**: `infra/docker-compose.yml` 수정 — API + Nginx 추가

기존 postgres + postgres_backup 위에 추가:

```yaml
  api:
    build:
      context: ../backend
      dockerfile: Dockerfile
    container_name: survivors-api
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_DB: ${POSTGRES_DB:-survivors}
      POSTGRES_USER: ${POSTGRES_USER:-survivors_app}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      LS_WEBHOOK_SECRET: ${LS_WEBHOOK_SECRET}
      PORT: 3001
    expose:
      - "3001"

  nginx:
    image: nginx:alpine
    container_name: survivors-nginx
    restart: unless-stopped
    depends_on:
      - api
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/dist:/usr/share/nginx/html:ro  # 게임 PWA 빌드
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro

  certbot:
    image: certbot/certbot
    container_name: survivors-certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: |
      sh -c "trap exit TERM; while :; do certbot renew --quiet; sleep 12h & wait $${!}; done"
```

- [ ] **Step 3**: `backend/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

- [ ] **Step 4**: SSL 발급 가이드 (`infra/README.md` 갱신)

```markdown
## SSL 발급 (Let's Encrypt)

1. 도메인 DNS가 Contabo IP를 가리키는지 확인 (`dig games.blocktalker.co.kr`)
2. 일회성 Certbot 실행:
   ```bash
   docker-compose run --rm certbot certonly --webroot -w /var/www/certbot \
       -d games.blocktalker.co.kr --email <YOUR_EMAIL> --agree-tos --no-eff-email
   ```
3. 발급 성공 시 `certbot/conf/live/games.blocktalker.co.kr/` 디렉토리 생성
4. `docker-compose up -d` 재시작 (Nginx HTTPS 활성)
5. 자동 갱신: `certbot` 컨테이너가 12시간마다 `renew` 체크
```

---

## Task 7: 클라이언트 ↔ 백엔드 통합

**Files:** Modify `src/integrations/LemonSqueezy.ts`, `src/core/Identity.ts`, `src/scenes/MainScene.ts`

- [ ] **Step 1**: API client

`src/integrations/ApiClient.ts`:
```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://games.blocktalker.co.kr/api';

export class ApiClient {
    static async getPlayer(deviceId: string): Promise<any> {
        const r = await fetch(`${API_BASE}/player/${deviceId}`);
        if (!r.ok) return { exists: false, no_ads_pass: false };
        return r.json();
    }

    static async submitLeaderboard(payload: any): Promise<boolean> {
        try {
            const r = await fetch(`${API_BASE}/leaderboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            return r.ok;
        } catch {
            return false;
        }
    }

    static async sendEvents(events: any[]): Promise<boolean> {
        try {
            const r = await fetch(`${API_BASE}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ events }),
            });
            return r.ok;
        } catch {
            return false;
        }
    }
}
```

- [ ] **Step 2**: LemonSqueezy.hasProduct 서버 조회로 변경

```typescript
import { ApiClient } from './ApiClient';

// 서버 우선, 폴백 LocalStorage. 최초 게임 시작 시 1회 조회 후 LocalStorage 캐시.
static async hasProductRemote(productId: string): Promise<boolean> {
    const deviceId = Identity.getDeviceId();
    const player = await ApiClient.getPlayer(deviceId);
    const owned = !!player.no_ads_pass;
    if (owned) localStorage.setItem(OWNED_KEY_PREFIX + productId, 'true');
    return owned;
}
```

게임 시작 시 1회 호출. 결과는 LocalStorage에 캐시 (오프라인 폴백).

- [ ] **Step 3-5**: 이벤트 전송 hook + 검증 + 커밋

---

## Task 8: 통합 검증 + Phase 2 회고

- [ ] **Step 1**: 자동 검증 (백엔드 + 클라이언트 둘 다)
  - 백엔드: `cd backend && npm test`
  - 클라이언트: `npm test`
  - 빌드: 둘 다 build 성공
- [ ] **Step 2**: 수동 검증 (사용자)
  - 로컬에서 docker-compose up → API health check
  - 클라이언트에서 `/api/health` 응답 확인
  - LS test mode 결제 → webhook 수신 → DB 저장 → hasProduct true
  - 리더보드 점수 제출 → 조회
- [ ] **Step 3**: `docs/superpowers/specs/m4-phase2-retrospective.md` 작성
- [ ] **Step 4**: 커밋 + PR

---

## Self-Review

### Spec Coverage
| 상업화 plan §3 D60-90 | Task |
|----------------------|------|
| 백엔드 API | Task 1-5 |
| Nginx + SSL | Task 6 |
| LS webhook 서명 검증 | Task 4 |
| 클라이언트 통합 | Task 7 |
| 검증 게이트 | Task 8 |

### Open Questions
- **인증 방식**: device_id 무인증. 추후 JWT 또는 OAuth (이메일 가입) 필요?
- **분석 백엔드**: 자체 events 테이블 vs Google Analytics 4 vs PostHog?
- **결제 환불 처리**: refund webhook 수신 시 player.no_ads_pass=false?
- **국제화**: API 응답 한국어/영어? — 클라이언트 i18n으로 처리?

### 시간 추정 (주말)
- Task 1 부트스트랩: 3-4시간
- Task 2-3 Leaderboard + Events: 3-4시간
- Task 4 LS Webhook: 3-4시간
- Task 5 Player API: 1-2시간
- Task 6 Nginx + SSL: 4-5시간 (인프라 작업이 가장 큰 부분)
- Task 7 클라이언트 통합: 2-3시간
- Task 8 검증: 2-3시간

**총 18-25시간** = 주말 5-6주

---

## Execution Handoff

Plan complete. Subagent-Driven 실행 시 Task 1부터.

**P2 사용자 결정** (Phase 2 진행 중):
- 인증 모델 (device_id only vs JWT vs OAuth)
- 분석 백엔드 (자체 vs GA4)
- 환불 정책 + UI
