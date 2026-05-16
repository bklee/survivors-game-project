# M4 Phase 1 회고 (PWA + Poki + Contabo + Lemon Squeezy)

**완료일**: 2026-05-16
**브랜치**: worktree-feat+m4-phase1
**구현 방식**: Subagent-Driven Development

## ✅ 자동 검증 게이트 통과

| 항목 | 결과 |
|------|------|
| TypeScript | ✅ 0 errors |
| Unit Tests | ✅ **48/48** (8 files, 676ms) |
| Build | ✅ 1.89s |
| npm audit | ✅ 0 vulnerabilities |

## 📦 구현 완료

### PWA (Task 1, 2)
- ✅ `public/manifest.json` (Magicka Survivors, landscape, fullscreen)
- ✅ `public/sw.js` Service Worker (캐싱 + 오프라인 fallback)
- ✅ 임시 아이콘 (192/512 황금색 placeholder)
- ✅ `index.html` manifest 링크 + SW 등록
- ⏭️ vite-plugin-pwa는 선택 사항으로 보류 (수동 SW로 충분)

### Poki SDK (Task 3)
- ✅ `src/integrations/PokiSDK.ts` 래퍼 클래스
- ✅ `index.html` Poki SDK 외부 스크립트 로드
- ✅ `main.ts` 초기화
- ✅ MainScene `gameplayStart`/`gameplayStop` 통합
- ✅ GameOverScene `광고 보고 부활` 버튼 (1회 한정)
- ✅ UpgradeScene `광고 보고 카드 1장 더` 버튼

### Contabo PostgreSQL (Task 4)
- ✅ `infra/docker-compose.yml` (postgres 16-alpine + 백업 컨테이너)
- ✅ `infra/postgres/init.sql` (4 테이블: players, purchases, leaderboard, events)
- ✅ `infra/.env.example` + `.gitignore`
- ✅ `infra/README.md` 배포 가이드

### Lemon Squeezy (Task 5)
- ✅ `src/core/Identity.ts` device_id 생성 (crypto.randomUUID)
- ✅ `src/integrations/LemonSqueezy.ts` checkout + success redirect + hasProduct
- ✅ `.env.example` LS 환경변수 템플릿
- ✅ `main.ts` 결제 success redirect 처리

### No-Ads Pass IAP UI (Task 6)
- ✅ TitleScene `광고 제거 ₩5,500` 구매 버튼
- ✅ 보유 시 `✦ No-Ads Pass 활성` 표시
- ✅ GameOverScene/UpgradeScene 광고 분기 (보유자는 즉시 혜택)

## 🧪 신규 단위 테스트

- `PokiSDK.test.ts` — 4개 (SDK 미로드/로드/rewardedBreak 분기)
- `LemonSqueezy.test.ts` — 5개 (hasProduct/setOwned/handleSuccessRedirect/checkout)
- 기존 39 + 신규 9 = **48 tests passing**

## 📊 통계

- 총 커밋: 5개 (PWA / Poki / Contabo / LS / IAP UI)
- 신규 파일: 13개
  - PWA: manifest.json, sw.js, icon-192.png, icon-512.png
  - Integrations: PokiSDK.ts, LemonSqueezy.ts, Identity.ts
  - Infra: docker-compose.yml, init.sql, .env.example, .gitignore, README.md
  - Tests: PokiSDK.test.ts, LemonSqueezy.test.ts
- 수정 파일: 6개 (index.html, main.ts, MainScene, GameOverScene, UpgradeScene, TitleScene, vite-env.d.ts)
- 추가 코드: 약 900줄

## ⚠️ 사용자 직접 수행 (D1-D7 이후)

1. **Lemon Squeezy 가입** + No-Ads Pass 상품 생성 + Checkout URL 발급 → `.env`의 `VITE_LS_NO_ADS_URL` 설정
2. **Poki Developer 가입** + 게임 등록 (D90 근처, 실 광고 활성)
3. **Contabo 배포**: SSH 접속 + `cd infra && docker-compose up -d`
4. **도메인 DNS**: `games.blocktalker.co.kr` → Contabo IP
5. **아이콘 자체 제작** (선택 — placeholder 대체)

## 🚧 M4 Phase 2 후속 작업

### 필수
- **백엔드 API 컨테이너** (Node.js/Express)
  - `/api/leaderboard` 제출/조회
  - `/api/events` 분석 이벤트 수집
  - `/api/ls-webhook` Lemon Squeezy webhook 수신 + 서명 검증
- **Nginx reverse proxy + SSL** (Let's Encrypt)
- **device_id ↔ player 매핑** (PostgreSQL players 테이블)
- **결제 검증**: LocalStorage 'ls_owned_*'는 변조 가능 → 서버 측 검증

### 선택
- vite-plugin-pwa (자산 hash 자동화)
- 데일리 보너스 (rewardedBreak)
- Sentry 무료 통합

## 🎯 M4 Phase 2 진입 조건

- ✅ 자동 검증 게이트 통과
- ⏳ 사용자: Lemon Squeezy 가입 + Checkout URL 발급 + `.env` 설정
- ⏳ 사용자: Contabo 배포 + PostgreSQL 작동
- ⏳ 수동 테스트: PWA 설치 가능 + LS checkout redirect 작동

## 🎬 D1-D7 즉시 액션 5개 (상업화 plan 인용)

1. **Lemon Squeezy 가입 시도** (2-3시간, 최우선)
2. **PWA manifest 작성** ← ✅ M4 Phase 1 Task 1에서 완료
3. **Poki SDK 사전 조사** (1시간) — 본격 등록은 D90 근처
4. **Contabo PostgreSQL 컨테이너 셋업** (2시간) ← 본 Phase 1에서 코드 완성, 배포는 사용자
5. **`.omc/plans/m4-phase1-checklist.md` 체크리스트** ← M4 Phase 1 본 plan + retrospective가 대체

## 🚀 다음 마일스톤

**M4 Phase 2** (W5-8, 주말 4-5주 추가):
- 백엔드 API + Nginx
- 결제 webhook 검증
- 분석 이벤트 수집
- 리더보드 제출/조회

**M5** (D180 결제 10건+ 달성 시):
- 콘텐츠 확장 (시즌 패스, 추가 캐릭터, 신규 시너지)
