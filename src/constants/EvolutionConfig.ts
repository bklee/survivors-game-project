import { Element } from './AlchemyConfig';
import { AlchemySlot } from '../components/alchemy';
import { WeaponEvolution } from '../components/weapon';

export interface WeaponEvolutionDef {
    id: string;
    name: string;
    baseWeaponId: number; // 0=Knight, 1=Wizard, 2=Elf, 3=Necromancer
    requiredElement: Element;
    requiredLevel: number;
    description: string;
}

export const EVOLUTIONS: WeaponEvolutionDef[] = [
    // Knight (baseWeaponId 0)
    {
        id: 'inferno_blade',
        name: 'Inferno Blade',
        baseWeaponId: 0,
        requiredElement: Element.FIRE,
        requiredLevel: 5,
        description: '검 휘두름에 화염 부여, 베인 적 3초 화상',
    },
    {
        id: 'frost_razor',
        name: 'Frost Razor',
        baseWeaponId: 0,
        requiredElement: Element.ICE,
        requiredLevel: 5,
        description: '검 휘두름에 빙결, 적중 적 1초 둔화',
    },
    {
        id: 'crimson_edge',
        name: 'Crimson Edge',
        baseWeaponId: 0,
        requiredElement: Element.POISON,
        requiredLevel: 8,
        description: 'Knight 검에 흡혈 부여 — 처치 시 max HP 2% 회복',
    },
    // Wizard (baseWeaponId 1)
    {
        id: 'thunder_orb',
        name: 'Thunder Orb',
        baseWeaponId: 1,
        requiredElement: Element.LIGHTNING,
        requiredLevel: 5,
        description: '마법탄 적중 시 인근 적 2명 체인',
    },
    {
        id: 'plague_sphere',
        name: 'Plague Sphere',
        baseWeaponId: 1,
        requiredElement: Element.POISON,
        requiredLevel: 5,
        description: '마법탄 폭발 시 독 안개 잔류 (2초)',
    },
    {
        id: 'mana_burst',
        name: 'Mana Burst',
        baseWeaponId: 1,
        requiredElement: Element.AIR,
        requiredLevel: 8,
        description: 'Wizard 마법탄 발사 시 3방향 분사',
    },
    // Elf (baseWeaponId 2)
    {
        id: 'storm_volley',
        name: 'Storm Volley',
        baseWeaponId: 2,
        requiredElement: Element.AIR,
        requiredLevel: 5,
        description: '화살이 회오리에 휩쓸려 곡선 비행 + 사거리 +50%',
    },
    {
        id: 'earthshatter',
        name: 'Earthshatter',
        baseWeaponId: 2,
        requiredElement: Element.EARTH,
        requiredLevel: 5,
        description: '화살 적중 시 반경 60 작은 폭발',
    },
    {
        id: 'verdant_arrow',
        name: 'Verdant Arrow',
        baseWeaponId: 2,
        requiredElement: Element.FIRE,
        requiredLevel: 8,
        description: 'Elf 화살에 화상 부여 + 관통 1',
    },
    // Necromancer (baseWeaponId 3)
    {
        id: 'soul_storm',
        name: 'Soul Storm',
        baseWeaponId: 3,
        requiredElement: Element.LIGHTNING,
        requiredLevel: 5,
        description: '영혼탄 발사 시 50% 확률 즉시 추가 발사 (2배 속도)',
    },
    {
        id: 'death_mist',
        name: 'Death Mist',
        baseWeaponId: 3,
        requiredElement: Element.POISON,
        requiredLevel: 5,
        description: '영혼탄 적중 위치 안개 (4초, 시야 가림 + DOT)',
    },
    {
        id: 'lich_grasp',
        name: 'Lich Grasp',
        baseWeaponId: 3,
        requiredElement: Element.ICE,
        requiredLevel: 8,
        description: 'Necromancer 영혼탄 적중 시 1초 둔화',
    },
];

/**
 * 주어진 entity에 대해 적용 가능한 진화 목록을 반환.
 * 조건:
 *   1. 아직 진화하지 않은 상태 (WeaponEvolution.evolutionId === -1)
 *   2. baseWeaponId 일치
 *   3. 현재 레벨 >= requiredLevel
 *   4. AlchemySlot 3개 중 requiredElement가 하나라도 있음
 */
export function findEligibleEvolutions(eid: number, currentLevel: number): WeaponEvolutionDef[] {
    if (WeaponEvolution.evolutionId[eid] !== -1) return []; // 이미 진화함
    const baseId = WeaponEvolution.baseWeaponId[eid];
    const slots = [AlchemySlot.slot0[eid], AlchemySlot.slot1[eid], AlchemySlot.slot2[eid]];
    return EVOLUTIONS.filter(
        (e) =>
            e.baseWeaponId === baseId &&
            currentLevel >= e.requiredLevel &&
            slots.includes(e.requiredElement),
    );
}
