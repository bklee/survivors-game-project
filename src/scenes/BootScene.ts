import { Scene } from 'phaser';
import { AssetLoader } from '../assets/AssetLoader';

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
        this.scene.start('CharacterSelectScene');
    }

}