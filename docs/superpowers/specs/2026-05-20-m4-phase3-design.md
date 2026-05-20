# M4 Phase 3 Design — Retention Loops + Dashboard

> **상태:** Draft (구현 전 검토 필요)
> **작성일:** 2026-05-20
> **작성자:** hangup2 (bkxx.2)
> **선행 단계:** M4 Phase 1 (PWA + Poki SDK + Contabo PG + LS IAP), M4 Phase 2 (Backend API + Nginx + LS Webhook)
> **다음 단계:** M4 Phase 4 (TBD — Phase 3 회고 후 결정)

---

## Overview

M4 Phase 2 까지 인프라/백엔드는 안정화되었다. 게임 클라이언트는 Poki SDK 광고로 수익화하고, 백엔드는 leaderboard·events·LS webhook·player API를 운영 중이지만 **사용자에게 노출되는 retention 장치가 부족**하다. Phase 3 의 핵심 질문은 다음과 같다.

> **"플레이어가 매일 게임으로 돌아올 이유가 있는가?"**

현재까지의 답은 "엔드리스 모드를 다시 도전하고 싶을 때" 정도다. Phase 3 는 이 비유 (intrinsic motivation) 위에 **daily/weekly 외부 보상 루프** 와 **사회적 비교 (leaderboard UI)** 를 얹어 D1/D7 retention 을 측정 가능한 수준으로 끌어올리는 단계다. 동시에, Phase 2 에서 수집한 events 테이블을 **읽기 전용 대시보드** 로 가시화하여 솔로 개발자가 다음 의사결정을 데이터 기반으로 내릴 수 있게 한다.

### Phase 3 의 비유

- Phase 1 = 집을 짓고 (PWA + 인프라)
- Phase 2 = 전기·수도를 연결했다 (Backend API)
- Phase 3 = **가구를 들여놓고 손님이 다시 찾아올 이유를 만든다**

Phase 3 는 새 게임 메커닉을 만들지 않는다. 기존 systems (essence, coin, character unlock, synergy, stage) 위에 **얇은 메타 레이어** 만 덧붙인다. 신규 컨텐츠 생산보다 기존 컨텐츠의 재방문 동선 설계가 우선이다.

### Phase 3 가 다루지 않는 것

이 단계는 명시적으로 다음을 **하지 않는다**:

- 신규 캐릭터, 신규 무기, 신규 시너지 추가
- 신규 스테이지/챕터/보스
- 새로운 IAP 상품 (Poki 광고 모델 유지)
- 본격적인 PvP/길드/소셜 기능
- 자체 회원가입/이메일 인증 (device_id 모델 유지)
- 모바일 네이티브 빌드 (Capacitor/Cordova)

이런 큰 변화는 Phase 4 이후로 미룬다.

---

## Goals & Non-goals

### Goals

1. **D1 retention 측정 가능화.** "어제 플레이한 사람 중 오늘 다시 온 비율" 을 대시보드에서 한 눈에 볼 수 있게 한다.
2. **재방문 트리거 1개 이상 추가.** 일일 보상 또는 일일 퀘스트 중 **최소 하나** 는 출시 가능 상태로 만든다.
3. **Leaderboard 의 가치 잠금 해제.** Phase 2 에서 만든 leaderboard 백엔드를 **클라이언트 UI 와 연결** 하여 사용자가 비교를 통해 동기 부여 받을 수 있게 한다.
4. **운영 가시성 확보.** DAU, top characters, avg stage reached, ad funnel 을 솔로 개발자가 5분 안에 확인할 수 있는 read-only HTML 대시보드 구축.
5. **무엇이 작동하는지에 대한 의사결정 근거 확보.** Phase 4 의 방향성을 Phase 3 종료 시점의 데이터로 결정한다.

### Non-goals

- **백엔드 재설계 없음.** Phase 2 의 Express + pg + JSONB 구조를 그대로 활용한다. ORM 도입, 마이그레이션 도구 도입 (Prisma/Drizzle 등) 보류.
- **별도 어드민 인증 시스템 없음.** Phase 3 의 대시보드는 **Basic Auth 또는 단일 secret token** 으로 보호한다. SSO/OAuth 는 Phase 4 이후.
- **푸시 알림 필수 아님.** Web Push 는 "여유 시간이 남으면 PoC" 수준으로만 다룬다 (Section 5.3 참고).
- **A/B 테스팅 프레임워크 없음.** 일일 보상/퀘스트는 단일 버전으로 출시한다. A/B 는 데이터가 쌓인 후 Phase 4 에서 검토.
- **AI/추천 시스템 없음.** 일일 퀘스트는 정적 풀에서 랜덤 추출. ML 기반 개인화는 범위 외.
- **친구/길드/채팅 등 진성 소셜 없음.** Leaderboard 는 비식별 nickname 노출만.

### 성공 기준 (Success Criteria)

Phase 3 종료 후 다음 모든 항목이 충족되면 성공:

| 기준 | 측정 방법 |
|------|-----------|
| 일일 보상 UI 가 출시 가능 상태 | TitleScene 진입 시 streak 화면이 표시되고 essence 가 지급된다 |
| Leaderboard 가 클라이언트에서 조회 가능 | 게임 내 신규 Leaderboard tab/scene 에서 top 10 이 보인다 |
| 대시보드가 운영자에게 접근 가능 | `/survivors/admin` 또는 `/api/admin/dashboard` 로 접근하여 DAU/top character 가 보인다 |
| 회귀 없음 | Phase 2 의 leaderboard POST, events POST, LS webhook 이 모두 기존대로 동작 |
| 데이터로 다음 결정 가능 | "Phase 4 에서 신규 스테이지 vs 신규 캐릭터 중 무엇이 retention 에 더 기여할까?" 가설을 데이터로 좁힐 수 있다 |

---

## Architecture Overview

### High-Level Diagram

```
┌──────────────────────────────────────────────┐
│  Game Client (Phaser 3 + bitECS)              │
│                                                │
│  ┌─────────────┐  ┌──────────────┐            │
│  │ TitleScene  │→ │ DailyReward  │ (new)      │
│  └─────────────┘  │   Modal      │            │
│         ↓         └──────────────┘            │
│  ┌──────────────────┐                          │
│  │ CharacterSelect  │ + Leaderboard tab (new) │
│  └──────────────────┘                          │
│         ↓                                      │
│  ┌────────────┐    ┌────────────┐             │
│  │ MainScene  │ →  │ Quest      │ (new)       │
│  │ + tracking │    │ tracker    │             │
│  └────────────┘    └────────────┘             │
│                                                │
│         ↓ (HTTPS via NPM)                      │
└──────────────────────────────────────────────┘
            ↓
┌──────────────────────────────────────────────┐
│  Backend API (Express + pg)                    │
│                                                │
│  Existing:                                     │
│    /api/leaderboard  /api/events               │
│    /api/player/:id   /api/ls-webhook           │
│                                                │
│  New (Phase 3):                                │
│    GET  /api/daily-reward/:device_id           │
│    POST /api/daily-reward/claim                │
│    GET  /api/quests/:device_id                 │
│    POST /api/quests/progress                   │
│    GET  /api/leaderboard?window=weekly         │
│    GET  /api/admin/dashboard  (Basic Auth)     │
│    GET  /api/admin/dashboard.html              │
└──────────────────────────────────────────────┘
            ↓
┌──────────────────────────────────────────────┐
│  PostgreSQL                                    │
│                                                │
│  Existing: players, leaderboard, events,       │
│            purchases                           │
│                                                │
│  New (Phase 3):                                │
│    daily_rewards (claim 기록)                  │
│    quests (할당된 일일 퀘스트)                  │
│    quest_progress (진척도)                     │
│                                                │
│  No new tables for dashboard — 기존 events     │
│  + materialized view 1-2개로 충분              │
└──────────────────────────────────────────────┘
```

