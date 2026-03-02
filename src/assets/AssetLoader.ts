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
        // Load the downloaded 0x72 dungeon tileset as a generic 16x16 spritesheet
        this.scene.load.spritesheet('dungeon', 'assets/0x72_DungeonTilesetII_v1.7.png', {
            frameWidth: 16,
            frameHeight: 16
        });
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
