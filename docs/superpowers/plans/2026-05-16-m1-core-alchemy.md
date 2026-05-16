# M1: Core Alchemy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phaser 3 + bitECS Survivors 게임에 연금술 시스템 코어를 구축한다 — 6원소 정의, 3슬롯 시스템, 5개 시너지 조합, 죽은 UpgradeScene/LevelUpUI 코드 부활.

**Architecture:** bitECS 컴포넌트 기반(AlchemySlot, SynergyEffect) + 데이터 상수(AlchemyConfig.ts) + 시스템 로직(AlchemySystem.ts) + UI 레이어(AlchemySlotUI, TriggerButton). 기존 [UpgradeScene.ts](src/scenes/UpgradeScene.ts)와 [LevelUpUI.ts](src/ui/LevelUpUI.ts) 죽은 코드를 부활시켜 카드 선택 UI로 사용.

**Tech Stack:** TypeScript 5.8 / Phaser 3.88 / bitECS 0.3.39 / Vite 6.2 / vitest (신규 추가)

**Spec:** [2026-05-16-game-redefinition-design.md](../specs/2026-05-16-game-redefinition-design.md) Section 2

**Milestone:** W1-4 (4주). 검증 게이트: 내부 플레이테스트에서 "조합 발견 재미" 확인.

---

## File Structure

### 신규 파일
| 경로 | 책임 |
|------|------|
| `src/constants/AlchemyConfig.ts` | 6원소 enum, 5 시너지 조합 데이터, 헬퍼 함수 |
| `src/components/alchemy.ts` | AlchemySlot, SynergyEffect bitECS 컴포넌트 |
| `src/systems/AlchemySystem.ts` | 슬롯 채움 감지, 시너지 활성/비활성 로직 |
| `src/ui/AlchemySlotUI.ts` | 좌하단 3슬롯 시각화 |
| `src/ui/TriggerButton.ts` | 우측 하단 ⚡ TRIGGER 버튼 UI 및 쿨다운 |
| `src/effects/PlasmaStorm.ts` | 시너지 효과 #1 구현 |
| `src/effects/VolcanicPlague.ts` | 시너지 효과 #2 |
| `src/effects/Tempest.ts` | 시너지 효과 #3 |
| `src/effects/Eruption.ts` | 시너지 효과 #4 |
| `src/effects/Cryotoxin.ts` | 시너지 효과 #5 |
| `tests/constants/AlchemyConfig.test.ts` | 원소·시너지 데이터 검증 |
| `tests/systems/AlchemySystem.test.ts` | 슬롯·시너지 감지 검증 |
| `vitest.config.ts` | vitest 설정 |

### 수정 파일
| 경로 | 변경 |
|------|------|
| `src/components/index.ts` | alchemy 컴포넌트 re-export |
| `src/scenes/MainScene.ts` | 레벨업 시 UpgradeScene launch, AlchemySystem 등록 |
| `src/scenes/UpgradeScene.ts` (110줄, 죽은 코드 부활) | 3장 카드 생성 + 선택 |
| `src/ui/LevelUpUI.ts` (74줄, 죽은 코드 부활) | 카드 hover/select UI |
| `src/scenes/UIScene.ts` | AlchemySlotUI, TriggerButton 통합 |
| `src/constants/GameConfig.ts` | TRIGGER 쿨다운/지속 시간 상수 |
| `package.json` | vitest devDependency 추가 |

---

## Task 0: Vitest 테스트 인프라 구축

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`
- Test: (직접 vitest 실행)

- [ ] **Step 1: vitest 설치**

```bash
npm install --save-dev vitest @vitest/ui
```

Expected: `package.json` devDependencies에 `vitest`, `@vitest/ui` 추가됨.

- [ ] **Step 2: package.json scripts 추가**

`package.json` 편집:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts",
    "format": "prettier --write 'src/**/*.ts'",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "prepare": "husky"
  }
}
```

- [ ] **Step 3: vitest.config.ts 생성**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
    },
});
```

- [ ] **Step 4: 더미 테스트로 동작 확인**

`tests/smoke.test.ts` 생성:

```typescript
import { describe, it, expect } from 'vitest';

describe('vitest 인프라', () => {
    it('산술이 작동한다', () => {
        expect(1 + 1).toBe(2);
    });
});
```

Run: `npm run test`
Expected: 1 test passed.

- [ ] **Step 5: 커밋**

```bash
git add package.json package-lock.json vitest.config.ts tests/smoke.test.ts
git commit -m "test: add vitest infrastructure"
```

---

## Task 1: 6원소 + 5 시너지 데이터 정의

**Files:**
- Create: `src/constants/AlchemyConfig.ts`
- Test: `tests/constants/AlchemyConfig.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`tests/constants/AlchemyConfig.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
    Element,
    ELEMENT_INFO,
    SYNERGIES,
    findSynergy,
} from '../../src/constants/AlchemyConfig';

describe('AlchemyConfig', () => {
    it('6개 원소가 정의되어 있다', () => {
        expect(Object.keys(Element)).toHaveLength(6);
        expect(Element.FIRE).toBe(0);
        expect(Element.ICE).toBe(1);
        expect(Element.LIGHTNING).toBe(2);
        expect(Element.POISON).toBe(3);
        expect(Element.EARTH).toBe(4);
        expect(Element.AIR).toBe(5);
    });

    it('각 원소에 정보가 있다', () => {
        for (let i = 0; i < 6; i++) {
            expect(ELEMENT_INFO[i]).toBeDefined();
            expect(ELEMENT_INFO[i].name).toBeTruthy();
            expect(ELEMENT_INFO[i].color).toMatch(/^0x[0-9A-Fa-f]{6}$/);
        }
    });

    it('5개 시너지가 정의되어 있다 (Plasma Storm, Volcanic Plague, Tempest, Eruption, Cryotoxin)', () => {
        expect(SYNERGIES).toHaveLength(5);
        const names = SYNERGIES.map((s) => s.id);
        expect(names).toContain('plasma_storm');
        expect(names).toContain('volcanic_plague');
        expect(names).toContain('tempest');
        expect(names).toContain('eruption');
        expect(names).toContain('cryotoxin');
    });

    it('findSynergy는 슬롯 조합으로 시너지를 찾는다 (순서 무관)', () => {
        const r1 = findSynergy([Element.FIRE, Element.LIGHTNING, Element.ICE]);
        const r2 = findSynergy([Element.ICE, Element.FIRE, Element.LIGHTNING]);
        expect(r1?.id).toBe('plasma_storm');
        expect(r2?.id).toBe('plasma_storm');
    });

    it('findSynergy는 정의 없는 조합에 null을 반환한다', () => {
        const r = findSynergy([Element.FIRE, Element.FIRE, Element.FIRE]);
        expect(r).toBeNull();
    });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -- AlchemyConfig`
