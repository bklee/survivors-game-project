# M4 Phase 2 회고 (Backend API + Nginx + LS Webhook + 분석 이벤트)

**완료일**: 2026-05-16
**브랜치**: worktree-feat+m4-phase2
**구현 방식**: Subagent-Driven Development (Task 1-8)

## ✅ 자동 검증 게이트 통과

| 항목 | 결과 |
|------|------|
| Backend TypeScript | ✅ 0 errors |
| Backend Unit Tests | ✅ **37/37** (5 files, 202ms) |
| Backend Build | ✅ tsc clean |
| Client TypeScript | ✅ 0 errors |
| Client Unit Tests | ✅ **48/48** (8 files, 672ms) |
| Client Build (Vite) | ✅ 1.85s |
| docker-compose YAML | ✅ services parse (postgres, postgres_backup, api, nginx, certbot) |

## 📦 구현 완료

### Task 1: Express 부트스트랩 (사전 커밋)
- ✅ `backend/package.json` (express 4.21, pg 8.13, zod 3.23, tsx, vitest, supertest)
- ✅ `backend/tsconfig.json` ES2022 / ESNext
- ✅ `backend/src/db/pool.ts` PostgreSQL 연결 풀
- ✅ `backend/src/server.ts` 헬스 체크 + CORS + 에러 핸들러
- ✅ `backend/tests/health.test.ts` (DB 정상/실패 2 케이스)

### Task 2: Leaderboard API
- ✅ `POST /api/leaderboard` — device_id로 player upsert, score insert
- ✅ `GET /api/leaderboard?limit=N` — Top N (cap 100)
- ✅ zod 스키마 검증 (character_id enum = 인게임 6 캐릭터)
- ✅ 통합 테스트 6/6 (성공/검증 실패/DB 에러)

### Task 3: Events API (분석 이벤트 배치)
- ✅ `POST /api/events` — 1-50개 배치
- ✅ 단일 트랜잭션 (`BEGIN`/`COMMIT`/`ROLLBACK`)
- ✅ device_id 당 player upsert 1회 (배치 내 캐시)
- ✅ 통합 테스트 8/8 (배치/dedup/검증/롤백/release)

### Task 4: LS Webhook + HMAC 서명 검증
- ✅ `express.json` verify 훅으로 raw body 보존
- ✅ `lsSignature` 미들웨어 (timing-safe SHA-256 비교)
- ✅ `POST /api/ls-webhook` — order_created 이벤트 처리
- ✅ `ls_order_id UNIQUE` + `ON CONFLICT DO NOTHING` 멱등성
- ✅ no_ads_pass + paid 시 `players.no_ads_pass = TRUE`
- ✅ 통합 테스트 11/11 (서명/스키마/멱등/상태 전이/누락 처리)

### Task 5: Player API
- ✅ `GET /api/player/:device_id` — IAP 보유 + 메타 조회
- ✅ device_id 길이 검증 (8-64)
- ✅ 미존재 시 `{exists:false,no_ads_pass:false}` (클라이언트 폴백)
- ✅ 통합 테스트 5/5

