# M2: Content+ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** M1 Core Alchemy 위에 콘텐츠 깊이를 더한다 — 시너지 5→20개 완성, 무기 진화 12종 도입, 4번째 캐릭터 Necromancer 추가.

**Architecture:** M1의 ECS + AlchemyConfig + fx/ 패턴을 그대로 확장. 신규 추가는 데이터(AlchemyConfig), 진화 로직(WeaponEvolutionSystem), 캐릭터 데이터(CharacterConfig). 기존 시스템 손대지 않고 신규 모듈만 추가.

**Tech Stack:** TypeScript 5.8 + Phaser 3.88 + bitECS 0.3.39 + Vite 6.4.2 + vitest 4.1.6

**Spec:** [2026-05-16-game-redefinition-design.md](../specs/2026-05-16-game-redefinition-design.md) Section 2 (시너지) + Section 3 (무기 진화) + Section 5 (캐릭터)

**Milestone:** W5-8 (4주). 검증 게이트: 30분 무이탈 플레이 5회 + Necromancer 캐릭터로 1회 클리어.

**Prerequisite:** M1 PR #1, #4 머지 완료 + Lazy binding fix + UI 재배치.

---

## File Structure

### 신규 파일
| 경로 | 책임 |
|------|------|
| `src/systems/WeaponEvolutionSystem.ts` | 진화 조건 매칭 + 진화 카드 풀 생성 |
| `src/components/weapon.ts` | WeaponEvolution 컴포넌트 (evolutionStage, baseWeaponId) |
| `src/constants/EvolutionConfig.ts` | 12종 진화 무기 정의 + 진화 조건 |
| `src/fx/synergy/SynergyFactory.ts` | 신규 시너지 효과 생성 팩토리 (15개 패턴 그룹) |
| `src/fx/synergy/<SynergyName>.ts` × 15 | 각 신규 시너지 효과 (Task 4-8 참조) |
| `src/constants/NecromancerConfig.ts` | Necromancer 캐릭터 데이터 |
| `src/systems/NecromancerSystem.ts` | "처치 시 좀비 소환" 메커니즘 |
| `src/fx/SummonZombie.ts` | 좀비 소환 시각 효과 + 엔티티 |
| `tests/constants/EvolutionConfig.test.ts` | 진화 조건/매칭 검증 |
| `tests/systems/WeaponEvolutionSystem.test.ts` | 진화 카드 풀 생성 검증 |

### 수정 파일
| 경로 | 변경 |
|------|------|
| `src/constants/AlchemyConfig.ts` | SYNERGIES 5→20 (15개 추가) |
| `src/scenes/UpgradeScene.ts` | 진화 카드 풀 + Necromancer 원소 친화도 통합 |
| `src/scenes/MainScene.ts` | 15개 신규 시너지 인스턴스 + NecromancerSystem tick |
| `src/scenes/CharacterSelectScene.ts` | Necromancer 옵션 추가 |
| `src/components/index.ts` | WeaponEvolution re-export |

---

## Task 1: 15개 신규 시너지 데이터 정의

**Files:**
- Modify: `src/constants/AlchemyConfig.ts`
- Test: `tests/constants/AlchemyConfig.test.ts`

15개 시너지 = C(6,3) 전체 20개 중 M1의 5개를 제외한 모든 조합.

- [ ] **Step 1: 실패 테스트 — 20개 SYNERGIES 검증**

`tests/constants/AlchemyConfig.test.ts`의 기존 5개 테스트에 추가:

```typescript
it('총 20개 시너지가 정의되어 있다 (모든 C(6,3) 조합)', () => {
    expect(SYNERGIES).toHaveLength(20);
});

it('모든 시너지가 고유한 elements 조합을 가진다', () => {
    const keys = SYNERGIES.map(s => s.elements.join('-'));
    expect(new Set(keys).size).toBe(20);
});

it('20개 신규 시너지 ID가 모두 정의되어 있다', () => {
    const ids = SYNERGIES.map(s => s.id);
    const expected = [
        'plasma_storm', 'volcanic_plague', 'tempest', 'eruption', 'cryotoxin',
        'inferno_aura', 'frostbite', 'thunderstrike', 'venom_cloud', 'rockfall',
        'whirlwind', 'arc_lightning', 'poison_nova', 'earthquake', 'cyclone',
        'cinder_burst', 'glacial_spike', 'static_field', 'mire', 'sandstorm',
    ];
    expected.forEach(id => expect(ids).toContain(id));
});
```