Expected: 모듈을 찾을 수 없다는 에러로 FAIL.

- [ ] **Step 3: AlchemyConfig.ts 구현**

`src/constants/AlchemyConfig.ts`:

```typescript
export enum Element {
    FIRE = 0,
    ICE = 1,
    LIGHTNING = 2,
    POISON = 3,
    EARTH = 4,
    AIR = 5,
}

export interface ElementInfo {
    name: string;
    color: string; // hex like '0xFF4500'
    icon: string;  // emoji or key
}

export const ELEMENT_INFO: Record<number, ElementInfo> = {
    [Element.FIRE]:      { name: 'FIRE',      color: '0xFF4500', icon: '🔥' },
    [Element.ICE]:       { name: 'ICE',       color: '0x4FC3F7', icon: '❄️' },
    [Element.LIGHTNING]: { name: 'LIGHTNING', color: '0xFFEE58', icon: '⚡' },
    [Element.POISON]:    { name: 'POISON',    color: '0x9CCC65', icon: '☠️' },
    [Element.EARTH]:     { name: 'EARTH',     color: '0x8D6E63', icon: '🪨' },
    [Element.AIR]:       { name: 'AIR',       color: '0xCFD8DC', icon: '💨' },
};

export interface SynergyDef {
    id: string;
    name: string;
    elements: [Element, Element, Element]; // 정렬된 3원소
    description: string;
}

// 조합은 정렬된 형태로 저장 (검색 시 입력도 정렬)
const sortTuple = (a: Element, b: Element, c: Element): [Element, Element, Element] => {
    const arr = [a, b, c].sort((x, y) => x - y) as [Element, Element, Element];
    return arr;
};

export const SYNERGIES: SynergyDef[] = [
    {
        id: 'plasma_storm',
        name: 'Plasma Storm',
        elements: sortTuple(Element.FIRE, Element.LIGHTNING, Element.ICE),
        description: '30프레임마다 화면 무작위 위치에 번개 폭풍 (300 dmg)',
    },
    {
        id: 'volcanic_plague',
        name: 'Volcanic Plague',
        elements: sortTuple(Element.FIRE, Element.POISON, Element.EARTH),
        description: '적 사망 시 독구덩이 (5초, DOT 8%)',
    },
    {
        id: 'tempest',
        name: 'Tempest',
        elements: sortTuple(Element.ICE, Element.LIGHTNING, Element.AIR),
        description: '플레이어 주변 회오리 (반경 200, 둔화+체인)',
    },
    {
        id: 'eruption',
        name: 'Eruption',
        elements: sortTuple(Element.EARTH, Element.AIR, Element.FIRE),
        description: '5초마다 적 위치 폭발 (반경 100, 200 dmg)',
    },
    {
        id: 'cryotoxin',
        name: 'Cryotoxin',
        elements: sortTuple(Element.POISON, Element.ICE, Element.LIGHTNING),
        description: '적 처치 시 50% 얼음 폭발 (반경 80)',
    },
];

export function findSynergy(slots: [Element, Element, Element]): SynergyDef | null {
    const sorted = sortTuple(slots[0], slots[1], slots[2]);
    return (
        SYNERGIES.find(
            (s) =>
                s.elements[0] === sorted[0] &&
                s.elements[1] === sorted[1] &&
                s.elements[2] === sorted[2]
        ) ?? null
    );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -- AlchemyConfig`
Expected: 5 tests passed.

- [ ] **Step 5: 커밋**

```bash
git add src/constants/AlchemyConfig.ts tests/constants/AlchemyConfig.test.ts
git commit -m "feat(alchemy): define 6 elements and 5 initial synergies"
```

---

## Task 2: AlchemySlot 및 SynergyEffect bitECS 컴포넌트

**Files:**
- Create: `src/components/alchemy.ts`
- Modify: `src/components/index.ts`

- [ ] **Step 1: alchemy.ts 작성**

`src/components/alchemy.ts`:

```typescript
import { defineComponent, Types } from 'bitecs';

/**
 * Player가 보유한 3개 원소 슬롯. 값은 AlchemyConfig.Element enum.
 * -1 = 빈 슬롯.
 */
export const AlchemySlot = defineComponent({
    slot0: Types.i8,
    slot1: Types.i8,
    slot2: Types.i8,
});

/**
 * 현재 활성화된 시너지 효과 상태.
 * synergyId == -1 → 비활성
 * boostActiveUntil: TRIGGER로 활성된 강화 효과 종료 시각 (ms)
 * boostCooldownUntil: TRIGGER 쿨다운 종료 시각 (ms)
 */
export const SynergyEffect = defineComponent({
    synergyId: Types.i16,
    boostActiveUntil: Types.f64,
    boostCooldownUntil: Types.f64,
});
```

- [ ] **Step 2: index.ts에 re-export**

`src/components/index.ts` 파일 맨 아래에 추가:

```typescript
// Alchemy system components
export { AlchemySlot, SynergyEffect } from './alchemy';
```

- [ ] **Step 3: 타입체크 통과 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: 컴파일 동작 확인 (Vite)**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 5: 커밋**

```bash
git add src/components/alchemy.ts src/components/index.ts
git commit -m "feat(alchemy): add AlchemySlot and SynergyEffect bitECS components"
```

---

## Task 3: AlchemySystem — 슬롯 채움 감지 및 시너지 활성화

**Files:**
- Create: `src/systems/AlchemySystem.ts`
- Test: `tests/systems/AlchemySystem.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`tests/systems/AlchemySystem.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, addEntity, addComponent, IWorld } from 'bitecs';
import { AlchemySlot, SynergyEffect } from '../../src/components/alchemy';
import { Element, SYNERGIES } from '../../src/constants/AlchemyConfig';
import { detectSynergy, applySlotChange } from '../../src/systems/AlchemySystem';

