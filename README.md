# Magicka Survivors

Vampire Survivors 스타일의 탑다운 액션 로그라이트 웹 게임. Phaser 3 + bitECS 아키텍처로 구축한 PWA 게임입니다. (코드 저장소명: `survivors-game-project`)

## 개요

GameDistribution 플랫폼을 통해 배포되는 웹 기반 액션 게임입니다. 6개 캐릭터, 6가지 원소(Fire, Ice, Lightning, Poison, Earth, Air)의 연금술 시너지, 유물 시스템, 메타 스킬트리 등 게임플레이 깊이를 갖추고 있습니다.

- **플랫폼**: 웹 기반 PWA (모바일 가로모드 지원)
- **엔진**: Phaser 3.88 + bitECS (ECS 아키텍처)
- **배포**: GameDistribution CDN + Contabo VPS (API + PostgreSQL)
- **언어**: TypeScript, 한글/영문 i18n 지원

## 기술 스택

| 카테고리 | 기술 | 버전 |
|---------|------|------|
| **엔진/런타임** | Phaser | ^3.88.2 |
| | bitECS | ^0.3.39 |
| | rot-js (던전 생성) | ^2.2.1 |
| **빌드/언어** | Vite | ^6.2.0 |
| | TypeScript | ^5.8.2 |
| **테스트** | Vitest | ^4.1.6 |
| | Playwright | ^1.58.2 |
| | jsdom | ^29.1.1 |
| **린트/포맷** | ESLint | ^9.21.0 |
| | Prettier | ^3.5.2 |
| | husky + lint-staged | ^9.1.7, ^15.4.3 |
| **백엔드** | Express | (backend/package.json) |
| | PostgreSQL | 16 (Docker) |

## 시작하기

### 요구사항

- Node.js 18+ 및 npm 9+
- (선택) Docker & docker-compose (백엔드/인프라 실행 시)

### 설치

