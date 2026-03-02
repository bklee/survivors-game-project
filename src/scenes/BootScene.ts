import { Scene } from 'phaser';

export class BootScene extends Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Load some assets here
        // this.load.image('logo', 'assets/logo.png');
    }

    create() {
        this.scene.start('MainScene');
    }
}
