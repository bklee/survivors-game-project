export interface RelicDef {
    id: string;
    bit: number; // 0~11, Relic.bitmask 위치
    name: string;
    description: string;
}

export const RELICS: RelicDef[] = [
    { id: 'healing_crystal', bit: 0, name: 'Healing Crystal', description: '처치 시 1% HP 회복' },
    {
        id: 'phoenix_feather',
        bit: 1,
        name: 'Phoenix Feather',
        description: '사망 시 1회 부활 (50% HP)',
    },
    { id: 'time_crystal', bit: 2, name: 'Time Crystal', description: '5초마다 무적 0.3초' },
    { id: 'greed_pouch', bit: 3, name: 'Greed Pouch', description: '코인 픽업 +50%' },
    { id: 'magnet_core', bit: 4, name: 'Magnet Core', description: '픽업 범위 +100%' },
    { id: 'berserker_belt', bit: 5, name: 'Berserker Belt', description: 'HP < 30% 시 DMG +50%' },
    { id: 'mana_battery', bit: 6, name: 'Mana Battery', description: 'MP 회복 속도 +30%' },
    { id: 'scout_helmet', bit: 7, name: 'Scout Helmet', description: '미니맵 시야 +200%' },
    { id: 'lucky_coin', bit: 8, name: 'Lucky Coin', description: '카드 1장 추가 (15% 확률)' },
    { id: 'vampire_fang', bit: 9, name: 'Vampire Fang', description: '처치 시 1 HP 흡혈' },
    { id: 'echo_boots', bit: 10, name: 'Echo Boots', description: '대시 거리 +30%, 쿨 -20%' },
    {
        id: 'alchemist_sigil',
        bit: 11,
        name: 'Alchemist Sigil',
        description: '시너지 강화 효과 +30%',
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
    for (let i = 0; i < 12; i++) {
        if (hasRelic(bitmask, i)) count++;
    }
    return count;
}
