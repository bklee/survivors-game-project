import './errorLogger';
import Phaser from 'phaser';

// GameDistribution SDK 동적 로드 — VITE_GD_GAME_ID 가 설정된 경우에만 활성화
const GD_GAME_ID = import.meta.env.VITE_GD_GAME_ID || '';
if (GD_GAME_ID) {
    (window as Window).GD_OPTIONS = {
        gameId: GD_GAME_ID,
        onEvent: (event: Record<string, unknown>) => console.log('[GD]', event['name'], event),
    };
    const s = document.createElement('script');
    s.src = 'https://html5.api.gamedistribution.com/main.min.js';
    s.async = true;
    document.head.appendChild(s);
} else {
    console.warn('[GD] VITE_GD_GAME_ID not set — running without GameDistribution SDK');
}
import { AdSDK } from './integrations/AdSDK';
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

AdSDK.init().then(() => {
    new Phaser.Game(config);
    setTimeout(() => AdSDK.gameLoadingFinished(), 1000);
});

// 디버그 — Shift+T: 모든 캐릭터 unlock. CHARACTERS 의 key 는 대문자, char.id 는 소문자.
// CharacterSelectScene 은 char.id 로 매칭하므로 push 도 char.id (소문자) 로.
window.addEventListener(
    'keydown',
    (e) => {
        if (e.isComposing) return;
        const isT = e.code === 'KeyT' || e.key === 'T' || e.key === 't';
        if (!isT || !e.shiftKey) return;
        const data = MetaProgress.load();
        for (const char of Object.values(CHARACTERS)) {
            if (!data.unlockedCharacters.includes(char.id)) {
                data.unlockedCharacters.push(char.id);
            }
        }
        MetaProgress.save(data);
        location.reload();
    },
    true,
);
