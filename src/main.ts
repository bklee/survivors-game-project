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

let gameInstance: Phaser.Game | null = null;
PokiSDK.init().then(() => {
    gameInstance = new Phaser.Game(config);
    setTimeout(() => PokiSDK.gameLoadingFinished(), 1000);
});

// 디버그 — Shift+Q: 모든 캐릭터 unlock. 글로벌 (어느 scene 에서든 작동).
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
        // CharacterSelectScene 활성이면 그것만 restart. 실패하면 location.reload 로 fallback.
        let restarted = false;
        try {
            const charSelect = gameInstance?.scene.getScene('CharacterSelectScene');
            if (charSelect && gameInstance?.scene.isActive('CharacterSelectScene')) {
                charSelect.scene.restart();
                restarted = true;
            }
        } catch (err) {
            console.warn('[DEBUG] scene restart failed:', err);
        }
        if (!restarted) {
            // 다른 scene 에 있거나 restart 실패 — reload 로 보장
            location.reload();
        }
    },
    true,
);
