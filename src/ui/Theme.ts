/**
 * 디자인 토큰 — 색/폰트/타이포 통일.
 *
 * 분포 조사 결과: 가장 많이 쓰이는 색은 #ffd700 (gold, 25+ 곳),
 * #000000 (stroke, 18+), #ffffff (text body, 12+), #aaaaaa (muted),
 * #5a3300/#3a2a1a (shadow), #ffaa00 (warm accent), #44cc44 (success).
 *
 * Phaser Text 스타일은 string 색 (CSS hex) 사용. Rectangle 등 GameObject 는 number.
 * 양쪽 모두 지원하기 위해 PALETTE 는 string, PALETTE_NUM 은 동일 값을 0x 숫자로 제공.
 */

export const PALETTE = {
    // 골드 계열 (이전 #ffd700 가장 많이 사용)
    gold: '#ffd700', // pure gold — UI 강조, 활성 상태 등
    goldSoft: '#ffaa00', // warm orange-gold — 보조 강조 (reroll 등)
    goldDeep: '#b08d57', // antique bronze — 타이틀 등 차분한 톤
    goldShadow: '#5a3300', // 텍스트 shadow 용 다크 브라운
    bronzeShadow: '#3a2a1a', // 더 깊은 브론즈 그림자

    // 기본 텍스트 색
    text: '#ffffff', // body 텍스트 / 강조 흰
    textMuted: '#aaaaaa', // 보조 정보
    textDim: '#888888', // 더 흐린 텍스트
    textDisabled: '#666666', // 비활성

    // 의미 색
    success: '#44cc44', // 완료/성공 (✓)
    danger: '#cc4444', // 위험/에러
    info: '#aaddff', // 정보 (essence 등)

    // 배경/스트로크
    stroke: '#000000', // 기본 검정 stroke
    strokeDeep: '#1a0e00', // 더 깊은 다크 브라운 stroke
    bgOverlay: '#000000bb', // 모달 오버레이 (반투명 검정)
    bgPanel: '#1e1e1e', // 카드/패널 어두운 배경
    bgPanelDark: '#0d0d0d', // 비활성 패널
} as const;

/**
 * 숫자 (0x) 버전 — Rectangle setFillStyle / setStrokeStyle 등 GameObject 용.
 * PALETTE 와 동일 값 (헥스 string → 0x number).
 */
export const PALETTE_NUM = {
    gold: 0xffd700,
    goldSoft: 0xffaa00,
    goldDeep: 0xb08d57,
    goldShadow: 0x5a3300,
    bronzeShadow: 0x3a2a1a,
    text: 0xffffff,
    textMuted: 0xaaaaaa,
    textDim: 0x888888,
    textDisabled: 0x666666,
    success: 0x44cc44,
    danger: 0xcc4444,
    info: 0xaaddff,
    stroke: 0x000000,
    strokeDeep: 0x1a0e00,
    bgPanel: 0x1e1e1e,
    bgPanelDark: 0x0d0d0d,
} as const;

/**
 * 폰트 패밀리.
 * - title: 큰 타이틀/장식 텍스트 (대형 헤딩, 보스 네임 등). 디아블로2 풍.
 * - body: 일반 UI 텍스트 (버튼, 라벨, 본문). 중세 분위기 유지.
 * - mono: 숫자/스코어 (선택). 현재 미사용.
 *
 * Google Fonts (OFL 라이선스 — 상용 자유):
 *   - Cinzel Decorative: 대형 로마 세리프, 라틴 글리프 (디아블로2 풍)
 *   - Jua: 한글 둥근 고딕 (캐주얼, 친근감, 가독성 좋음)
 *   - MedievalSharp: 라틴 폴백 (이미 다수 씬에서 사용)
 *
 * 폴백 체인: 라틴은 Cinzel, 한글은 Jua, 그 외는 시스템 serif.
 */
export const FONTS = {
    title: '"Cinzel Decorative", "Jua", "MedievalSharp", serif',
    body: '"Cinzel Decorative", "Jua", "MedievalSharp", cursive',
    mono: 'monospace',
} as const;

/**
 * 자주 쓰이는 타이포 프리셋. Phaser.Types.GameObjects.Text.TextStyle 호환.
 * 사용 예:
 *   this.add.text(x, y, 'hello', TEXT_STYLES.btnPrimary)
 *
 * 각 프리셋은 readonly — 그대로 사용. 변형 필요 시 spread 로 override:
 *   this.add.text(x, y, 'hi', { ...TEXT_STYLES.body, color: PALETTE.gold })
 */
export const TEXT_STYLES = {
    /** 대형 타이틀 (게임 진입 화면 등). 80px 청동 톤 + letterSpacing 8. */
    titleHero: {
        fontFamily: FONTS.title,
        fontSize: '80px',
        color: PALETTE.goldDeep,
        fontStyle: 'bold',
        stroke: PALETTE.strokeDeep,
        strokeThickness: 10,
        align: 'center',
        shadow: { offsetX: 3, offsetY: 3, color: PALETTE.bronzeShadow, blur: 18, fill: true },
    } as Phaser.Types.GameObjects.Text.TextStyle,

    /** 씬 타이틀 (모달 헤더, 패널 제목). 38px 골드. */
    titleScene: {
        fontFamily: FONTS.title,
        fontSize: '38px',
        color: PALETTE.gold,
        fontStyle: 'bold',
    } as Phaser.Types.GameObjects.Text.TextStyle,

    /** 1차 액션 버튼 (받기, 시작 등). 24px 골드 + 검정 stroke. */
    btnPrimary: {
        fontFamily: FONTS.body,
        fontSize: '24px',
        color: PALETTE.text,
        fontStyle: 'bold',
        stroke: PALETTE.stroke,
        strokeThickness: 2,
    } as Phaser.Types.GameObjects.Text.TextStyle,

    /** 2차 액션 버튼 (재추첨, 닫기 등). 20px 골드. */
    btnSecondary: {
        fontFamily: FONTS.body,
        fontSize: '22px',
        color: PALETTE.goldSoft,
        fontStyle: 'bold',
        stroke: PALETTE.stroke,
        strokeThickness: 3,
        padding: { x: 16, y: 8 },
    } as Phaser.Types.GameObjects.Text.TextStyle,

    /** 본문 텍스트 (라벨, 설명). 20px 회색. */
    body: {
        fontFamily: FONTS.body,
        fontSize: '20px',
        color: PALETTE.textMuted,
    } as Phaser.Types.GameObjects.Text.TextStyle,

    /** 작은 본문 (스탯, 메타정보). 16px 회색. */
    bodySmall: {
        fontFamily: FONTS.body,
        fontSize: '16px',
        color: PALETTE.textMuted,
    } as Phaser.Types.GameObjects.Text.TextStyle,
} as const;