### 변경 표면 요약

| 영역 | 신규 | 수정 | 비고 |
|------|------|------|------|
| DB 스키마 | 3 테이블 + 1-2 view | 없음 | Phase 2 테이블 그대로 |
| Backend routes | `daily-reward.ts`, `quests.ts`, `admin.ts` | `leaderboard.ts` (window 파라미터) | 신규 라우터 3개 |
| Backend middleware | `basicAuth.ts` (admin 전용) | 없음 | 단일 secret |
| Client scenes | `DailyRewardModal.ts`, `LeaderboardScene.ts`, `QuestPanel.ts` | `TitleScene.ts`, `MainScene.ts`, `CharacterSelectScene.ts` | UI 위주 |
| Client core | `DailyRewardClient.ts`, `QuestClient.ts` | `MetaProgress.ts` (essence 지급 경로 통합) | API client 패턴 |
| Infra | `infra/admin/` (선택, dashboard HTML 정적 호스팅) | `docker-compose.yml` (필요 시) | nginx static 으로 충분 |

---

## Design

### Section 1. Daily / Weekly Login Rewards

#### 1.1 사용자 경험

플레이어가 게임을 켜고 `TitleScene` 에 진입하면, **하루 1회** 일일 보상 모달이 자동 표시된다. 모달은 7일 streak 캘린더 (Day 1 ~ Day 7) 를 가로로 보여주고, 오늘 받을 보상이 강조 표시된다. "받기" 버튼을 누르면 보상이 즉시 지급되고 카운터가 다음 칸으로 이동한다. streak 가 끊긴 경우 Day 1 부터 다시 시작.

```
┌────────────────────────────────────┐
│  매일 보상                  [X]    │
│                                    │
│  [Day1] [Day2] [Day3] [Day4]      │
│   ✓      ✓     ●오늘  ?           │
│  +10E   +15E   +25E   +30E         │
│                                    │
│  [Day5] [Day6] [Day7]              │
│   ?      ?     ?★                  │
│  +40E   +50E   +100E (특별)        │
│                                    │
│        [ 받기 (+25 에센스) ]         │
└────────────────────────────────────┘
```

#### 1.2 보상 테이블

```
Day 1: 10 essence
Day 2: 15 essence
Day 3: 25 essence
Day 4: 30 essence
Day 5: 40 essence
Day 6: 50 essence
Day 7: 100 essence + 1000 coins (보너스)
Day 8+: 다시 Day 1 부터 (rolling cycle)
```

총 7일 누적 = 270 essence + 1000 coins. M3 의 스킬 트리 1티어 노드 1-2개 해금 가능한 양. Phase 4 에서 보상 곡선 조정 가능.

#### 1.3 데이터 모델

```sql
CREATE TABLE IF NOT EXISTS daily_rewards (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    streak_day INTEGER NOT NULL,            -- 1..7 (cycle)
    streak_count INTEGER NOT NULL,          -- 누적 streak 길이
    essence_granted INTEGER NOT NULL,
    coins_granted INTEGER NOT NULL DEFAULT 0,
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    claim_date DATE GENERATED ALWAYS AS (claimed_at AT TIME ZONE 'Asia/Seoul')::date STORED
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_rewards_unique_per_day
    ON daily_rewards(player_id, claim_date);

CREATE INDEX IF NOT EXISTS idx_daily_rewards_player_time
    ON daily_rewards(player_id, claimed_at DESC);
```

UNIQUE 제약 `(player_id, claim_date)` 가 **동일 KST 날짜 내 중복 청구 방지** 의 핵심이다. 클라이언트의 시계는 신뢰하지 않으며, 모든 day 계산은 KST (Asia/Seoul) 기준으로 서버가 결정한다.

#### 1.4 API

**GET /api/daily-reward/:device_id**

```json
{
  "can_claim": true,
  "next_day": 3,                  // 받게 될 streak_day
  "streak_count": 12,             // 누적 streak
  "preview_reward": {
    "essence": 25,
    "coins": 0
  },
  "last_claimed_at": "2026-05-19T15:00:00Z",
  "next_claim_available_at": "2026-05-20T15:00:00Z"  // KST 자정
}
```

streak 끊김 판정: 마지막 claim 의 `claim_date` 와 오늘 KST 날짜의 차이가 **2일 이상** 이면 streak_count 초기화 후 streak_day=1 부터.

**POST /api/daily-reward/claim**

```json
// 요청
{ "device_id": "..." }

// 응답 (성공)
{
  "ok": true,
  "granted": { "essence": 25, "coins": 0 },
  "streak_day": 3,
  "streak_count": 13,
  "total_essence": 270
}

// 응답 (중복 - 동일 일자에 이미 받음)
{ "ok": false, "error": "already_claimed", "next_claim_available_at": "..." }
```

청구 시 서버는 다음을 트랜잭션으로 처리:
1. `INSERT INTO daily_rewards (...) ON CONFLICT (player_id, claim_date) DO NOTHING RETURNING *` — 중복 방지
2. `UPDATE players SET total_essence = total_essence + $essence WHERE id = $player_id`
3. (선택) `INSERT INTO events (player_id, event_type, payload) VALUES (...)` — `event_type='daily_reward_claim'`

`RETURNING *` 의 결과가 0 rows 이면 중복으로 판단하여 `409 Conflict` 또는 `200 + ok:false` 반환.

#### 1.5 클라이언트 통합

- `src/core/MetaProgress.ts` 의 `addEssence(n)` 경로는 그대로 유지. daily reward 응답을 받은 후 동일 함수를 호출하여 UI/SaveSystem 갱신.
- `src/scenes/TitleScene.ts` 진입 시 `DailyRewardClient.fetchStatus()` 호출. `can_claim===true` 이면 모달 자동 표시.
- 오프라인/네트워크 실패 시 모달은 **표시하지 않는다** (claim 은 서버 권위). LocalStorage 캐시는 정보성 표시용만 사용.

#### 1.6 Weekly 보상 (선택, 작게)

주간 보상은 **Day 7 청구 시 보너스가 곧 주간 보상** 으로 간주하여 별도 UI 를 만들지 않는다. 명시적인 "weekly chest" 는 Phase 4 이후. 이유:

- 솔로 개발자 시간 예산이 빠듯하다.
- weekly 가 있을 때만 효과 측정 가능 → 일단 daily 만 출시하여 baseline 확보.
- 추후 Day 7 청구율이 50% 이상이면 weekly 도입 검토.

---

### Section 2. Daily Quests

#### 2.1 사용자 경험

매일 KST 자정에 **3개의 일일 퀘스트** 가 자동 할당된다. 게임 내 UI:

- `TitleScene` 또는 `CharacterSelectScene` 의 우측 패널에 **간단한 퀘스트 트래커** 표시
- `MainScene` 중 일시정지 메뉴에서도 진척도 확인 가능
- 완료 시 화면 상단에 narrative toast (`적 100마리 처치 완료! +20 에센스`)

```
┌─────────────────────────────────────┐
│  오늘의 퀘스트              [3/3]   │
│                                     │
│  ▶ 적 100마리 처치        ✓ 100/100 │
│  ▶ 스테이지 3 도달        ◯  2/3   │
│  ▶ 시너지 5개 발견        ✓  5/5   │
│                                     │
│  보상: +60 에센스 + 500 코인         │
└─────────────────────────────────────┘
```

#### 2.2 퀘스트 풀 (정적, 7개로 시작)

