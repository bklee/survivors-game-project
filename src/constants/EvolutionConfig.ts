import { Element } from './AlchemyConfig';
import { AlchemySlot } from '../components/alchemy';
import { WeaponEvolution } from '../components/weapon';
import { I18nString } from '../i18n/I18n';

export interface WeaponEvolutionDef {
    id: string;
    name: string;
    baseWeaponId: number; // 0=Knight, 1=Wizard, 2=Elf, 3=Necromancer
    requiredElement: Element;
    requiredLevel: number;
    description: I18nString;
}

export const EVOLUTIONS: WeaponEvolutionDef[] = [
    // Knight (baseWeaponId 0)
    {
        id: 'inferno_blade',
        name: 'Inferno Blade',
        baseWeaponId: 0,
        requiredElement: Element.FIRE,
        requiredLevel: 5,
        description: {
            ko: '검 휘두름에 화염 부여, 베인 적 3초 화상',
            en: 'Sword swings ignite enemies, 3s burn',
        },
    },
    {
        id: 'frost_razor',
        name: 'Frost Razor',
        baseWeaponId: 0,
        requiredElement: Element.ICE,
        requiredLevel: 5,
        description: {
            ko: '검 휘두름에 빙결, 적중 적 1초 둔화',
            en: 'Sword swings freeze enemies on hit, 1s slow',
        },
    },
    {
        id: 'crimson_edge',
        name: 'Crimson Edge',
        baseWeaponId: 0,
        requiredElement: Element.POISON,
        requiredLevel: 8,
        description: {
            ko: 'Knight 검에 흡혈 부여 — 처치 시 max HP 2% 회복',
            en: 'Sword gains lifesteal — heal 2% max HP on kill',
        },
    },
    // Wizard (baseWeaponId 1)
    {
        id: 'thunder_orb',
        name: 'Thunder Orb',
        baseWeaponId: 1,
        requiredElement: Element.LIGHTNING,
        requiredLevel: 5,
        description: {
            ko: '마법탄 적중 시 인근 적 2명 체인',
            en: 'Magic bolts chain to 2 nearby enemies on hit',
        },
    },
    {
        id: 'plague_sphere',
        name: 'Plague Sphere',
        baseWeaponId: 1,
        requiredElement: Element.POISON,
        requiredLevel: 5,
        description: {
            ko: '마법탄 폭발 시 독 안개 잔류 (2초)',
            en: 'Magic bolt explosions leave poison mist (2s)',
        },
    },
    {
        id: 'mana_burst',
        name: 'Mana Burst',
        baseWeaponId: 1,
        requiredElement: Element.AIR,
        requiredLevel: 8,
        description: {
            ko: 'Wizard 마법탄 발사 시 3방향 분사',
            en: 'Magic bolts split into 3-way spread',
        },
    },
    // Elf (baseWeaponId 2)
    {
        id: 'storm_volley',
        name: 'Storm Volley',
        baseWeaponId: 2,
        requiredElement: Element.AIR,
        requiredLevel: 5,
        description: {
            ko: '화살이 회오리에 휩쓸려 곡선 비행 + 사거리 +50%',
            en: 'Arrows curve in a vortex + range +50%',
        },
    },
    {
        id: 'earthshatter',
        name: 'Earthshatter',
        baseWeaponId: 2,
        requiredElement: Element.EARTH,
        requiredLevel: 5,
        description: {
            ko: '화살 적중 시 반경 60 작은 폭발',
            en: 'Arrows trigger a small explosion (radius 60) on hit',
        },
    },
    {
        id: 'verdant_arrow',
        name: 'Verdant Arrow',
        baseWeaponId: 2,
        requiredElement: Element.FIRE,
        requiredLevel: 8,
        description: {
            ko: 'Elf 화살에 화상 부여 + 관통 1',
            en: 'Arrows ignite enemies + pierce 1',
        },
    },
    // Necromancer (baseWeaponId 3)
    {
        id: 'soul_storm',
        name: 'Soul Storm',
        baseWeaponId: 3,
        requiredElement: Element.LIGHTNING,
        requiredLevel: 5,
        description: {
            ko: '영혼탄 발사 시 50% 확률 즉시 추가 발사 (2배 속도)',
            en: 'Soul bolts: 50% chance to fire again instantly (2x speed)',
        },
    },
    {
        id: 'death_mist',
        name: 'Death Mist',
        baseWeaponId: 3,
        requiredElement: Element.POISON,
        requiredLevel: 5,
        description: {
            ko: '영혼탄 적중 위치 안개 (4초, 시야 가림 + DOT)',
            en: 'Soul bolts leave fog on impact (4s, obscures + DOT)',
        },
    },
    {
        id: 'lich_grasp',
        name: 'Lich Grasp',
        baseWeaponId: 3,
        requiredElement: Element.ICE,
        requiredLevel: 8,
        description: {
            ko: 'Necromancer 영혼탄 적중 시 1초 둔화',
            en: 'Soul bolts slow enemies 1s on hit',
        },
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
