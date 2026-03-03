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
        // BGM
        this.scene.load.audio('main_bgm', 'assets/audio/main_bgm.mp3');
        this.scene.load.audio('boss_bgm', 'assets/audio/boss_bgm.mp3');

        // SFX
        this.scene.load.audio('fire_cast', 'assets/audio/fire_cast.mp3');
        this.scene.load.audio('ice_cast', 'assets/audio/ice_cast.mp3');
        this.scene.load.audio('poison_cast', 'assets/audio/poison_cast.mp3');
        this.scene.load.audio('hit', 'assets/audio/hit.mp3');
        this.scene.load.audio('level_up', 'assets/audio/level_up.mp3');
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
        
        // Orc (16x23)
        for (let i = 0; i < 4; i++) {
            texture.add(`orc_idle_${i}`, 0, 368 + (i * 16), 177, 16, 23);
            texture.add(`orc_run_${i}`, 0, 432 + (i * 16), 177, 16, 23);
        }

        // Skeleton (16x16)
        for (let i = 0; i < 4; i++) {
            texture.add(`skeleton_idle_${i}`, 0, 368 + (i * 16), 88, 16, 16);
            texture.add(`skeleton_run_${i}`, 0, 432 + (i * 16), 88, 16, 16);
        }

        // Add default enemy (imp or similar)
        for (let i = 0; i < 4; i++) {
            texture.add(`imp_idle_${i}`, 0, 368 + (i * 16), 64, 16, 16);
            texture.add(`imp_run_${i}`, 0, 432 + (i * 16), 64, 16, 16);
        }
        // Add Spell Frames
        texture.add('spell_fire', 0, 288, 336, 16, 16); // flask_big_red
        texture.add('spell_ice', 0, 304, 336, 16, 16);  // flask_big_blue
        texture.add('spell_gas', 0, 320, 336, 16, 16);  // flask_big_green
        texture.add('spell_dud', 0, 288, 320, 16, 16);  // bomb_f0
        texture.add('enemy_bullet', 0, 313, 385, 6, 7); 
        
        // Weapons
        texture.add('weapon_sword', 0, 339, 98, 10, 29);
        texture.add('weapon_arrow', 0, 324, 202, 7, 21);
        texture.add('weapon_staff', 0, 324, 129, 8, 30);

        // Dungeon Props (Static)
        texture.add('prop_crate', 0, 288, 408, 16, 24);
        texture.add('prop_skull', 0, 288, 432, 16, 16);
        texture.add('prop_column', 0, 80, 80, 16, 48);

        // Dungeon Props (Animated - Spikes)
        for (let i = 0; i < 4; i++) {
            texture.add(`prop_spikes_${i}`, 0, 16 + (i * 16), 192, 16, 16);
        }

        // Interactive (Levers & Doors)
        texture.add('lever_off', 0, 256, 448, 16, 16);
        texture.add('lever_on', 0, 272, 448, 16, 16);
        texture.add('door_closed', 0, 160, 144, 32, 32);
        texture.add('door_open', 0, 224, 144, 32, 32);

        // Add XP gem frame
        texture.add('gem', 0, 288, 352, 16, 16);
    }
}