- [ ] **Step 2: 테스트 실패 확인**: `npm run test -- AlchemyConfig`. 3개 추가 테스트 FAIL.

- [ ] **Step 3: AlchemyConfig.ts에 15개 시너지 추가**

`SYNERGIES` 배열에 추가:

```typescript
{ id: 'inferno_aura', name: 'Inferno Aura', elements: sortTuple(Element.FIRE, Element.FIRE, Element.AIR),
  description: '플레이어 주변 반경 150 화염 오라 (틱당 30dmg)' },
// (참고: 같은 원소 중복은 정의 불가 — sortTuple은 3 distinct elements 가정)
```

> ⚠️ **재설계 필요**: 6원소 중 3개 distinct 선택 → C(6,3) = 20. 위 inferno_aura는 FIRE×2 + AIR로 invalid.

다음과 같이 20개 distinct 조합 (lexicographic sorted):
```
[FIRE,ICE,LIGHTNING]   [FIRE,ICE,POISON]  [FIRE,ICE,EARTH]    [FIRE,ICE,AIR]
[FIRE,LIGHTNING,POISON] [FIRE,LIGHTNING,EARTH] [FIRE,LIGHTNING,AIR]
[FIRE,POISON,EARTH]    [FIRE,POISON,AIR]   [FIRE,EARTH,AIR]
[ICE,LIGHTNING,POISON] [ICE,LIGHTNING,EARTH] [ICE,LIGHTNING,AIR]
[ICE,POISON,EARTH]     [ICE,POISON,AIR]    [ICE,EARTH,AIR]
[LIGHTNING,POISON,EARTH] [LIGHTNING,POISON,AIR] [LIGHTNING,EARTH,AIR]
[POISON,EARTH,AIR]
```

M1 매핑:
- plasma_storm = FIRE+ICE+LIGHTNING
- volcanic_plague = FIRE+POISON+EARTH
- tempest = ICE+LIGHTNING+AIR
- eruption = FIRE+EARTH+AIR
- cryotoxin = ICE+LIGHTNING+POISON

신규 15개 (id + description):
```typescript
// 추가 시너지 15개
{ id: 'frostbite',     elements: [FIRE,ICE,POISON],       name: 'Frostbite',
  description: '5초마다 가장 가까운 적 빙결 1.5초 + 중독' },
{ id: 'cinder_burst',  elements: [FIRE,ICE,EARTH],        name: 'Cinder Burst',
  description: '적 처치 시 25% 확률 잔해 폭발 (반경 60, 100dmg)' },
{ id: 'thunderstrike', elements: [FIRE,ICE,AIR],          name: 'Thunderstrike',
  description: '플레이어 위 3초마다 낙뢰 (반경 80, 180dmg)' },
{ id: 'venom_cloud',   elements: [FIRE,LIGHTNING,EARTH],  name: 'Venom Cloud',
  description: '플레이어 주변 반경 120 독 안개 (틱당 max HP 2%)' },
{ id: 'arc_lightning', elements: [FIRE,LIGHTNING,AIR],    name: 'Arc Lightning',
  description: '공격 시 25% 확률 인근 적 2명 체인 (50dmg)' },
{ id: 'rockfall',      elements: [FIRE,POISON,AIR],       name: 'Rockfall',
  description: '8초마다 화면 무작위 4곳 돌덩이 (반경 70, 200dmg)' },
{ id: 'sandstorm',     elements: [FIRE,EARTH,AIR],        name: 'Sandstorm',
  description: '플레이어 주변 회오리 (반경 180) 적 둔화 40% + 시야 차단 표시' },
{ id: 'whirlwind',     elements: [ICE,LIGHTNING,EARTH],   name: 'Whirlwind',
  description: '플레이어 주변 회오리 반경 200, 60프레임마다 80dmg + 넉백' },
{ id: 'glacial_spike', elements: [ICE,POISON,EARTH],      name: 'Glacial Spike',
  description: '15프레임마다 가장 강한 적에게 얼음 가시 (250dmg + 1초 둔화)' },
{ id: 'mire',          elements: [ICE,POISON,AIR],        name: 'Mire',
  description: '8초마다 화면 무작위 위치 늪 (반경 80, 3초 지속, 둔화+중독)' },
{ id: 'poison_nova',   elements: [ICE,EARTH,AIR],         name: 'Poison Nova',
  description: '10초마다 플레이어 중심 독 폭발 (반경 200, 100dmg)' },
{ id: 'static_field',  elements: [LIGHTNING,POISON,EARTH],name: 'Static Field',
  description: '플레이어 주변 반경 180 전기장 (틱당 25dmg + 5% 마비)' },
{ id: 'earthquake',    elements: [LIGHTNING,POISON,AIR],  name: 'Earthquake',
  description: '12초마다 전체 지진 (모든 적 1초 스턴 + 50dmg)' },
{ id: 'cyclone',       elements: [LIGHTNING,EARTH,AIR],   name: 'Cyclone',
  description: '플레이어 따라다니는 사이클론 (반경 150, 적 끌어당김 + 100dmg/sec)' },
{ id: 'cascade',       elements: [POISON,EARTH,AIR],      name: 'Cascade',
  description: '적 처치 시 인근 적 1명에게 30% 데미지 폭발' },
```

