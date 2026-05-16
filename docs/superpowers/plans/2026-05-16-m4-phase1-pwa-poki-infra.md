# M4 Phase 1: PWA + Poki SDK + Contabo 인프라 + Lemon Squeezy 준비

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development to execute task-by-task.

**Goal:** 상업화 첫 단계 — 게임을 PWA로 만들고, Poki SDK 통합 준비, Contabo 서버에 데이터베이스 셋업, Lemon Squeezy 결제 인프라 검증.

**Architecture:** 게임 자체 코드 변경 최소화 + 인프라 layer 추가. PWA(manifest+service worker), Poki SDK 외부 스크립트, Contabo PostgreSQL, Lemon Squeezy 결제 webhook 수신용 endpoint.

**Tech Stack:** TypeScript + Phaser 3 + Vite + PWA + Poki SDK (JS 외부) + Contabo (Docker + PostgreSQL) + Lemon Squeezy MoR

**Spec:** [2026-05-16-commercialization-plan.md](../specs/2026-05-16-commercialization-plan.md) Section 3 W1-4 (D1-30)

**Milestone:** 주말 기준 4주 (실제 16~20시간 분량 추정). 검증 게이트: Lemon Squeezy 가입 + PWA 설치 가능 + Contabo PostgreSQL 작동.

**Prerequisite:** PR #1-#8 모두 머지 (M1-M3 + 상업화 plan).

**도메인**: 사용자 보유 `blocktalker.co.kr` 활용. 서브도메인 `games.blocktalker.co.kr/survivors/` (deploy.exp 기존 패턴).

---

## File Structure

### 신규 파일
| 경로 | 책임 |
|------|------|
| `public/manifest.json` | PWA 매니페스트 (name, icons, display, theme) |
| `public/sw.js` | Service Worker — 게임 코드/애셋 캐시 + 오프라인 |
| `public/icon-192.png`, `public/icon-512.png` | PWA 아이콘 (임시 placeholder 또는 자체 제작) |
| `src/integrations/PokiSDK.ts` | Poki SDK 래퍼 (광고 호출, 분석 이벤트) |
| `src/integrations/LemonSqueezy.ts` | Lemon Squeezy 결제 URL 생성 + webhook 수신 클라이언트 |
| `infra/docker-compose.yml` | Contabo PostgreSQL + 백업 cron 컨테이너 정의 |
| `infra/postgres/init.sql` | 초기 스키마 (players, purchases, leaderboard, events) |
| `infra/README.md` | Contabo 배포 가이드 |
| `tests/integrations/PokiSDK.test.ts` | Poki SDK 모킹 + 호출 검증 |
| `tests/integrations/LemonSqueezy.test.ts` | 결제 URL 생성 검증 |

### 수정 파일
| 경로 | 변경 |
|------|------|
| `index.html` | manifest.json 링크 + service worker 등록 |
| `vite.config.ts` | PWA 빌드 설정 (vite-plugin-pwa 검토) |
| `src/main.ts` | Poki SDK 초기화 (`window.PokiSDK.init()`) |
| `src/scenes/MainScene.ts` | 광고 트리거 포인트 (부활/2x XP/추가 카드/데일리 보너스/세션 시작) |
| `src/scenes/GameOverScene.ts` | "광고 보고 부활" 버튼 추가 |
| `src/scenes/UpgradeScene.ts` | "광고 보고 카드 1장 더" 옵션 |
| `package.json` | vite-plugin-pwa devDependency (선택) |

---

## Task 1: PWA 기본 (manifest + service worker)

**Files:**
- Create: `public/manifest.json`, `public/sw.js`, icon files
- Modify: `index.html`

- [ ] **Step 1: manifest.json 작성**

```json
{
  "name": "Magicka Survivors",
  "short_name": "MagickaSurv",
  "description": "Vampire Survivors-style action game with alchemy synergies",
  "start_url": "/",
  "scope": "/",
  "display": "fullscreen",
  "orientation": "landscape",
  "background_color": "#111111",
  "theme_color": "#FFD700",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "lang": "ko",
  "categories": ["games", "entertainment"]
}
```

- [ ] **Step 2: 임시 아이콘 생성** (placeholder)

ImageMagick으로 단색 + 텍스트:
```bash
brew install imagemagick  # 미설치 시
convert -size 192x192 xc:'#FFD700' -gravity center -pointsize 60 -fill '#111' -draw "text 0,0 'MS'" public/icon-192.png
convert -size 512x512 xc:'#FFD700' -gravity center -pointsize 160 -fill '#111' -draw "text 0,0 'MS'" public/icon-512.png
```

