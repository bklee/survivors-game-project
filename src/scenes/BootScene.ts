import { Scene } from 'phaser';
import { AssetLoader } from '../assets/AssetLoader';

export class BootScene extends Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        const loader = new AssetLoader(this);
        loader.loadImages();
    }

    create() {
        this.scene.start('MainScene');
    }
}