| ID | 설명 | 트래킹 이벤트 | 목표값 | 보상 essence |
|----|------|---------------|--------|--------------|
| `kill_100` | 적 100마리 처치 | enemy_killed | 100 | 20 |
| `kill_300` | 적 300마리 처치 | enemy_killed | 300 | 40 |
| `stage_3` | 스테이지 3 도달 | stage_reached | 3 | 30 |
| `stage_5` | 스테이지 5 도달 | stage_reached | 5 | 50 |
| `synergy_5` | 시너지 5개 발견 | synergy_discover | 5 | 25 |
| `survive_5m` | 5분 생존 | session_end (duration>=300) | 1 | 30 |
| `play_2_sessions` | 2판 플레이 | session_start | 2 | 20 |

3개 모두 완료 시 추가 **+500 코인** 보너스 (combo bonus).

서버는 매일 자정 (또는 첫 요청 시 lazy assignment) 위 풀에서 **랜덤 3개** 를 추출하여 `quests` 테이블에 저장한다. 동일 퀘스트 중복 없음.

#### 2.3 데이터 모델

```sql
CREATE TABLE IF NOT EXISTS quests (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    quest_id TEXT NOT NULL,                  -- 'kill_100', 'stage_3', ...
    target_value INTEGER NOT NULL,
    reward_essence INTEGER NOT NULL,
    assigned_date DATE NOT NULL,             -- KST 기준 할당일
    assigned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quests_player_date_questid
    ON quests(player_id, assigned_date, quest_id);

CREATE INDEX IF NOT EXISTS idx_quests_player_date
    ON quests(player_id, assigned_date DESC);

CREATE TABLE IF NOT EXISTS quest_progress (
    quest_db_id INTEGER PRIMARY KEY REFERENCES quests(id) ON DELETE CASCADE,
    current_value INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

`quest_progress` 를 별도 테이블로 분리한 이유: `quests` 행은 immutable (할당 후 변경 없음), `quest_progress` 만 update 발생하여 lock contention 분리.

#### 2.4 API

**GET /api/quests/:device_id**

```json
{
  "date": "2026-05-20",
  "quests": [
    {
      "quest_id": "kill_100",
      "description": "적 100마리 처치",
      "target_value": 100,
      "current_value": 100,
      "reward_essence": 20,
      "completed": true,
      "claimed": false
    },
    ...
  ],
  "combo_bonus_coins": 500,
  "combo_claimed": false
}
```

서버 동작:
1. `assigned_date = TODAY_KST` 인 `quests` 행 조회
2. 0개면 풀에서 3개 랜덤 선택 후 INSERT
3. `quest_progress` 와 LEFT JOIN 하여 반환

**POST /api/quests/progress**

게임이 진행 중인 이벤트를 batch 로 전송. `/api/events` 와 중복 우려가 있으나, 일일 퀘스트는 **세션 종료 시점이 아닌 실시간 누적** 이 필요하여 별도 엔드포인트가 효율적.

```json
// 요청
{
  "device_id": "...",
  "increments": [
    { "quest_id": "kill_100", "delta": 50 },
    { "quest_id": "synergy_5", "delta": 1 }
  ]
}

// 응답
{
  "ok": true,
  "updated": [
    { "quest_id": "kill_100", "current_value": 100, "completed": true },
    { "quest_id": "synergy_5", "current_value": 5, "completed": true }
  ],
  "newly_completed_count": 2
}
```

완료 시점 (current >= target 으로 처음 도달) 에 `completed_at = NOW()` 설정. claim 은 별도 엔드포인트.

**POST /api/quests/claim**

```json
// 요청
{ "device_id": "...", "quest_id": "kill_100" }

// 응답
{
  "ok": true,
  "granted_essence": 20,
  "combo_unlocked": false
}
```

3개 모두 claimed 면 combo bonus (`+500 coins`) 자동 지급 후 응답에 `combo_unlocked: true`.

#### 2.5 클라이언트 통합

- `src/core/QuestClient.ts` 신규 — REST 래퍼.
- `src/systems/QuestTracker.ts` 신규 — bitECS 시스템과 별개의 lightweight 클라이언트 시스템. 게임 이벤트 (enemy killed, synergy discovered) 를 batch 로 모아 5-10초 간격 또는 세션 종료 시 `/api/quests/progress` 호출.
- `src/scenes/UIScene.ts` 에 퀘스트 패널 토글 (HUD 우측 상단 작은 아이콘).
- `src/scenes/MainScene.ts` 에서 시너지 발견/적 처치/스테이지 도달 시 QuestTracker 에 delta 추가.

#### 2.6 트래킹 정밀도 트레이드오프

**옵션 A (선택):** 클라이언트가 신뢰 권위 (client-authoritative). 게임이 적 처치 카운터를 들고 있다가 서버에 delta 전송. **장점:** 단순, 빠른 UI 피드백. **단점:** 클라이언트 조작 시 essence 부정 획득 가능.

**옵션 B (보류):** 서버 권위. 서버가 events 테이블의 `event_type='enemy_killed'` 집계로 진행도 계산. **장점:** 조작 불가. **단점:** events 폭주, 게임 이벤트와 quest 의 결합도 높음.

**결정: 옵션 A.** 이유: (1) Phase 3 의 essence 보상량은 일일 100 미만으로 부정 인센티브가 낮음, (2) Phase 2 의 leaderboard 도 client-authoritative 인 상황에서 quest 만 서버 권위로 만드는 것은 비대칭, (3) 솔로 개발자의 구현 비용 차이가 크다. 부정이 만연하면 Phase 4 에서 서버 권위로 마이그레이션.

---

### Section 3. Leaderboard UI

#### 3.1 현황

- 백엔드: `GET /api/leaderboard?limit=20`, `POST /api/leaderboard` 모두 동작 중.
- 클라이언트: **노출 UI 없음.** `GameOverScene` 에서 자동 제출만 하고, 사용자가 자신의 순위나 다른 플레이어의 점수를 볼 수 없다.

Phase 2 의 가장 큰 미완성 항목. Phase 3 에서 클라이언트 UI 를 만들어 정상화한다.

#### 3.2 사용자 경험

`CharacterSelectScene` 또는 `TitleScene` 에서 새 메뉴 항목 "리더보드" 추가. 클릭 시 별도 `LeaderboardScene` 로 전환.

```
┌──────────────────────────────────────────────┐
│  ◀ 리더보드                                   │
│                                              │
│  [ 전체 ] [ 주간 ] [ 내 캐릭터별 ]            │
│                                              │
│  순위  닉네임          캐릭터   점수   스테이지 │
│  ─────────────────────────────────────────── │
│  1     IronWolf       wizard   8,932   12    │
│  2     ShadowFox      knight   7,210   10    │
│  3     (나) hangup2   dwarf    6,500    9    │
│  4     CrimsonElf     elf      5,840    8    │
│  ...                                         │
│  10    DustyMage      druid    3,210    5    │
│                                              │
│  내 최고점수: 6,500 (3위)                     │
└──────────────────────────────────────────────┘
```

#### 3.3 백엔드 변경

**기존:** `GET /api/leaderboard?limit=20` — 전체 상위.

**신규 파라미터:**
- `window=all` (기본) | `weekly` | `daily`
- `character_id=knight` (옵션, 캐릭터별 필터)
- `device_id=<id>` (옵션, "내 순위" 계산용)

쿼리 예시 (weekly):

```sql
SELECT l.score, l.stage_reached, l.character_id, l.duration_seconds,
       l.submitted_at, p.nickname,
       RANK() OVER (ORDER BY l.score DESC) AS rank