> 참고: `cascade`는 위 expected 배열의 마지막 원소와 맞춰야 함 — `frostbite~cyclone, cascade`로 ID 일관성 확보. 실제 expected 배열에 맞춰 정리.

- [ ] **Step 4: 테스트 통과** `npm run test -- AlchemyConfig` → 8 tests passed.

- [ ] **Step 5: 커밋**
```bash
git add src/constants/AlchemyConfig.ts tests/constants/AlchemyConfig.test.ts
git commit -m "feat(alchemy): expand SYNERGIES from 5 to 20 (all C(6,3) combinations)"
```

---

## Task 2: 15개 신규 시너지 효과 클래스 (그룹 패턴화)

**Files:** `src/fx/synergy/<Name>.ts` × 15

> M1 PlasmaStorm 패턴을 5개 그룹으로 분류하여 반복 작업 효율화.

### 효과 그룹 5종
| 그룹 | 패턴 | 해당 시너지 |
|------|------|------------|
| **A. Tick-based AOE** | N프레임마다 무작위 적 위치 폭발 | thunderstrike, rockfall, glacial_spike |
| **B. Aura (passive)** | 플레이어 주변 지속 효과 | inferno_aura, venom_cloud, sandstorm, whirlwind, static_field, cyclone, poison_nova |
| **C. On-Death** | 적 사망 시 트리거 | cinder_burst, cascade |
| **D. On-Attack proc** | 공격 시 확률 효과 | arc_lightning |
| **E. Periodic Targeted** | 주기적으로 특정 적 표적 | frostbite |
| **F. Periodic Global** | 주기적 전체 영향 | earthquake, mire |

각 그룹별 베이스 클래스를 만들지, 개별 파일로 만들지 결정. **개별 파일이 단순** (M1 패턴 유지). 단, 베이스 클래스를 만들면 코드 중복 75% 감소.

### 결정: 베이스 클래스 + 그룹별 구현

- [ ] **Step 1**: `src/fx/synergy/SynergyEffectBase.ts` 작성 (공통 인터페이스):

```typescript
export interface SynergyEffectBase {
    setPlayerEid(eid: number): void;
    tick(): void;
    destroy?(): void;
}

export abstract class SynergyEffectTick implements SynergyEffectBase {
    protected scene: Phaser.Scene;
    protected playerEid: number = -1;
    protected frameCounter = 0;
    protected enemyQuery: ReturnType<typeof defineQuery>;
    abstract synergyIndex: number;
    abstract tickFrames: number;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.enemyQuery = defineQuery([Enemy, Position, Health]);
    }

    setPlayerEid(eid: number): void { this.playerEid = eid; }

    tick(): void {
        if (this.playerEid < 0) return;
        if (SynergyEffect.synergyId[this.playerEid] !== this.synergyIndex) {
            this.frameCounter = 0;
            return;
        }
        this.frameCounter++;
        if (this.frameCounter < this.tickFrames) return;
        this.frameCounter = 0;
        this.execute();
    }

    protected abstract execute(): void;
}
```

