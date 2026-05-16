import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, addEntity, addComponent, IWorld } from 'bitecs';
import { AlchemySlot } from '../../src/components/alchemy';
import { WeaponEvolution } from '../../src/components/weapon';
import { Element } from '../../src/constants/AlchemyConfig';
import { EVOLUTIONS, findEligibleEvolutions } from '../../src/constants/EvolutionConfig';

describe('EvolutionConfig', () => {
    let world: IWorld;
    let eid: number;

    beforeEach(() => {
        world = createWorld();
        eid = addEntity(world);
        addComponent(world, AlchemySlot, eid);
        addComponent(world, WeaponEvolution, eid);
        AlchemySlot.slot0[eid] = -1;
        AlchemySlot.slot1[eid] = -1;
        AlchemySlot.slot2[eid] = -1;
        WeaponEvolution.evolutionId[eid] = -1;
        WeaponEvolution.baseWeaponId[eid] = 0;
    });

    it('12개 EVOLUTIONS가 정의되어 있다', () => {
        expect(EVOLUTIONS).toHaveLength(12);
    });

    it('각 캐릭터에 3개씩 진화 무기', () => {
        for (let b = 0; b < 4; b++) {
            const count = EVOLUTIONS.filter((e) => e.baseWeaponId === b).length;
            expect(count).toBe(3);
        }
    });

    it('이미 진화한 무기는 추가 진화 불가', () => {
        WeaponEvolution.evolutionId[eid] = 0;
        AlchemySlot.slot0[eid] = Element.FIRE;
        const result = findEligibleEvolutions(eid, 10);
        expect(result).toEqual([]);
    });

    it('레벨 5 미만에서는 진화 불가', () => {
        AlchemySlot.slot0[eid] = Element.FIRE;
        const result = findEligibleEvolutions(eid, 4);
        expect(result).toEqual([]);
    });

    it('Knight(0) + FIRE 슬롯 + 레벨 5 → inferno_blade 후보', () => {
        AlchemySlot.slot0[eid] = Element.FIRE;
        const result = findEligibleEvolutions(eid, 5);
        expect(result.map((e) => e.id)).toContain('inferno_blade');
    });

    it('Knight + POISON 슬롯 + 레벨 5 → crimson_edge 불가 (requiredLevel 8)', () => {
        AlchemySlot.slot0[eid] = Element.POISON;
        const result = findEligibleEvolutions(eid, 5);
        expect(result.map((e) => e.id)).not.toContain('crimson_edge');
    });

    it('Knight + POISON 슬롯 + 레벨 8 → crimson_edge 가능', () => {
        AlchemySlot.slot0[eid] = Element.POISON;
        const result = findEligibleEvolutions(eid, 8);
        expect(result.map((e) => e.id)).toContain('crimson_edge');
    });

    it('Wizard(1)에는 Knight 진화 무기 안 보임', () => {
        WeaponEvolution.baseWeaponId[eid] = 1;
        AlchemySlot.slot0[eid] = Element.FIRE;
        const result = findEligibleEvolutions(eid, 10);
        expect(result.map((e) => e.id)).not.toContain('inferno_blade');
    });
});
