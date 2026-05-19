import { describe, it, expect } from 'vitest';
import {
    CHAPTERS,
    BOSS_LORE,
    findChapter,
    isChapterStart,
    isChapterEnd,
} from '../../src/constants/ChapterConfig';

describe('ChapterConfig', () => {
    it('has 4 chapters with required fields', () => {
        expect(CHAPTERS).toHaveLength(4);
        for (const ch of CHAPTERS) {
            expect(typeof ch.startStage).toBe('number');
            expect(ch.name).toBeDefined();
            expect(ch.lore).toBeDefined();
        }
    });

    it('first 3 chapters have outro, last (endless) does not', () => {
        expect(CHAPTERS[0].outro).toBeDefined();
        expect(CHAPTERS[1].outro).toBeDefined();
        expect(CHAPTERS[2].outro).toBeDefined();
        expect(CHAPTERS[3].outro).toBeUndefined();
    });

    it('findChapter resolves stage to enclosing chapter', () => {
        expect(findChapter(1).startStage).toBe(1);
        expect(findChapter(5).startStage).toBe(1);
        expect(findChapter(6).startStage).toBe(6);
        expect(findChapter(10).startStage).toBe(6);
        expect(findChapter(15).startStage).toBe(11);
        expect(findChapter(20).startStage).toBe(16);
    });

    it('isChapterStart fires only on chapter boundaries', () => {
        expect(isChapterStart(1)).toBe(true);
        expect(isChapterStart(6)).toBe(true);
        expect(isChapterStart(11)).toBe(true);
        expect(isChapterStart(16)).toBe(true);
        expect(isChapterStart(2)).toBe(false);
        expect(isChapterStart(5)).toBe(false);
    });

    it('isChapterEnd fires on last stage of finite chapters only', () => {
        expect(isChapterEnd(5)).toBe(true);
        expect(isChapterEnd(10)).toBe(true);
        expect(isChapterEnd(15)).toBe(true);
        // 마지막 챕터는 끝없음
        expect(isChapterEnd(20)).toBe(false);
        expect(isChapterEnd(4)).toBe(false);
        expect(isChapterEnd(6)).toBe(false);
    });

    it('BOSS_LORE covers the three known boss typeIds', () => {
        expect(BOSS_LORE[79]).toBeDefined();
        expect(BOSS_LORE[89]).toBeDefined();
        expect(BOSS_LORE[69]).toBeDefined();
    });
});
