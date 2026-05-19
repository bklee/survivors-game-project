import { I18nString } from '../i18n/I18n';

export interface ChapterDef {
    startStage: number;
    name: I18nString;
    lore: I18nString;
}

export const CHAPTERS: ChapterDef[] = [
    {
        startStage: 1,
        name: { ko: '제1장: 저주받은 무덤', en: 'Chapter 1: The Cursed Tomb' },
        lore: {
            ko: '잠든 영혼들이 깨어났다. 그들을 정화하라.',
            en: 'Forgotten souls have awakened. Cleanse them.',
        },
    },
    {
        startStage: 6,
        name: { ko: '제2장: 잊혀진 대장간', en: 'Chapter 2: The Forgotten Forge' },
        lore: {
            ko: '오크 군대가 무기를 벼리고 있다. 부숴라.',
            en: 'Orcs are forging weapons. Shatter them.',
        },
    },
    {
        startStage: 11,
        name: { ko: '제3장: 버려진 신전', en: 'Chapter 3: The Forsaken Sanctum' },
        lore: {
            ko: '악마들이 신전을 점령했다. 다시 봉인하라.',
            en: 'Demons hold the sanctum. Seal it again.',
        },
    },
    {
        startStage: 16,
        name: { ko: '제4장: 영원의 첨탑', en: 'Chapter 4: The Eternal Spire' },
        lore: {
            ko: '시간의 권좌가 기다린다. 운명을 마주하라.',
            en: 'The throne of time awaits. Face your fate.',
        },
    },
];

/** 주어진 stage 가 속한 챕터 반환 */
export function findChapter(stage: number): ChapterDef {
    let current = CHAPTERS[0];
    for (const ch of CHAPTERS) {
        if (ch.startStage <= stage) current = ch;
        else break;
    }
    return current;
}

/** stage 가 새 챕터의 시작인지 (예: 1, 6, 11, 16) */
export function isChapterStart(stage: number): boolean {
    return CHAPTERS.some((c) => c.startStage === stage);
}
