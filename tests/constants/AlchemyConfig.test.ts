import { describe, it, expect } from 'vitest';
import { Element, ELEMENT_INFO, SYNERGIES, findSynergy } from '../../src/constants/AlchemyConfig';

describe('AlchemyConfig', () => {
    it('6개 원소가 정의되어 있다', () => {
        expect(Object.keys(Element)).toHaveLength(6);
        expect(Element.FIRE).toBe(0);
        expect(Element.ICE).toBe(1);
        expect(Element.LIGHTNING).toBe(2);
        expect(Element.POISON).toBe(3);
        expect(Element.EARTH).toBe(4);
        expect(Element.AIR).toBe(5);
    });

    it('각 원소에 정보가 있다', () => {
        const elements = [
            Element.FIRE,
            Element.ICE,
            Element.LIGHTNING,
            Element.POISON,
            Element.EARTH,
            Element.AIR,
        ];
        for (const el of elements) {
            expect(ELEMENT_INFO[el]).toBeDefined();
            expect(ELEMENT_INFO[el].name).toBeTruthy();
            expect(typeof ELEMENT_INFO[el].color).toBe('number');
            expect(ELEMENT_INFO[el].color).toBeGreaterThanOrEqual(0);
            expect(ELEMENT_INFO[el].color).toBeLessThanOrEqual(0xffffff);
        }
    });

    it('5개 시너지가 정의되어 있다', () => {
        expect(SYNERGIES).toHaveLength(5);
        const names = SYNERGIES.map((s) => s.id);
        expect(names).toContain('plasma_storm');
        expect(names).toContain('volcanic_plague');
        expect(names).toContain('tempest');
        expect(names).toContain('eruption');
        expect(names).toContain('cryotoxin');
    });

    it('findSynergy는 슬롯 조합으로 시너지를 찾는다 (순서 무관)', () => {
        const r1 = findSynergy([Element.FIRE, Element.LIGHTNING, Element.ICE]);
        const r2 = findSynergy([Element.ICE, Element.FIRE, Element.LIGHTNING]);
        expect(r1?.id).toBe('plasma_storm');
        expect(r2?.id).toBe('plasma_storm');
    });

    it('findSynergy는 정의 없는 조합에 null을 반환한다', () => {
        const r = findSynergy([Element.FIRE, Element.FIRE, Element.FIRE]);
        expect(r).toBeNull();
    });
});