또는 사용자가 직접 아이콘 디자인 후 교체. 우선 placeholder로 진행.

- [ ] **Step 3: Service Worker — 게임 코드/애셋 캐싱**

`public/sw.js`:

```javascript
const CACHE_NAME = 'magicka-surv-v1';
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => 
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then((cached) => 
            cached || fetch(event.request).then((response) => {
                if (!response || response.status !== 200) return response;
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return response;
            }).catch(() => caches.match('/index.html'))
        )
    );
});
```

> 주의: Vite build 시 자산은 hashed filename (예: `index-abc123.js`). manifest 캐시 전략은 build 시 자산 list 자동 주입 필요 — `vite-plugin-pwa` 사용 권장.

- [ ] **Step 4: index.html에 manifest + sw 등록**

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#FFD700">

<script>
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
    });
}
</script>
```

- [ ] **Step 5: 빌드 + 수동 검증**

Run: `npm run build && npm run preview`
- 브라우저 DevTools → Application → Manifest 확인
- Service Worker 등록 확인
- "Add to Home Screen" 프롬프트 표시 확인 (Chrome)

- [ ] **Step 6: 커밋**

```bash
git add public/manifest.json public/sw.js public/icon-*.png index.html
git commit -m "feat(pwa): add manifest + service worker for installable PWA"
```

---

## Task 2: vite-plugin-pwa 검토 + 정식 적용 (선택)

**Files:**
- Modify: `vite.config.ts`, `package.json`

> Task 1의 수동 sw.js는 자산 hash 처리 안 됨. vite-plugin-pwa로 자동화 권장. 다만 시간 절약 시 Task 1만으로 충분.

- [ ] **Step 1: 의존성 설치**

```bash
npm install --save-dev vite-plugin-pwa
```

- [ ] **Step 2: vite.config.ts 수정**

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'Magicka Survivors',
                // ... manifest 내용
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,png,jpg,mp3,svg}'],
                maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6MB
            },
        }),
    ],
});
```

- [ ] **Step 3-5**: 빌드 + 검증 + 커밋

---

## Task 3: Poki SDK 통합

**Files:**
- Create: `src/integrations/PokiSDK.ts`
- Modify: `src/main.ts`, `src/scenes/MainScene.ts`, `src/scenes/GameOverScene.ts`, `src/scenes/UpgradeScene.ts`

- [ ] **Step 1: Poki SDK 사전 조사 + 키 발급 (사용자 수행)**

사용자 직접 수행:
1. https://developers.poki.com/ 가입
2. New game 등록 (`Magicka Survivors`, 카테고리: Action/Roguelite)
3. SDK key 발급 — `.env`에 저장 (또는 코드 상수)

> Plan에서는 placeholder key로 코드 작성. 사용자가 실제 발급 후 교체.

- [ ] **Step 2: Poki SDK 스크립트 외부 로드**

`index.html`에 추가 (Poki 가이드 따라):
```html
<script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>
```

- [ ] **Step 3: PokiSDK.ts 래퍼**

```typescript
declare global {
    interface Window {
        PokiSDK?: {
            init(): Promise<void>;
            gameLoadingStart(): void;
            gameLoadingFinished(): void;
            gameplayStart(): void;
            gameplayStop(): void;
            commercialBreak(): Promise<void>;
            rewardedBreak(): Promise<boolean>;
            happyTime(intensity: number): void;
            setDebug(value: boolean): void;
        };
    }
}

export class PokiSDK {
    private static initialized = false;

    static async init(): Promise<void> {
        if (this.initialized) return;
        if (!window.PokiSDK) {
            console.warn('Poki SDK not loaded — running in non-Poki mode');
            return;
        }
        try {
            await window.PokiSDK.init();
            window.PokiSDK.gameLoadingStart();
            this.initialized = true;
        } catch (e) {
            console.error('Poki SDK init failed:', e);
        }
    }

    static gameLoadingFinished(): void {
        if (!window.PokiSDK || !this.initialized) return;
        window.PokiSDK.gameLoadingFinished();
    }

    static gameplayStart(): void {
        if (!window.PokiSDK || !this.initialized) return;
        window.PokiSDK.gameplayStart();
    }

    static gameplayStop(): void {
        if (!window.PokiSDK || !this.initialized) return;
        window.PokiSDK.gameplayStop();
    }

    /** 인터스티셜 광고 (게임 흐름 중단) */
    static async commercialBreak(): Promise<void> {
        if (!window.PokiSDK || !this.initialized) return;
        await window.PokiSDK.commercialBreak();
    }

    /** 보상형 광고 — 사용자 선택 (부활/2x XP 등) */
    static async rewardedBreak(): Promise<boolean> {
        if (!window.PokiSDK || !this.initialized) return false;
        try {
            return await window.PokiSDK.rewardedBreak();
        } catch {
            return false;
        }
    }
}
```

