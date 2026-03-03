import './errorLogger';
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainScene } from './scenes/MainScene';
import { UpgradeScene } from './scenes/UpgradeScene';
import { UIScene } from './scenes/UIScene';
import { GameOverScene } from './scenes/GameOverScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { RecipeScene } from './scenes/RecipeScene';

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
    scene: [BootScene, CharacterSelectScene, MainScene, UIScene, UpgradeScene, GameOverScene, RecipeScene],
    pixelArt: true,
    backgroundColor: '#111111',
};

new Phaser.Game(config);
