import { describe, it, expect } from 'vitest';
import { RELICS, hasRelic, setRelic, countRelics } from '../../src/constants/RelicConfig';

describe('RelicConfig', () => {
    it('16개 유물 정의', () => {
        expect(RELICS).toHaveLength(16);
    });

    it('각 유물의 bit는 0~15 고유', () => {
        const bits = RELICS.map((r) => r.bit);
        expect(new Set(bits).size).toBe(16);
        bits.forEach((b) => {
            expect(b).toBeGreaterThanOrEqual(0);
            expect(b).toBeLessThan(16);
        });
    });

    it('hasRelic은 bit 위치를 확인', () => {
        const mask = 0b0000_0000_1010; // bit 1, 3
        expect(hasRelic(mask, 0)).toBe(false);
        expect(hasRelic(mask, 1)).toBe(true);
        expect(hasRelic(mask, 3)).toBe(true);
    });

    it('setRelic은 bit를 켠다', () => {
        let mask = 0;
        mask = setRelic(mask, 5);
        expect(hasRelic(mask, 5)).toBe(true);
        mask = setRelic(mask, 11);
        expect(hasRelic(mask, 11)).toBe(true);
    });

    it('countRelics는 보유 수를 센다', () => {
        let mask = 0;
        expect(countRelics(mask)).toBe(0);
        mask = setRelic(mask, 0);
        mask = setRelic(mask, 5);
        mask = setRelic(mask, 11);
        expect(countRelics(mask)).toBe(3);
    });
});