FROM leaderboard l
JOIN players p ON p.id = l.player_id
WHERE l.submitted_at >= NOW() - INTERVAL '7 days'
ORDER BY l.score DESC
LIMIT $1;
```

`device_id` 가 주어지면 별도 쿼리로 해당 player 의 최고 점수와 rank 를 같이 반환:

```sql
WITH ranked AS (
  SELECT l.id, l.player_id, l.score,
         RANK() OVER (ORDER BY l.score DESC) AS rank
  FROM leaderboard l
  WHERE l.submitted_at >= NOW() - INTERVAL '7 days'
)
SELECT score, rank FROM ranked
WHERE player_id = (SELECT id FROM players WHERE device_id = $1)
ORDER BY score DESC LIMIT 1;
```

응답:

```json
{
  "entries": [
    { "rank": 1, "nickname": "IronWolf", "character_id": "wizard", "score": 8932, "stage_reached": 12, "submitted_at": "..." },
    ...
  ],
  "me": { "rank": 3, "score": 6500 },
  "window": "weekly",
  "total_entries_in_window": 247
}
```

#### 3.4 닉네임 처리

현재 `players.nickname` 은 NULL 이 다수. Phase 3 에서:

1. **최초 제출 시 닉네임 부재 → 자동 생성** (`Player_${random_5digit}`)
2. `CharacterSelectScene` 에 "닉네임 변경" 입력란 추가 (선택). 변경 시 `POST /api/player/nickname`.
3. 부적절한 단어 필터링은 Phase 4 이후 (현재는 자동 생성이라 큰 문제 없음).

```sql
-- nickname 변경 API
UPDATE players SET nickname = $1 WHERE device_id = $2
RETURNING nickname;
```

#### 3.5 클라이언트 구현

- `src/scenes/LeaderboardScene.ts` 신규
- 탭 토글: 전체 / 주간 / 캐릭터별
- 스크롤 가능한 리스트 (top 50 이상)
- 본인 행 하이라이트
- 빈 상태 ("아직 점수가 없습니다") 처리
- 네트워크 실패 시 retry 버튼

UI 텍스처는 기존 dungeon 타일셋 UI 컴포넌트 재사용. 신규 아트워크 없음.

---

### Section 4. Internal Admin Dashboard

#### 4.1 목적

솔로 개발자가 **다음 weekend 의 우선순위를 결정** 하기 위한 read-only 대시보드. 외부 노출 없음. 화려한 차트 라이브러리 없이 HTML 테이블 + 간단한 ASCII 막대그래프 (또는 inline SVG sparkline) 로 충분.

#### 4.2 표시할 지표

**Cohort / Retention**
- DAU (오늘 KST 기준 unique device_id with session_start)
- WAU (지난 7일)
- D1 retention (어제 신규 + 오늘 복귀 비율)
- D7 retention (7일 전 활성 + 오늘 복귀 비율)
- 신규 가입 (created_at 오늘)

**Engagement**
- Avg session duration (events 의 session_start ~ session_end pair)
- Avg sessions per player per day
- 일일 퀘스트 완료율 (3/3 달성 / 할당된 player 수)
- 일일 보상 청구율 (claim / DAU)

**Content**
- Top 10 캐릭터 (last 7d leaderboard rows GROUP BY character_id)
- Avg stage reached (last 7d)
- 시너지 발견 빈도 (events.event_type='synergy_discover' GROUP BY payload.synergy_id)

**Monetization (Poki 광고)**
- ad_view 일별 카운트 (last 14d)
- ad_skip 비율
- iap_funnel 단계별 drop-off (funnel_view → click → complete; LS pivot 이후 0 일 가능성)

#### 4.3 아키텍처 결정: React/Admin 프레임워크 없이

**왜 안 쓰는가:**
- 빌드 파이프라인 분리, 의존성 폭증, 솔로 개발자 시간 낭비.
- read-only 단일 페이지 + 10개 미만 지표 → 정적 HTML + 서버 사이드 렌더링이면 충분.
- 인증도 단순 Basic Auth 면 됨.

**대안:**
- **Option A (선택):** 백엔드가 HTML 을 직접 렌더링하는 `/api/admin/dashboard.html` 엔드포인트. 템플릿은 template literal + 간단 헬퍼. CSS 는 inline.
- **Option B:** 정적 HTML 파일을 nginx 로 호스팅하고 fetch 로 `/api/admin/dashboard.json` 데이터를 가져와 client-side 렌더. → JSON 엔드포인트 따로 만들고 보안 처리도 따로 → 복잡도 증가.
- **Option C:** Grafana 등 외부 도구. → 인프라 비용/시간 증가.

**Option A 선택.** 1개 라우터 1개 미들웨어로 끝.

#### 4.4 인증

`/api/admin/*` 전체에 Basic Auth 적용.

```typescript
// backend/src/middleware/basicAuth.ts
import { Request, Response, NextFunction } from 'express';

export function basicAuth(req: Request, res: Response, next: NextFunction) {
    const expected = process.env.ADMIN_AUTH;
    if (!expected) {
        return res.status(503).json({ error: 'admin not configured' });
    }

    const header = req.headers.authorization;
    if (!header || !header.startsWith('Basic ')) {
        res.set('WWW-Authenticate', 'Basic realm="survivors-admin"');
        return res.status(401).json({ error: 'auth required' });
    }

    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    // ADMIN_AUTH 환경변수 형식: "user:password" (base64 인코딩 전)
    if (decoded !== expected) {
        return res.status(401).json({ error: 'invalid credentials' });
    }
    next();
}
```

`.env`:
```
ADMIN_AUTH=admin:<강력한_랜덤_32자_시크릿>
```

추가 방어:
- `/api/admin/*` 라우트는 nginx 단계에서 IP allowlist 적용 (옵션, 자신의 집/사무실 IP만 허용 가능).
- 로그인 실패 5회 시 IP rate-limit (Phase 4 이후).

#### 4.5 쿼리 모음 (대시보드의 핵심)

```sql
-- 1. DAU (KST today)
SELECT COUNT(DISTINCT player_id) AS dau
FROM events
WHERE event_type = 'session_start'
  AND (created_at AT TIME ZONE 'Asia/Seoul')::date = (NOW() AT TIME ZONE 'Asia/Seoul')::date;

-- 2. WAU
SELECT COUNT(DISTINCT player_id) AS wau
FROM events
WHERE event_type = 'session_start'
  AND created_at >= NOW() - INTERVAL '7 days';

-- 3. D1 retention
WITH yday_new AS (
  SELECT id FROM players
  WHERE (created_at AT TIME ZONE 'Asia/Seoul')::date
        = ((NOW() AT TIME ZONE 'Asia/Seoul') - INTERVAL '1 day')::date
),
returned AS (
  SELECT DISTINCT player_id FROM events
  WHERE event_type='session_start'
    AND (created_at AT TIME ZONE 'Asia/Seoul')::date
        = (NOW() AT TIME ZONE 'Asia/Seoul')::date
)
SELECT
  (SELECT COUNT(*) FROM yday_new) AS new_yday,
  (SELECT COUNT(*) FROM yday_new y WHERE y.id IN (SELECT player_id FROM returned)) AS retained,
  CASE WHEN (SELECT COUNT(*) FROM yday_new)=0 THEN 0
       ELSE ROUND(100.0 *
         (SELECT COUNT(*) FROM yday_new y WHERE y.id IN (SELECT player_id FROM returned))::numeric /
         (SELECT COUNT(*) FROM yday_new), 1)
  END AS d1_pct;

-- 4. Top characters (last 7d, by play count)
SELECT character_id, COUNT(*) AS runs, ROUND(AVG(score)) AS avg_score, ROUND(AVG(stage_reached)) AS avg_stage
FROM leaderboard
WHERE submitted_at >= NOW() - INTERVAL '7 days'
GROUP BY character_id
ORDER BY runs DESC;

-- 5. Avg session duration (last 7d)
-- session_start 와 session_end 를 player_id + 가장 가까운 시간으로 매칭
-- 정확한 구현은 lateral join 또는 window function 필요
SELECT
  ROUND(AVG(EXTRACT(EPOCH FROM (e2.created_at - e1.created_at)))) AS avg_sec
FROM events e1
JOIN LATERAL (
  SELECT created_at FROM events e2
  WHERE e2.player_id = e1.player_id
    AND e2.event_type = 'session_end'
    AND e2.created_at > e1.created_at
    AND e2.created_at < e1.created_at + INTERVAL '2 hours'
  ORDER BY e2.created_at ASC LIMIT 1
) e2 ON TRUE
WHERE e1.event_type = 'session_start'
  AND e1.created_at >= NOW() - INTERVAL '7 days';

-- 6. Daily reward claim rate (today)
SELECT
  (SELECT COUNT(*) FROM daily_rewards
   WHERE claim_date = (NOW() AT TIME ZONE 'Asia/Seoul')::date) AS claims_today,
  (SELECT COUNT(DISTINCT player_id) FROM events
   WHERE event_type='session_start'
     AND (created_at AT TIME ZONE 'Asia/Seoul')::date
         = (NOW() AT TIME ZONE 'Asia/Seoul')::date) AS dau_today;

-- 7. Quest completion (today)
SELECT
  COUNT(*) FILTER (WHERE qp.completed_at IS NOT NULL) AS completed,
  COUNT(*) AS total_assigned
FROM quests q
LEFT JOIN quest_progress qp ON qp.quest_db_id = q.id
WHERE q.assigned_date = (NOW() AT TIME ZONE 'Asia/Seoul')::date;

-- 8. Ad funnel (last 7d)
SELECT event_type, COUNT(*) FROM events
WHERE event_type IN ('ad_view', 'ad_skip', 'iap_funnel_view', 'iap_funnel_click', 'iap_funnel_complete')
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY event_type;

-- 9. Synergy discovery histogram (last 14d)
SELECT payload->>'synergy_id' AS synergy_id, COUNT(*) AS discoveries
FROM events
WHERE event_type = 'synergy_discover'
  AND created_at >= NOW() - INTERVAL '14 days'
GROUP BY payload->>'synergy_id'
ORDER BY discoveries DESC
LIMIT 20;

-- 10. New player trend (last 14d daily)
SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS day, COUNT(*) AS new_players
FROM players
WHERE created_at >= NOW() - INTERVAL '14 days'
GROUP BY day
ORDER BY day;
```

성능: events 테이블은 30일 자동 삭제 (Phase 2 의 주석 처리된 cron 활성화 권장). 위 쿼리는 모두 인덱스 사용 가능. 초기 트래픽에선 view 없이 직접 쿼리, 100k events 넘으면 materialized view 도입.

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_session_counts AS
SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS day,
       COUNT(DISTINCT player_id) AS unique_players,
       COUNT(*) AS session_starts
FROM events
WHERE event_type = 'session_start'
GROUP BY day;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_session_counts_day
    ON mv_daily_session_counts(day);

-- 매일 새벽 refresh (cron, Phase 4)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_session_counts;
```

#### 4.6 HTML 렌더링 스케치

```typescript
// backend/src/routes/admin.ts
import { Router } from 'express';
import { pool } from '../db/pool.js';
import { basicAuth } from '../middleware/basicAuth.js';

const router = Router();
router.use(basicAuth);

router.get('/dashboard.html', async (_req, res) => {
    const dau = (await pool.query(/* query 1 */)).rows[0];
    const wau = (await pool.query(/* query 2 */)).rows[0];
    const d1 = (await pool.query(/* query 3 */)).rows[0];
    const topChars = (await pool.query(/* query 4 */)).rows;
    // ... 등등

    res.type('html').send(`<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8">
<title>Survivors Admin</title>
<style>
  body { font: 14px/1.4 -apple-system, sans-serif; padding: 24px; max-width: 1000px; margin: 0 auto; }
  h1, h2 { border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  table { border-collapse: collapse; margin: 8px 0 24px; }
  th, td { border: 1px solid #ccc; padding: 6px 12px; text-align: left; }
  th { background: #f4f4f4; }
  .metric { display: inline-block; padding: 12px 20px; border: 1px solid #ddd; border-radius: 8px; margin: 4px; }
  .metric .v { font-size: 24px; font-weight: 600; }
  .metric .l { font-size: 11px; color: #888; text-transform: uppercase; }
  .bar { display: inline-block; height: 12px; background: #5d9; vertical-align: middle; }
</style>
</head><body>
<h1>Survivors Admin Dashboard</h1>
<p>업데이트: ${new Date().toISOString()} (KST: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })})</p>

<h2>Cohort</h2>
<div class="metric"><div class="l">DAU</div><div class="v">${dau.dau}</div></div>
<div class="metric"><div class="l">WAU</div><div class="v">${wau.wau}</div></div>
<div class="metric"><div class="l">D1 Retention</div><div class="v">${d1.d1_pct}%</div></div>

<h2>Top Characters (7d)</h2>
<table>
  <tr><th>Character</th><th>Runs</th><th>Avg Score</th><th>Avg Stage</th><th></th></tr>
  ${topChars.map(c => `<tr>
    <td>${escape(c.character_id)}</td>
    <td>${c.runs}</td>
    <td>${c.avg_score}</td>
    <td>${c.avg_stage}</td>
    <td><span class="bar" style="width:${Math.min(c.runs * 4, 200)}px"></span></td>
  </tr>`).join('')}
</table>

<!-- 이하 동일 패턴 -->
</body></html>`);
});

