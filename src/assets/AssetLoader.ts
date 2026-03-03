import Phaser from 'phaser';
import { CHARACTERS, BACKGROUND_FLOOR } from '../constants/CharacterConfig';

export class AssetLoader {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    loadSpritesheets() {
        // e.g. this.scene.load.spritesheet('player', 'assets/player.png', { frameWidth: 32, frameHeight: 32 });
    }

    loadImages() {
        // Load the 0x72 dungeon tileset as a raw image
        this.scene.load.image('dungeon', 'assets/0x72_DungeonTilesetII_v1.7.png');
    }

    loadAudio() {
        // e.g. this.scene.load.audio('hit', 'assets/hit.wav');
    }

    loadTextureAtlas() {
        // e.g. this.scene.load.atlas('characters', 'assets/atlas/chars.png', 'assets/atlas/chars.json');
    }

    defineFrames() {
        const texture = this.scene.textures.get('dungeon');
        if (!texture) return;

        // Add background floor frame
        texture.add('floor', 0, BACKGROUND_FLOOR.x, BACKGROUND_FLOOR.y, BACKGROUND_FLOOR.w, BACKGROUND_FLOOR.h);

        // Add character frames
        Object.values(CHARACTERS).forEach(char => {
            // Idle frames
            for (let i = 0; i < char.frames.idle.count; i++) {
                texture.add(`${char.id}_idle_${i}`, 0, 
                    char.frames.idle.x + (i * 16), 
                    char.frames.idle.y, 
                    char.frames.idle.w, 
                    char.frames.idle.h);
            }
            // Run frames
            for (let i = 0; i < char.frames.run.count; i++) {
                texture.add(`${char.id}_run_${i}`, 0, 
                    char.frames.run.x + (i * 16), 
                    char.frames.run.y, 
                    char.frames.run.w, 
                    char.frames.run.h);
            }
        });

        // Add some enemy frames (Demon)
        // Big Demon frames (32x36)
        for (let i = 0; i < 4; i++) {
            texture.add(`demon_idle_${i}`, 0, 16 + (i * 32), 428, 32, 36);
            texture.add(`demon_run_${i}`, 0, 144 + (i * 32), 428, 32, 36);
        }
        
        // Add default enemy (imp or similar)
        for (let i = 0; i < 4; i++) {
            texture.add(`imp_idle_${i}`, 0, 368 + (i * 16), 64, 16, 16);
            texture.add(`imp_run_${i}`, 0, 432 + (i * 16), 64, 16, 16);
        }

        // Add XP gem frame (flask_red or similar)
        texture.add('gem', 0, 288, 352, 16, 16);
    }
}
