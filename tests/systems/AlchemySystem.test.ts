import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, addEntity, addComponent, IWorld } from 'bitecs';
import { AlchemySlot, SynergyEffect } from '../../src/components/alchemy';
import { Element } from '../../src/constants/AlchemyConfig';
import { detectSynergy, applySlotChange } from '../../src/systems/AlchemySystem';

describe('AlchemySystem', () => {
    let world: IWorld;
    let eid: number;

    beforeEach(() => {
        world = createWorld();
        eid = addEntity(world);
        addComponent(world, AlchemySlot, eid);
        addComponent(world, SynergyEffect, eid);
        AlchemySlot.slot0[eid] = -1;
        AlchemySlot.slot1[eid] = -1;
        AlchemySlot.slot2[eid] = -1;
        SynergyEffect.synergyId[eid] = -1;
    });

    it('슬롯이 비어있으면 시너지 없음', () => {
        expect(detectSynergy(eid)).toBeNull();
    });

    it('슬롯 2개만 채워지면 시너지 없음', () => {
        AlchemySlot.slot0[eid] = Element.FIRE;
        AlchemySlot.slot1[eid] = Element.ICE;
        expect(detectSynergy(eid)).toBeNull();
    });

    it('3슬롯 채워지고 정의된 조합이면 시너지 반환', () => {
        AlchemySlot.slot0[eid] = Element.FIRE;
        AlchemySlot.slot1[eid] = Element.LIGHTNING;
        AlchemySlot.slot2[eid] = Element.ICE;
        expect(detectSynergy(eid)?.id).toBe('plasma_storm');
    });

    it('3슬롯 채워지고 정의 안 된 조합이면 null', () => {
        AlchemySlot.slot0[eid] = Element.FIRE;
        AlchemySlot.slot1[eid] = Element.FIRE;
        AlchemySlot.slot2[eid] = Element.FIRE;
        expect(detectSynergy(eid)).toBeNull();
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
        expect(SynergyEffect.synergyId[eid]).toBe(0); // SYNERGIES[0] = plasma_storm
    });
});
