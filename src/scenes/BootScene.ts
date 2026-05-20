import { Scene } from 'phaser';
import { AssetLoader } from '../assets/AssetLoader';
import { ApiClient } from '../integrations/ApiClient';
import { QuestTracker } from '../systems/QuestTracker';

export class BootScene extends Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        const loader = new AssetLoader(this);
        loader.loadImages();
        loader.loadAudio();
    }

    create() {
        const loader = new AssetLoader(this);
        loader.defineFrames();

        // 페이지 이탈 직전 이벤트 큐 + quest progress flush (sendBeacon / fetch best-effort)
        window.addEventListener('pagehide', () => {
            ApiClient.flushBeacon();
            void QuestTracker.flush();
        });

        this.scene.launch('UIScene');
        this.scene.start('TitleScene');
    }
}
