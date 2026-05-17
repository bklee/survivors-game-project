import { globalStats } from '../core/PlayerStats';
import { I18nString } from '../i18n/I18n';

export interface SkillNodeDef {
    branch: 'combat' | 'survival' | 'discovery';
    level: number; // 1~10
    name: I18nString;
    description: I18nString;
    cost: number;
    apply: () => void;
}

const cost = (level: number) => level * 100;

export const SKILL_TREE: SkillNodeDef[] = [
    // === COMBAT (전투) — 공격력 +5% 누적 ===
    {
        branch: 'combat',
        level: 1,
        name: { ko: '단련 I', en: 'Training I' },
        description: { ko: '시작 DMG +5% (누적 5%)', en: 'Starting DMG +5% (total 5%)' },
        cost: cost(1),
        apply: () => {
            globalStats.damageMult *= 1.05;
        },
    },
    {
        branch: 'combat',
        level: 2,
        name: { ko: '단련 II', en: 'Training II' },
        description: { ko: '시작 DMG +5% (누적 10%)', en: 'Starting DMG +5% (total 10%)' },
        cost: cost(2),
        apply: () => {
            globalStats.damageMult *= 1.05;
        },
    },
    {
        branch: 'combat',
        level: 3,
        name: { ko: '단련 III', en: 'Training III' },
        description: { ko: '시작 DMG +5% (누적 15%)', en: 'Starting DMG +5% (total 15%)' },
        cost: cost(3),
        apply: () => {
            globalStats.damageMult *= 1.05;
        },
    },
    {
        branch: 'combat',
        level: 4,
        name: { ko: '단련 IV', en: 'Training IV' },
        description: { ko: '시작 DMG +5% (누적 20%)', en: 'Starting DMG +5% (total 20%)' },
        cost: cost(4),
        apply: () => {
            globalStats.damageMult *= 1.05;
        },
    },
    {
        branch: 'combat',
        level: 5,
        name: { ko: '단련 V', en: 'Training V' },
        description: { ko: '시작 DMG +5% (누적 25%)', en: 'Starting DMG +5% (total 25%)' },
        cost: cost(5),
        apply: () => {
            globalStats.damageMult *= 1.05;
        },
    },
    {
        branch: 'combat',
        level: 6,
        name: { ko: '격투 I', en: 'Combat I' },
        description: { ko: '시작 DMG +5% (누적 30%)', en: 'Starting DMG +5% (total 30%)' },
        cost: cost(6),
        apply: () => {
            globalStats.damageMult *= 1.05;
        },
    },
    {
        branch: 'combat',
        level: 7,
        name: { ko: '격투 II', en: 'Combat II' },
        description: { ko: '시작 DMG +5% (누적 35%)', en: 'Starting DMG +5% (total 35%)' },
        cost: cost(7),
        apply: () => {
            globalStats.damageMult *= 1.05;
        },
    },
    {
        branch: 'combat',
        level: 8,
        name: { ko: '격투 III', en: 'Combat III' },
        description: { ko: '시작 DMG +5% (누적 40%)', en: 'Starting DMG +5% (total 40%)' },
        cost: cost(8),
        apply: () => {
            globalStats.damageMult *= 1.05;
        },
    },
    {
        branch: 'combat',
        level: 9,
        name: { ko: '격투 IV', en: 'Combat IV' },
        description: { ko: '시작 DMG +5% (누적 45%)', en: 'Starting DMG +5% (total 45%)' },
        cost: cost(9),
        apply: () => {
            globalStats.damageMult *= 1.05;
        },
    },
    {
        branch: 'combat',
        level: 10,
        name: { ko: '전쟁신', en: 'War God' },
        description: { ko: '시작 DMG +5% (누적 50%)', en: 'Starting DMG +5% (total 50%)' },
        cost: cost(10),
        apply: () => {
            globalStats.damageMult *= 1.05;
        },
    },

    // === SURVIVAL (생존) — HP 보너스 / 이동속도 교대 ===
    {
        branch: 'survival',
        level: 1,
        name: { ko: '튼튼함 I', en: 'Toughness I' },
        description: { ko: '시작 보너스 HP +10', en: 'Starting bonus HP +10' },
        cost: cost(1),
        apply: () => {
            globalStats.bonusMaxHp += 10;
        },
    },
    {
        branch: 'survival',
        level: 2,
        name: { ko: '튼튼함 II', en: 'Toughness II' },
        description: { ko: '이동속도 +3%', en: 'Move speed +3%' },
        cost: cost(2),
        apply: () => {
            globalStats.moveSpeedMult *= 1.03;
        },
    },
    {
        branch: 'survival',
        level: 3,
        name: { ko: '튼튼함 III', en: 'Toughness III' },
        description: { ko: '시작 보너스 HP +10', en: 'Starting bonus HP +10' },
        cost: cost(3),
        apply: () => {
            globalStats.bonusMaxHp += 10;
        },
    },
    {
        branch: 'survival',
        level: 4,
        name: { ko: '튼튼함 IV', en: 'Toughness IV' },
        description: { ko: '이동속도 +3%', en: 'Move speed +3%' },
        cost: cost(4),
        apply: () => {
            globalStats.moveSpeedMult *= 1.03;
        },
    },
    {
        branch: 'survival',
        level: 5,
        name: { ko: '튼튼함 V', en: 'Toughness V' },
        description: { ko: '시작 보너스 HP +10', en: 'Starting bonus HP +10' },
        cost: cost(5),
        apply: () => {
            globalStats.bonusMaxHp += 10;
        },
    },
    {
        branch: 'survival',
        level: 6,
        name: { ko: '강인함 I', en: 'Resilience I' },
        description: { ko: '이동속도 +3%', en: 'Move speed +3%' },
        cost: cost(6),
        apply: () => {
            globalStats.moveSpeedMult *= 1.03;
        },
    },
    {
        branch: 'survival',
        level: 7,
        name: { ko: '강인함 II', en: 'Resilience II' },
        description: { ko: '시작 보너스 HP +10', en: 'Starting bonus HP +10' },
        cost: cost(7),
        apply: () => {
            globalStats.bonusMaxHp += 10;
        },
    },
    {
        branch: 'survival',
        level: 8,
        name: { ko: '강인함 III', en: 'Resilience III' },
        description: { ko: '이동속도 +3%', en: 'Move speed +3%' },
        cost: cost(8),
        apply: () => {
            globalStats.moveSpeedMult *= 1.03;
        },
    },
    {
        branch: 'survival',
        level: 9,
        name: { ko: '강인함 IV', en: 'Resilience IV' },
        description: { ko: '시작 보너스 HP +10', en: 'Starting bonus HP +10' },
        cost: cost(9),
        apply: () => {
            globalStats.bonusMaxHp += 10;
        },
    },
    {
        branch: 'survival',
        level: 10,
        name: { ko: '불사신', en: 'Immortal' },
        description: { ko: '이동속도 +3%', en: 'Move speed +3%' },
        cost: cost(10),
        apply: () => {
            globalStats.moveSpeedMult *= 1.03;
        },
    },

    // === DISCOVERY (발견) — 픽업 범위 / 쿨타임 교대 ===
    {
        branch: 'discovery',
        level: 1,
        name: { ko: '탐색가 I', en: 'Explorer I' },
        description: { ko: '픽업 범위 +5%', en: 'Pickup range +5%' },
        cost: cost(1),
        apply: () => {
            globalStats.pickupRadiusMult *= 1.05;
        },
    },
    {
        branch: 'discovery',
        level: 2,
        name: { ko: '탐색가 II', en: 'Explorer II' },
        description: { ko: '쿨타임 -3%', en: 'Cooldown -3%' },
        cost: cost(2),
        apply: () => {
            globalStats.cooldownMult *= 0.97;
        },
    },
    {
        branch: 'discovery',
        level: 3,
        name: { ko: '탐색가 III', en: 'Explorer III' },
        description: { ko: '픽업 범위 +5%', en: 'Pickup range +5%' },
        cost: cost(3),
        apply: () => {
            globalStats.pickupRadiusMult *= 1.05;
        },
    },
    {
        branch: 'discovery',
        level: 4,
        name: { ko: '탐색가 IV', en: 'Explorer IV' },
        description: { ko: '쿨타임 -3%', en: 'Cooldown -3%' },
        cost: cost(4),
        apply: () => {
            globalStats.cooldownMult *= 0.97;
        },
    },
    {
        branch: 'discovery',
        level: 5,
        name: { ko: '탐색가 V', en: 'Explorer V' },
        description: { ko: '픽업 범위 +5%', en: 'Pickup range +5%' },
        cost: cost(5),
        apply: () => {
            globalStats.pickupRadiusMult *= 1.05;
        },
    },
    {
        branch: 'discovery',
        level: 6,
        name: { ko: '지식인 I', en: 'Scholar I' },
        description: { ko: '쿨타임 -3%', en: 'Cooldown -3%' },
        cost: cost(6),
        apply: () => {
            globalStats.cooldownMult *= 0.97;
        },
    },
    {
        branch: 'discovery',
        level: 7,
        name: { ko: '지식인 II', en: 'Scholar II' },
        description: { ko: '픽업 범위 +5%', en: 'Pickup range +5%' },
        cost: cost(7),
        apply: () => {
            globalStats.pickupRadiusMult *= 1.05;
        },
    },
    {
        branch: 'discovery',
        level: 8,
        name: { ko: '지식인 III', en: 'Scholar III' },
        description: { ko: '쿨타임 -3%', en: 'Cooldown -3%' },
        cost: cost(8),
        apply: () => {
            globalStats.cooldownMult *= 0.97;
        },
    },
    {
        branch: 'discovery',
        level: 9,
        name: { ko: '지식인 IV', en: 'Scholar IV' },
        description: { ko: '픽업 범위 +5%', en: 'Pickup range +5%' },
        cost: cost(9),
        apply: () => {
            globalStats.pickupRadiusMult *= 1.05;
        },
    },
    {
        branch: 'discovery',
        level: 10,
        name: { ko: '현자', en: 'Sage' },
        description: { ko: '쿨타임 -3%', en: 'Cooldown -3%' },
        cost: cost(10),
        apply: () => {
            globalStats.cooldownMult *= 0.97;
        },
    },
];