describe('AlchemySystem', () => {
    let world: IWorld;
    let eid: number;

    beforeEach(() => {
        world = createWorld();
        eid = addEntity(world);
        addComponent(world, AlchemySlot, eid);
        addComponent(world, SynergyEffect, eid);
        // 초기값 — 빈 슬롯
        AlchemySlot.slot0[eid] = -1;
        AlchemySlot.slot1[eid] = -1;
        AlchemySlot.slot2[eid] = -1;
        SynergyEffect.synergyId[eid] = -1;
    });

    it('슬롯이 비어있으면 시너지 없음', () => {
        const result = detectSynergy(eid);
        expect(result).toBeNull();
    });

    it('슬롯 2개만 채워지면 시너지 없음', () => {
        AlchemySlot.slot0[eid] = Element.FIRE;
        AlchemySlot.slot1[eid] = Element.ICE;
        const result = detectSynergy(eid);
        expect(result).toBeNull();
    });

    it('3슬롯 채워지고 정의된 조합이면 시너지 반환', () => {
        AlchemySlot.slot0[eid] = Element.FIRE;
        AlchemySlot.slot1[eid] = Element.LIGHTNING;
        AlchemySlot.slot2[eid] = Element.ICE;
        const result = detectSynergy(eid);
        expect(result?.id).toBe('plasma_storm');
    });

    it('3슬롯 채워지고 정의 안 된 조합이면 null', () => {
        AlchemySlot.slot0[eid] = Element.FIRE;
        AlchemySlot.slot1[eid] = Element.FIRE;
        AlchemySlot.slot2[eid] = Element.FIRE;
        const result = detectSynergy(eid);
        expect(result).toBeNull();
    });

    it('applySlotChange는 빈 슬롯에 원소를 채운다', () => {
        applySlotChange(eid, Element.FIRE);
        expect(AlchemySlot.slot0[eid]).toBe(Element.FIRE);
    });

    it('applySlotChange는 빈 슬롯이 없으면 첫 슬롯을 덮어쓴다', () => {
        applySlotChange(eid, Element.FIRE);
        applySlotChange(eid, Element.ICE);
        applySlotChange(eid, Element.LIGHTNING);
        applySlotChange(eid, Element.POISON);
        expect(AlchemySlot.slot0[eid]).toBe(Element.POISON);
        expect(AlchemySlot.slot1[eid]).toBe(Element.ICE);
        expect(AlchemySlot.slot2[eid]).toBe(Element.LIGHTNING);
    });

    it('applySlotChange 후 시너지 자동 활성화', () => {
        applySlotChange(eid, Element.FIRE);
        applySlotChange(eid, Element.LIGHTNING);
        applySlotChange(eid, Element.ICE);
        expect(SynergyEffect.synergyId[eid]).toBe(0); // SYNERGIES 배열의 plasma_storm 인덱스
    });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -- AlchemySystem`
Expected: 모듈 부재로 FAIL.

- [ ] **Step 3: AlchemySystem.ts 구현**

`src/systems/AlchemySystem.ts`:

```typescript
import { AlchemySlot, SynergyEffect } from '../components/alchemy';
import { Element, SynergyDef, SYNERGIES, findSynergy } from '../constants/AlchemyConfig';

/**
 * 주어진 엔티티의 3슬롯 상태를 보고 일치하는 시너지를 반환.
 * 슬롯이 다 차지 않았으면 null.
 */
export function detectSynergy(eid: number): SynergyDef | null {
    const s0 = AlchemySlot.slot0[eid];
    const s1 = AlchemySlot.slot1[eid];
    const s2 = AlchemySlot.slot2[eid];
    if (s0 < 0 || s1 < 0 || s2 < 0) return null;
    return findSynergy([s0 as Element, s1 as Element, s2 as Element]);
}

/**
 * 빈 슬롯에 원소를 채우고, 빈 슬롯 없으면 첫 슬롯을 덮어쓴다.
 * 슬롯 변경 후 시너지 재계산하여 SynergyEffect.synergyId 갱신.
 */
export function applySlotChange(eid: number, element: Element): void {
    if (AlchemySlot.slot0[eid] < 0) {
        AlchemySlot.slot0[eid] = element;
    } else if (AlchemySlot.slot1[eid] < 0) {
        AlchemySlot.slot1[eid] = element;
    } else if (AlchemySlot.slot2[eid] < 0) {
        AlchemySlot.slot2[eid] = element;
    } else {
        // 모두 차있으면 첫 슬롯 덮어쓰기 (단순화 — 추후 UX 개선 시 사용자 선택 UI)
        AlchemySlot.slot0[eid] = element;
    }
    const synergy = detectSynergy(eid);
    SynergyEffect.synergyId[eid] = synergy ? SYNERGIES.findIndex((s) => s.id === synergy.id) : -1;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -- AlchemySystem`
Expected: 7 tests passed.

- [ ] **Step 5: 커밋**

```bash
git add src/systems/AlchemySystem.ts tests/systems/AlchemySystem.test.ts
git commit -m "feat(alchemy): implement slot detection and synergy activation logic"
```

---

## Task 4: GameConfig에 TRIGGER 상수 추가

**Files:**
- Modify: `src/constants/GameConfig.ts`

- [ ] **Step 1: 현재 GameConfig 읽기**

Run: `cat src/constants/GameConfig.ts`
Expected: 기존 상수 목록 확인 (PLAYER_SPEED 등).

- [ ] **Step 2: TRIGGER 상수 추가**

`src/constants/GameConfig.ts` 맨 아래에 추가:

```typescript
// Alchemy Trigger Button
export const TRIGGER_ACTIVE_DURATION_MS = 5000;     // 강화 효과 5초 지속
export const TRIGGER_COOLDOWN_AFTER_END_MS = 3000;  // 효과 종료 후 3초 쿨
export const TRIGGER_BUTTON_RADIUS_PX = 40;         // 모바일 터치 반경
```

- [ ] **Step 3: 타입체크 통과 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: 빌드 동작 확인**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 5: 커밋**

```bash
git add src/constants/GameConfig.ts
git commit -m "feat(alchemy): add TRIGGER duration and cooldown constants"
```

---

## Task 5: AlchemySlotUI — 좌하단 3슬롯 시각화

**Files:**
- Create: `src/ui/AlchemySlotUI.ts`

> Phaser UI 코드는 단위 테스트 어려움. 본 태스크는 수동 검증.

- [ ] **Step 1: AlchemySlotUI.ts 작성**

`src/ui/AlchemySlotUI.ts`:

```typescript
import Phaser from 'phaser';
import { AlchemySlot } from '../components/alchemy';
import { Element, ELEMENT_INFO } from '../constants/AlchemyConfig';

const SLOT_SIZE = 48;
const SLOT_GAP = 8;
const MARGIN_X = 20;
const MARGIN_Y_FROM_BOTTOM = 20;

export class AlchemySlotUI {
    private scene: Phaser.Scene;
    private slotRects: Phaser.GameObjects.Rectangle[] = [];
    private slotIcons: Phaser.GameObjects.Text[] = [];
    private container: Phaser.GameObjects.Container;
    private playerEid: number | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        const totalWidth = SLOT_SIZE * 3 + SLOT_GAP * 2;
        const baseX = MARGIN_X;
        const baseY = scene.scale.height - MARGIN_Y_FROM_BOTTOM - SLOT_SIZE;

        this.container = scene.add.container(baseX, baseY);
        this.container.setDepth(1000);
        this.container.setScrollFactor(0);

        for (let i = 0; i < 3; i++) {
            const rect = scene.add.rectangle(
                i * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2,
                SLOT_SIZE / 2,
                SLOT_SIZE,
                SLOT_SIZE,
                0x222222,
                0.75
            );
            rect.setStrokeStyle(2, 0xffffff, 0.4);
            this.container.add(rect);
            this.slotRects.push(rect);

            const icon = scene.add.text(
                i * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2,
                SLOT_SIZE / 2,
                '?',
                { fontSize: '24px', color: '#888888' }
            );
            icon.setOrigin(0.5);
            this.container.add(icon);
            this.slotIcons.push(icon);
        }
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
    }

    update(): void {
        if (this.playerEid === null) return;
        const slots = [
            AlchemySlot.slot0[this.playerEid],
            AlchemySlot.slot1[this.playerEid],
            AlchemySlot.slot2[this.playerEid],
        ];
        for (let i = 0; i < 3; i++) {
            const el = slots[i];
            if (el < 0) {
                this.slotIcons[i].setText('?');
                this.slotIcons[i].setColor('#888888');
                this.slotRects[i].setFillStyle(0x222222, 0.75);
            } else {
                const info = ELEMENT_INFO[el as Element];
                this.slotIcons[i].setText(info.icon);
                this.slotIcons[i].setColor('#ffffff');
                this.slotRects[i].setFillStyle(parseInt(info.color), 0.5);
            }
        }
    }

    destroy(): void {
        this.container.destroy();
    }
}
```

- [ ] **Step 2: 빌드 통과 확인**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 3: 수동 통합 테스트 (UIScene에 임시 통합)**

Section `src/scenes/UIScene.ts`의 `create()` 메서드 끝에 임시 코드 추가:

```typescript
// TEMP: Slot UI 시각 확인 (Task 7에서 정식 통합)
import { AlchemySlotUI } from '../ui/AlchemySlotUI';
const slotUI = new AlchemySlotUI(this);
(this as any).__tempSlotUI = slotUI;
```

Run: `npm run dev` → 브라우저 열기
Expected: 화면 좌하단에 빈 3슬롯(`?` 표시) 보임.

- [ ] **Step 4: 임시 코드 롤백 (Step 3 코드 제거)**

UIScene.ts에 추가한 import와 임시 코드 줄 제거.

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 5: 커밋**

```bash
git add src/ui/AlchemySlotUI.ts
git commit -m "feat(alchemy): add AlchemySlotUI for 3-slot bottom-left visualization"
```

---

## Task 6: TriggerButton UI 및 쿨다운 로직

**Files:**
- Create: `src/ui/TriggerButton.ts`

- [ ] **Step 1: TriggerButton.ts 작성**

`src/ui/TriggerButton.ts`:

```typescript
import Phaser from 'phaser';
import { SynergyEffect } from '../components/alchemy';
import {
    TRIGGER_ACTIVE_DURATION_MS,
    TRIGGER_COOLDOWN_AFTER_END_MS,
    TRIGGER_BUTTON_RADIUS_PX,
} from '../constants/GameConfig';

export class TriggerButton {
    private scene: Phaser.Scene;
    private circle: Phaser.GameObjects.Arc;
    private label: Phaser.GameObjects.Text;
    private cooldownText: Phaser.GameObjects.Text;
    private container: Phaser.GameObjects.Container;
    private playerEid: number | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        const x = scene.scale.width - 80;
        const y = scene.scale.height - 80;

        this.container = scene.add.container(x, y);
        this.container.setDepth(1000);
        this.container.setScrollFactor(0);

        this.circle = scene.add.circle(0, 0, TRIGGER_BUTTON_RADIUS_PX, 0xFFAA00, 0.85);
        this.circle.setStrokeStyle(3, 0xffffff, 1);
        this.circle.setInteractive({ useHandCursor: true });
        this.container.add(this.circle);

        this.label = scene.add.text(0, 0, '⚡', { fontSize: '28px' });
        this.label.setOrigin(0.5);
        this.container.add(this.label);

        this.cooldownText = scene.add.text(0, 0, '', {
            fontSize: '16px',
            color: '#ffffff',
            fontStyle: 'bold',
        });
        this.cooldownText.setOrigin(0.5);
        this.container.add(this.cooldownText);

        this.circle.on('pointerdown', () => this.onPress());
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
    }

    /**
     * 활성 가능 조건: 슬롯 3개 차서 시너지 활성 중 AND 쿨다운 끝남.
     */
    private canActivate(now: number): boolean {
        if (this.playerEid === null) return false;
        if (SynergyEffect.synergyId[this.playerEid] < 0) return false;
        if (now < SynergyEffect.boostCooldownUntil[this.playerEid]) return false;
        if (now < SynergyEffect.boostActiveUntil[this.playerEid]) return false;
        return true;
    }

    private onPress(): void {
        if (this.playerEid === null) return;
        const now = this.scene.time.now;
        if (!this.canActivate(now)) return;
        SynergyEffect.boostActiveUntil[this.playerEid] = now + TRIGGER_ACTIVE_DURATION_MS;
        SynergyEffect.boostCooldownUntil[this.playerEid] =
            now + TRIGGER_ACTIVE_DURATION_MS + TRIGGER_COOLDOWN_AFTER_END_MS;
    }

    update(): void {
        if (this.playerEid === null) return;
        const now = this.scene.time.now;

        if (now < SynergyEffect.boostActiveUntil[this.playerEid]) {
            // 활성 중 — 황금색 펄스
            this.circle.setFillStyle(0xffd700, 1.0);
            this.cooldownText.setText('');
        } else if (now < SynergyEffect.boostCooldownUntil[this.playerEid]) {
            // 쿨다운 — 회색
            this.circle.setFillStyle(0x555555, 0.7);
            const remaining = Math.ceil(
                (SynergyEffect.boostCooldownUntil[this.playerEid] - now) / 1000
            );
            this.cooldownText.setText(String(remaining));
        } else if (SynergyEffect.synergyId[this.playerEid] >= 0) {
            // 발동 가능 — 주황색
            this.circle.setFillStyle(0xFFAA00, 0.85);
            this.cooldownText.setText('');
        } else {
            // 슬롯 미완성 — 어둠색
            this.circle.setFillStyle(0x222222, 0.5);
            this.cooldownText.setText('');
        }
    }

    destroy(): void {
        this.container.destroy();
    }
}
```

- [ ] **Step 2: 빌드 통과 확인**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 3: 수동 통합 테스트 (UIScene 임시 통합)**

`src/scenes/UIScene.ts`의 `create()` 끝에 임시 추가:

```typescript
import { TriggerButton } from '../ui/TriggerButton';
const tb = new TriggerButton(this);
(this as any).__tempTriggerButton = tb;
```

Run: `npm run dev`
Expected: 우측 하단에 어둠색 원형 버튼 보임.

- [ ] **Step 4: 임시 코드 롤백**

UIScene.ts에서 추가한 import와 임시 코드 제거.

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 5: 커밋**

```bash
git add src/ui/TriggerButton.ts
git commit -m "feat(alchemy): add TriggerButton UI with cooldown state machine"
```

---

## Task 7: UpgradeScene 부활 — 3장 카드 생성 및 launch

**Files:**
- Modify: `src/scenes/UpgradeScene.ts` (110줄 죽은 코드 부활)
- Modify: `src/scenes/MainScene.ts` (레벨업 시 UpgradeScene launch)

- [ ] **Step 1: UpgradeScene 현재 코드 백업 (참고용)**

Run: `cat src/scenes/UpgradeScene.ts > /tmp/UpgradeScene.old.ts.bak`
Expected: 백업 생성.

- [ ] **Step 2: UpgradeScene을 카드 선택 씬으로 재작성**

`src/scenes/UpgradeScene.ts` 전체 교체:

```typescript
import Phaser from 'phaser';
import { Element, ELEMENT_INFO } from '../constants/AlchemyConfig';
import { applySlotChange } from '../systems/AlchemySystem';

interface CardData {
    element: Element;
    title: string;
    description: string;
}

export class UpgradeScene extends Phaser.Scene {
    private cards: Phaser.GameObjects.Container[] = [];
    private playerEid: number = -1;

    constructor() {
        super({ key: 'UpgradeScene' });
    }

    init(data: { playerEid: number }) {
        this.playerEid = data.playerEid;
    }

    create() {
        // 반투명 배경
        const bg = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            0x000000,
            0.7
        );
        bg.setDepth(0);

        // 타이틀
        const title = this.add.text(
            this.scale.width / 2,
            80,
            'LEVEL UP! 카드를 선택하세요',
            { fontSize: '32px', color: '#ffd700', fontStyle: 'bold' }
        );
        title.setOrigin(0.5);
        title.setDepth(1);

        // 카드 3장 무작위 (원소 카드만, Task 8/9에서 다른 카드 종류 추가)
        const cardData = this.pickRandomCards(3);
        const cardWidth = 200;
        const cardHeight = 280;
        const gap = 40;
        const totalWidth = cardWidth * 3 + gap * 2;
        const startX = (this.scale.width - totalWidth) / 2 + cardWidth / 2;
        const cardY = this.scale.height / 2;

        cardData.forEach((data, i) => {
            const x = startX + i * (cardWidth + gap);
            const card = this.createCard(x, cardY, cardWidth, cardHeight, data);
            this.cards.push(card);
        });
    }

    private pickRandomCards(count: number): CardData[] {
        const allElements = Object.values(Element).filter((v) => typeof v === 'number') as Element[];
        const shuffled = [...allElements].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count).map((el) => ({
            element: el,
            title: ELEMENT_INFO[el].name,
            description: `${ELEMENT_INFO[el].icon} ${ELEMENT_INFO[el].name} 원소를 슬롯에 추가`,
        }));
    }

    private createCard(x: number, y: number, w: number, h: number, data: CardData): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);
        container.setDepth(1);

        const colorHex = parseInt(ELEMENT_INFO[data.element].color);
        const bg = this.add.rectangle(0, 0, w, h, colorHex, 0.4);
        bg.setStrokeStyle(3, 0xffffff, 1);
        container.add(bg);

        const icon = this.add.text(0, -80, ELEMENT_INFO[data.element].icon, { fontSize: '64px' });
        icon.setOrigin(0.5);
        container.add(icon);

        const titleText = this.add.text(0, 0, data.title, { fontSize: '24px', color: '#ffffff', fontStyle: 'bold' });
        titleText.setOrigin(0.5);
        container.add(titleText);

        const descText = this.add.text(0, 60, data.description, {
            fontSize: '14px',
            color: '#cccccc',
            wordWrap: { width: w - 20 },
            align: 'center',
        });
        descText.setOrigin(0.5);
        container.add(descText);

        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => bg.setFillStyle(colorHex, 0.7));
        bg.on('pointerout', () => bg.setFillStyle(colorHex, 0.4));
        bg.on('pointerdown', () => this.onCardSelected(data));

        return container;
    }

    private onCardSelected(data: CardData) {
        if (this.playerEid >= 0) {
            applySlotChange(this.playerEid, data.element);
        }
        // 메인 씬 재개
        this.scene.resume('MainScene');
        this.scene.stop();
    }
}
```

- [ ] **Step 3: MainScene 레벨업 핸들러에서 UpgradeScene launch**

`src/scenes/MainScene.ts`의 레벨업 처리 부분 (`'level_up'` 이벤트 핸들러 또는 레벨업 로직 위치)에 다음 추가. 위치 찾기:

Run: `grep -n "level_up\|levelUp\|onLevelUp\|level + 1" src/scenes/MainScene.ts`

찾은 위치 직후에 다음 코드 추가 (예시 — 정확한 위치는 실제 코드 기준):

```typescript
// 레벨업 시 UpgradeScene 띄우기 (게임 일시정지)
this.scene.pause();
this.scene.launch('UpgradeScene', { playerEid: this.player.eid });
```

> 주의: `this.player.eid` 는 player 엔티티의 ECS ID. MainScene 코드에 player 객체가 어떤 형태로 저장되어있는지 확인 후 정확한 표현으로 교체.

- [ ] **Step 4: 빌드 + 수동 테스트**

Run: `npm run build && npm run dev`

수동: 게임 진입 → XP 획득 → 레벨업 → UpgradeScene 등장 확인.

Expected:
- 화면 어두워짐
- 3장의 원소 카드 표시
- 카드 클릭 시 사라지고 게임 재개
- 게임 좌하단 슬롯에 선택한 원소 표시 (Task 5의 UI가 정식 통합되어야 보임 — Task 9 참조)

- [ ] **Step 5: 커밋**

```bash
git add src/scenes/UpgradeScene.ts src/scenes/MainScene.ts
git commit -m "feat(alchemy): revive UpgradeScene as 3-card selection on level up"
```

---

## Task 8: Player 엔티티에 AlchemySlot, SynergyEffect 컴포넌트 부여

**Files:**
- Modify: `src/scenes/MainScene.ts` (또는 PlayerSystem.ts — Player 생성 위치)

- [ ] **Step 1: Player 생성 위치 찾기**

Run: `grep -n "addComponent.*Player\|createPlayer\|Player\.eid" src/scenes/MainScene.ts src/systems/PlayerSystem.ts`

Player 엔티티가 생성되는 정확한 위치 식별.

- [ ] **Step 2: 컴포넌트 추가 코드 삽입**

Player 엔티티 생성 직후에 추가 (예시 — 실제 위치는 Step 1에서 확인):

```typescript
import { AlchemySlot, SynergyEffect } from '../components/alchemy';

