# M3: Meta Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development to execute task-by-task.

**Goal:** 게임 외 영구 진행 시스템 도입 — 정수(Essence) 화폐, 영구 스킬트리, 12 유물, 시너지 도감, 추가 캐릭터 잠금 해제. 사용자 D7+ 리텐션 메커니즘 구축.

**Architecture:** LocalStorage 기반 영구 데이터(`MetaProgress`) + 신규 컴포넌트(`Relic`) + UI 씬(SkillTreeScene, CodexScene). 기존 시스템(UpgradeScene 카드 풀, SynergyEffect)에 hook 추가만으로 통합.

**Tech Stack:** TypeScript + Phaser 3 + bitECS + Vite + vitest (기존 그대로)

**Spec:** [2026-05-16-game-redefinition-design.md](../specs/2026-05-16-game-redefinition-design.md) Section 3.D (메타 진행) + Section 5 (유물 12종, 캐릭터 6종)

**Milestone:** W9-12 (4주). 검증 게이트: 7일 리텐션 시뮬레이션 (정수 누적 → 캐릭터 해금 + 스킬트리 투자 가능).

**Prerequisite:** M1, M2 머지 완료 (PR #1, #4, #5, #6).

---

## File Structure

### 신규 파일
| 경로 | 책임 |
|------|------|
| `src/core/MetaProgress.ts` | LocalStorage 영구 데이터 (essence/unlocked/skillTree/codex 저장) |
| `src/constants/SkillTreeConfig.ts` | 3계열(전투/생존/발견) × 10단계 정의 |
| `src/constants/RelicConfig.ts` | 12개 유물 정의 (id, name, description, 효과 파라미터) |
| `src/components/relic.ts` | Relic bitECS 컴포넌트 (보유 유물 비트마스크) |
| `src/systems/RelicSystem.ts` | 유물 효과 적용 (처치 시 회복, HP <30% 데미지 +50% 등) |
| `src/scenes/SkillTreeScene.ts` | 스킬트리 UI (메인 메뉴/타이틀에서 진입) |
| `src/scenes/CodexScene.ts` | 시너지 도감 (RecipeScene 재활용 또는 새로 작성) |
| `tests/core/MetaProgress.test.ts` | 영구 저장/로드 + 정수 누적 검증 |
| `tests/constants/SkillTreeConfig.test.ts` | 스킬트리 데이터 무결성 |
| `tests/constants/RelicConfig.test.ts` | 12 유물 데이터 무결성 |

### 수정 파일
| 경로 | 변경 |
|------|------|
| `src/scenes/TitleScene.ts` | "Skill Tree" + "Codex" 진입 버튼 추가 |
| `src/scenes/CharacterSelectScene.ts` | Druid/Engineer 카드 추가 + 정수 잠금 표시 |
| `src/scenes/UpgradeScene.ts` | 카드 풀에 **유물 카드** 추가 (20% 비율) |
| `src/scenes/GameOverScene.ts` | 게임 종료 시 정수 정산 → MetaProgress 저장 |
| `src/scenes/MainScene.ts` | Player에 Relic 컴포넌트 부착 + RelicSystem 등록 |
| `src/components/index.ts` | Relic re-export |
| `src/constants/CharacterConfig.ts` | Druid, Engineer 데이터 추가 (정수 해금 조건) |

---

## Task 1: MetaProgress 영구 저장 시스템

**Files:**
- Create: `src/core/MetaProgress.ts`
- Test: `tests/core/MetaProgress.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MetaProgress } from '../../src/core/MetaProgress';

describe('MetaProgress', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('초기 상태: essence 0, 잠금 해제 0, 도감 비어있음', () => {
        const m = MetaProgress.load();
        expect(m.essence).toBe(0);
        expect(m.unlockedCharacters).toEqual(['knight', 'wizard', 'elf']);
        expect(m.discoveredSynergies).toEqual([]);
        expect(m.skillTree).toEqual({ combat: 0, survival: 0, discovery: 0 });
    });

    it('addEssence는 누적된다', () => {
        const m = MetaProgress.load();
        MetaProgress.addEssence(50);
        MetaProgress.addEssence(30);
        expect(MetaProgress.load().essence).toBe(80);
    });

    it('unlockCharacter는 essence 차감 + 잠금 해제', () => {
        MetaProgress.addEssence(2000);
        const ok = MetaProgress.unlockCharacter('necromancer', 1500);
        expect(ok).toBe(true);
        expect(MetaProgress.load().essence).toBe(500);
        expect(MetaProgress.load().unlockedCharacters).toContain('necromancer');
    });

    it('unlockCharacter는 essence 부족 시 false', () => {
        MetaProgress.addEssence(1000);
        const ok = MetaProgress.unlockCharacter('necromancer', 1500);
        expect(ok).toBe(false);
        expect(MetaProgress.load().essence).toBe(1000);
    });

    it('discoverSynergy는 도감에 추가하고 50 essence 보상', () => {
        MetaProgress.discoverSynergy('plasma_storm');
        expect(MetaProgress.load().discoveredSynergies).toContain('plasma_storm');
        expect(MetaProgress.load().essence).toBe(50);
    });

    it('discoverSynergy 중복은 무시', () => {
        MetaProgress.discoverSynergy('plasma_storm');
        MetaProgress.discoverSynergy('plasma_storm');
        expect(MetaProgress.load().discoveredSynergies).toEqual(['plasma_storm']);
        expect(MetaProgress.load().essence).toBe(50);
    });

    it('upgradeSkillTree는 essence 차감 + 단계 증가', () => {
        MetaProgress.addEssence(500);
        const ok = MetaProgress.upgradeSkillTree('combat', 100);
        expect(ok).toBe(true);
        expect(MetaProgress.load().skillTree.combat).toBe(1);
        expect(MetaProgress.load().essence).toBe(400);
    });

    it('skillTree는 10단계 최대', () => {
        MetaProgress.addEssence(10000);
        for (let i = 0; i < 12; i++) MetaProgress.upgradeSkillTree('combat', 100);
        expect(MetaProgress.load().skillTree.combat).toBe(10);
    });
});
```

- [ ] **Step 2: vitest.config.ts에 jsdom environment 추가 (localStorage 사용 위해)**

`vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom', // localStorage 지원
        include: ['tests/**/*.test.ts'],
    },
});
```

`npm install --save-dev jsdom` 도 같이.

- [ ] **Step 3: MetaProgress.ts 구현**

```typescript
const STORAGE_KEY = 'survivors_meta_progress_v1';

export interface MetaProgressData {
    essence: number;
    unlockedCharacters: string[]; // ['knight', 'wizard', 'elf'] 시작
    discoveredSynergies: string[]; // synergy id 리스트
    skillTree: { combat: number; survival: number; discovery: number };
    relicSlots: number; // 3 기본 → 정수 투자 시 확장
}

const DEFAULT: MetaProgressData = {
    essence: 0,
    unlockedCharacters: ['knight', 'wizard', 'elf'],
    discoveredSynergies: [],
    skillTree: { combat: 0, survival: 0, discovery: 0 },
    relicSlots: 3,
};

export const MetaProgress = {
    load(): MetaProgressData {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return { ...DEFAULT };
            const parsed = JSON.parse(raw);
            return { ...DEFAULT, ...parsed };
        } catch {
            return { ...DEFAULT };
        }
    },

    save(data: MetaProgressData): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },

    addEssence(amount: number): void {
        const data = this.load();
        data.essence += amount;
        this.save(data);
    },

    unlockCharacter(id: string, cost: number): boolean {
        const data = this.load();
        if (data.essence < cost) return false;
        if (data.unlockedCharacters.includes(id)) return false;
        data.essence -= cost;
        data.unlockedCharacters.push(id);
        this.save(data);
        return true;
    },

    discoverSynergy(id: string): void {
        const data = this.load();
        if (data.discoveredSynergies.includes(id)) return;
        data.discoveredSynergies.push(id);
        data.essence += 50; // 발견 보상
        this.save(data);
    },

    upgradeSkillTree(
        branch: 'combat' | 'survival' | 'discovery',
        cost: number,
    ): boolean {
        const data = this.load();
        if (data.essence < cost) return false;
        if (data.skillTree[branch] >= 10) return false;
        data.essence -= cost;
        data.skillTree[branch] += 1;
        this.save(data);
        return true;
    },

    expandRelicSlots(cost: number): boolean {
        const data = this.load();
        if (data.essence < cost) return false;
        if (data.relicSlots >= 5) return false;
        data.essence -= cost;
        data.relicSlots += 1;
        this.save(data);
        return true;
    },
};
```

- [ ] **Step 4: 테스트 통과**: `npm run test -- MetaProgress` → 8 tests passed.

- [ ] **Step 5: 커밋**
```bash
git add src/core/MetaProgress.ts tests/core/MetaProgress.test.ts vitest.config.ts package.json package-lock.json
git commit -m "feat(meta): MetaProgress LocalStorage persistence + essence/unlock/skillTree/codex"
```

---

## Task 2: 스킬트리 데이터 + UI

**Files:**
- Create: `src/constants/SkillTreeConfig.ts`
- Create: `src/scenes/SkillTreeScene.ts`
- Test: `tests/constants/SkillTreeConfig.test.ts`

- [ ] **Step 1: SkillTreeConfig 정의**

```typescript
export interface SkillNodeDef {
    branch: 'combat' | 'survival' | 'discovery';
    level: number; // 1~10
    name: string;
    description: string;
    cost: number; // 정수 비용
    apply: (stats: GlobalStats) => void; // 게임 시작 시 적용
}

export const SKILL_TREE: SkillNodeDef[] = [
    // Combat (전투)
    { branch: 'combat', level: 1, name: '단련 I', cost: 100,
      description: '시작 DMG +5%', apply: (s) => { s.damageMult *= 1.05; } },
    { branch: 'combat', level: 2, name: '단련 II', cost: 200,
      description: '시작 DMG +5% (누적 +10%)', apply: (s) => { s.damageMult *= 1.05; } },
    // ... 10단계 each branch
    // Survival (생존): HP, regen, defense
    { branch: 'survival', level: 1, name: '튼튼함 I', cost: 100,
      description: '시작 HP +10', apply: (s) => { s.bonusMaxHp += 10; } },
    // ... 
    // Discovery (발견): pickup, essence boost, codex
    { branch: 'discovery', level: 1, name: '탐색가 I', cost: 100,
      description: '획득 정수 +10%', apply: (s) => { s.essenceMult *= 1.1; } },
    // ...
];
// 총 30개 노드 (3 × 10)
```

- [ ] **Step 2: 단위 테스트 (30개 + 비용 증가 + 분기 균등)**
- [ ] **Step 3: SkillTreeScene UI**
  - 3 column 레이아웃 (전투/생존/발견)
  - 각 column에 10단계 노드 세로 배치
  - 노드 클릭 → 잠금 해제 시도 (essence 차감)
  - 우측 상단에 essence 잔액 표시
  - 뒤로 가기 버튼 → TitleScene
- [ ] **Step 4: TitleScene에 "Skill Tree" 진입 버튼**
- [ ] **Step 5: 커밋**

---

## Task 3: 12 유물 시스템

**Files:**
- Create: `src/constants/RelicConfig.ts`
- Create: `src/components/relic.ts` (bitmask)
- Create: `src/systems/RelicSystem.ts`
- Test: `tests/constants/RelicConfig.test.ts`

- [ ] **Step 1: RelicConfig 정의**

디자인 스펙의 12 유물 (Section 3.D Items):
```typescript
export interface RelicDef {
    id: string;
    bit: number; // 0~11, Relic.bitmask 위치
    name: string;
    description: string;
}

export const RELICS: RelicDef[] = [
    { id: 'healing_crystal',   bit: 0, name: 'Healing Crystal',
      description: '처치 시 1% HP 회복' },
    { id: 'phoenix_feather',   bit: 1, name: 'Phoenix Feather',
      description: '사망 시 1회 부활 (50% HP)' },
    { id: 'time_crystal',      bit: 2, name: 'Time Crystal',
      description: '5초마다 무적 0.3초' },
    { id: 'greed_pouch',       bit: 3, name: 'Greed Pouch',
      description: '코인 픽업 +50%' },
    { id: 'magnet_core',       bit: 4, name: 'Magnet Core',
      description: '픽업 범위 +100%' },
    { id: 'berserker_belt',    bit: 5, name: 'Berserker Belt',
      description: 'HP < 30% 시 DMG +50%' },
    { id: 'mana_battery',      bit: 6, name: 'Mana Battery',
      description: 'MP 회복 속도 +30%' },
    { id: 'scout_helmet',      bit: 7, name: 'Scout Helmet',
      description: '미니맵 시야 +200%' },
    { id: 'lucky_coin',        bit: 8, name: 'Lucky Coin',
      description: '카드 1장 추가 (15% 확률)' },
    { id: 'vampire_fang',      bit: 9, name: 'Vampire Fang',
      description: '처치 시 1 HP 흡혈' },
    { id: 'echo_boots',        bit: 10, name: 'Echo Boots',
      description: '대시 거리 +30%, 쿨 -20%' },
    { id: 'alchemist_sigil',   bit: 11, name: 'Alchemist Sigil',
      description: '시너지 강화 효과 +30%' },
];
```

- [ ] **Step 2: Relic 컴포넌트 (32-bit bitmask)**

```typescript
import { defineComponent, Types } from 'bitecs';

export const Relic = defineComponent({
    bitmask: Types.ui32, // bit N = relic N 보유 여부
});
```

- [ ] **Step 3: RelicSystem — 매 프레임/이벤트 적용**

- on-kill: healing_crystal, vampire_fang
- on-tick: time_crystal (5초 무적), mana_battery
- conditional: berserker_belt (HP <30%)
- passive multiplier: greed_pouch, magnet_core, alchemist_sigil
- on-death: phoenix_feather (1회 부활)

각 유물별 효과 적용 로직. 30개 시너지 + 유물 패턴 활용.

- [ ] **Step 4: UpgradeScene 카드 풀에 유물 카드 추가 (20% 비율)**
  - 이미 보유한 유물은 풀에서 제외
  - relicSlots(기본 3, 최대 5)까지만 획득 가능
- [ ] **Step 5: 단위 테스트 + 통합 + 커밋**

---

## Task 4: Codex (시너지 도감)

**Files:**
- Create: `src/scenes/CodexScene.ts` (또는 기존 RecipeScene 재작성)
- Modify: `src/systems/AlchemySystem.ts` (시너지 활성 시 MetaProgress.discoverSynergy 호출)

- [ ] **Step 1: AlchemySystem에 발견 hook 추가**

`detectSynergy` 또는 `applySlotChange` 안에서:
```typescript
if (synergy && !MetaProgress.load().discoveredSynergies.includes(synergy.id)) {
    MetaProgress.discoverSynergy(synergy.id); // 50 essence 보상 + 도감 추가
    // 토스트 알림 이벤트 emit (UI에서 수신)
    window.dispatchEvent(new CustomEvent('synergy_discovered', { detail: synergy }));
}
```

- [ ] **Step 2: CodexScene UI**
  - 20개 시너지 그리드 (4×5)
  - 발견한 것 = 이름·설명·원소 표시
  - 미발견 = ??? 표시
  - 진행도 표시 (예: 14/20)
- [ ] **Step 3: TitleScene에 "Codex" 진입 버튼**
- [ ] **Step 4: 발견 시 화면 토스트** (UIScene에서 `synergy_discovered` 이벤트 리스닝)
- [ ] **Step 5: 커밋**

---

## Task 5: Druid + Engineer 캐릭터 + 정수 잠금

**Files:**
- Modify: `src/constants/CharacterConfig.ts` (DRUID, ENGINEER 추가)
- Modify: `src/scenes/CharacterSelectScene.ts` (6 카드 + 잠금 표시)
- Modify: `src/systems/SpellSystem.ts` (Druid/Engineer 공격 분기)

- [ ] **Step 1: CharacterConfig — Druid, Engineer**

```typescript
DRUID: {
    id: 'druid', baseStats: { health: 90, speed: 105, damage: 1.2 },
    unlockCost: 3000, // 정수
    frames: { /* wizard 또는 elf 프레임 재사용 + 녹색 tint */ },
    // ...
},
ENGINEER: {
    id: 'engineer', baseStats: { health: 100, speed: 95, damage: 1.0 },
    unlockCost: 5000,
    frames: { /* knight 프레임 재사용 + 갈색 tint */ },
    // ...
},
```

- [ ] **Step 2: CharacterSelectScene 6-카드 레이아웃**
  - cardWidth 240→180, gap 30→16 (6×180 + 5×16 = 1160 < 1280)
  - 또는 2-row 그리드 (3×2)
  - 잠금된 캐릭터: 회색 + 자물쇠 아이콘 + "필요 정수 3000" 표시
  - 클릭 시 unlockCharacter 시도 (성공 시 즉시 선택 가능)

- [ ] **Step 3: SpellSystem — Druid (가시 덩굴 = wizard 마법탄 변종, 녹색)**
- [ ] **Step 4: SpellSystem — Engineer (포탑 = 정적 스폰, 자동 공격 sprite)**
  - 단순화: Engineer는 wizard 마법탄과 동일 메커니즘 + 푸른 tint
- [ ] **Step 5: 커밋**

---

## Task 6: GameOverScene 정수 정산 + 통합 검증

**Files:** Modify `src/scenes/GameOverScene.ts`

- [ ] **Step 1: 게임 종료 시 정수 정산**

```typescript
// 게임 결과 데이터 (MainScene에서 init data로 전달)
const stage = data.stageCleared;
const enemies = data.enemiesKilled;
const synergies = data.synergiesActivated; // 발견한 시너지 수

const baseEssence = stage * 10 + enemies * 0.5 + synergies * 5;
const finalEssence = Math.floor(baseEssence * (1 + globalStats.essenceMult)); // skill tree boost
MetaProgress.addEssence(finalEssence);

// UI에 표시 — "+125 Essence (총: 2350)"
```

- [ ] **Step 2: GameOverScene에 정수 합산 표시 + Continue 버튼**
- [ ] **Step 3: 자동 검증**
  - `npx tsc --noEmit`
  - `npm run test`
  - `npm run build`
- [ ] **Step 4: 수동 통합 테스트 (검증 게이트)**
  - [ ] 게임 5회 플레이 → 정수 누적 확인 (LocalStorage)
  - [ ] 1500 정수 모이면 Necromancer 잠금 해제
  - [ ] 3000 정수 모이면 Druid 잠금 해제
  - [ ] 스킬트리 노드 잠금 해제 확인
  - [ ] 시너지 발견 시 도감 + 50 essence 보상
  - [ ] 유물 카드 등장 + 효과 작동 (예: vampire_fang HP 흡혈)
- [ ] **Step 5: M3 회고 + 커밋**

---

## Self-Review

### Spec Coverage
| Spec | Plan Task |
|------|-----------|
| 정수(Essence) 영구 화폐 | Task 1 |
| 스킬트리 3계열 × 10단계 | Task 2 |
| 12 유물 + bitmask + RelicSystem | Task 3 |
| Codex (시너지 도감) | Task 4 |
| Druid, Engineer 캐릭터 (정수 해금) | Task 5 |
| 게임 종료 정수 정산 | Task 6 |

### Open Questions
- 스킬트리 노드 비용 곡선 (100→2000 단계별 증가? 모든 단계 100?)
- 유물 카드 등장 확률 — M2의 카드 풀 비율(원소 40/스탯 50/진화 10)에서 어떻게 추가?
- Druid/Engineer 무기 sprite — atlas 재사용 vs 신규 PNG
- 잠금 캐릭터 미리보기 (선택 불가지만 외형은 보임)

### Placeholder Scan
- Task 2 SKILL_TREE 30개 노드: 비용 곡선 + apply 함수 본문은 implementer가 합리적 추정 적용
- Task 3 RelicSystem: 12 유물 각자 적용 로직은 implementer가 패턴별 그룹화 가능
- Task 5 Druid/Engineer 무기 분기: SpellSystem에 단순 wizard 변종으로 처리 후 M4 폴리싱

---

## Execution Handoff

Plan complete. Subagent-Driven Development로 실행.
