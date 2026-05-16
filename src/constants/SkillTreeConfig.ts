import { globalStats } from '../core/PlayerStats';

export interface SkillNodeDef {
    branch: 'combat' | 'survival' | 'discovery';
    level: number; // 1~10
    name: string;
    description: string;
    cost: number;
    apply: () => void;
}

const cost = (level: number) => level * 100;

export const SKILL_TREE: SkillNodeDef[] = [
    // === COMBAT (전투) — 공격력 +5% 누적 ===
    {
        branch: 'combat',
        level: 1,
        name: '단련 I',
        description: '시작 DMG +5% (누적 5%)',
        cost: cost(1),
        apply: () => {
            globalStats.damageMult *= 1.05;
        },
    },
    {
        branch: 'combat',
        level: 2,
        name: '단련 II',
        description: '시작 DMG +5% (누적 10%)',
        cost: cost(2),
        apply: () => {
            globalStats.damageMult *= 1.05;
        },
    },
    {
        branch: 'combat',
        level: 3,
        name: '단련 III',
        description: '시작 DMG +5% (누적 15%)',
        cost: cost(3),
        apply: () => {
            globalStats.damageMult *= 1.05;
        },
    },
    {
        branch: 'combat',
        level: 4,
        name: '단련 IV',
        description: '시작 DMG +5% (누적 20%)',
        cost: cost(4),
        apply: () => {
            globalStats.damageMult *= 1.05;
        },
    },
    {
        branch: 'combat',
        level: 5,
        name: '단련 V',
        description: '시작 DMG +5% (누적 25%)',
        cost: cost(5),
        apply: () => {
            globalStats.damageMult *= 1.05;
        },
    },
    {
        branch: 'combat',
        level: 6,
        name: '격투 I',
        description: '시작 DMG +5% (누적 30%)',
        cost: cost(6),
        apply: () => {
            globalStats.damageMult *= 1.05;
        },
    },
    {
        branch: 'combat',
        level: 7,
        name: '격투 II',
        description: '시작 DMG +5% (누적 35%)',
        cost: cost(7),
        apply: () => {
            globalStats.damageMult *= 1.05;
        },
    },
    {
        branch: 'combat',
        level: 8,
        name: '격투 III',
        description: '시작 DMG +5% (누적 40%)',
        cost: cost(8),
        apply: () => {
            globalStats.damageMult *= 1.05;
        },
    },
    {
        branch: 'combat',
        level: 9,
        name: '격투 IV',
        description: '시작 DMG +5% (누적 45%)',
        cost: cost(9),
        apply: () => {
            globalStats.damageMult *= 1.05;
        },
    },
    {
        branch: 'combat',
        level: 10,
        name: '전쟁신',
        description: '시작 DMG +5% (누적 50%)',
        cost: cost(10),
        apply: () => {
            globalStats.damageMult *= 1.05;
        },
    },

    // === SURVIVAL (생존) — HP 보너스 / 이동속도 교대 ===
    {
        branch: 'survival',
        level: 1,
        name: '튼튼함 I',
        description: '시작 보너스 HP +10',
        cost: cost(1),
        apply: () => {
            globalStats.bonusMaxHp += 10;
        },
    },
    {
        branch: 'survival',
        level: 2,
        name: '튼튼함 II',
        description: '이동속도 +3%',
        cost: cost(2),
        apply: () => {
            globalStats.moveSpeedMult *= 1.03;
        },
    },
    {
        branch: 'survival',
        level: 3,
        name: '튼튼함 III',
        description: '시작 보너스 HP +10',
        cost: cost(3),
        apply: () => {
            globalStats.bonusMaxHp += 10;
        },
    },
    {
        branch: 'survival',
        level: 4,
        name: '튼튼함 IV',
        description: '이동속도 +3%',
        cost: cost(4),
        apply: () => {
            globalStats.moveSpeedMult *= 1.03;
        },
    },
    {
        branch: 'survival',
        level: 5,
        name: '튼튼함 V',
        description: '시작 보너스 HP +10',
        cost: cost(5),
        apply: () => {
            globalStats.bonusMaxHp += 10;
        },
    },
    {
        branch: 'survival',
        level: 6,
        name: '강인함 I',
        description: '이동속도 +3%',
        cost: cost(6),
        apply: () => {
            globalStats.moveSpeedMult *= 1.03;
        },
    },
    {
        branch: 'survival',
        level: 7,
        name: '강인함 II',
        description: '시작 보너스 HP +10',
        cost: cost(7),
        apply: () => {
            globalStats.bonusMaxHp += 10;
        },
    },
    {
        branch: 'survival',
        level: 8,
        name: '강인함 III',
        description: '이동속도 +3%',
        cost: cost(8),
        apply: () => {
            globalStats.moveSpeedMult *= 1.03;
        },
    },
    {
        branch: 'survival',
        level: 9,
        name: '강인함 IV',
        description: '시작 보너스 HP +10',
        cost: cost(9),
        apply: () => {
            globalStats.bonusMaxHp += 10;
        },
    },
    {
        branch: 'survival',
        level: 10,
        name: '불사신',
        description: '이동속도 +3%',
        cost: cost(10),
        apply: () => {
            globalStats.moveSpeedMult *= 1.03;
        },
    },

    // === DISCOVERY (발견) — 픽업 범위 / 쿨타임 교대 ===
    {
        branch: 'discovery',
        level: 1,
        name: '탐색가 I',
        description: '픽업 범위 +5%',
        cost: cost(1),
        apply: () => {
            globalStats.pickupRadiusMult *= 1.05;
        },
    },
    {
        branch: 'discovery',
        level: 2,
        name: '탐색가 II',
        description: '쿨타임 -3%',
        cost: cost(2),
        apply: () => {
            globalStats.cooldownMult *= 0.97;
        },
    },
    {
        branch: 'discovery',
        level: 3,
        name: '탐색가 III',
        description: '픽업 범위 +5%',
        cost: cost(3),
        apply: () => {
            globalStats.pickupRadiusMult *= 1.05;
        },
    },
    {
        branch: 'discovery',
        level: 4,
        name: '탐색가 IV',
        description: '쿨타임 -3%',
        cost: cost(4),
        apply: () => {
            globalStats.cooldownMult *= 0.97;
        },
    },
    {
        branch: 'discovery',
        level: 5,
        name: '탐색가 V',
        description: '픽업 범위 +5%',
        cost: cost(5),
        apply: () => {
            globalStats.pickupRadiusMult *= 1.05;
        },
    },
    {
        branch: 'discovery',
        level: 6,
        name: '지식인 I',
        description: '쿨타임 -3%',
        cost: cost(6),
        apply: () => {
            globalStats.cooldownMult *= 0.97;
        },
    },
    {
        branch: 'discovery',
        level: 7,
        name: '지식인 II',
        description: '픽업 범위 +5%',
        cost: cost(7),
        apply: () => {
            globalStats.pickupRadiusMult *= 1.05;
        },
    },
    {
        branch: 'discovery',
        level: 8,
        name: '지식인 III',
        description: '쿨타임 -3%',
        cost: cost(8),
        apply: () => {
            globalStats.cooldownMult *= 0.97;
        },
    },
    {
        branch: 'discovery',
        level: 9,
        name: '지식인 IV',
        description: '픽업 범위 +5%',
        cost: cost(9),
        apply: () => {
            globalStats.pickupRadiusMult *= 1.05;
        },
    },
    {
        branch: 'discovery',
        level: 10,
        name: '현자',
        description: '쿨타임 -3%',
        cost: cost(10),
        apply: () => {
            globalStats.cooldownMult *= 0.97;
        },
    },
];
