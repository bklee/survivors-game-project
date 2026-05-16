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

    it('5개 초기 시너지 ID가 포함되어 있다', () => {
        const names = SYNERGIES.map((s) => s.id);
        expect(names).toContain('plasma_storm');
        expect(names).toContain('volcanic_plague');
        expect(names).toContain('tempest');
        expect(names).toContain('eruption');
        expect(names).toContain('cryotoxin');
    });

    it('총 20개 시너지가 정의되어 있다 (모든 C(6,3) 조합)', () => {
        expect(SYNERGIES).toHaveLength(20);
    });

    it('모든 시너지가 고유한 elements 조합을 가진다', () => {
        const keys = SYNERGIES.map((s) => s.elements.join('-'));
        expect(new Set(keys).size).toBe(20);
    });

    it('20개 신규 시너지 ID가 모두 정의되어 있다', () => {
        const ids = SYNERGIES.map((s) => s.id);
        const expected = [
            'plasma_storm',
            'volcanic_plague',
            'tempest',
            'eruption',
            'cryotoxin',
            'frostbite',
            'cinder_burst',
            'thunderstrike',
            'venom_cloud',
            'arc_lightning',
            'rockfall',
            'sandstorm',
            'whirlwind',
            'glacial_spike',
            'mire',
            'poison_nova',
            'static_field',
            'earthquake',
            'cyclone',
            'cascade',
        ];
        expected.forEach((id) => expect(ids).toContain(id));
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
