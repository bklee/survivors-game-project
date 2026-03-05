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
        this.scene.load.image('dungeon', './assets/0x72_DungeonTilesetII_v1.7.png');
        this.scene.load.image('walls', './assets/atlas_walls_high-16x32.png');
        this.scene.load.image('weapon_bow', './assets/frames/weapon_bow.png');
        this.scene.load.image('main_bg', './assets/main.jpg');
        this.scene.load.image('loading_bg', './assets/loading.jpg');
        for (let i = 0; i < 3; i++) {
            this.scene.load.image(`sword_slash_f${i}`, `./assets/frames/sword_slash_f${i}.png`);
            this.scene.load.image(`super_slash_f${i}`, `./assets/frames/super_slash_f${i}.png`);
        }
        // Monster Groups
        const monsters = [
            // Demons
            { name: 'chort', hasIdleRun: true },
            { name: 'imp', hasIdleRun: true },
            { name: 'wogol', hasIdleRun: true },
            { name: 'big_demon', hasIdleRun: true }, // BOSS

            // Undeads
            { name: 'skelet', hasIdleRun: true },
            { name: 'tiny_zombie', hasIdleRun: true },
            { name: 'zombie', hasIdleRun: false },
            { name: 'ice_zombie', hasIdleRun: false },
            { name: 'doc', hasIdleRun: true },
            { name: 'necromancer', hasIdleRun: false },
            { name: 'big_zombie', hasIdleRun: true }, // BOSS

            // Orcs
            { name: 'orc_shaman', hasIdleRun: true },
            { name: 'orc_warrior', hasIdleRun: true },
            { name: 'goblin', hasIdleRun: true },
            { name: 'masked_orc', hasIdleRun: true },
            { name: 'ogre', hasIdleRun: true } // BOSS
        ];

        monsters.forEach(m => {
            if (m.hasIdleRun) {
                for (let i = 0; i < 4; i++) {
                    this.scene.load.image(`${m.name}_idle_f${i}`, `./assets/frames/${m.name}_idle_anim_f${i}.png`);
                    this.scene.load.image(`${m.name}_run_f${i}`, `./assets/frames/${m.name}_run_anim_f${i}.png`);
                }
            } else {
                for (let i = 0; i < 4; i++) {
                    this.scene.load.image(`${m.name}_f${i}`, `./assets/frames/${m.name}_anim_f${i}.png`);
                }
            }
        });

        // Add Chest animations
        for (let i = 0; i < 3; i++) {
            this.scene.load.image(`chest_full_open_${i}`, `./assets/frames/chest_full_open_anim_f${i}.png`);
            this.scene.load.image(`chest_empty_open_${i}`, `./assets/frames/chest_empty_open_anim_f${i}.png`);
        }

        // Add Coin animations
        for (let i = 0; i < 4; i++) {
            this.scene.load.image(`coin_f${i}`, `./assets/frames/coin_anim_f${i}.png`);
        }
    }

    loadAudio() {
        this.scene.load.audio('select_bgm', './assets/audio/hero_reprise.mp3', { stream: true });
        this.scene.load.audio('main_bgm', './assets/audio/fight_for_better_future.mp3', { stream: true });
        this.scene.load.audio('boss_bgm', './assets/audio/boss_battle_8_retro_01_opening.mp3', { stream: true });

        this.scene.load.audio('fire_cast', './assets/audio/fire_cast.mp3');
        this.scene.load.audio('ice_cast', './assets/audio/ice_cast.mp3');
        this.scene.load.audio('poison_cast', './assets/audio/poison_cast.mp3');
        this.scene.load.audio('hit', './assets/audio/hit.mp3');
        this.scene.load.audio('level_up', './assets/audio/level_up.mp3');
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

        // Default monster frames (older versions, keeping for compatibility if needed)
        // ...

        // Add Spell Frames
        texture.add('spell_fire', 0, 288, 336, 16, 16);
        texture.add('spell_ice', 0, 304, 336, 16, 16);
        texture.add('spell_gas', 0, 320, 336, 16, 16);
        texture.add('spell_dud', 0, 288, 320, 16, 16);
        texture.add('enemy_bullet', 0, 313, 385, 6, 7);

        // Weapons
        texture.add('weapon_sword', 0, 339, 98, 10, 29);
        texture.add('weapon_arrow', 0, 324, 202, 7, 21);
        texture.add('weapon_staff', 0, 324, 129, 8, 30);

        // Props
        texture.add('prop_crate', 0, 288, 408, 16, 24);
        texture.add('prop_skull', 0, 288, 432, 16, 16);
        texture.add('prop_column', 0, 80, 80, 16, 48);
        texture.add('prop_chest', 0, 304, 416, 16, 16);

        for (let i = 0; i < 4; i++) {
            texture.add(`prop_spikes_${i}`, 0, 16 + (i * 16), 192, 16, 16);
        }

        texture.add('lever_off', 0, 256, 448, 16, 16);
        texture.add('lever_on', 0, 272, 448, 16, 16);
        texture.add('door_closed', 0, 160, 144, 32, 32);
        texture.add('door_open', 0, 224, 144, 32, 32);
        texture.add('gem', 0, 288, 352, 16, 16);

        const wallTex = this.scene.textures.get('walls');
        if (wallTex) {
            wallTex.add('wall_top', 0, 32, 96, 16, 32);
            wallTex.add('wall_bottom', 0, 32, 0, 16, 32);
            wallTex.add('wall_left', 0, 16, 32, 16, 32);
            wallTex.add('wall_right', 0, 48, 32, 16, 32);
            wallTex.add('wall_inner', 0, 32, 32, 16, 32);
            wallTex.add('wall_tl', 0, 16, 96, 16, 32);
            wallTex.add('wall_tr', 0, 48, 96, 16, 32);
            wallTex.add('wall_bl', 0, 16, 0, 16, 32);
            wallTex.add('wall_br', 0, 48, 0, 16, 32);
        }
    }

}