- [ ] **Step 2-15**: 각 효과 파일 생성. 베이스 상속 후 `execute()` 구현. 그룹 A 예시:

```typescript
// src/fx/synergy/Thunderstrike.ts
export class Thunderstrike extends SynergyEffectTick {
    synergyIndex = 7; // SYNERGIES에서 thunderstrike 인덱스
    tickFrames = 180; // 3초

    protected execute(): void {
        const px = Position.x[this.playerEid];
        const py = Position.y[this.playerEid];
        // 플레이어 위에 낙뢰 — 시각 효과 + 반경 80 데미지 180
        const flash = this.scene.add.rectangle(px, py, 8, 200, 0xffee58, 1);
        // ...
    }
}
```

> ⚠️ 각 파일 ~30~50줄. 15개 파일 작성 = 약 600~750줄.

- [ ] **Step 16**: `src/fx/synergy/SynergyFactory.ts` — 모든 효과 인스턴스화 + MainScene에 등록 단순화:

```typescript
import { PlasmaStorm } from '../PlasmaStorm';
import { VolcanicPlague } from '../VolcanicPlague';
// ... 5 M1 + 15 M2 imports

export function createAllSynergyEffects(scene: Phaser.Scene): SynergyEffectBase[] {
    return [
        new PlasmaStorm(scene), new VolcanicPlague(scene),
        new Tempest(scene), new Eruption(scene), new Cryotoxin(scene),
        // 15 신규
        new Frostbite(scene), new CinderBurst(scene), new Thunderstrike(scene),
        // ...
    ];
}
```

- [ ] **Step 17**: MainScene 수정 — 기존 5개 개별 호출 대신 SynergyFactory 사용:

```typescript
// MainScene.create
this.synergyEffects = createAllSynergyEffects(this);
this.synergyEffects.forEach(e => e.setPlayerEid(this.playerId));

// MainScene.update
this.synergyEffects.forEach(e => e.tick());
```

- [ ] **Step 18**: 빌드 + 빠른 수동 테스트 → 각 시너지 1개씩 발동 확인.

- [ ] **Step 19**: 커밋 (그룹별 분할):
```bash
git commit -m "feat(alchemy): add SynergyEffectBase + 15 new synergy effects"
```

---

## Task 3: 무기 진화 시스템 도입

**Files:**
- Create: `src/components/weapon.ts`
- Create: `src/constants/EvolutionConfig.ts`
- Create: `src/systems/WeaponEvolutionSystem.ts`
- Test: `tests/constants/EvolutionConfig.test.ts`, `tests/systems/WeaponEvolutionSystem.test.ts`

- [ ] **Step 1**: `WeaponEvolution` bitECS 컴포넌트:

```typescript
// src/components/weapon.ts
export const WeaponEvolution = defineComponent({
    evolutionId: Types.i8,    // EVOLUTIONS 인덱스, -1 = 기본 무기
    baseWeaponId: Types.i8,   // 0=Knight, 1=Wizard, 2=Elf, 3=Necromancer
});
```

- [ ] **Step 2**: `EvolutionConfig.ts` — 12개 진화 무기 정의:

```typescript
export interface WeaponEvolutionDef {
    id: string;
    name: string;
    baseWeaponId: number;       // 어느 캐릭터 무기에서
    requiredElement: Element;   // 어느 슬롯 원소가 필요한가
    requiredLevel: number;      // 무기 레벨 (예: 5)
    description: string;
    // 효과 파라미터는 fx/weapon-evolutions/<id>.ts에서 처리
}

export const EVOLUTIONS: WeaponEvolutionDef[] = [
    // Knight
    { id: 'inferno_blade',  baseWeaponId: 0, requiredElement: Element.FIRE, requiredLevel: 5,
      name: 'Inferno Blade', description: '검 휘두름에 화염 부여, 베인 적 3초 화상' },
    { id: 'frost_razor',    baseWeaponId: 0, requiredElement: Element.ICE,  requiredLevel: 5,
      name: 'Frost Razor', description: '검 휘두름에 빙결, 적중 적 1초 둔화' },
    // Wizard
    { id: 'thunder_orb',    baseWeaponId: 1, requiredElement: Element.LIGHTNING, requiredLevel: 5,
      name: 'Thunder Orb', description: '마법탄 적중 시 인근 적 2명 체인' },
    { id: 'plague_sphere',  baseWeaponId: 1, requiredElement: Element.POISON, requiredLevel: 5,
      name: 'Plague Sphere', description: '마법탄 폭발 시 독 안개 잔류 (2초)' },
    // Elf
    { id: 'storm_volley',   baseWeaponId: 2, requiredElement: Element.AIR,    requiredLevel: 5,
      name: 'Storm Volley', description: '화살이 회오리에 휩쓸려 곡선 비행 + 사거리 +50%' },
    { id: 'earthshatter',   baseWeaponId: 2, requiredElement: Element.EARTH,  requiredLevel: 5,
      name: 'Earthshatter', description: '화살 적중 시 반경 60 작은 폭발' },
    // Necromancer
    { id: 'soul_storm',     baseWeaponId: 3, requiredElement: Element.LIGHTNING, requiredLevel: 5,
      name: 'Soul Storm', description: '영혼탄 발사 시 50% 확률 즉시 추가 발사 (2배 속도)' },
    { id: 'death_mist',     baseWeaponId: 3, requiredElement: Element.POISON, requiredLevel: 5,
      name: 'Death Mist', description: '영혼탄 적중 위치 안개 (4초, 시야 가림 + DOT)' },
    // 진화 무기 (4개 더 — 캐릭터별 2종 × 4클래스 = 8개. 4종 추가는 보너스 변종)
    { id: 'crimson_edge',   baseWeaponId: 0, requiredElement: Element.POISON, requiredLevel: 8,
      name: 'Crimson Edge', description: 'Knight 검에 흡혈 부여 — 처치 시 max HP 2% 회복' },
    { id: 'mana_burst',     baseWeaponId: 1, requiredElement: Element.AIR,    requiredLevel: 8,
      name: 'Mana Burst', description: 'Wizard 마법탄 발사 시 3방향 분사' },
    { id: 'verdant_arrow',  baseWeaponId: 2, requiredElement: Element.FIRE,   requiredLevel: 8,
      name: 'Verdant Arrow', description: 'Elf 화살에 화상 부여 + 관통 1' },
    { id: 'lich_grasp',     baseWeaponId: 3, requiredElement: Element.ICE,    requiredLevel: 8,
      name: 'Lich Grasp', description: 'Necromancer 영혼탄 적중 시 1초 둔화' },
];
```

- [ ] **Step 3**: `findEligibleEvolutions(eid: number, baseWeaponId: number, currentLevel: number)` 헬퍼:

조건 매칭 — 슬롯에 requiredElement가 있고, currentLevel >= requiredLevel.

- [ ] **Step 4**: 단위 테스트 작성 + 통과:

```typescript
it('레벨 5 미만에서는 진화 불가', () => {
    const result = findEligibleEvolutions(eid, 0, 4);
    expect(result).toEqual([]);
});

it('Knight + FIRE 슬롯 + 레벨 5 → inferno_blade 진화 가능', () => {
    AlchemySlot.slot0[eid] = Element.FIRE;
    const result = findEligibleEvolutions(eid, 0, 5);
    expect(result.map(e => e.id)).toContain('inferno_blade');
});
```

- [ ] **Step 5**: 커밋

---

## Task 4: UpgradeScene에 진화 카드 통합

**Files:** Modify `src/scenes/UpgradeScene.ts`

- [ ] **Step 1**: 카드 풀 4종 다양화 (Section 3.B 스펙):
  - 원소 카드 (40%): 기존 유지
  - 스탯 카드 (30%): DMG/SPD/CDR/픽업범위 +10~15%
  - 유물 카드 (20%): M3로 연기 → M2에서는 스탯에 흡수 (50% 비율로)
  - 진화 카드 (10%): 조건 만족 시만 등장

- [ ] **Step 2**: `pickRandomCards(count)` 로직 변경. 카드 타입 enum 도입:

```typescript
type CardType = 'element' | 'stat' | 'evolution';

interface CardData {
    type: CardType;
    title: string;
    description: string;
    payload: ElementCardPayload | StatCardPayload | EvolutionCardPayload;
}
```

- [ ] **Step 3-5**: 카드 선택 시 type별 적용 + 빌드 + 수동 테스트 + 커밋.