- [ ] **Step 4: main.ts에서 초기화**

```typescript
import { PokiSDK } from './integrations/PokiSDK';

// before new Phaser.Game(config)
PokiSDK.init().then(() => {
    new Phaser.Game(config);
    PokiSDK.gameLoadingFinished();
});
```

- [ ] **Step 5: 광고 트리거 포인트 5종 통합**

각 위치에 PokiSDK 호출 추가:
1. **MainScene** 게임 시작 시 → `PokiSDK.gameplayStart()`
2. **MainScene** 게임 종료 시 → `PokiSDK.gameplayStop()`
3. **GameOverScene** "광고 보고 부활" 버튼:
   ```typescript
   const ok = await PokiSDK.rewardedBreak();
   if (ok) {
       // 부활 처리
   }
   ```
4. **UpgradeScene** "광고 보고 카드 1장 더" 옵션 (10% 확률 또는 항상)
5. **MainScene** 데일리 보너스 (HUD 버튼) → `PokiSDK.rewardedBreak()`

- [ ] **Step 6: 단위 테스트 + 커밋**

Poki SDK는 외부 스크립트라 테스트 시 mocking:
```typescript
// tests/integrations/PokiSDK.test.ts
beforeEach(() => {
    (global as any).window.PokiSDK = {
        init: vi.fn().mockResolvedValue(undefined),
        // ...
    };
});
```

---

## Task 4: Contabo PostgreSQL 인프라

**Files:**
- Create: `infra/docker-compose.yml`, `infra/postgres/init.sql`, `infra/README.md`

> 사용자가 Contabo 서버에 직접 배포 필요. 본 task는 코드 산출물 + 배포 가이드만.

- [ ] **Step 1: docker-compose.yml**

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: survivors-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-survivors}
      POSTGRES_USER: ${POSTGRES_USER:-survivors_app}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "127.0.0.1:5432:5432"  # localhost only — 외부 노출 금지
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-survivors_app}"]
      interval: 10s
      timeout: 5s
      retries: 5

  postgres_backup:
    image: postgres:16-alpine
    container_name: survivors-postgres-backup
    restart: unless-stopped
    depends_on:
      - postgres
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_DB: ${POSTGRES_DB:-survivors}
      POSTGRES_USER: ${POSTGRES_USER:-survivors_app}
      PGPASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - ./backups:/backups
    entrypoint: |
      sh -c 'while true; do
        pg_dump -h $$POSTGRES_HOST -U $$POSTGRES_USER -d $$POSTGRES_DB | gzip > /backups/dump_$(date +%Y%m%d_%H%M%S).sql.gz
        find /backups -name "dump_*.sql.gz" -mtime +7 -delete
        sleep 86400
      done'

volumes:
  postgres_data:
```

- [ ] **Step 2: 초기 스키마**

`infra/postgres/init.sql`:

```sql
-- Players (게스트 디바이스 ID 기반)
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    device_id TEXT UNIQUE NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    no_ads_pass BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_players_device ON players(device_id);

-- 결제 (Lemon Squeezy webhook 수신용)
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id),
    product_id TEXT NOT NULL, -- 'no_ads_pass' 등
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    ls_order_id TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'completed', -- 'completed' | 'refunded'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 리더보드 (엔드리스 모드 점수)
CREATE TABLE IF NOT EXISTS leaderboard (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id),
    score INTEGER NOT NULL,
    stage_reached INTEGER,
    character_id TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);

-- 분석 이벤트 (가벼운 텔레메트리)
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    player_id INTEGER,
    event_type TEXT NOT NULL, -- 'session_start', 'session_end', 'card_select', 'iap_funnel_*', 'ad_view'
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_type_time ON events(event_type, created_at);
```

- [ ] **Step 3: README — Contabo 배포 가이드**

`infra/README.md`:

```markdown
# Contabo 배포 가이드

