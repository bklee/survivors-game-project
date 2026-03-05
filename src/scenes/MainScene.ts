import Phaser from 'phaser';
import { defineQuery, addEntity, addComponent, hasComponent, removeEntity } from 'bitecs';
import { world } from '../core/World';
import { Position, Velocity, Player, SpriteInfo, Animation, Health, Interactive, Item, Enemy } from '../components';
import { createPhysicsSystem } from '../systems/PhysicsSystem';
import { createRenderSystem } from '../systems/RenderSystem';
import { PlayerSystem } from '../systems/PlayerSystem';
import { NightDirector } from '../systems/WaveSystem';

import { CHARACTERS } from '../constants/CharacterConfig';

import { JuicePipeline } from '../fx/JuicePipeline';
import { createCombatSystem } from '../systems/CombatSystem';
import { SpellSystem } from '../systems/SpellSystem';
import { ItemSystem } from '../systems/ItemSystem';
import { DungeonGenerator, TILE_SIZE, TileType } from '../core/DungeonGenerator';

export class MainScene extends Phaser.Scene {
    private physicsSystem!: (dt: number) => void;
    private renderSystem!: (dt: number) => void;
    private playerSystem!: PlayerSystem;
    private nightDirector!: NightDirector;
    private uiScene!: any;
    private playerId!: number;
    private juicePipeline!: JuicePipeline;
    private combatSystem!: (dt: number) => void;
    private spellSystem!: SpellSystem;
    private itemSystem!: ItemSystem;
    private selectedCharId: string = 'wizard';
    private currentBGM?: Phaser.Sound.BaseSound;
    private dungeon!: DungeonGenerator;
    private wallBlitter!: Phaser.GameObjects.Blitter;
    private floorSprite!: Phaser.GameObjects.TileSprite;
    private currentStage: number = 1;
    private isPausedForClear: boolean = false;

    constructor() {
        super('MainScene');
    }

    init(data: { characterId: string }) {
        if (data && data.characterId) {
            this.selectedCharId = data.characterId.toLowerCase();
            console.log('Battlefield: Using character', this.selectedCharId);
        }
    }