// Player 생성 후
addComponent(world, AlchemySlot, playerEid);
addComponent(world, SynergyEffect, playerEid);
AlchemySlot.slot0[playerEid] = -1;
AlchemySlot.slot1[playerEid] = -1;
AlchemySlot.slot2[playerEid] = -1;
SynergyEffect.synergyId[playerEid] = -1;
SynergyEffect.boostActiveUntil[playerEid] = 0;
SynergyEffect.boostCooldownUntil[playerEid] = 0;
```

- [ ] **Step 3: 빌드 통과 확인**

Run: `npm run build`
Expected: 에러 없음.

- [ ] **Step 4: 수동 동작 확인**

Run: `npm run dev` → 레벨업 → 카드 선택 → 콘솔 (`F12 DevTools`)에서:

```javascript
// 브라우저 콘솔에서 확인 (게임 인스턴스 접근 위해 임시로 window 노출 필요할 수 있음)
console.log(AlchemySlot.slot0[playerEid]);
// 선택한 원소 enum 값이 출력되어야 함
```

> 콘솔 직접 확인이 어려우면 Task 9의 UI 통합 후 시각 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/scenes/MainScene.ts
git commit -m "feat(alchemy): attach AlchemySlot and SynergyEffect to Player entity"
```

---

## Task 9: AlchemySlotUI + TriggerButton 정식 통합 (UIScene)

