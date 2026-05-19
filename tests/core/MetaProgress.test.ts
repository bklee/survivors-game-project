import { describe, it, expect, beforeEach } from 'vitest';
import { MetaProgress } from '../../src/core/MetaProgress';

describe('MetaProgress', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('초기 상태: essence 0, 잠금 해제 4개(dwarf 기본), 도감 비어있음', () => {
        const m = MetaProgress.load();
        expect(m.essence).toBe(0);
        expect(m.unlockedCharacters).toEqual(['knight', 'wizard', 'elf', 'dwarf']);
        expect(m.discoveredSynergies).toEqual([]);
        expect(m.skillTree).toEqual({ combat: 0, survival: 0, discovery: 0 });
        expect(m.relicSlots).toBe(3);
    });

    it('기존 세이브에서 dwarf 가 빠져있으면 load 시 자동 보강', () => {
        // 이전 버전 (3 starter) 으로 저장된 데이터 시뮬레이션
        localStorage.setItem(
            'survivors_meta_progress_v1',
            JSON.stringify({
                essence: 100,
                unlockedCharacters: ['knight', 'wizard', 'elf'],
                discoveredSynergies: [],
                skillTree: { combat: 1, survival: 0, discovery: 0 },
                relicSlots: 3,
            }),
        );
        const m = MetaProgress.load();
        expect(m.essence).toBe(100);
        expect(m.unlockedCharacters).toContain('dwarf');
        expect(m.skillTree.combat).toBe(1);
    });

    it('addEssence는 누적된다', () => {
        MetaProgress.addEssence(50);
        MetaProgress.addEssence(30);
        expect(MetaProgress.load().essence).toBe(80);
    });

    it('unlockCharacter는 essence 차감 + 잠금 해제', () => {
        MetaProgress.addEssence(2000);
        const ok = MetaProgress.unlockCharacter('necromancer', 1500);
        expect(ok).toBe(true);
        expect(MetaProgress.load().essence).toBe(500);
        expect(MetaProgress.load().unlockedCharacters).toContain('necromancer');
    });

    it('unlockCharacter는 essence 부족 시 false', () => {
        MetaProgress.addEssence(1000);
        const ok = MetaProgress.unlockCharacter('necromancer', 1500);
        expect(ok).toBe(false);
        expect(MetaProgress.load().essence).toBe(1000);
    });

    it('이미 해금된 캐릭터는 재해금 불가', () => {
        MetaProgress.addEssence(5000);
        MetaProgress.unlockCharacter('necromancer', 1500);
        const ok2 = MetaProgress.unlockCharacter('necromancer', 1500);
        expect(ok2).toBe(false);
    });

    it('discoverSynergy는 도감 추가 + 50 essence 보상', () => {
        MetaProgress.discoverSynergy('plasma_storm');
        expect(MetaProgress.load().discoveredSynergies).toContain('plasma_storm');
        expect(MetaProgress.load().essence).toBe(50);
    });

    it('discoverSynergy 중복은 무시', () => {
        MetaProgress.discoverSynergy('plasma_storm');
        MetaProgress.discoverSynergy('plasma_storm');
        expect(MetaProgress.load().discoveredSynergies).toEqual(['plasma_storm']);
        expect(MetaProgress.load().essence).toBe(50);
    });

    it('upgradeSkillTree는 essence 차감 + 단계 증가', () => {
        MetaProgress.addEssence(500);
        const ok = MetaProgress.upgradeSkillTree('combat', 100);
        expect(ok).toBe(true);
        expect(MetaProgress.load().skillTree.combat).toBe(1);
        expect(MetaProgress.load().essence).toBe(400);
    });

    it('skillTree는 10단계 최대', () => {
        MetaProgress.addEssence(10000);
        for (let i = 0; i < 12; i++) MetaProgress.upgradeSkillTree('combat', 100);
        expect(MetaProgress.load().skillTree.combat).toBe(10);
    });

    it('expandRelicSlots는 essence 차감 + 슬롯 증가 (최대 5)', () => {
        MetaProgress.addEssence(10000);
        expect(MetaProgress.load().relicSlots).toBe(3);
        MetaProgress.expandRelicSlots(500);
        expect(MetaProgress.load().relicSlots).toBe(4);
        MetaProgress.expandRelicSlots(500);
        expect(MetaProgress.load().relicSlots).toBe(5);
        const ok = MetaProgress.expandRelicSlots(500);
        expect(ok).toBe(false); // 최대 5
    });
});