## 사전 준비
- Contabo VPS (Docker 설치됨)
- 도메인 `blocktalker.co.kr` 또는 서브도메인 DNS 설정

## 배포 단계
1. Contabo 서버 SSH 접속
2. 코드 clone: `git clone https://github.com/bklee/survivors-game-project.git`
3. `infra/.env` 생성:
   ```
   POSTGRES_DB=survivors
   POSTGRES_USER=survivors_app
   POSTGRES_PASSWORD=<강력한 비밀번호>
   ```
4. `cd infra && docker-compose up -d`
5. 확인: `docker-compose ps` (postgres + postgres_backup 둘 다 healthy)

## 외부 접근
- PostgreSQL은 `127.0.0.1:5432`로만 노출 (외부 차단)
- 게임 백엔드 API가 별도 컨테이너로 PostgreSQL 접속 (Phase 2 작업)
- 또는 일단 직접 game JS에서 접근 (보안 위험, Phase 2 권장)

## 백업
- `./backups/dump_YYYYMMDD_HHMMSS.sql.gz` 자동 생성 (24시간 주기)
- 7일 보관

## 복구
```
docker-compose exec postgres psql -U survivors_app -d survivors < /backups/dump_<날짜>.sql
```

## 모니터링
- Sentry 무료 티어 (5K events/월) — Phase 2에서 통합
- 단기: `docker logs survivors-postgres` 확인
```

- [ ] **Step 4: 검증 + 커밋**

```bash
git add infra/
git commit -m "feat(infra): add Contabo PostgreSQL docker-compose + schema + deployment guide"
```

> 실제 Contabo 배포는 사용자 수행. plan은 코드 산출물만.

---

## Task 5: Lemon Squeezy 결제 클라이언트

**Files:**
- Create: `src/integrations/LemonSqueezy.ts`
- Test: `tests/integrations/LemonSqueezy.test.ts`

> 사용자 직접: Lemon Squeezy 가입 + 상품 생성 (No-Ads Pass ₩5,500). Plan은 클라이언트 코드만.

- [ ] **Step 1: LemonSqueezy.ts**

```typescript
// LS 결제 URL 생성 + 결제 완료 후 webhook 수신은 백엔드 (Phase 2)
// Phase 1: 결제 URL 클릭 → LS 호스팅 결제 페이지 → 완료 후 게임 복귀

export interface PaymentProduct {
    id: string;
    name: string;
    priceKrw: number;
    lsCheckoutUrl: string; // LS에서 발급한 결제 URL
}

export const PRODUCTS: Record<string, PaymentProduct> = {
    no_ads_pass: {
        id: 'no_ads_pass',
        name: 'No-Ads Pass',
        priceKrw: 5500,
        lsCheckoutUrl: import.meta.env.VITE_LS_NO_ADS_URL || '',
    },
};

export class LemonSqueezy {
    /** 결제 시작 — LS 호스팅 페이지로 리다이렉트 */
    static checkout(productId: string, deviceId: string): void {
        const product = PRODUCTS[productId];
        if (!product || !product.lsCheckoutUrl) {
            console.error('Product not configured:', productId);
            return;
        }
        // 결제 완료 후 게임 복귀 URL + deviceId를 LS custom data로 전달
        const url = new URL(product.lsCheckoutUrl);
        url.searchParams.set('checkout[custom][device_id]', deviceId);
        window.location.href = url.toString();
    }

    /** 결제 상태 조회 — 임시 LocalStorage 확인 (백엔드 webhook 통합 전) */
    static hasProduct(productId: string): boolean {
        // Phase 1: LocalStorage. Phase 2: 서버 API 조회.
        const stored = localStorage.getItem(`ls_owned_${productId}`);
        return stored === 'true';
    }

