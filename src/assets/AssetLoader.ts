import Phaser from 'phaser';

export class AssetLoader {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    loadSpritesheets() {
        // e.g. this.scene.load.spritesheet('player', 'assets/player.png', { frameWidth: 32, frameHeight: 32 });
    }

    loadImages() {
        // e.g. this.scene.load.image('bg', 'assets/bg.png');
    }

    loadAudio() {
        // e.g. this.scene.load.audio('hit', 'assets/hit.wav');
    }

    loadTextureAtlas() {
        // e.g. this.scene.load.atlas('characters', 'assets/atlas/chars.png', 'assets/atlas/chars.json');
    }

    createAnimations() {
        // Create generic animations from loaded sheets/atlas
        //
        // this.scene.anims.create({
        //     key: 'run',
        //     frames: this.scene.anims.generateFrameNames('characters', { prefix: 'run_', start: 0, end: 5 }),
        //     frameRate: 10,
        //     repeat: -1
        // });
    }
}
