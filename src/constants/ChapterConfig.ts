import { I18nString } from '../i18n/I18n';

export interface ChapterDef {
    startStage: number;
    name: I18nString;
    lore: I18nString;
    outro?: I18nString;
}

export const CHAPTERS: ChapterDef[] = [
    {
        startStage: 1,
        name: { ko: '제1장: 저주받은 무덤', en: 'Chapter 1: The Cursed Tomb' },
        lore: {
            ko: '잠든 영혼들이 깨어났다. 그들을 정화하라.',
            en: 'Forgotten souls have awakened. Cleanse them.',
        },
        outro: {
            ko: '무덤은 다시 잠들었다. 하지만 멀리, 망치 소리가 들려온다…',
            en: 'The tomb sleeps again. Yet far away, a hammer rings…',
        },
    },
    {
        startStage: 6,
        name: { ko: '제2장: 잊혀진 대장간', en: 'Chapter 2: The Forgotten Forge' },
        lore: {
            ko: '오크 군대가 무기를 벼리고 있다. 부숴라.',
            en: 'Orcs are forging weapons. Shatter them.',
        },
        outro: {
            ko: '대장간의 불은 꺼졌다. 그러나 더 깊은 어둠이 신전에서 깨어난다…',
            en: 'The forge fires die. But deeper darkness stirs in the sanctum…',
        },
    },
    {
        startStage: 11,
        name: { ko: '제3장: 버려진 신전', en: 'Chapter 3: The Forsaken Sanctum' },
        lore: {
            ko: '악마들이 신전을 점령했다. 다시 봉인하라.',
            en: 'Demons hold the sanctum. Seal it again.',
        },
        outro: {
            ko: '신전은 다시 봉인되었다. 이제, 시간 그 자체가 너를 부른다…',
            en: 'The sanctum is sealed once more. Now, time itself calls you…',
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

/** 보스 등장 시 표시되는 한 줄 lore. key = SpriteInfo.textureIndex. */
export const BOSS_LORE: Record<number, I18nString> = {
    79: {
        ko: '“나는 잠들지 못한 자… 너도 곧 합류하리라.”',
        en: '"I am the one who cannot sleep… you shall join me soon."',
    },
    89: {
        ko: '“이 망치는 천 명의 영혼을 으깼다. 너도 하나가 되어라.”',
        en: '"This hammer crushed a thousand souls. You shall be one more."',
    },
    69: {
        ko: '“너의 영혼은 좋은 연료가 되겠군.”',
        en: '"Your soul will make fine kindling."',
    },
};

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

/** stage 가 현재 챕터의 마지막인지 (다음 챕터 시작 직전, 예: 5, 10, 15).
 *  마지막 챕터(끝없음)는 false 반환. */
export function isChapterEnd(stage: number): boolean {
    return CHAPTERS.some((c, i) => i > 0 && c.startStage === stage + 1);
}
