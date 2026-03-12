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
        this.scene.load.image('floors', './assets/atlas_floor-16x16.png');
        this.scene.load.image('weapon_knight_sword', './assets/frames/weapon_knight_sword.png');
        this.scene.load.image('weapon_green_magic_staff', './assets/frames/weapon_green_magic_staff.png');
        this.scene.load.image('main_bg', './assets/main.png');
        this.scene.load.image('loading_bg', './assets/loading.jpg');
        this.scene.load.image('hp_icon', './assets/frames/ui_heart_full.png');
        this.scene.load.image('game_over', './assets/game_over.png');

        for (let i = 0; i < 3; i++) {
            this.scene.load.image(`sword_slash_f${i}`, `assets/frames/sword_slash_f${i}.png`);
            this.scene.load.image(`super_slash_f${i}`, `assets/frames/super_slash_f${i}.png`);
            this.scene.load.image(`spell_fire_f${i}`, `assets/frames/spell_fire_f${i}.png`);
        }
        // We will define all monster, coin, and chest frames in defineFrames() using the dungeon tileset
    }

    loadAudio() {
        this.scene.load.audio('select_bgm', 'assets/audio/hero_reprise.mp3', { stream: true });
        this.scene.load.audio('main_bgm', 'assets/audio/fight_for_better_future.mp3', { stream: true });
        this.scene.load.audio('bgm_metal', 'assets/audio/once_more_metal.mp3', { stream: true });
        this.scene.load.audio('bgm_unchained', 'assets/audio/unchained_destiny_loop.mp3', { stream: true });
        this.scene.load.audio('boss_bgm', 'assets/audio/boss_battle_8_retro_01_opening.mp3', { stream: true });

        this.scene.load.audio('fire_cast', 'assets/audio/fire_cast.mp3');
        this.scene.load.audio('ice_cast', 'assets/audio/ice_cast.mp3');
        this.scene.load.audio('poison_cast', 'assets/audio/poison_cast.mp3');
        this.scene.load.audio('hit', 'assets/audio/hit.mp3');
        this.scene.load.audio('level_up', 'assets/audio/level_up.mp3');
        this.scene.load.audio('victory_fanfare', 'assets/audio/victory_fanfare.mp3');
        this.scene.load.audio('coin_pickup', 'assets/audio/coin.mp3');
        this.scene.load.audio('game_over_bgm', 'assets/audio/true_love_ost.mp3');
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
            texture.add(`imp_idle_f${i}`, 0, 368 + (i * 16), 64, 16, 16);
            texture.add(`imp_run_f${i}`, 0, 432 + (i * 16), 64, 16, 16);
        }

        // --- NEW COMPREHENSIVE FRAMES FROM TILESET ---
        // Big Bosses (32x36)
        for (let i = 0; i < 4; i++) {
            texture.add(`big_demon_idle_f${i}`, 0, 16 + (i * 32), 428, 32, 36);
            texture.add(`big_demon_run_f${i}`, 0, 144 + (i * 32), 428, 32, 36);
            texture.add(`big_zombie_idle_f${i}`, 0, 16 + (i * 32), 332, 32, 36);
            texture.add(`big_zombie_run_f${i}`, 0, 144 + (i * 32), 332, 32, 36);
            texture.add(`ogre_idle_f${i}`, 0, 16 + (i * 32), 380, 32, 36);
            texture.add(`ogre_run_f${i}`, 0, 144 + (i * 32), 380, 32, 36);
        }

        // Monsters (16x23 / 16x16)
        for (let i = 0; i < 4; i++) {
            // Orcs
            texture.add(`orc_shaman_idle_f${i}`, 0, 368 + (i * 16), 201, 16, 23);
            texture.add(`orc_shaman_run_f${i}`, 0, 432 + (i * 16), 201, 16, 23);
            texture.add(`orc_warrior_idle_f${i}`, 0, 368 + (i * 16), 177, 16, 23);
            texture.add(`orc_warrior_run_f${i}`, 0, 432 + (i * 16), 177, 16, 23);
            texture.add(`goblin_idle_f${i}`, 0, 368 + (i * 16), 40, 16, 16);
            texture.add(`goblin_run_f${i}`, 0, 432 + (i * 16), 40, 16, 16);
            texture.add(`masked_orc_idle_f${i}`, 0, 368 + (i * 16), 153, 16, 23);
            texture.add(`masked_orc_run_f${i}`, 0, 432 + (i * 16), 153, 16, 23);
            // Undeads
            texture.add(`skelet_idle_f${i}`, 0, 368 + (i * 16), 88, 16, 16);
            texture.add(`skelet_run_f${i}`, 0, 432 + (i * 16), 88, 16, 16);
            texture.add(`tiny_zombie_idle_f${i}`, 0, 368 + (i * 16), 16, 16, 16);
            texture.add(`tiny_zombie_run_f${i}`, 0, 432 + (i * 16), 16, 16, 16);
            texture.add(`zombie_f${i}`, 0, 368 + (i * 16), 136, 16, 16);
            texture.add(`ice_zombie_f${i}`, 0, 432 + (i * 16), 136, 16, 16);
            texture.add(`doc_idle_f${i}`, 0, 368 + (i * 16), 345, 16, 23);
            texture.add(`doc_run_f${i}`, 0, 432 + (i * 16), 345, 16, 23);
            texture.add(`necromancer_f${i}`, 0, 368 + (i * 16), 225, 16, 23);
            // Demons
            texture.add(`chort_idle_f${i}`, 0, 368 + (i * 16), 273, 16, 23);
            texture.add(`chort_run_f${i}`, 0, 432 + (i * 16), 273, 16, 23);
            texture.add(`wogol_idle_f${i}`, 0, 368 + (i * 16), 249, 16, 23);
            texture.add(`wogol_run_f${i}`, 0, 432 + (i * 16), 249, 16, 23);
        }

        // Chests (16x16)
        for (let i = 0; i < 3; i++) {
            texture.add(`chest_full_open_f${i}`, 0, 304 + (i * 16), 416, 16, 16);
            texture.add(`chest_empty_open_f${i}`, 0, 304 + (i * 16), 400, 16, 16);
        }

        // Coins (6x7)
        for (let i = 0; i < 4; i++) {
            texture.add(`coin_f${i}`, 0, 289 + (i * 8), 385, 6, 7);
        }

        // Slashes (placeholder coordinates if needed, or keeping current)
        // sword_slash_f0-2... for now let's hope they are not critical or use similar frames
        // Actually sword slash might be a special asset. We'll leave them if not in tileset.
        // Wait, I saw sword_slash in AssetLoader before. If it's not in tileset, keep it.
        // --- END NEW FRAMES ---

        // Default monster frames (older versions, keeping for compatibility if needed)
        // ...

        // Flasks (Potions) - Big
        texture.add('flask_big_red', 0, 288, 336, 16, 16);
        texture.add('flask_big_blue', 0, 304, 336, 16, 16);
        texture.add('flask_big_green', 0, 320, 336, 16, 16);
        texture.add('flask_big_yellow', 0, 336, 336, 16, 16);

        // Flasks (Potions) - Small
        texture.add('flask_red', 0, 288, 352, 16, 16);
        texture.add('flask_blue', 0, 304, 352, 16, 16);
        texture.add('flask_green', 0, 320, 352, 16, 16);
        texture.add('flask_yellow', 0, 336, 352, 16, 16);

        texture.add('spell_fire', 0, 288, 336, 16, 16);
        texture.add('spell_ice', 0, 304, 336, 16, 16);
        texture.add('spell_gas', 0, 320, 336, 16, 16);
        texture.add('spell_dud', 0, 288, 320, 16, 16);
        texture.add('enemy_bullet', 0, 313, 385, 6, 7);

        // Weapons
        texture.add('weapon_sword', 0, 339, 98, 10, 29);
        texture.add('weapon_arrow', 0, 324, 202, 7, 21);
        texture.add('weapon_bow', 0, 289, 195, 14, 26);
        texture.add('weapon_staff', 0, 324, 129, 8, 30);

        // Props
        texture.add('prop_crate', 0, 288, 408, 16, 24);
        texture.add('prop_skull', 0, 288, 432, 16, 16);
        texture.add('prop_column', 0, 80, 80, 16, 48);
        texture.add('prop_chest', 0, 304, 416, 16, 16);

        for (let i = 0; i < 4; i++) {
            texture.add(`prop_spikes_${i}`, 0, 16 + (i * 16), 192, 16, 16);
        }

        texture.add('lever_off', 0, 80, 208, 16, 16);   // tile_list: lever_left  (이전 좌표 256,448 → 빨간 몬스터 스프라이트 구역 버그 수정)
        texture.add('lever_on', 0, 96, 208, 16, 16);   // tile_list: lever_right
        texture.add('door_closed', 0, 32, 240, 32, 32);   // tile_list: doors_leaf_closed  (이전 좌표 160,144 → wizzard 스프라이트와 겹쳐있던 버그 수정)
        texture.add('door_open', 0, 80, 240, 32, 32);     // tile_list: doors_leaf_open
        texture.add('doors_frame_left', 0, 16, 240, 16, 32);
        texture.add('doors_frame_right', 0, 64, 240, 16, 32);
        texture.add('doors_frame_top', 0, 32, 224, 32, 16);
        texture.add('gem', 0, 320, 336, 16, 16);

        const wallTex = this.scene.textures.get('walls');
        if (wallTex) {
            // --- North Walls (Row 0) ---
            wallTex.add('wall_n_mid', 0, 32, 0, 16, 32);
            wallTex.add('wall_n_corner_l', 0, 16, 0, 16, 32);
            wallTex.add('wall_n_corner_r', 0, 48, 0, 16, 32);
            wallTex.add('wall_n_end_l', 0, 80, 0, 16, 32);
            wallTex.add('wall_n_end_r', 0, 96, 0, 16, 32);
            wallTex.add('wall_n_mid_crack', 0, 160, 0, 16, 32);

            // --- West/East Side Walls (Row 1/2) ---
            wallTex.add('wall_w_mid', 0, 0, 32, 16, 32);
            wallTex.add('wall_e_mid', 0, 64, 32, 16, 32);
            wallTex.add('wall_w_mid_bg', 0, 0, 64, 16, 32);
            wallTex.add('wall_e_mid_bg', 0, 64, 64, 16, 32);

            // --- South Walls (Row 3) ---
            wallTex.add('wall_s_mid', 0, 32, 96, 16, 32);
            wallTex.add('wall_s_corner_l', 0, 0, 96, 16, 32);
            wallTex.add('wall_s_corner_r', 0, 64, 96, 16, 32);
            wallTex.add('wall_s_mid_crack', 0, 160, 96, 16, 32);

            // --- Fill/Internal ---
            wallTex.add('wall_inner_mid', 0, 32, 32, 16, 32);
            wallTex.add('wall_inner_l', 0, 16, 32, 16, 32);
            wallTex.add('wall_inner_r', 0, 48, 32, 16, 32);

            // --- Pillars & Special ---
            wallTex.add('column', 0, 240, 64, 16, 32);
            wallTex.add('column_wall', 0, 240, 96, 16, 32);
            wallTex.add('door_wall', 0, 256, 96, 16, 32);

            // --- Fountains ---
            for (let i = 0; i < 3; i++) {
                wallTex.add(`wall_fountain_mid_blue_f${i}`, 0, 192 + (i * 16), 64, 16, 32);
                wallTex.add(`wall_fountain_top_blue_f${i}`, 0, 192 + (i * 16), 96, 16, 32);
                wallTex.add(`wall_fountain_mid_red_f${i}`, 0, 192 + (i * 16), 32, 16, 32);
                wallTex.add(`wall_fountain_top_red_f${i}`, 0, 192 + (i * 16), 0, 16, 32);
            }
        }

        const floorTex = this.scene.textures.get('floors');
        if (floorTex) {
            let idx = 1;
            for (let r = 0; r < 7; r++) {
                for (let c = 0; c < 7; c++) {
                    floorTex.add(`floor_${idx}`, 0, c * 16, r * 16, 16, 16);
                    idx++;
                }
            }
        }
    }

}