    /** 결제 완료 콜백 (LS success URL로 돌아왔을 때) */
    static handleSuccessRedirect(): void {
        const params = new URLSearchParams(window.location.search);
        if (params.get('ls_success') === '1') {
            const product = params.get('product');
            if (product) {
                localStorage.setItem(`ls_owned_${product}`, 'true');
                // 사용자에게 감사 메시지
                alert('결제 완료! 광고가 제거됩니다.');
                window.history.replaceState({}, '', window.location.pathname);
            }
        }
    }
}
```

- [ ] **Step 2: 환경변수 템플릿**

`.env.example`:
```
VITE_LS_NO_ADS_URL=https://your-store.lemonsqueezy.com/buy/xxx-xxx-xxx
VITE_API_BASE_URL=https://games.blocktalker.co.kr/api
```

`.gitignore`에 `.env` 추가 확인.

- [ ] **Step 3: 단위 테스트**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LemonSqueezy, PRODUCTS } from '../../src/integrations/LemonSqueezy';

describe('LemonSqueezy', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('hasProduct: 미구매 상품은 false', () => {
        expect(LemonSqueezy.hasProduct('no_ads_pass')).toBe(false);
    });

    it('LocalStorage 설정 시 hasProduct true', () => {
        localStorage.setItem('ls_owned_no_ads_pass', 'true');
        expect(LemonSqueezy.hasProduct('no_ads_pass')).toBe(true);
    });

    it('handleSuccessRedirect: ls_success=1이면 owned 저장', () => {
        const originalLocation = window.location;
        delete (window as any).location;
        (window as any).location = { search: '?ls_success=1&product=no_ads_pass', pathname: '/' };
        window.history.replaceState = vi.fn();
        
        LemonSqueezy.handleSuccessRedirect();
        expect(localStorage.getItem('ls_owned_no_ads_pass')).toBe('true');
        
        (window as any).location = originalLocation;
    });
});
```

- [ ] **Step 4: main.ts에서 success redirect 처리**

```typescript
import { LemonSqueezy } from './integrations/LemonSqueezy';

// before Phaser.Game
LemonSqueezy.handleSuccessRedirect();
```

- [ ] **Step 5: 커밋**

```bash
git add src/integrations/LemonSqueezy.ts tests/integrations/LemonSqueezy.test.ts .env.example
git commit -m "feat(payments): Lemon Squeezy client + checkout + success redirect handler"
```

---

## Task 6: 광고 + IAP UI 통합

**Files:**
- Modify: `src/scenes/GameOverScene.ts` (광고 보고 부활 버튼)
- Modify: `src/scenes/UpgradeScene.ts` (광고 보고 카드 1장 더)
- Modify: `src/scenes/MainScene.ts` (No-Ads Pass 구매 버튼 — 시작 메뉴 또는 옵션)

- [ ] **Step 1: GameOverScene "광고 보고 부활" 버튼**

```typescript
import { PokiSDK } from '../integrations/PokiSDK';
import { LemonSqueezy } from '../integrations/LemonSqueezy';

// GameOverScene.create() 끝
// No-Ads Pass 구매자는 보상형 광고로 직접 부활 (광고 X)
const hasNoAds = LemonSqueezy.hasProduct('no_ads_pass');
const reviveBtn = this.add.text(this.scale.width / 2, this.scale.height - 100, 
    hasNoAds ? '✦ 부활' : '🎬 광고 보고 부활', 
    { fontSize: '28px', color: '#ffd700', backgroundColor: '#333', padding: { x: 16, y: 8 } }
).setOrigin(0.5).setInteractive({ useHandCursor: true });

reviveBtn.on('pointerdown', async () => {
    if (!hasNoAds) {
        const ok = await PokiSDK.rewardedBreak();
        if (!ok) return; // 광고 시청 안 끝남
    }
    // 부활 — MainScene 재시작 또는 player Health 복원
    this.scene.start('MainScene', { revive: true, /* ... */ });
});
```

- [ ] **Step 2: UpgradeScene "카드 1장 더" 옵션**

```typescript
// UpgradeScene.create() 끝 — 4번째 카드 슬롯
const hasNoAds = LemonSqueezy.hasProduct('no_ads_pass');
const extraCardBtn = this.add.text(this.scale.width / 2, this.scale.height - 60,
    '🎬 광고 보고 카드 1장 더',
    { fontSize: '20px', color: '#888', backgroundColor: '#222', padding: { x: 12, y: 6 } }
).setOrigin(0.5).setInteractive({ useHandCursor: true });
extraCardBtn.on('pointerdown', async () => {
    const ok = hasNoAds || await PokiSDK.rewardedBreak();
    if (ok) {
        // 4번째 카드 추가 표시
        this.addExtraCard();
        extraCardBtn.destroy();
    }
});
```

- [ ] **Step 3: 시작 메뉴 No-Ads Pass 구매 버튼**

TitleScene 또는 MainScene 옵션 메뉴에:

```typescript
const noAdsBtn = this.add.text(/* 위치 */, '광고 제거 (₩5,500)', { /* style */ })
    .setInteractive({ useHandCursor: true });
noAdsBtn.on('pointerdown', () => {
    const deviceId = localStorage.getItem('device_id') || 'unknown';
    LemonSqueezy.checkout('no_ads_pass', deviceId);
});

// 이미 구매한 경우 버튼 숨김
if (LemonSqueezy.hasProduct('no_ads_pass')) {
    noAdsBtn.setVisible(false);
}
```

