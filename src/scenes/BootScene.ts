import { Scene } from 'phaser';
import { AssetLoader } from '../assets/AssetLoader';
import { LemonSqueezy } from '../integrations/LemonSqueezy';
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

        // 서버에서 IAP 보유 상태 동기화 (네트워크 실패해도 LocalStorage 폴백)
        void LemonSqueezy.refreshFromServer();

        // 페이지 이탈 직전 이벤트 큐 flush (sendBeacon)
        window.addEventListener('pagehide', () => ApiClient.flushBeacon());

        this.scene.launch('UIScene');
        this.scene.start('TitleScene');
    }
}
