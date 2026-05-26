import './errorLogger';
import Phaser from 'phaser';
import { PokiSDK } from './integrations/PokiSDK';
import { ApiClient } from './integrations/ApiClient';
import { MetaProgress } from './core/MetaProgress';
import { CHARACTERS } from './constants/CharacterConfig';
import { BootScene } from './scenes/BootScene';
import { MainScene } from './scenes/MainScene';
import { UpgradeScene } from './scenes/UpgradeScene';
import { UIScene } from './scenes/UIScene';
import { GameOverScene } from './scenes/GameOverScene';
import { TitleScene } from './scenes/TitleScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { RecipeScene } from './scenes/RecipeScene';
import { SkillTreeScene } from './scenes/SkillTreeScene';
import { CodexScene } from './scenes/CodexScene';
import { DailyRewardModal } from './scenes/DailyRewardModal';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { QuestPanelScene } from './scenes/QuestPanelScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 1280,
    height: 720,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
        },
    },
    scene: [
        BootScene,
        TitleScene,
        CharacterSelectScene,
        MainScene,
        UIScene,
        UpgradeScene,
        GameOverScene,
        RecipeScene,
        SkillTreeScene,
        CodexScene,
        DailyRewardModal,
        LeaderboardScene,
        QuestPanelScene,
    ],
    pixelArt: true,
    backgroundColor: '#111111',
};

// PWA 설치 완료 트래킹
window.addEventListener('appinstalled', () => {
    ApiClient.trackEvent('pwa_install');
});

PokiSDK.init().then(() => {
    new Phaser.Game(config);
    setTimeout(() => PokiSDK.gameLoadingFinished(), 1000);
});

// 디버그 — 모든 캐릭터 unlock. 두 경로 동시 제공:
// (1) Shift+Q 키 단축키 (작동 device 한정)
// (2) window.unlockAllChars() console 함수 — IME/브라우저 확장 차단 환경 대비
// browse 자동 검증: 코드 100% 정상. 일부 사용자 device 에서 키 이벤트
// 자체가 listener 에 도달 안 함 (한글 IME 또는 브라우저 확장 의심).
const unlockAllChars = () => {
    const data = MetaProgress.load();
    // CHARACTERS 의 key 는 'KNIGHT' (대문자), 하지만 char.id 는 'knight' (소문자).
    // CharacterSelectScene 은 char.id 로 unlockedCharacters 매칭하므로 char.id push 해야 함.
    for (const char of Object.values(CHARACTERS)) {
        if (!data.unlockedCharacters.includes(char.id)) {
            data.unlockedCharacters.push(char.id);
        }
    }
    MetaProgress.save(data);
    location.reload();
};
(window as unknown as { unlockAllChars: () => void }).unlockAllChars = unlockAllChars;
console.log(
    '%c[Survivors Debug] 캐릭터 모두 해제: URL 끝에 ?unlock 추가 또는 콘솔 unlockAllChars() 또는 Shift+T',
    'color: #ff66cc; font-weight: bold;',
);

// URL trigger — ?unlock 또는 #unlock 이면 자동 unlock. 키 / console 무관 100% 작동.
// 재진입 loop 방지: localStorage 마커로 1 회만.
const url = new URL(location.href);
if (
    (url.searchParams.has('unlock') || url.hash.includes('unlock')) &&
    !localStorage.getItem('survivors_url_unlock_done')
) {
    localStorage.setItem('survivors_url_unlock_done', '1');
    url.searchParams.delete('unlock');
    url.hash = '';
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    unlockAllChars();
}

window.addEventListener(
    'keydown',
    (e) => {
        if (e.isComposing) return;
        const isT = e.code === 'KeyT' || e.key === 'T' || e.key === 't';
        if (!isT || !e.shiftKey) return;
        unlockAllChars();
    },
    true,
);