export default router;

function escape(s: string): string {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
}
```

병렬 쿼리: `Promise.all([...])` 로 묶어서 latency 줄임. 캐시는 일단 안 함 (트래픽 낮음).

#### 4.7 운영

- 접근 URL: `https://games.blocktalker.co.kr/api/admin/dashboard.html`
- 로컬 개발: `http://localhost:3001/api/admin/dashboard.html`
- 새로고침으로 최신 데이터 (서버 사이드 쿼리). 30초마다 meta refresh 옵션:
  ```html
  <meta http-equiv="refresh" content="60">
  ```

---

### Section 5. Web Push Notification (선택, 시간 남으면)

#### 5.1 동기

D1 retention 을 끌어올리는 가장 강한 도구이지만, 솔로 개발자에겐 구현 비용이 가장 큰 항목. Phase 3 의 **stretch goal** 로만 다룬다. 일일 보상/퀘스트 출시 후 데이터로 retention 부족이 명확해질 때만 진행.

#### 5.2 범위 제약

- **iOS 16.4+ Safari (PWA holstered) 만** 신뢰 가능, 그 외 모바일 브라우저는 미지원/제한적.
- Android Chrome PWA 는 잘 동작하지만 사용자가 "홈 화면에 추가" 한 비율이 낮을 것.
- → 푸시 알림 ROI 는 PWA 설치율에 강하게 종속. PWA install 이벤트 (`pwa_install`) 가 일 5건 미만이면 푸시는 보류.

#### 5.3 PoC 스코프

만약 진행한다면:

1. 클라이언트: `Notification.requestPermission()` + `serviceWorker.pushManager.subscribe()`. VAPID public key 사용.
2. 백엔드: 신규 테이블 `push_subscriptions`.
3. 백엔드 cron: 매일 KST 19:00 에 24h 동안 미접속 player 에게 push 전송 ("오늘의 보상이 기다려요!").
4. `web-push` npm 패키지 사용.

