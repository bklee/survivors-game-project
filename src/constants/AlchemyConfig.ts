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
