import { I18nString } from '../i18n/I18n';

export interface RelicDef {
    id: string;
    bit: number; // 0~11, Relic.bitmask 위치
    name: string;
    description: I18nString;
}

export const RELICS: RelicDef[] = [
    {
        id: 'healing_crystal',
        bit: 0,
        name: 'Healing Crystal',
        description: { ko: '처치 시 1% HP 회복', en: 'Heal 1% HP on kill' },
    },
    {
        id: 'phoenix_feather',
        bit: 1,
        name: 'Phoenix Feather',
        description: {
            ko: '사망 시 1회 부활 (50% HP)',
            en: 'Revive once on death (50% HP)',
        },
    },
    {
        id: 'time_crystal',
        bit: 2,
        name: 'Time Crystal',
        description: { ko: '5초마다 무적 0.3초', en: 'Invincible 0.3s every 5s' },
    },
    {
        id: 'greed_pouch',
        bit: 3,
        name: 'Greed Pouch',
        description: { ko: '코인 픽업 +50%', en: 'Coin pickup +50%' },
    },
    {
        id: 'magnet_core',
        bit: 4,
        name: 'Magnet Core',
        description: { ko: '픽업 범위 +100%', en: 'Pickup radius +100%' },
    },
    {
        id: 'berserker_belt',
        bit: 5,
        name: 'Berserker Belt',
        description: { ko: 'HP < 30% 시 DMG +50%', en: 'DMG +50% when HP < 30%' },
    },
    {
        id: 'mana_battery',
        bit: 6,
        name: 'Mana Battery',
        description: { ko: 'MP 회복 속도 +30%', en: 'MP regen +30%' },
    },
    {
        id: 'scout_helmet',
        bit: 7,
        name: 'Scout Helmet',
        description: { ko: '미니맵 시야 +200%', en: 'Minimap vision +200%' },
    },
    {
        id: 'lucky_coin',
        bit: 8,
        name: 'Lucky Coin',
        description: {
            ko: '카드 1장 추가 (15% 확률)',
            en: '+1 card on level up (15% chance)',
        },
    },
    {
        id: 'vampire_fang',
        bit: 9,
        name: 'Vampire Fang',
        description: { ko: '처치 시 1 HP 흡혈', en: 'Lifesteal 1 HP on kill' },
    },
    {
        id: 'echo_boots',
        bit: 10,
        name: 'Echo Boots',
        description: {
            ko: '대시 거리 +30%, 쿨 -20%',
            en: 'Dash range +30%, cooldown -20%',
        },
    },
    {
        id: 'alchemist_sigil',
        bit: 11,
        name: 'Alchemist Sigil',
        description: { ko: '시너지 강화 효과 +30%', en: 'Synergy effects +30%' },
    },
    {
        id: 'iron_hide',
        bit: 12,
        name: 'Iron Hide',
        description: { ko: '시작 보너스 HP +30', en: 'Starting bonus HP +30' },
    },
    {
        id: 'bronze_anvil',
        bit: 13,
        name: 'Bronze Anvil',
        description: { ko: '데미지 +20%', en: 'Damage +20%' },
    },
    {
        id: 'hawk_eye',
        bit: 14,
        name: 'Hawk Eye',
        description: { ko: '획득 범위 +50%', en: 'Pickup range +50%' },
    },
    {
        id: 'quickdraw',
        bit: 15,
        name: 'Quickdraw',
        description: { ko: '쿨다운 -15%', en: 'Cooldown -15%' },
    },
];

export function hasRelic(bitmask: number, bit: number): boolean {
    return (bitmask & (1 << bit)) !== 0;
}

export function setRelic(bitmask: number, bit: number): number {
    return bitmask | (1 << bit);
}

export function countRelics(bitmask: number): number {
    let count = 0;
    for (let i = 0; i < 16; i++) {
        if (hasRelic(bitmask, i)) count++;
    }
    return count;
}
