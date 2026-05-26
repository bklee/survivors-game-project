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
    for (const id of Object.keys(CHARACTERS)) {
        if (!data.unlockedCharacters.includes(id)) {
            data.unlockedCharacters.push(id);
        }
    }
    MetaProgress.save(data);
    location.reload();
};
(window as unknown as { unlockAllChars: () => void }).unlockAllChars = unlockAllChars;
console.log(
    '%c[Survivors Debug] 캐릭터 모두 해제: 콘솔에 unlockAllChars() 입력 또는 Shift+Q',
    'color: #ff66cc; font-weight: bold;',
);

window.addEventListener(
    'keydown',
    (e) => {
        if (e.isComposing) return;
        const isQ = e.code === 'KeyQ' || e.key === 'Q' || e.key === 'q';
        if (!isQ || !e.shiftKey) return;
        unlockAllChars();
    },
    true,
);
