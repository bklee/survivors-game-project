import { Scene } from 'phaser';
import { AssetLoader } from '../assets/AssetLoader';
import { ApiClient } from '../integrations/ApiClient';

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

        // 페이지 이탈 직전 이벤트 큐 flush (sendBeacon)
        window.addEventListener('pagehide', () => ApiClient.flushBeacon());

        this.scene.launch('UIScene');
        this.scene.start('TitleScene');
    }
}