```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);
```

VAPID 키 생성:
```bash
npx web-push generate-vapid-keys
```

`.env`:
```
VAPID_PUBLIC=...
VAPID_PRIVATE=...
VAPID_SUBJECT=mailto:robert.lee@bdacs.co.kr
```

#### 5.4 결정 게이트

Phase 3 Week 3 종료 시점에 다음을 만족하면 Section 5 진행:
- PWA install 누적 50건 이상
- 일일 보상 claim 비율 30% 이하 (즉, 다시 와야 받지만 잘 안 옴)

아니면 Phase 4 로 미룸.

---

## Trade-offs / Alternatives Considered

### TO-1. 일일 보상의 단위: essence vs character unlock token

| 옵션 | 장점 | 단점 |
|------|------|------|
| Essence (선택) | 기존 스킬 트리와 연동, 즉시 사용처 명확 | 큰 보상감 부족 |
| Character unlock token | 보상감 강함 | 발급 속도 통제 어려움, 한번 다 풀리면 retention 동력 상실 |
| Coin only | 단순 | 게임 내 사용처 빈약 |

**결론:** essence 위주, Day 7 만 coin 보너스. 추후 character unlock 가 stale 해지면 Phase 4 에서 special currency 도입 검토.

### TO-2. 일일 퀘스트 할당 시점: 자정 자동 vs 첫 접속 lazy

| 옵션 | 장점 | 단점 |
|------|------|------|
| 자정 자동 (cron) | "오늘의 퀘스트" 명확 | cron 인프라 필요, 휴면 player 도 row 생성 |
| Lazy (첫 GET 시 생성, 선택) | 인프라 없음, 활성 player 만 row | 자정 직후 짧은 race condition (UNIQUE 인덱스로 보호) |

**결론:** Lazy. UNIQUE `(player_id, assigned_date, quest_id)` 로 동시성 보호. pg_cron 도입 시점은 Phase 4 이후.

### TO-3. 대시보드 호스팅: 백엔드 inline vs 분리

| 옵션 | 장점 | 단점 |
|------|------|------|
| Backend inline HTML (선택) | 인증 단순, 신규 인프라 0 | 백엔드와 대시보드 결합 |
| 별도 컨테이너 (e.g., Metabase) | 표준 도구, 차트 풍부 | 메모리/CPU 증가, 인증 추가 |
| Static + JSON API | SPA 가능 | 인증 + CORS 처리 추가 |

**결론:** inline. 데이터 규모 작고, 솔로 개발 시간 절약. 100k+ events 또는 다중 운영자 발생 시 Metabase 검토.

### TO-4. Quest 진척도 트래킹: client-authoritative vs server-side

이미 Section 2.6 에서 다룸. **client-authoritative 선택.** essence 보상 규모가 작아 부정 인센티브 낮음.

### TO-5. Leaderboard window: 시간 기반 vs season 기반

| 옵션 | 장점 | 단점 |
|------|------|------|
| Rolling 7일 (선택) | 자연스러운 "주간" 체험 | season 종료 이벤트 만들기 어려움 |
| 명시적 season (e.g., 2026-W21) | 종료 이벤트로 retention 자극 | 인프라 (시즌 보상, archive) 필요 |

**결론:** Rolling 7일 + 30일. Phase 4 에서 명시 season 도입 검토 (e.g., 매월 1일 reset + reward).

### TO-6. 닉네임 충돌

- 자동 생성 `Player_12345` 는 충돌 가능성 낮지만 0 은 아님.
- DB 에 UNIQUE constraint 없음 (의도적). 같은 닉네임이 여러 player 가 가져도 leaderboard 표시상 문제 없음.
- 사용자가 직접 변경할 때만 충돌 체크 (DB query + 거부 또는 자동 suffix).
- Phase 3 에서는 단순화: **충돌 허용**, 표시상 device hash 4자리 suffix 같이 표시 가능 (e.g., `IronWolf#a3f9`).

### TO-7. KST 타임존 처리

- 모든 daily 경계는 KST 기준. UTC 변환은 DB 가 처리 (`AT TIME ZONE 'Asia/Seoul'`).
- 다국가 출시 시점 (Phase 4 이후) 에 player 별 timezone 도입. 현재는 한국 사용자 위주이므로 단일 timezone OK.

---

## Open Questions

1. **닉네임 입력 시점.** 자동 생성 후 절대 안 바꾸는 사용자가 다수일까? 초기 닉네임 설정을 CharacterSelectScene 에 강제할지 vs Profile 메뉴 깊숙이 둘지.
2. **퀘스트 풀 다양성.** 7개로 시작했지만, "오늘이 어제와 비슷" 느낌은 풀이 10-15개 되어야 해소될 수 있음. Phase 3 안에 풀 확장할지 vs Phase 4 로 미룰지.
3. **streak 끊김 보호.** "1일 break protection" 같은 grace period 가 retention 에 유리하나 구현 복잡도 증가. Phase 3 에서 도입할지.
4. **Combo bonus 가 너무 강한가.** 3개 다 깨면 +500 coin → 일일 +500 코인은 게임 내 인플레이션 우려. 시뮬레이션 필요.
5. **대시보드 IP allowlist.** 현재 솔로 운영이라 가정. 외부에서 접근할 일이 잦으면 어떻게? VPN? Cloudflare Access?
6. **events 테이블의 30일 cleanup.** Phase 2 의 주석 처리된 cron 을 Phase 3 에서 활성화할지. 대시보드의 "trend" 가 30일 ~ 14일 윈도우에서는 데이터 부족 위험.
7. **Poki 정책 호환성.** Web Push 가 Poki 의 SDK 정책과 충돌하지 않는지 확인 필요 (Section 5 진행 시).
8. **세션 정의.** `session_start` 와 `session_end` 의 매칭이 깨졌을 때 (브라우저 강제 종료) avg session duration 이 왜곡됨. window function 으로 cap 처리할지 vs heartbeat 이벤트 도입할지.
9. **퀘스트 보상 지급 시점.** 자동 vs claim 버튼 클릭? UX 차이 (자동은 surprise 감, claim 은 control 감). 일단 claim 버튼 선택했으나 재검토 여지.
10. **localStorage 캐시 정책.** daily reward / quest 상태를 캐시할 경우, 서버와 어긋날 때 어떻게 reconcile? 일단 "캐시는 표시용, 권위는 서버" 원칙.

### Resolutions (2026-05-20, pre-merge)

Sprint 진입 전 기본값. Sprint 진행 중 데이터로 재검토.

1. **닉네임 입력 시점** → 자동 생성 (`Player_${5digit}`) + CharacterSelectScene 에 "닉네임 변경" 선택 메뉴. **강제 입력 X** (이탈 위험). Sprint 2.
2. **퀘스트 풀** → **7개로 시작.** Phase 3 안에서는 확장 X. Sprint 6 회고에서 "퀘스트 중복 피로도" 지표 확인 후 Phase 4 에서 결정.
3. **streak grace period** → **도입 X** (Phase 3). 솔로 운영에서 grace period 는 데이터 노이즈만 증가. streak 끊김 = 정상 신호로 측정. Phase 4 후보.
4. **Combo bonus +500 coin** → 일단 **유지.** Sprint 4 대시보드에서 평균 일일 코인 증가량을 모니터링, 인플레이션 우려 시 +300 으로 하향. Sprint 6 결정.
5. **Admin IP allowlist** → Phase 3 에서는 **Basic Auth 만.** allowlist 는 외부 접근 발생 시 즉시 추가 가능하도록 nginx 설정 분리. Cloudflare Access 는 Phase 4+.
6. **events 30일 cleanup cron** → **Phase 3 종료 후 활성화.** 대시보드 trend 윈도우를 14/30/90일로 동시 노출하여 데이터 부족 위험 최소화. Sprint 6 에서 활성화 결정.
7. **Poki + Web Push 호환성** → Sprint 5 진입 조건에 "Poki SDK 문서 + 정책 확인" 게이트 추가. 충돌 시 Sprint 5 **자동 폐기**.
8. **세션 정의** → `session_end` 누락 시 `session_start` 후 **15분 cap** 적용 (window function). heartbeat 도입은 Phase 4 후보.
9. **퀘스트 보상 지급** → **Claim 버튼** 유지 (control 감 + 재방문 유도). 자동 지급은 A/B 후보 Phase 4.
10. **localStorage 캐시 정책** → **"캐시는 표시용, 권위는 서버"** 원칙 유지. 클라이언트 부팅 시 1회 동기화, 진행 중에는 낙관적 업데이트 + 서버 응답으로 보정.

