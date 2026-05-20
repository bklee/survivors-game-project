// i18n 문자열 테이블. 새 string 추가 시 ko + en 둘 다 채우기.
// 미번역(빈 en) 은 fallback 으로 ko 가 표시된다.
export const STRINGS = {
    // Title Scene
    title_start: { ko: 'START', en: 'START' },
    title_skill_tree: { ko: '스킬 트리', en: 'Skill Tree' },
    title_codex: { ko: '시너지 도감', en: 'Codex' },
    title_leaderboard: { ko: '리더보드', en: 'Leaderboard' },
    title_home: { ko: '🏠 Home', en: '🏠 Home' },

    // Leaderboard Scene
    leaderboard_title: { ko: '🏆 리더보드', en: '🏆 Leaderboard' },
    leaderboard_tab_all: { ko: '전체', en: 'All-Time' },
    leaderboard_tab_weekly: { ko: '주간', en: 'Weekly' },
    leaderboard_tab_daily: { ko: '일간', en: 'Daily' },
    leaderboard_col_rank: { ko: '순위', en: 'Rank' },
    leaderboard_col_nickname: { ko: '닉네임', en: 'Player' },
    leaderboard_col_character: { ko: '캐릭터', en: 'Hero' },
    leaderboard_col_score: { ko: '점수', en: 'Score' },
    leaderboard_col_stage: { ko: '스테이지', en: 'Stage' },
    leaderboard_empty: { ko: '아직 등록된 점수가 없습니다.', en: 'No scores yet.' },
    leaderboard_loading: { ko: '불러오는 중...', en: 'Loading...' },
    leaderboard_error: { ko: '불러오기 실패 — 다시 시도', en: 'Failed to load — retry' },
    leaderboard_me_rank: { ko: '내 최고: {rank}위 ({score})', en: 'Your best: #{rank} ({score})' },
    leaderboard_me_none: { ko: '아직 점수 미등록', en: 'No score yet' },
    leaderboard_back: { ko: '← 뒤로', en: '← Back' },

    // Character Select Scene
    char_select_title: { ko: 'CHOOSE YOUR HERO!', en: 'CHOOSE YOUR HERO!' },
    char_select_essence: { ko: '보유 정수: {amount}', en: 'Essence: {amount}' },
    char_select_unlock: { ko: '[클릭하여 해금]', en: '[Click to unlock]' },
    char_select_locked: { ko: '🔒 {cost} 정수', en: '🔒 {cost} Essence' },
    char_select_short: { ko: '정수 부족', en: 'Not enough essence' },

    // Upgrade Scene
    upgrade_title: { ko: 'LEVEL UP! 카드를 선택하세요', en: 'LEVEL UP! Choose a card' },
    upgrade_extra_card_ad: { ko: '광고 보고 카드 1장 더', en: 'Watch Ad for Extra Card' },
    upgrade_extra_card_unlocked: { ko: '카드 2장 선택 가능!', en: 'Pick 2 cards!' },
    upgrade_pick_one_more: { ko: '카드 1장 더 선택!', en: 'Pick one more card!' },
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
    upgrade_stat_maxhp_title: { ko: '최대 HP +25', en: 'Max HP +25' },
    upgrade_stat_maxhp_desc: { ko: '최대 체력 증가 + 완전 회복', en: 'Max health up + full heal' },
    upgrade_stat_bigdmg_title: { ko: '데미지 +25%', en: 'Damage +25%' },
    upgrade_stat_bigdmg_desc: { ko: '큰 폭으로 데미지 증가', en: 'Massive damage boost' },
} as const;

export type StringKey = keyof typeof STRINGS;
