export const Element = {
    FIRE: 0,
    ICE: 1,
    LIGHTNING: 2,
    POISON: 3,
    EARTH: 4,
    AIR: 5,
} as const;

export type Element = (typeof Element)[keyof typeof Element];

export interface ElementInfo {
    name: string;
    color: number; // Phaser graphics number e.g. 0xFF4500
    icon: string; // emoji or key
}

export const ELEMENT_INFO: Record<Element, ElementInfo> = {
    [Element.FIRE]: { name: 'FIRE', color: 0xff4500, icon: '🔥' },
    [Element.ICE]: { name: 'ICE', color: 0x4fc3f7, icon: '❄️' },
    [Element.LIGHTNING]: { name: 'LIGHTNING', color: 0xffee58, icon: '⚡' },
    [Element.POISON]: { name: 'POISON', color: 0x9ccc65, icon: '☠️' },
    [Element.EARTH]: { name: 'EARTH', color: 0x8d6e63, icon: '🪨' },
    [Element.AIR]: { name: 'AIR', color: 0xcfd8dc, icon: '💨' },
};

export interface SynergyDef {
    id: string;
    name: string;
    elements: [Element, Element, Element]; // 정렬된 3원소
    description: string;
}

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
    {
        id: 'frostbite',
        name: 'Frostbite',
        elements: sortTuple(Element.FIRE, Element.ICE, Element.POISON),
        description: '5초마다 가장 가까운 적 빙결 1.5초 + 중독',
    },
    {
        id: 'cinder_burst',
        name: 'Cinder Burst',
        elements: sortTuple(Element.FIRE, Element.ICE, Element.EARTH),
        description: '적 처치 시 25% 확률 잔해 폭발 (반경 60, 100dmg)',
    },
    {
        id: 'thunderstrike',
        name: 'Thunderstrike',
        elements: sortTuple(Element.FIRE, Element.ICE, Element.AIR),
        description: '플레이어 위 3초마다 낙뢰 (반경 80, 180dmg)',
    },
    {
        id: 'venom_cloud',
        name: 'Venom Cloud',
        elements: sortTuple(Element.FIRE, Element.LIGHTNING, Element.EARTH),
        description: '플레이어 주변 반경 120 독 안개 (틱당 max HP 2%)',
    },
    {
        id: 'arc_lightning',
        name: 'Arc Lightning',
        elements: sortTuple(Element.FIRE, Element.LIGHTNING, Element.AIR),
        description: '공격 시 25% 확률 인근 적 2명 체인 (50dmg)',
    },
    {
        id: 'rockfall',
        name: 'Rockfall',
        elements: sortTuple(Element.FIRE, Element.POISON, Element.AIR),
        description: '8초마다 화면 무작위 4곳 돌덩이 (반경 70, 200dmg)',
    },
    {
        id: 'sandstorm',
        name: 'Sandstorm',
        elements: sortTuple(Element.FIRE, Element.LIGHTNING, Element.POISON),
        description: '플레이어 주변 회오리 (반경 180) 적 둔화 40% + 시야 차단',
    },
    {
        id: 'whirlwind',
        name: 'Whirlwind',
        elements: sortTuple(Element.ICE, Element.LIGHTNING, Element.EARTH),
        description: '플레이어 주변 회오리 반경 200, 60프레임마다 80dmg + 넉백',
    },
    {
        id: 'glacial_spike',
        name: 'Glacial Spike',
        elements: sortTuple(Element.ICE, Element.POISON, Element.EARTH),
        description: '15프레임마다 가장 강한 적에게 얼음 가시 (250dmg + 1초 둔화)',
    },
    {
        id: 'mire',
        name: 'Mire',
        elements: sortTuple(Element.ICE, Element.POISON, Element.AIR),
        description: '8초마다 화면 무작위 위치 늪 (반경 80, 3초 지속, 둔화+중독)',
    },
    {
        id: 'poison_nova',
        name: 'Poison Nova',
        elements: sortTuple(Element.ICE, Element.EARTH, Element.AIR),
        description: '10초마다 플레이어 중심 독 폭발 (반경 200, 100dmg)',
    },
    {
        id: 'static_field',
        name: 'Static Field',
        elements: sortTuple(Element.LIGHTNING, Element.POISON, Element.EARTH),
        description: '플레이어 주변 반경 180 전기장 (틱당 25dmg + 5% 마비)',
    },
    {
        id: 'earthquake',
        name: 'Earthquake',
        elements: sortTuple(Element.LIGHTNING, Element.POISON, Element.AIR),
        description: '12초마다 전체 지진 (모든 적 1초 스턴 + 50dmg)',
    },
    {
        id: 'cyclone',
        name: 'Cyclone',
        elements: sortTuple(Element.LIGHTNING, Element.EARTH, Element.AIR),
        description: '플레이어 따라다니는 사이클론 (반경 150, 적 끌어당김 + 100dmg/sec)',
    },
    {
        id: 'cascade',
        name: 'Cascade',
        elements: sortTuple(Element.POISON, Element.EARTH, Element.AIR),
        description: '적 처치 시 인근 적 1명에게 30% 데미지 폭발',
    },
];

export function findSynergy(slots: [Element, Element, Element]): SynergyDef | null {
    const sorted = sortTuple(slots[0], slots[1], slots[2]);
    return (
        SYNERGIES.find(
            (s) =>
                s.elements[0] === sorted[0] &&
                s.elements[1] === sorted[1] &&
                s.elements[2] === sorted[2],
        ) ?? null
    );
}
