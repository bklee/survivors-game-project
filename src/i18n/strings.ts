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

    // Common
    common_back: { ko: '뒤로 가기', en: 'Back' },

    // Codex Scene
    codex_title: { ko: '시너지 도감  ({found}/{total})', en: 'Synergy Codex  ({found}/{total})' },

    // Skill Tree Scene
    skill_tree_title: { ko: '스킬 트리', en: 'Skill Tree' },
    skill_tree_branch_combat: { ko: '⚔ 전투', en: '⚔ Combat' },
    skill_tree_branch_survival: { ko: '🛡 생존', en: '🛡 Survival' },
    skill_tree_branch_discovery: { ko: '🔍 발견', en: '🔍 Discovery' },
    skill_tree_essence_label: { ko: '정수: {amount}', en: 'Essence: {amount}' },
    skill_tree_node_cost: { ko: '({cost} 정수)', en: '({cost} Essence)' },

    // UI Toasts
    synergy_discovered_toast: {
        ko: '✦ 새 시너지 발견: {name}!\n+50 정수',
        en: '✦ New synergy discovered: {name}!\n+50 Essence',
    },

    // Upgrade Stat Cards
    upgrade_stat_damage_title: { ko: '데미지 +15%', en: 'Damage +15%' },
    upgrade_stat_damage_desc: { ko: '모든 공격 데미지 증가', en: 'All attack damage increased' },
    upgrade_stat_speed_title: { ko: '이동속도 +10%', en: 'Move Speed +10%' },
    upgrade_stat_speed_desc: { ko: '이동 속도 증가', en: 'Move speed increased' },
    upgrade_stat_cdr_title: { ko: 'CDR +10%', en: 'CDR +10%' },
    upgrade_stat_cdr_desc: { ko: '쿨다운 감소', en: 'Cooldown reduced' },
    upgrade_stat_pickup_title: { ko: '획득 범위 +20%', en: 'Pickup Range +20%' },
    upgrade_stat_pickup_desc: { ko: 'XP/아이템 픽업 범위', en: 'XP/item pickup range' },
} as const;

export type StringKey = keyof typeof STRINGS;