### Task 6: Nginx + Dockerfile + docker-compose
- ✅ `backend/Dockerfile` 멀티스테이지 (builder + slim production)
- ✅ `backend/.dockerignore`
- ✅ `infra/nginx/nginx.conf`
  - HTTPS reverse proxy, gzip, rate limit (60r/m + burst 30)
  - 보안 헤더 (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
  - `/api/*` → `api:3001` (X-Signature 헤더 명시 전달)
  - `/` → 정적 PWA (`sw.js` no-cache, `/assets/` 1y immutable)
- ✅ `infra/docker-compose.yml` 3개 서비스 추가 (api, nginx, certbot)
- ✅ `infra/README.md` SSL 부트스트랩 + 자동 갱신 가이드

### Task 7: 클라이언트 ↔ 백엔드 통합
- ✅ `src/integrations/ApiClient.ts`
  - `getPlayer`, `submitLeaderboard`, `trackEvent` (배치), `flush`, `flushBeacon`
  - 4초 fetch 타임아웃 (AbortController), 실패 시 큐 보존 + 재시도
  - 5초 간격 또는 50개 도달 시 자동 flush
  - `pagehide`에서 `navigator.sendBeacon` best-effort 전송
- ✅ `LemonSqueezy.refreshFromServer` — 서버가 진실의 원천, LocalStorage 는 캐시
- ✅ `BootScene` 서버 동기화 + pagehide hook 등록
- ✅ `MainScene` session_start (게임 시작) + session_end + leaderboard 제출 (사망 시)

### Task 8: 검증 + 회고 (본 문서)
- ✅ 자동 검증 게이트 통과 (위 표)
- ⏳ 수동 검증 (Contabo 배포 후 사용자)

## 📊 통계

| 지표 | 값 |
|------|---|
| 총 커밋 | 7 (Task 1-7 + 회고) |
| 신규 파일 | 14 (backend 8, infra 1, client 1, tests 4) |
| 수정 파일 | 7 |
| 백엔드 LoC | ~620 (route + middleware + tests) |
| 클라이언트 LoC | ~140 (ApiClient + hook) |
| 신규 테스트 | 35 (백엔드) |
| API 엔드포인트 | 5 (health, leaderboard×2, events, ls-webhook, player) |

## 🚧 미해결 / 운영 항목 (Contabo 배포 시 수행)

1. **SSL 인증서 발급** — `docker-compose run --rm --service-ports certbot certonly --standalone -d games.blocktalker.co.kr ...` (one-time, README 가이드 따라)
2. **인증서 갱신 후 nginx reload** — 현재 자동 갱신은 동작하나 nginx 가 새 cert 를 픽업하려면 SIGHUP 필요. cron 또는 deploy hook 으로 보강 권장.
3. **LS_WEBHOOK_SECRET** — Lemon Squeezy dashboard 에서 받은 값을 `.env` 에 설정 후 `docker-compose up -d api` 재시작.
4. **수동 검증**
   - `curl https://games.blocktalker.co.kr/api/health` → `{status:ok, db:connected}`
   - LS test mode 결제 → webhook 수신 → `SELECT * FROM purchases;` 확인 → 다음 게임 시작에서 hasProduct true
   - 게임 종료 후 `SELECT * FROM leaderboard ORDER BY submitted_at DESC LIMIT 5;`
   - 30분 플레이 후 `SELECT event_type, COUNT(*) FROM events GROUP BY event_type;`

## ⚠️ Open Questions (해결 안 함, Phase 2.5 후속)

- **인증**: 여전히 device_id 무인증. LS Pro 전환 시 JWT 또는 OAuth 도입 검토.
- **환불 webhook**: `order_refunded` 이벤트는 현재 200 ignored 처리. 환불 정책 결정 후 `players.no_ads_pass = FALSE` 업데이트 로직 필요.
- **분석 백엔드**: 자체 events 테이블만 사용. PostHog/GA4 비교는 데이터 누적 후.
- **국제화**: 현재 한국어만. 클라이언트 i18n + 서버 응답 메시지 표준화는 미정.
- **레이트 리미트 단위**: nginx 60r/m per IP 는 첫 번째 방어선. 분석 이벤트가 폭주하면 API 레벨 토큰 버킷 필요.

## 🎯 Phase 2 평가

- **목적 달성**: 결제 검증 모델을 클라이언트 LocalStorage 신뢰 → 서버 webhook 검증으로 전환 완료.
- **리스크 감소**: 결제 위변조 방지, IAP 영구 보관, 분석 이벤트 수집 인프라 확보.
- **기술 부채**: nginx 인증서 갱신 후 reload 누락 가능성, 인증 부재. Phase 2.5 에서 처리.
- **다음 단계**: Phase 2.5 (인증 정식화 + 환불) 또는 Phase 3 (메타 진행 동기화 = cross-device save).