---

## Implementation Plan

### Phase 구분 (주말 단위)

#### Sprint 1 (주말 1, 6-8h): Daily Reward — 신뢰 가능한 베이스라인

- [ ] DB migration: `daily_rewards` 테이블 + UNIQUE 인덱스
- [ ] Backend: `GET /api/daily-reward/:device_id`, `POST /api/daily-reward/claim`
- [ ] Backend tests (vitest + supertest): claim 중복 방지, streak 끊김, day 7 보너스
- [ ] Client: `DailyRewardClient.ts` API 래퍼
- [ ] Client: `DailyRewardModal.ts` (TitleScene 진입 시 표시)
- [ ] 이벤트 추가: `daily_reward_claim` (events 테이블)
- [ ] 로컬 e2e 검증 (docker-compose up + 가짜 device_id 로 7일치 시뮬레이션)
- [ ] 커밋 + 회고 메모

**목표:** Sprint 종료 시 prod 배포 가능 상태. 솔로 dev 본인이 매일 첫 사용자가 되어 다음 주말까지 데이터 모으기.

#### Sprint 2 (주말 2, 6-8h): Leaderboard UI — 미완성 정상화

- [ ] Backend: `/api/leaderboard` 에 `window`, `character_id`, `device_id` 파라미터 추가
- [ ] Backend: `me.rank` 계산 쿼리 추가
- [ ] Backend: `POST /api/player/nickname` (옵션 입력)
- [ ] Backend tests: window 필터, rank 계산
- [ ] Client: `LeaderboardScene.ts` 신규 + 탭 (전체/주간/캐릭터별)
- [ ] Client: `CharacterSelectScene` 닉네임 변경 입력란
- [ ] Client: 자동 닉네임 생성 (`Player_${5digit}`)
- [ ] Client: TitleScene 또는 CharacterSelectScene 에 "리더보드" 메뉴 항목
- [ ] 로컬 e2e: 다중 device_id 로 점수 제출 후 ranking 확인
- [ ] 커밋

**목표:** Phase 2 의 미완성 부채 해소. 이후 대시보드 데이터의 신뢰도 상승 (실제 사용자가 leaderboard 를 보면서 더 자주 플레이).

#### Sprint 3 (주말 3, 6-8h): Daily Quests — 두 번째 retention loop

- [ ] DB migration: `quests`, `quest_progress` 테이블
- [ ] Backend: `GET /api/quests/:device_id` (lazy assignment)
- [ ] Backend: `POST /api/quests/progress`
- [ ] Backend: `POST /api/quests/claim` (+ combo bonus 로직)
- [ ] Backend tests: lazy assign, progress increment, claim idempotency, combo
- [ ] Client: `QuestClient.ts`
- [ ] Client: `QuestTracker.ts` (5-10초 batch flush + 세션 종료 flush)
- [ ] Client: `MainScene` 에 enemy_killed/synergy_discover/stage_reached 카운터 hook
- [ ] Client: UI 패널 (HUD 토글 또는 일시정지 메뉴)
- [ ] Client: 완료 toast
- [ ] 로컬 e2e: 한 판 끝까지 플레이 후 perms 정상 동작 확인
- [ ] 커밋

**목표:** 두 번째 retention loop 추가. Sprint 1 의 단조로움 해소.

#### Sprint 4 (주말 4, 4-6h): Admin Dashboard — 운영 가시성

- [ ] Backend: `basicAuth.ts` 미들웨어
- [ ] Backend: `admin.ts` 라우터 + HTML 템플릿 + 10개 쿼리
- [ ] Backend: `Promise.all` 로 쿼리 병렬화
- [ ] `.env` 에 `ADMIN_AUTH` 추가, deploy 스크립트 갱신
- [ ] Materialized view 1개 (mv_daily_session_counts) — 선택, 필요 시
- [ ] (옵션) nginx IP allowlist 룰 추가
- [ ] 본인 데이터로 시각 검수 (숫자가 말이 되는가?)
- [ ] 커밋

**목표:** Phase 3 종료 시점에 Phase 4 의 방향성을 결정할 데이터 확보.

#### Sprint 5 (주말 5, 옵션 4-6h): Web Push (조건부)

Sprint 4 데이터로 결정. 진행 시:

- [ ] DB migration: `push_subscriptions`
- [ ] Backend: VAPID 키 생성 + 환경 변수
- [ ] Backend: `POST /api/push/subscribe`, `POST /api/push/test`
- [ ] Backend: cron 또는 외부 트리거 (`POST /api/admin/push-daily-reminder`)
- [ ] Client: Service worker push 핸들러
- [ ] Client: TitleScene 또는 settings 에 알림 권한 요청 UI
- [ ] 로컬 + iOS PWA 실기기 검증
- [ ] 커밋

#### Sprint 6 (주말 6, 2-3h): Phase 3 회고 + 데이터 분석

- [ ] `docs/superpowers/specs/m4-phase3-retrospective.md` 작성
- [ ] 대시보드 스크린샷 첨부 + Phase 4 방향성 문서화
- [ ] 데이터 기반 Phase 4 plan draft

**총 예상 시간:** 26-37시간 (4-6주말). Web Push 제외 시 22-31시간 (4-5주말).

### 의존성 그래프

```
Sprint 1 (Daily Reward) ──┐
                           ├──> Sprint 4 (Dashboard) — 데이터 필요
Sprint 2 (Leaderboard) ────┤
                           │
Sprint 3 (Quests) ─────────┘
                           │
                           └──> Sprint 5 (Push, 조건부)
                                     │
                                     v
                              Sprint 6 (Retro)
```

Sprint 1/2/3 는 서로 독립이므로 순서 변경 가능. 추천 순서: 1 → 2 → 3 (보상감 → 사회적 비교 → 도전 과제 순으로 점진적 복잡도).

---

## Self-Review

### Spec Coverage

| Goals | 다루는 Section |
|-------|----------------|
| D1 retention 측정 | Section 4 (대시보드) |
| 재방문 트리거 ≥ 1 | Section 1 (Daily Reward), Section 2 (Quests) |
| Leaderboard UI | Section 3 |
| 운영 가시성 | Section 4 |
| Phase 4 의사결정 근거 | Section 4 + Sprint 6 회고 |

### Non-goals 준수

- 신규 게임 컨텐츠 0 (확인)
- Backend 재설계 0 (Express + pg 유지)
- 어드민 SSO 0 (Basic Auth)
- 푸시 필수 0 (Sprint 5 조건부)

### 위험 요소 (Pre-mortem 요약)