---

## Task 5: Necromancer 캐릭터 추가

**Files:**
- Create: `src/constants/NecromancerConfig.ts`
- Modify: `src/scenes/CharacterSelectScene.ts`
- Create: `src/systems/NecromancerSystem.ts` (좀비 소환 메커니즘)
- Create: `src/fx/SummonZombie.ts`

- [ ] **Step 1**: Necromancer 데이터 — 기본 무기 "Soul Bolt" 정의 (Wizard의 마법탄 변종).

- [ ] **Step 2**: CharacterSelectScene에 4번째 캐릭터 카드 추가 + 잠금 해제 조건 (정수 1,500 보유 시).

- [ ] **Step 3**: NecromancerSystem — "처치 시 좀비 소환" tick 로직.

```typescript
export class NecromancerSystem {
    private playerEid: number = -1;
    private kills = 0;
    private SUMMON_EVERY_KILLS = 10;

    setPlayerEid(eid: number): void { this.playerEid = eid; }

    onKill(): void {
        if (this.playerEid < 0) return;
        // 캐릭터 == Necromancer 체크 (CharacterConfig.id === 'necromancer')
        this.kills++;
        if (this.kills >= this.SUMMON_EVERY_KILLS) {
            this.kills = 0;
            // 좀비 엔티티 spawn — Position.x[player], Position.y[player] + 약간 randomized
            // 5초 후 자동 소멸. 적 1마리 attack
        }
    }
}
```

- [ ] **Step 4**: 빌드 + 수동 테스트 + 커밋.

---

## Task 6: M2 통합 검증 + 플레이테스트 (검증 게이트)

**Files:** (수동만)

- [ ] **Step 1**: `npm run test` 모든 신규 단위 테스트 통과 (예상: 30+ tests).
- [ ] **Step 2**: `npm run build` 성공 + 번들 크기 < 6MB.
- [ ] **Step 3**: `npm run dev` → 30분 플레이 × 5회 (각각 다른 캐릭터로 1회씩 + Necromancer).
- [ ] **Step 4**: 검증 체크리스트:
  - [ ] 20개 시너지 중 최소 8개 발동 확인
  - [ ] 무기 진화 카드 등장 + 진화 적용 확인
  - [ ] Necromancer "처치 시 좀비 소환" 시각 + 데미지 확인
  - [ ] 30분 무이탈 (크래시·진행 불가 없음)
  - [ ] FPS ≥ 50 @ 100엔티티
- [ ] **Step 5**: `docs/superpowers/specs/m2-retrospective.md` 작성 + 커밋.

---

## Self-Review

### Spec Coverage
| Spec 항목 | Plan Task |
|----------|-----------|
| Section 2 — 20 시너지 완성 | Task 1, 2 |
| Section 3 — 무기 진화 (12종) | Task 3, 4 |
| Section 3 — 카드 풀 4종 다양화 | Task 4 |
| Section 5 — Necromancer 캐릭터 | Task 5 |
| Section 6 M2 검증 게이트: 30분 무이탈 5회 | Task 6 |

### Placeholder Scan
- ⚠️ Task 2의 15개 시너지 효과 코드는 그룹 패턴화로 요약. 실제 구현 시 SynergyFactory + 각 효과 클래스 명확히 작성 필요. **각 effect 구현은 implementer subagent가 PlasmaStorm 패턴 참조**.
- ⚠️ Task 4의 카드 풀 비율 (40/30/20/10)은 유물 카드(M3 이연) 때문에 M2에서는 40/50/0/10으로 조정. 실제 구현 시 명시.

### Open Questions
- Necromancer 잠금 해제: M2에서는 정수 시스템(M3) 미구현이므로, 일단 게임 시작부터 가용으로 두고 잠금은 M3에 도입
- 진화 카드 등장 빈도: 10% 비율을 5%로 낮춰 희소성 부각할지 → 플레이테스트 결과로 결정
- earthquake (전체 스턴)이 너무 강력할 수 있음 — 쿨다운 12초 → 20초로 늘릴지 검토

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-16-m2-content-plus.md`. Two execution options:

**1. Subagent-Driven** - 신선한 서브에이전트 per task, 두 단계 리뷰

**2. Inline Execution** - 현재 세션 내 배치 실행

**Which approach?**