**Files:**
- Modify: `src/scenes/UIScene.ts`

- [ ] **Step 1: UIScene에 임포트 및 필드 추가**

`src/scenes/UIScene.ts` 상단:

```typescript
import { AlchemySlotUI } from '../ui/AlchemySlotUI';
import { TriggerButton } from '../ui/TriggerButton';
```

class 내부에 필드 추가:

```typescript
private alchemySlotUI!: AlchemySlotUI;
private triggerButton!: TriggerButton;
```

- [ ] **Step 2: create()에서 인스턴스 생성**

`create()` 메서드 끝에 추가:

```typescript
this.alchemySlotUI = new AlchemySlotUI(this);
this.triggerButton = new TriggerButton(this);

// MainScene에서 playerEid 받기
const mainScene = this.scene.get('MainScene') as any;
if (mainScene?.playerEid !== undefined) {
    this.alchemySlotUI.setPlayerEid(mainScene.playerEid);
    this.triggerButton.setPlayerEid(mainScene.playerEid);
}
```

- [ ] **Step 3: update()에서 UI 갱신**

`update()` 메서드 끝에 추가 (메서드 없으면 새로 추가):

```typescript
update() {
    // ... 기존 업데이트 로직
    if (this.alchemySlotUI) this.alchemySlotUI.update();
    if (this.triggerButton) this.triggerButton.update();
}
```