| 위험 | 가능성 | 영향 | 완화 |
|------|--------|------|------|
| Quest tracking 동기화 버그 (client batch flush 손실) | 중 | 중 | 세션 종료 시 강제 flush + 멱등성 (delta 누적, 서버가 cap 처리) |
| KST 타임존 경계 케이스 (해외 사용자 자정 어긋남) | 중 | 저 | 단일 timezone 선언, Phase 4 에서 다국가화 |
| 대시보드 쿼리 성능 저하 (events 100k+) | 저 (Phase 3 트래픽 가정) | 중 | 30일 cleanup cron 활성화, materialized view 도입 |
| Basic Auth 유출 | 저 | 중 | 강력한 random 시크릿, IP allowlist 옵션, 분기 로테이션 |
| Daily reward 중복 청구 (race) | 저 | 저 | UNIQUE `(player_id, claim_date)` |
| Client-authoritative quest 진척도 위조 | 중 | 저 (essence 양 적음) | 서버 cap (`delta <= max_per_quest`), Phase 4 에서 서버 권위 마이그레이션 검토 |

### Karpathy 원칙 점검

- **Think before coding:** Section 5 (Push) 를 조건부 stretch goal 로 분리, 가정 명시 (옵션 A/B 선택 근거).
- **Simplicity first:** ORM, admin framework, A/B 프레임워크 모두 배제. SQL + Express + template literal.
- **Surgical changes:** Phase 2 의 `leaderboard.ts` 는 파라미터 추가만, 신규 라우터로 새 기능 추가. 기존 events/webhook/player API 무수정.
- **Goal-driven execution:** Success Criteria 표 + Sprint 별 검증 단계 명시.

### Open Loop 정리

Open Questions 10개를 Section 으로 분리하여 구현 전 합의 가능하게 함. Phase 3 시작 직전에 README 또는 PR 코멘트에서 답하기.

---

## Appendix A. DB Migration SQL (요약)

```sql
-- Phase 3: retention + dashboard 테이블

CREATE TABLE IF NOT EXISTS daily_rewards (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    streak_day INTEGER NOT NULL,
    streak_count INTEGER NOT NULL,
    essence_granted INTEGER NOT NULL,
    coins_granted INTEGER NOT NULL DEFAULT 0,
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    claim_date DATE GENERATED ALWAYS AS ((claimed_at AT TIME ZONE 'Asia/Seoul')::date) STORED
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_rewards_unique_per_day
    ON daily_rewards(player_id, claim_date);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_player_time
    ON daily_rewards(player_id, claimed_at DESC);

CREATE TABLE IF NOT EXISTS quests (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    quest_id TEXT NOT NULL,
    target_value INTEGER NOT NULL,
    reward_essence INTEGER NOT NULL,
    assigned_date DATE NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quests_player_date_questid
    ON quests(player_id, assigned_date, quest_id);
CREATE INDEX IF NOT EXISTS idx_quests_player_date
    ON quests(player_id, assigned_date DESC);

CREATE TABLE IF NOT EXISTS quest_progress (
    quest_db_id INTEGER PRIMARY KEY REFERENCES quests(id) ON DELETE CASCADE,
    current_value INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 선택: Push (Sprint 5 진행 시만)
-- CREATE TABLE IF NOT EXISTS push_subscriptions (
--     id SERIAL PRIMARY KEY,
--     player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
--     endpoint TEXT UNIQUE NOT NULL,
--     p256dh TEXT NOT NULL,
--     auth TEXT NOT NULL,
--     created_at TIMESTAMPTZ DEFAULT NOW(),
--     last_used_at TIMESTAMPTZ
-- );

-- 선택: 대시보드 materialized view
-- CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_session_counts AS
-- SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS day,
--        COUNT(DISTINCT player_id) AS unique_players,
--        COUNT(*) AS session_starts
-- FROM events
-- WHERE event_type = 'session_start'
-- GROUP BY day;
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_session_counts_day
--     ON mv_daily_session_counts(day);
```

`infra/postgres/init.sql` 에 추가하거나, 별도 마이그레이션 파일 `infra/postgres/migrations/2026-05-20-phase3.sql` 신설 후 deploy 스크립트에서 `psql -f` 실행. 후자 권장 (init.sql 은 신규 DB 만, 기존 prod 에는 마이그레이션 따로).

---

## Appendix B. 클라이언트 변경 표면 요약

### 신규 파일

| 경로 | 책임 |
|------|------|
| `src/integrations/DailyRewardClient.ts` | daily-reward API 래퍼 |
| `src/integrations/QuestClient.ts` | quests API 래퍼 |
| `src/integrations/LeaderboardClient.ts` | leaderboard API 래퍼 (현재 `ApiClient.ts` 내부 메서드를 별도 파일로 분리 옵션) |
| `src/scenes/LeaderboardScene.ts` | 리더보드 뷰 |
| `src/ui/DailyRewardModal.ts` | 일일 보상 모달 |
| `src/ui/QuestPanel.ts` | 퀘스트 패널 (HUD overlay) |
| `src/systems/QuestTracker.ts` | 게임 이벤트 → quest delta 변환 + batch flush |

### 수정 파일

| 경로 | 변경 |
|------|------|
| `src/scenes/TitleScene.ts` | DailyRewardModal 진입 시 호출 |
| `src/scenes/CharacterSelectScene.ts` | "리더보드" 메뉴, 닉네임 변경 |
| `src/scenes/MainScene.ts` | QuestTracker 통합, enemy_killed/synergy_discover/stage_reached hook |
| `src/scenes/UIScene.ts` | QuestPanel 토글 |
| `src/core/MetaProgress.ts` | (no-op 가능성, `addEssence` 그대로 활용) |

---

## Appendix C. 환경 변수 추가

| 키 | 값 예시 | 용도 |
|----|--------|------|
| `ADMIN_AUTH` | `admin:VeryLongRandomSecret123` | `/api/admin/*` Basic Auth |
| `VAPID_PUBLIC` | `BL...` | Web Push (Sprint 5) |
| `VAPID_PRIVATE` | `...` | Web Push (Sprint 5) |
| `VAPID_SUBJECT` | `mailto:robert.lee@bdacs.co.kr` | Web Push 식별자 |

`docker-compose.yml` 의 `api` 서비스 environment 에 추가. `.env.example` 갱신.

---

## Appendix D. 검증 체크리스트

각 Sprint 종료 시:

- [ ] `cd backend && npm run build` 성공
- [ ] `cd backend && npm test` 전체 통과
- [ ] `npm run build` (클라이언트) 성공
- [ ] `npm test` (클라이언트) 전체 통과
- [ ] `docker-compose up -d` 후 `/api/health` 200
- [ ] 신규 엔드포인트가 정상 응답 (수동 curl)
- [ ] 본인 device 로 e2e 시나리오 1회 완주
- [ ] git diff 가 Sprint 범위 밖 파일 건드리지 않음 (surgical changes)
- [ ] 커밋 메시지가 "what" 보다 "why" 위주

Phase 3 전체 종료 시 추가:

- [ ] Phase 2 회귀 없음 (leaderboard POST, events POST, LS webhook, player GET 모두 기존대로)
- [ ] 대시보드에서 본인이 직접 만든 데이터가 정합성 있게 보임
- [ ] 회고 문서 작성 (`m4-phase3-retrospective.md`)

---

## End of Spec

이 문서는 구현 전 검토용 draft 다. PR 코멘트로 다음을 확인:

1. Open Questions 10개에 대한 사용자 답변
2. Sprint 우선순위 변경 의사 (1→2→3 외 다른 순서 선호?)
3. Section 5 (Web Push) 의 조건부 게이트 동의 여부
4. 닉네임 정책 (자동 생성만 vs 입력 강제 vs 옵션)

승인 후 Sprint 1 부터 별도 PR 시작.