```bash
git clone https://github.com/bklee/survivors-game-project.git
cd survivors-game-project
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 을 엽니다.

- 웹폰트(Cinzel Decorative, Jua, MedievalSharp)가 로드될 때까지 게임이 시작되지 않습니다.
- Vite 개발 서버는 `/api/*` 호출을 프로덕션 백엔드로 자동 프록시합니다.

### 빌드

```bash
npm run build
```

프로덕션 빌드는 `dist/` 디렉토리에 생성되며, base path `/survivors/`로 설정됩니다.

GameDistribution CDN 호스팅용 빌드:

```bash
npm run build -- --mode gd
```

base path가 `./`로 설정되어 zip 파일로 배포 가능합니다.

### 미리보기

```bash
npm run preview
```

`http://localhost:4173`에서 프로덕션 빌드를 로컬에서 미리봅니다.

## 사용 가능한 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | Vite 개발 서버 시작 (port 3000) |
| `npm run build` | 프로덕션 빌드 (base: `/survivors/`) |
| `npm run preview` | 빌드 결과 로컬 미리보기 |
| `npm run lint` | ESLint로 TypeScript 파일 검사 |
| `npm run format` | Prettier로 TypeScript 파일 포맷 |
| `npm test` | Vitest로 단위 테스트 실행 (한 번) |
| `npm run test:watch` | Vitest 감시 모드 |
| `npm run test:ui` | Vitest UI 대시보드 실행 |

husky + lint-staged가 설정되어 있어, 커밋 시 자동으로 `prettier` + `eslint --fix`가 실행됩니다.

## 프로젝트 구조

```
survivors-game-project/
├── src/
│   ├── main.ts              # Phaser 게임 초기화, Scene 등록
│   ├── errorLogger.ts       # 에러 추적
│   ├── vite-env.d.ts        # TypeScript 타입 정의
│   │
│   ├── scenes/              # Phaser Scene (13개)
│   │   ├── BootScene.ts
│   │   ├── TitleScene.ts
│   │   ├── CharacterSelectScene.ts
│   │   ├── MainScene.ts     # 메인 게임 루프
│   │   ├── UIScene.ts
│   │   ├── UpgradeScene.ts
│   │   ├── GameOverScene.ts
│   │   └── ... (RecipeScene, SkillTreeScene, CodexScene 등)
│   │
│   ├── systems/             # bitECS System (10개+)
│   │   ├── PlayerSystem.ts
│   │   ├── PhysicsSystem.ts
│   │   ├── RenderSystem.ts
│   │   ├── CombatSystem.ts
│   │   ├── ItemSystem.ts
│   │   ├── WaveSystem.ts
│   │   └── ... (AlchemySystem, SpellSystem, RelicSystem 등)
│   │
│   ├── components/          # ECS 컴포넌트 (위치, 물리, 렌더링 등)
│   ├── constants/           # 게임 설정
│   │   ├── CharacterConfig.ts
│   │   ├── AlchemyConfig.ts
│   │   ├── RelicConfig.ts
│   │   ├── EvolutionConfig.ts
│   │   ├── SkillTreeConfig.ts
│   │   ├── ChapterConfig.ts
│   │   └── GameConfig.ts
│   │
│   ├── core/                # 핵심 게임 로직
│   │   ├── DungeonGenerator.ts  # rot-js 기반 던전 생성
│   │   ├── MetaProgress.ts      # 메타 진행, 언락, 코인
│   │   ├── SaveSystem.ts        # 저장/로드
│   │   ├── World.ts             # bitECS World 관리
│   │   └── ... (Identity, SpatialHash 등)
│   │
│   ├── ui/                  # UI 컴포넌트 (버튼, 패널, 텍스트)
│   ├── fx/                  # 이펙트 (입자, 애니메이션)
│   ├── audio/               # 사운드 에셋
│   ├── assets/              # 이미지 에셋 (0x72 던전 타일셋 등)
│   │
│   ├── i18n/                # 국제화
│   │   ├── I18n.ts          # 언어 전환 (ko/en)
│   │   └── strings.ts       # 문자열 저장소
│   │
│   ├── integrations/        # 외부 서비스
│   │   ├── AdSDK.ts         # GameDistribution 광고
│   │   ├── ApiClient.ts     # 백엔드 API 호출
│   │   └── QuestClient.ts
│   │
│   └── worker/              # 적응형 물리 (AdaptivePhysics)
│
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── server.ts        # Express 서버, 라우터 등록
│   │   ├── db/
│   │   │   └── pool.ts      # PostgreSQL 연결 풀
│   │   ├── routes/
│   │   │   ├── leaderboard.ts
│   │   │   ├── player.ts
│   │   │   ├── daily-reward.ts
│   │   │   ├── quests.ts
│   │   │   └── webhook.ts   # Lemon Squeezy 결제 webhook
│   │   └── ...
│   ├── Dockerfile
│   ├── package.json
│   └── vitest.config.ts
│
├── infra/                   # 인프라 (Docker Compose)
│   ├── docker-compose.yml   # PostgreSQL + 백업 + API
│   ├── README.md            # 배포 상세 가이드
│   └── .env.example
│
├── public/                  # PWA 정적 자산
│   ├── manifest.json        # PWA 매니페스트
│   ├── sw.js                # 서비스 워커
│   ├── icon-192.png
│   ├── icon-512.png
│   └── ...
│
├── index.html               # 게임 엔트리 (Vite, 루트)
├── vite.config.ts           # Vite 설정 (chunk 분리, proxy)
├── tsconfig.json
├── eslint.config.js
├── .prettierrc
├── .husky/                  # Pre-commit hook
├── package.json
├── package-lock.json
└── README.md
```

### 아키텍처 개요

**ECS (Entity Component System)**

bitECS를 사용하여 게임 객체를 데이터 지향적으로 관리합니다:
- **Components**: 엔티티 속성 (위치, 체력, 렌더링 데이터 등)
- **Systems**: 매 프레임마다 실행되는 로직 (물리 갱신, 렌더링, 전투 계산 등)
- **World**: 모든 엔티티와 컴포넌트를 관리하는 중앙 저장소

데이터가 메모리에 연속 배치(SoA)되어 캐시 친화적이며, 다수 엔티티를 효율적으로 처리합니다.

## 게임 시스템

### 캐릭터 (6종)

각 캐릭터는 기본 스탯(체력, 속도, 공격력, 마나)과 고유한 스프라이트를 갖습니다:

| 캐릭터 | 체력 | 속도 | 공격력 | 마나 | 잠금 | 설명 |
|--------|------|------|--------|------|------|------|
| **Knight** | 120 | 100 | 1.2 | 0 | - | 균형잡힌 전사 |
| **Wizard** | 80 | 120 | 1.5 | 100 | - | 마나 기반 마법사 |
| **Elf** | 100 | 180 | 1.1 | 80 | - | 가장 빠른 궁수 |
| **Dwarf** | 180 | 80 | 1.5 | 0 | - | 가장 튼튼한 전사 |
| **Lizard** | 100 | 95 | 1.0 | 80 | 5000 코인 | 도마뱀 전사, 푸른 마법탄 발사 |
| **Necromancer** | 80 | 110 | 1.4 | 120 | 7500 코인 | 어둠의 마법사, 소울 볼트 발사 |

### 원소 및 연금술 시너지

6가지 원소 조합으로 최대 20가지 시너지를 만들 수 있습니다. 각 시너지는 게임 중 3개 원소 슬롯을 채울 때 자동 활성화됩니다.

**원소**: Fire(🔥), Ice(❄️), Lightning(⚡), Poison(☠️), Earth(🪨), Air(💨)

**시너지 예시**:
- **Plasma Storm**: Fire + Lightning + Ice → 30프레임마다 화면 무작위 위치에 번개 폭풍 (300 피해)
- **Tempest**: Ice + Lightning + Air → 플레이어 주변 회오리 (반경 200, 둔화+연쇄)
- **Volcanic Plague**: Fire + Poison + Earth → 적 사망 시 독 구덩이 (5초, 지속 피해 8%)

### 유물 시스템

플레이 중 얻는 유물은 영구적인 스탯 증가를 제공합니다.

### 무기/스킬 진화

무기와 스킬은 특정 조건에서 더 강력한 형태로 진화합니다.

### 메타 스킬트리

게임 오버 후 메타 진행을 통해 영구 업그레이드를 언락하는 스킬트리 시스템입니다.

### 챕터 및 웨이브

게임은 다양한 스테이지(챕터)와 점진적으로 어려워지는 웨이브 구조를 갖습니다.

### 일일 보상 및 퀘스트

플레이어는 매일 로그인 보상을 받을 수 있으며, 퀘스트를 완료하여 추가 보상을 얻습니다.

### 리더보드

플레이어 점수가 백엔드에 기록되고 글로벌 리더보드에 표시됩니다.

### 코덱스

게임의 모든 캐릭터, 유물, 스킬, 원소 정보를 담은 도감입니다.

## PWA 및 플랫폼

### 서비스 워커

`public/sw.js`가 자동으로 정적 자산을 캐시합니다. 오프라인에서도 게임 플레이가 가능합니다.

### 웹 앱 설치

`public/manifest.json`에 정의된 PWA 매니페스트에 따라 모바일 기기에 앱으로 설치할 수 있습니다:
- 앱 이름: "Magicka Survivors"
- 표시 모드: fullscreen
- 방향: landscape (가로 모드 강제)
- 언어: 한국어(ko)

### GameDistribution SDK

환경변수 `VITE_GD_GAME_ID`가 설정되면 GameDistribution SDK를 동적으로 로드합니다.

```bash
# 빌드 시 GD 모드 활성화
VITE_GD_GAME_ID=your-game-id npm run build -- --mode gd
```

SDK는 게임 로드 완료 시 콜백하여 광고 및 분석을 지원합니다.

### 광고

`AdSDK`는 GameDistribution 플랫폼의 광고 API를 관리합니다. 플레이어는 무광고 패스를 Lemon Squeezy를 통해 구매할 수 있습니다.

## 백엔드 및 배포

### 백엔드 API

`backend/` 디렉토리의 Node.js + Express 서버는 다음 엔드포인트를 제공합니다:

- `/api/health` — 헬스 체크
- `/api/leaderboard/*` — 리더보드 조회/업데이트
- `/api/events/*` — 게임 이벤트(분석) 수집
- `/api/player/*` — 플레이어 데이터 (프로필, 통계)
- `/api/daily-reward/*` — 일일 보상
- `/api/quests/*` — 퀘스트 조회/완료
- `/api/ls-webhook` — Lemon Squeezy 결제 webhook (HMAC 검증)
- `/api/admin/*` — 관리자(admin) 대시보드 (읽기 전용)

PostgreSQL 16 데이터베이스에 연결하여 플레이어 데이터를 영구 저장합니다.

### 인프라

배포는 Contabo VPS + Docker + Nginx Proxy Manager를 기반으로 합니다.

**자세한 배포 절차는 [infra/README.md](infra/README.md)를 참고하세요.**

핵심 단계:

1. 환경변수 설정 (`.env.deploy`)
2. 로컬 빌드: `npm run build`
3. 배포 스크립트 실행:
   ```bash
   ./deploy-stack.exp              # 전체 배포 (클라이언트 + 서버)
   ./deploy-stack.exp --client-only # 클라이언트만
   ./deploy-stack.exp --server-only # 서버만
   ```

### 환경변수

프로젝트 루트에 `.env` 및 `.env.deploy` 파일 예시:

```bash
# 클라이언트 (.env.example)
VITE_LS_NO_ADS_URL=<Lemon Squeezy Checkout URL>
VITE_API_BASE_URL=https://games.blocktalker.co.kr/api

# GameDistribution 빌드 (.env.gd)
VITE_GD_GAME_ID=<GameDistribution Game ID>

# 배포 (.env.deploy, .env.deploy.example)
STACK_REMOTE_DIR=/home/docker/games/survivors
DEPLOY_HOST=user@your-vps-ip
DEPLOY_KEY=/path/to/ssh/key
API_HEALTH_URL=https://games.blocktalker.co.kr/survivors/api/health
```

## 테스트 및 품질 보증

### 단위 테스트

```bash
npm test           # 한 번 실행
npm run test:watch # 감시 모드
npm run test:ui    # UI 대시보드
```

Vitest와 jsdom을 사용하여 게임 로직을 테스트합니다.

### E2E 테스트

Playwright를 사용한 엔드-투-엔드 테스트 설정이 있습니다.

### 린트 및 포맷

```bash
npm run lint       # ESLint 검사 (typescript-eslint)
npm run format     # Prettier로 자동 포맷
```

위 검사는 husky + lint-staged 로 커밋 시 자동 실행됩니다(상단 [사용 가능한 스크립트](#사용-가능한-스크립트) 참고).

## 문서

- **[infra/README.md](infra/README.md)** — 배포 및 인프라 상세 가이드

## 라이선스

ISC

---

**더 많은 정보**:
- GitHub: https://github.com/bklee/survivors-game-project
- 배포: https://games.blocktalker.co.kr/survivors/
- GameDistribution: https://gamedistribution.com/