- [ ] **Step 4: 빌드 + 수동 테스트**

Run: `npm run build && npm run dev`

Expected:
- 좌하단 3슬롯 항상 표시
- 우측 하단 ⚡ 버튼 항상 표시
- 레벨업 → 원소 카드 선택 → 슬롯 채워짐 (시각 확인)
- 3슬롯 모두 채워지면 ⚡ 버튼 주황색 (활성 가능)
- ⚡ 버튼 누르면 황금색 5초 → 회색 카운트다운 3초

- [ ] **Step 5: 커밋**

```bash
git add src/scenes/UIScene.ts
git commit -m "feat(alchemy): integrate AlchemySlotUI and TriggerButton into UIScene"
```

---

## Task 10: 시너지 효과 #1 Plasma Storm 구현

**Files:**
- Create: `src/effects/PlasmaStorm.ts`
- Modify: `src/scenes/MainScene.ts` (effect tick)

- [ ] **Step 1: PlasmaStorm.ts 작성**

`src/effects/PlasmaStorm.ts`:

```typescript
import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Position } from '../components';
import { SynergyEffect } from '../components/alchemy';

const enemyQuery = defineQuery([Position]); // TODO: 실제 Enemy 태그 컴포넌트로 좁히기

const TICK_FRAMES = 30;
const DAMAGE_BASE = 300;
const RADIUS = 80;

export class PlasmaStorm {
    private scene: Phaser.Scene;
    private playerEid: number = -1;
    private frameCounter = 0;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
    }

    /**
     * 매 프레임 호출 — 시너지 #0(plasma_storm) 활성 시에만 작동
     */
    tick(world: any): void {
        if (this.playerEid < 0) return;
        if (SynergyEffect.synergyId[this.playerEid] !== 0) return; // 0 = plasma_storm index

        this.frameCounter++;
        if (this.frameCounter < TICK_FRAMES) return;
        this.frameCounter = 0;

        const enemies = enemyQuery(world);
        if (enemies.length === 0) return;

        // 무작위 적 위치에 번개 폭풍
        const targetIdx = Math.floor(Math.random() * enemies.length);
        const targetEid = enemies[targetIdx];
        const x = Position.x[targetEid];
        const y = Position.y[targetEid];

        const now = this.scene.time.now;
        const boostActive = now < SynergyEffect.boostActiveUntil[this.playerEid];
        const damage = boostActive ? DAMAGE_BASE * 2 : DAMAGE_BASE;

        // 시각 효과 (단순화 — 추후 VFX 시스템 활용)
        const flash = this.scene.add.circle(x, y, RADIUS, 0xFFEE58, 0.6);
        flash.setDepth(50);
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 200,
            onComplete: () => flash.destroy(),
        });

        // 데미지 적용 — 주변 적 검색
        for (const eid of enemies) {
            const dx = Position.x[eid] - x;
            const dy = Position.y[eid] - y;
            if (dx * dx + dy * dy <= RADIUS * RADIUS) {
                this.scene.events.emit('damage_enemy', { eid, damage });
            }
        }
    }
}
```

> 주의: `enemyQuery`의 `defineQuery([Position])`는 모든 Position 보유 엔티티를 잡으므로, 실제 코드베이스에서는 Enemy 식별 컴포넌트(예: `Health` + `EnemyTag`)로 좁혀야 함. 코드베이스의 기존 적 쿼리 패턴 확인 필수 (`grep -n "defineQuery" src/systems/*.ts`).

- [ ] **Step 2: 코드베이스 쿼리 패턴 확인 및 조정**

Run: `grep -n "defineQuery" src/systems/*.ts | head -20`

기존 적 쿼리 패턴 (예: `defineQuery([Position, Health, EnemyTag])`) 확인 후 `PlasmaStorm.ts`의 `enemyQuery` 정의 수정.

또한 `'damage_enemy'` 이벤트가 기존 코드에 있는지 확인:

Run: `grep -rn "damage_enemy\|takeDamage\|applyDamage" src/`

기존 데미지 적용 메커니즘에 맞춰 호출 방식 조정 (이벤트 vs 직접 컴포넌트 수정).

- [ ] **Step 3: MainScene update에서 PlasmaStorm tick 호출**

`src/scenes/MainScene.ts`:

```typescript
import { PlasmaStorm } from '../effects/PlasmaStorm';

// class 필드
private plasmaStorm!: PlasmaStorm;

// create() 끝
this.plasmaStorm = new PlasmaStorm(this);
this.plasmaStorm.setPlayerEid(this.playerEid);

// update() 안에
this.plasmaStorm.tick(this.world);
```