    create() {
        this.currentStage = 1;
        this.isPausedForClear = false;

        this.dungeon = new DungeonGenerator(100, 100);

        this.physicsSystem = createPhysicsSystem(this.dungeon);
        this.playerSystem = new PlayerSystem();
        this.nightDirector = new NightDirector(this.dungeon);
        this.juicePipeline = new JuicePipeline(this);
        this.combatSystem = createCombatSystem(this.juicePipeline);
        this.spellSystem = new SpellSystem();
        this.itemSystem = new ItemSystem();

        this.spellSystem.selectedCharId = this.selectedCharId;

        this.floorSprite = this.add.tileSprite(0, 0, this.dungeon.width * TILE_SIZE, this.dungeon.height * TILE_SIZE, 'dungeon', 'floor')
            .setOrigin(0, 0)
            .setDepth(-3);

        this.wallBlitter = this.add.blitter(0, 0, 'walls').setDepth(-2);

        this.buildMap(this.currentStage);

        const charBlitter = this.add.blitter(0, 0, 'dungeon').setDepth(0);
        this.renderSystem = createRenderSystem(this, charBlitter);

        this.playerId = addEntity(world);
        addComponent(world, Position, this.playerId);
        addComponent(world, Velocity, this.playerId);
        addComponent(world, Player, this.playerId);
        addComponent(world, SpriteInfo, this.playerId);
        addComponent(world, Animation, this.playerId);
        addComponent(world, Health, this.playerId);

        const startPos = this.dungeon.getRandomFloorPixel();
        Position.x[this.playerId] = startPos.x;
        Position.y[this.playerId] = startPos.y;

        let charTypeId = 1;
        if (this.selectedCharId === 'knight') charTypeId = 0;
        else if (this.selectedCharId === 'elf') charTypeId = 2;

        const charData = CHARACTERS[this.selectedCharId.toUpperCase()] || CHARACTERS.WIZARD;
        SpriteInfo.textureIndex[this.playerId] = charTypeId;
        Animation.frameRate[this.playerId] = 10;
        Health.current[this.playerId] = charData.baseStats.health;
        Health.max[this.playerId] = charData.baseStats.health;

        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('hp_updated', {
                detail: { current: Health.current[this.playerId], max: Health.max[this.playerId] }
            }));
            window.dispatchEvent(new CustomEvent('stage_updated', { detail: this.currentStage }));
        }, 100);

        import('../core/PlayerStats').then(m => {
            m.globalStats.damageMult = charData.baseStats.damage;
        });

        this.cameras.main.setZoom(2.5);
        this.uiScene = this.scene.get('UIScene');

        const soundHandler = ((e: CustomEvent<string>) => {
            if (this.cache.audio.exists(e.detail)) {
                this.sound.play(e.detail, { volume: 0.5 });
            }
        }) as EventListener;
        window.addEventListener('play_sound', soundHandler);

        const comboCastHandler = () => {
        };
        window.addEventListener('combo_cast', comboCastHandler);

        const deathHandler = () => {
            this.time.delayedCall(1000, () => {
                this.scene.pause();
                this.scene.launch('GameOverScene');
            });
        };
        window.addEventListener('player_died', deathHandler);

        const recipeHandler = (e: KeyboardEvent) => {
            if (e.code === 'KeyE') {
                this.scene.pause();
                this.scene.launch('RecipeScene');
            }
        };
        window.addEventListener('keydown', recipeHandler);

        const nextStageHandler = () => {
            this.currentStage++;
            this.isPausedForClear = false;
            this.buildMap(this.currentStage);

            const startPos = this.dungeon.getRandomFloorPixel();
            Position.x[this.playerId] = startPos.x;
            Position.y[this.playerId] = startPos.y;

            this.nightDirector.resetForNextStage(this.currentStage);

            // Restore HP to 100% on new stage
            Health.current[this.playerId] = Health.max[this.playerId];
            window.dispatchEvent(new CustomEvent('hp_updated', {
                detail: { current: Health.current[this.playerId], max: Health.max[this.playerId] }
            }));

            this.startBGM('main_bgm');
            window.dispatchEvent(new CustomEvent('stage_updated', { detail: this.currentStage }));
        };
        window.addEventListener('next_stage', nextStageHandler);

        const stageClearInternalHandler = () => {
            this.isPausedForClear = true;
            Velocity.x[this.playerId] = 0;
            Velocity.y[this.playerId] = 0;
            this.sound.stopAll();
        };
        window.addEventListener('stage_clear', stageClearInternalHandler);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener('play_sound', soundHandler);
            window.removeEventListener('combo_cast', comboCastHandler);
            window.removeEventListener('player_died', deathHandler);
            window.removeEventListener('keydown', recipeHandler);
            window.removeEventListener('next_stage', nextStageHandler);
            window.removeEventListener('stage_clear', stageClearInternalHandler);
        });

        this.startBGM('main_bgm');
        window.addEventListener('boss_spawned', () => this.startBGM('boss_bgm'));

        this.spawnDungeonProps();
        window.dispatchEvent(new CustomEvent('game_started'));
    }

    private buildMap(stage: number) {
        const scale = Math.pow(1.10, Math.max(0, stage - 1));
        const mapW = Math.floor(100 * scale);
        const mapH = Math.floor(100 * scale);

        this.dungeon.width = mapW;
        this.dungeon.height = mapH;
        this.dungeon.generate();

        const wPx = mapW * TILE_SIZE;
        const hPx = mapH * TILE_SIZE;

        this.floorSprite.setSize(wPx, hPx);
        this.cameras.main.setBounds(0, 0, wPx, hPx);

        this.wallBlitter.clear();
        for (let y = 0; y < mapH; y++) {
            for (let x = 0; x < mapW; x++) {
                if (this.dungeon.map[y][x] === TileType.WALL) {
                    let frame = 'wall_top';
                    const bottom = y < mapH - 1 ? this.dungeon.map[y + 1][x] : TileType.WALL;
                    if (bottom === TileType.FLOOR) frame = 'wall_top';
                    else frame = 'wall_inner';

                    this.wallBlitter.create(x * TILE_SIZE, y * TILE_SIZE, frame);
                }
            }
        }
        window.dispatchEvent(new CustomEvent('map_generated', { detail: this.dungeon.map }));
    }

    update(_time: number, delta: number) {
        if (this.isPausedForClear) {
            this.renderSystem(delta);
            return;
        }

        this.nightDirector.update(delta);
        this.playerSystem.update(delta);

        const dX = this.uiScene?.joystick?.vector?.x || 0;
        const dY = this.uiScene?.joystick?.vector?.y || 0;
        if (dX !== 0 || dY !== 0) {
            Velocity.x[this.playerId] = dX * 200;
            Velocity.y[this.playerId] = dY * 200;
        }

        this.spellSystem.update(delta);
        this.physicsSystem(delta);
        this.combatSystem(delta);
        this.itemSystem.update(delta);
        this.renderSystem(delta);
        this.handleInteractions(delta);

        this.cameras.main.centerOn(Position.x[this.playerId], Position.y[this.playerId]);
    }

    private handleInteractions(_dt: number) {
        const px = Position.x[this.playerId];
        const py = Position.y[this.playerId];
        const interactives = defineQuery([Position, SpriteInfo])(world);
        const enemies = defineQuery([Enemy, Position, Health])(world);

        for (let i = 0; i < interactives.length; i++) {
            const eid = interactives[i];
            const typeId = SpriteInfo.textureIndex[eid];
            const dx = px - Position.x[eid];
            const dy = py - Position.y[eid];
            const distSq = dx * dx + dy * dy;

            if (typeId === 40) {
                if (distSq < 40 * 40 && hasComponent(world, Interactive, eid) && Interactive.isActivated[eid] === 0) {
                    Interactive.isActivated[eid] = 1;
                    window.dispatchEvent(new CustomEvent('play_sound', { detail: 'hit' }));
                }
            } else if (typeId === 32) {
                const animIdx = Math.floor(Animation.timer[eid] * 4 / 1000) % 4;
                if (animIdx >= 2) {
                    if (distSq < 20 * 20) {
                        Health.current[this.playerId] -= 0.1;
                        window.dispatchEvent(new CustomEvent('hp_updated', {
                            detail: { current: Health.current[this.playerId], max: Health.max[this.playerId] }
                        }));
                    }
                    for (let j = 0; j < enemies.length; j++) {
                        const en = enemies[j];
                        const edx = Position.x[en] - Position.x[eid];
                        const edy = Position.y[en] - Position.y[eid];
                        if (edx * edx + edy * edy < 20 * 20) {
                            Health.current[en] -= 0.5;
                        }
                    }
                }
            } else if (typeId === 34) {
                if (distSq < 40 * 40 && (!hasComponent(world, Interactive, eid) || Interactive.isActivated[eid] === 0)) {
                    addComponent(world, Interactive, eid);
                    Interactive.isActivated[eid] = 1;

                    this.juicePipeline.screenShake(0.0025, 300);
                    this.juicePipeline.vfx.playFireHit(Position.x[eid], Position.y[eid]);

                    Health.current[this.playerId] -= 30;
                    window.dispatchEvent(new CustomEvent('hp_updated', {
                        detail: { current: Health.current[this.playerId], max: Health.max[this.playerId] }
                    }));
                    window.dispatchEvent(new CustomEvent('play_sound', { detail: 'hit' }));
                    removeEntity(world, eid);
                }
            } else if (typeId === 35) {
                if (distSq < 20 * 20) {
                    Health.current[this.playerId] = Math.min(Health.current[this.playerId] + 40, Health.max[this.playerId]);
                    window.dispatchEvent(new CustomEvent('hp_updated', {
                        detail: { current: Health.current[this.playerId], max: Health.max[this.playerId] }
                    }));
                    window.dispatchEvent(new CustomEvent('play_sound', { detail: 'level_up' }));
                    removeEntity(world, eid);
                }
            } else if (typeId === 36) {
                if (distSq < 30 * 30 && (!hasComponent(world, Interactive, eid) || Interactive.isActivated[eid] === 0)) {
                    addComponent(world, Interactive, eid);
                    Interactive.isActivated[eid] = 1;

                    // Ensure Animation component exists for chest opening frames
                    if (!hasComponent(world, Animation, eid)) {
                        addComponent(world, Animation, eid);
                    }
                    Animation.timer[eid] = 0;

                    // Spawn loot
                    for (let j = 0; j < 5; j++) {
                        const dropId = addEntity(world);
                        addComponent(world, Position, dropId);
                        addComponent(world, Velocity, dropId);
                        addComponent(world, Item, dropId);
                        addComponent(world, SpriteInfo, dropId);
                        Position.x[dropId] = Position.x[eid];
                        Position.y[dropId] = Position.y[eid];
                        Velocity.x[dropId] = (Math.random() - 0.5) * 200;
                        Velocity.y[dropId] = (Math.random() - 0.5) * 200 - 100;
                        Item.xpValue[dropId] = 200;
                        SpriteInfo.textureIndex[dropId] = 20;
                        Item.magnetized[dropId] = 0;
                    }

                    if (Math.random() > 0.5) {
                        const potId = addEntity(world);
                        addComponent(world, Position, potId);
                        addComponent(world, SpriteInfo, potId);
                        Position.x[potId] = Position.x[eid];
                        Position.y[potId] = Position.y[eid] + 16;
                        SpriteInfo.textureIndex[potId] = 35;
                    }

                    window.dispatchEvent(new CustomEvent('play_sound', { detail: 'level_up' }));
                }
            }
        }
    }

    private startBGM(key: string) {
        if (this.currentBGM && this.currentBGM.key === key) return;
        if (this.currentBGM) this.currentBGM.stop();
        if (this.cache.audio.exists(key)) {
            this.currentBGM = this.sound.add(key, { loop: true, volume: 0.3 });
            this.currentBGM.play();
        }
    }

    private spawnDungeonProps() {
        for (let i = 0; i < 80; i++) {
            const eid = addEntity(world);
            addComponent(world, Position, eid);
            addComponent(world, SpriteInfo, eid);
            const pos = this.dungeon.getRandomFloorPixel();
            Position.x[eid] = pos.x;
            Position.y[eid] = pos.y;
            const roll = Math.random();
            if (roll > 0.8) {
                SpriteInfo.textureIndex[eid] = 36;
                addComponent(world, Animation, eid);
                Animation.timer[eid] = 0;
            }
            else if (roll > 0.4) SpriteInfo.textureIndex[eid] = 35;
            else {
                SpriteInfo.textureIndex[eid] = 32;
                addComponent(world, Animation, eid);
                Animation.timer[eid] = Math.random() * 1000;
            }
        }
    }
}
