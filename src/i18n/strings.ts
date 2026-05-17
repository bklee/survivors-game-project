// i18n 문자열 테이블. 새 string 추가 시 ko + en 둘 다 채우기.
// 미번역(빈 en) 은 fallback 으로 ko 가 표시된다.
export const STRINGS = {
    // Title Scene
    title_start: { ko: 'START', en: 'START' },
    title_skill_tree: { ko: '스킬 트리', en: 'Skill Tree' },
    title_codex: { ko: '시너지 도감', en: 'Codex' },
    title_home: { ko: '🏠 Home', en: '🏠 Home' },

    // Character Select Scene
    char_select_title: { ko: 'CHOOSE YOUR HERO!', en: 'CHOOSE YOUR HERO!' },
    char_select_essence: { ko: '보유 정수: {amount}', en: 'Essence: {amount}' },
    char_select_unlock: { ko: '[클릭하여 해금]', en: '[Click to unlock]' },
    char_select_locked: { ko: '🔒 {cost} 정수', en: '🔒 {cost} Essence' },
    char_select_short: { ko: '정수 부족', en: 'Not enough essence' },

    // Upgrade Scene
    upgrade_title: { ko: 'LEVEL UP! 카드를 선택하세요', en: 'LEVEL UP! Choose a card' },
    upgrade_extra_card_ad: { ko: '광고 보고 카드 1장 더', en: 'Watch Ad for Extra Card' },
    upgrade_ad_failed: { ko: '광고 시청 실패', en: 'Ad watch failed' },

    // GameOver Scene
    gameover_essence: {
        ko: '+ {amount} 정수\n(총: {total})',
        en: '+ {amount} Essence\n(Total: {total})',
    },
    gameover_retry: { ko: 'RETRY', en: 'RETRY' },
    gameover_revive_ad: { ko: '광고 보고 부활', en: 'Watch Ad to Revive' },
} as const;

export type StringKey = keyof typeof STRINGS;