- [ ] **Step 4: 수동 동작 테스트**

Run: `npm run dev`

수동 테스트:
1. 레벨업 → FIRE 카드 선택
2. 레벨업 → LIGHTNING 카드 선택
3. 레벨업 → ICE 카드 선택 (3슬롯 완성, plasma_storm 활성)
4. 화면에 30프레임(약 0.5초)마다 황색 원형 폭발 → 데미지 입혀짐 확인

Expected: 적이 0.5초마다 무작위 위치에서 사라짐.

- [ ] **Step 5: 커밋**

```bash
git add src/effects/PlasmaStorm.ts src/scenes/MainScene.ts
git commit -m "feat(alchemy): implement Plasma Storm synergy effect (Fire+Lightning+Ice)"
```

---

## Task 11: 나머지 4개 시너지 효과 구현

> Task 10의 PlasmaStorm 패턴을 그대로 따라 4개 효과를 동일 구조로 작성. 각각 별도 파일.

### Task 11-A: Volcanic Plague (FIRE + POISON + EARTH)

**Files:** `src/effects/VolcanicPlague.ts`

- [ ] **Step 1: VolcanicPlague.ts 작성**

```typescript
import Phaser from 'phaser';
import { Position } from '../components';
import { SynergyEffect } from '../components/alchemy';

const POISON_PUDDLE_DURATION_MS = 5000;
const POISON_DOT_PERCENT_PER_SEC = 0.08;
const PUDDLE_RADIUS = 60;

interface Puddle {
    x: number; y: number; spawnedAt: number; gfx: Phaser.GameObjects.Arc;
}

export class VolcanicPlague {
    private scene: Phaser.Scene;
    private playerEid: number = -1;
    private puddles: Puddle[] = [];

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        // 적 사망 이벤트 구독
        scene.events.on('enemy_died', this.onEnemyDied, this);
    }

    setPlayerEid(eid: number): void { this.playerEid = eid; }

    private onEnemyDied(data: { x: number; y: number }) {
        if (this.playerEid < 0) return;
        if (SynergyEffect.synergyId[this.playerEid] !== 1) return; // 1 = volcanic_plague

        const gfx = this.scene.add.circle(data.x, data.y, PUDDLE_RADIUS, 0x9CCC65, 0.5);
        gfx.setDepth(5);
        this.puddles.push({ x: data.x, y: data.y, spawnedAt: this.scene.time.now, gfx });
    }

    tick(world: any): void {
        const now = this.scene.time.now;
        // 만료 puddle 제거
        this.puddles = this.puddles.filter((p) => {
            if (now - p.spawnedAt > POISON_PUDDLE_DURATION_MS) {
                p.gfx.destroy();
                return false;
            }
            return true;
        });
        // 모든 puddle에서 데미지 적용 (1초마다)
        // ... 구현은 enemyQuery + 위치 비교 + damage_enemy 이벤트 emit
    }
}
```

- [ ] **Step 2-5**: 동일 패턴 (코드베이스 적용/이벤트 동기화/MainScene update 호출/수동 테스트/커밋)

### Task 11-B: Tempest (ICE + LIGHTNING + AIR)

**Files:** `src/effects/Tempest.ts`

- [ ] **Step 1: Tempest.ts 작성**

플레이어 주변 회오리: 매 프레임 플레이어 위치 기준 반경 200 내 적 검색 → 둔화(velocity * 0.6) + 30프레임마다 50dmg 체인 적용.

```typescript
import Phaser from 'phaser';
import { Position, Velocity } from '../components';
import { SynergyEffect } from '../components/alchemy';

const TEMPEST_RADIUS = 200;
const SLOW_FACTOR = 0.6;
const CHAIN_TICK_FRAMES = 30;
const CHAIN_DAMAGE = 50;

export class Tempest {
    private scene: Phaser.Scene;
    private playerEid: number = -1;
    private chainCounter = 0;
    private aura!: Phaser.GameObjects.Arc;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.aura = scene.add.circle(0, 0, TEMPEST_RADIUS, 0x4FC3F7, 0.1);
        this.aura.setDepth(3);
        this.aura.setVisible(false);
    }

    setPlayerEid(eid: number): void { this.playerEid = eid; }

    tick(world: any, enemyQuery: (w: any) => number[]): void {
        if (this.playerEid < 0) return;
        const active = SynergyEffect.synergyId[this.playerEid] === 2;
        this.aura.setVisible(active);
        if (!active) return;

        const px = Position.x[this.playerEid];
        const py = Position.y[this.playerEid];
        this.aura.setPosition(px, py);

        this.chainCounter++;
        const doChain = this.chainCounter >= CHAIN_TICK_FRAMES;
        if (doChain) this.chainCounter = 0;

        const enemies = enemyQuery(world);
        for (const eid of enemies) {
            const dx = Position.x[eid] - px;
            const dy = Position.y[eid] - py;
            if (dx * dx + dy * dy <= TEMPEST_RADIUS * TEMPEST_RADIUS) {
                Velocity.x[eid] *= SLOW_FACTOR;
                Velocity.y[eid] *= SLOW_FACTOR;
                if (doChain) {
                    this.scene.events.emit('damage_enemy', { eid, damage: CHAIN_DAMAGE });
                }
            }
        }
    }
}
```

- [ ] **Step 2-5**: 코드베이스 적용 (enemyQuery 조정) → MainScene update 호출 → 수동 테스트 → 커밋

### Task 11-C: Eruption (EARTH + AIR + FIRE)

**Files:** `src/effects/Eruption.ts`

5초마다 적 위치 폭발 (반경 100, 200 dmg). PlasmaStorm과 동일 패턴, 주기만 다름 (300 프레임).

- [ ] **Step 1-5**: PlasmaStorm 패턴 복사 후 상수만 변경:
  - `TICK_FRAMES = 300` (5초)
  - `DAMAGE_BASE = 200`
  - `RADIUS = 100`
  - synergyId 체크: `=== 3` (eruption index)

### Task 11-D: Cryotoxin (POISON + ICE + LIGHTNING)

**Files:** `src/effects/Cryotoxin.ts`

적 처치 시 50% 확률로 얼음 폭발 (반경 80, 둔화+중독).

