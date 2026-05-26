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

// 디버그 — Shift+Q: 모든 캐릭터 unlock + 페이지 reload. 글로벌.
// PR #100 (reload) 작동 확인됨. PR #101/#102 의 scene.restart 분기는
// 일부 사용자에서 실패. 단순화 — 무조건 reload 로 작동 보장.
window.addEventListener(
    'keydown',
    (e) => {
        if (e.isComposing) return;
        const isQ = e.code === 'KeyQ' || e.key === 'Q' || e.key === 'q';
        if (!isQ || !e.shiftKey) return;
        const data = MetaProgress.load();
        for (const id of Object.keys(CHARACTERS)) {
            if (!data.unlockedCharacters.includes(id)) {
                data.unlockedCharacters.push(id);
            }
        }
        MetaProgress.save(data);
        location.reload();
    },
    true,
);