- [ ] **Step 4: device_id 생성 (Player 식별)**

`src/core/Identity.ts`:

```typescript
export class Identity {
    static getDeviceId(): string {
        let id = localStorage.getItem('device_id');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('device_id', id);
        }
        return id;
    }
}
```

- [ ] **Step 5: 검증 + 커밋**

---

## Task 7: M4 Phase 1 통합 검증

- [ ] **Step 1**: 자동 검증 (tsc/test/build/audit)
- [ ] **Step 2**: 수동 검증 (사용자 직접)
  - [ ] Chrome에서 "Add to Home Screen" 표시 (PWA)
  - [ ] Service Worker 등록 (DevTools → Application → SW)
  - [ ] No-Ads Pass 버튼 클릭 → LS checkout URL로 이동
  - [ ] LS 결제 완료 후 ls_success URL로 복귀 → LocalStorage 'ls_owned_no_ads_pass' = 'true'
  - [ ] 광고 트리거 5종 (PokiSDK가 console 호출 — 실제 광고는 Poki 등록 후)
- [ ] **Step 3**: M4 Phase 1 회고 + 커밋

### 검증 게이트 (Phase 2 진입 조건)
- [ ] PWA 설치 가능
- [ ] Lemon Squeezy 가입 + No-Ads Pass 상품 생성 + 테스트 결제 1회 성공
- [ ] Contabo PostgreSQL 가동 (docker-compose up)
- [ ] Poki SDK 호출 코드 통합 (실 게임 등록은 D90 근처)

---

## Self-Review

### Spec Coverage
| Spec (commercialization-plan §3) | Plan Task |
|--------------------------------|-----------|
| PWA manifest.json | Task 1 |
| Service Worker | Task 1, 2 |
| Poki SDK 통합 | Task 3 |
| 광고 5종 트리거 포인트 | Task 3, 6 |
| Contabo PostgreSQL | Task 4 |
| Lemon Squeezy 결제 | Task 5 |
| No-Ads Pass IAP | Task 5, 6 |
| 검증 게이트 | Task 7 |

### Open Questions
- **vite-plugin-pwa vs 수동 sw.js**: 자산 hash 처리 어려움 → 권장은 plugin. 시간 절약 시 manual.
- **Poki 광고 실 노출**: Poki 게임 등록 + 심사 통과 (2-6주) 후 가능. Phase 1은 호출 코드만 통합.
- **Contabo 백엔드 API**: 게임 JS가 PostgreSQL 직접 접근하면 자격증명 노출. **Phase 2에 백엔드 API 컨테이너 추가** 권장.
- **LS Webhook 수신**: 결제 완료 후 LS가 백엔드로 webhook. Phase 2에 endpoint 추가. Phase 1은 ls_success redirect만.
- **IAP 결제 검증**: LocalStorage 'ls_owned_*'는 변조 가능. Phase 2에서 서버 측 검증 필수.

### 사용자 직접 수행 (D1-D7)
1. Lemon Squeezy 가입 + No-Ads Pass 상품 생성 + LS Checkout URL 발급
2. Poki Developer 가입 + 게임 등록 + SDK key (실 광고는 D90 근처)
3. Contabo SSH 접속 + Docker 설치 확인
4. 도메인 DNS (서브도메인 `games.blocktalker.co.kr` → Contabo IP)
5. 아이콘 디자인 (선택 — 우선 placeholder)

### 시간 추정 (주말 기준)
- Task 1 (PWA 기본): 3-4시간
- Task 2 (vite-plugin-pwa): 2시간 (선택)
- Task 3 (Poki SDK): 3-4시간 (코드 + 통합)
- Task 4 (Contabo 스키마): 2-3시간
- Task 5 (LS 클라이언트): 2-3시간
- Task 6 (광고 UI): 3-4시간
- Task 7 (검증): 2-3시간

**총 16-20시간** = 주말 4-5회 = **4-5주**

---

## Execution Handoff

Plan complete. Subagent-Driven 실행 시 Task 1부터.

**P1 사용자 결정**:
- vite-plugin-pwa 사용 여부 (선택)
- 아이콘 디자인 (Task 1 placeholder 또는 사용자 제작)
- LS 가입 결과 (D7 안에 검증)