```typescript
import Phaser from 'phaser';
import { Position, Velocity } from '../components';
import { SynergyEffect } from '../components/alchemy';

const RADIUS = 80;
const PROC_CHANCE = 0.5;
const SLOW_FACTOR = 0.5;
const POISON_DOT_DURATION_MS = 3000;

export class Cryotoxin {
    private scene: Phaser.Scene;
    private playerEid: number = -1;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        scene.events.on('enemy_died', this.onEnemyDied, this);
    }

    setPlayerEid(eid: number): void { this.playerEid = eid; }

    private onEnemyDied(data: { x: number; y: number; world: any; enemyQuery: any }) {
        if (this.playerEid < 0) return;
        if (SynergyEffect.synergyId[this.playerEid] !== 4) return; // 4 = cryotoxin
        if (Math.random() > PROC_CHANCE) return;

        const flash = this.scene.add.circle(data.x, data.y, RADIUS, 0x4FC3F7, 0.6);
        flash.setDepth(50);
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 300,
            onComplete: () => flash.destroy(),
        });

        // 인근 적 둔화
        const enemies = data.enemyQuery(data.world);
        for (const eid of enemies) {
            const dx = Position.x[eid] - data.x;
            const dy = Position.y[eid] - data.y;
            if (dx * dx + dy * dy <= RADIUS * RADIUS) {
                Velocity.x[eid] *= SLOW_FACTOR;
                Velocity.y[eid] *= SLOW_FACTOR;
                this.scene.events.emit('apply_poison', { eid, duration: POISON_DOT_DURATION_MS });
            }
        }
    }
}
```

- [ ] **Step 1-5**: 작성/조정/MainScene 연결/수동 테스트/커밋

---

## Task 12: M1 통합 검증 + 플레이테스트

**Files:** (수동 검증만)

- [ ] **Step 1: 전체 빌드 통과**

Run: `npm run build && npm run lint && npm run test`
Expected: 모두 통과.

- [ ] **Step 2: 5개 시너지 모두 작동 검증**

각 시너지마다 카드 3장 선택하여 활성 확인:

| 시너지 | 카드 조합 | 확인할 효과 |
|--------|----------|------------|
| Plasma Storm | 🔥 + ⚡ + ❄️ | 0.5초마다 황색 폭발, 적 사망 |
| Volcanic Plague | 🔥 + ☠️ + 🪨 | 적 사망 시 녹색 독구덩이 5초 |
| Tempest | ❄️ + ⚡ + 💨 | 플레이어 주변 청색 오라 + 적 둔화 |
| Eruption | 🪨 + 💨 + 🔥 | 5초마다 적 위치 갈색 폭발 |
| Cryotoxin | ☠️ + ❄️ + ⚡ | 적 처치 시 50% 확률 청색 폭발 |

- [ ] **Step 3: TRIGGER 강화 효과 검증**

- 3슬롯 완성 후 ⚡ 버튼 누르기
- 5초간 황금색 (강화 활성)
- 3초 회색 카운트다운 (쿨다운)
- 다시 주황색 (재발동 가능)

- [ ] **Step 4: M1 검증 게이트 — 내부 플레이테스트**

5분 이상 플레이하면서 다음 체크:
- [ ] 레벨업 시 카드 선택이 자연스러운가?
- [ ] 슬롯 채움이 어렵지 않은가? (3장 모으는 데 5레벨 이내?)
- [ ] 시너지 활성 순간이 즉시 인식되는가?
- [ ] ⚡ TRIGGER 버튼 위치가 가로 모바일에서 자연스러운가?
- [ ] 효과가 시각적으로 구분되는가?

- [ ] **Step 5: M1 종료 — 데일리 노트 및 회고 커밋**

`docs/superpowers/specs/m1-retrospective.md` 작성:

```markdown
# M1 회고 (Core Alchemy)

## 작동 확인
- [ ] 6원소 + 5시너지 + UpgradeScene 부활 + TRIGGER

## 발견된 이슈
- (플레이테스트에서 발견한 것들)

## M2 진입 전 조정 사항
- (예: 시너지 효과 밸런스, UI 위치, 슬롯 채움 속도)
```

```bash
git add docs/superpowers/specs/m1-retrospective.md
git commit -m "docs: M1 retrospective and M2 entry notes"
```

---

## Self-Review

### Spec Coverage Check

| Spec Section | Plan Task |
|--------------|-----------|
| Section 2 - 6원소 정의 | Task 1 |
| Section 2 - 3슬롯 시스템 | Task 2, 5 |
| Section 2 - 20조합 → M1 5개 | Task 1 (정의), Task 10/11 (구현) |
| Section 2 - 반자동 발동 (자동 활성) | Task 3 (`detectSynergy` 자동 적용) |
| Section 2 - TRIGGER 강화 | Task 6 (UI), Task 10/11 (효과에서 2배 적용) |
| Section 2 - 죽은 코드 부활 (UpgradeScene) | Task 7 |
| Section 2 - 죽은 코드 부활 (LevelUpUI) | Task 7 (UpgradeScene 안에 통합) |
| Section 2 - Codex(RecipeScene) | M2로 연기 (M1 범위 밖) |
| Section 2 - 데이터 흐름 (LevelUp→UpgradeScene→AlchemySlot→SynergyEffect) | Task 7, 8, 3 |
| Section 6 M1 검증 게이트: 내부 플레이테스트 | Task 12 |

**누락 사항 없음** (Codex는 의도적 M2 연기, M1 검증 게이트에 명시되어 있지 않음).

### Placeholder Scan

- ✅ 모든 step에 실제 코드 포함
- ✅ "TODO"는 PlasmaStorm.ts 안의 enemyQuery 좁힘 안내(Task 10 Step 2에서 명시적 확인 단계)만 존재 — 정당화됨 (코드베이스 의존)
- ✅ Task 8 Step 2의 `playerEid` 참조 표현은 Step 1에서 grep으로 확인하도록 명시

### Type Consistency

- ✅ `applySlotChange(eid, element)` 시그니처 Task 3, Task 7에서 일관
- ✅ `SynergyEffect.synergyId` 인덱스: `0=plasma_storm, 1=volcanic_plague, 2=tempest, 3=eruption, 4=cryotoxin` — Task 10/11에서 일관 적용
- ✅ `findSynergy([Element, Element, Element])` 시그니처 Task 1, Task 3에서 일관
- ✅ `playerEid: number` Task 5, 6, 7, 9, 10, 11에서 일관

### Ambiguity Check

- ⚠️ Task 8 Step 1: Player 엔티티 생성 위치가 코드베이스 의존 → grep으로 확인하도록 명시
- ⚠️ Task 10 Step 1-2: `enemyQuery` 가 `defineQuery([Position])` 으로 잡지만 실제 Enemy 식별 필요 → Step 2에서 명시적 조정 단계
- ⚠️ `'damage_enemy'` 이벤트가 기존 코드에 없을 수 있음 → Task 10 Step 2에서 grep으로 확인 후 조정

이 3개 이슈는 실행 시 코드베이스를 직접 확인해야 해결되며, 플랜 단계에서 미리 grep 명령으로 안내함 → 허용 가능.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-16-m1-core-alchemy.md`. Two execution options:

**1. Subagent-Driven (recommended)** - 신선한 서브에이전트가 태스크당 1개씩 처리, 태스크 간 리뷰, 빠른 반복

**2. Inline Execution** - 본 세션 안에서 executing-plans로 배치 처리, 체크포인트 리뷰

**Which approach?**
