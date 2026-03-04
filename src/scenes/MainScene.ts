import Phaser from 'phaser';
import { defineQuery, addEntity, addComponent, hasComponent, removeEntity } from 'bitecs';
import { world } from '../core/World';
import { Position, Velocity, Player, SpriteInfo, Animation, Health, Interactive, Item, Enemy } from '../components';
import { createPhysicsSystem } from '../systems/PhysicsSystem';
import { createRenderSystem } from '../systems/RenderSystem';
import { PlayerSystem } from '../systems/PlayerSystem';
import { NightDirector } from '../systems/WaveSystem';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../constants/GameConfig';
import { CHARACTERS } from '../constants/CharacterConfig';

import { JuicePipeline } from '../fx/JuicePipeline';
import { AlchemySystem, Element } from '../alchemy/AlchemySystem';
import { createCombatSystem } from '../systems/CombatSystem';
import { SpellSystem } from '../systems/SpellSystem';
import { ItemSystem } from '../systems/ItemSystem';
import { DungeonGenerator, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, TileType } from '../core/DungeonGenerator';

export class MainScene extends Phaser.Scene {
    private physicsSystem!: (dt: number) => void;
    private renderSystem!: (dt: number) => void;
    private playerSystem!: PlayerSystem;
    private nightDirector!: NightDirector;
    private joystick!: VirtualJoystick;
    private playerId!: number;
    private juicePipeline!: JuicePipeline;
    private alchemySystem!: AlchemySystem;
    private combatSystem!: (dt: number) => void;
    private spellSystem!: SpellSystem;
    private itemSystem!: ItemSystem;
    private selectedCharId: string = 'wizard';
    private autoQueueIntervalId?: number;
    private currentBGM?: Phaser.Sound.BaseSound;
    private dungeon!: DungeonGenerator;

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
        // 1. Initialize Dungeon FIRST
        this.dungeon = new DungeonGenerator();

        // 2. Setup ECS Systems
        this.physicsSystem = createPhysicsSystem(this.dungeon);
        this.playerSystem = new PlayerSystem();
        this.nightDirector = new NightDirector(this.dungeon);
        this.juicePipeline = new JuicePipeline(this);
        this.alchemySystem = new AlchemySystem();
        this.combatSystem = createCombatSystem(this.juicePipeline);
        this.spellSystem = new SpellSystem(this.alchemySystem);
        this.itemSystem = new ItemSystem();

        this.spellSystem.selectedCharId = this.selectedCharId;

        // 3. Render Background
        this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'dungeon', 'floor')
            .setOrigin(0, 0)
            .setDepth(-3);

        // 4. Render Walls (Optimized via Blitter)
        const wallBlitter = this.add.blitter(0, 0, 'walls').setDepth(-2);
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (this.dungeon.map[y][x] === TileType.WALL) {
                    let frame = 'wall_top'; // Default
                    const bottom = y < MAP_HEIGHT - 1 ? this.dungeon.map[y + 1][x] : TileType.WALL;
                    if (bottom === TileType.FLOOR) frame = 'wall_top';
                    else frame = 'wall_inner';

                    wallBlitter.create(x * TILE_SIZE, y * TILE_SIZE, frame);
                }
            }
        }

        const charBlitter = this.add.blitter(0, 0, 'dungeon').setDepth(0);
        this.renderSystem = createRenderSystem(this, charBlitter);

        // 5. Spawn Player at valid floor
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
        }, 100);

        import('../core/PlayerStats').then(m => {
            m.globalStats.damageMult = charData.baseStats.damage;
        });

        this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this.cameras.main.setZoom(2.5);

        this.joystick = new VirtualJoystick(this, 150, 600, 50);

        const randomElements: Element[] = [Element.FIRE, Element.ICE, Element.LIGHTNING, Element.POISON];
        this.autoQueueIntervalId = window.setInterval(() => {
            const randomElement = randomElements[Math.floor(Math.random() * randomElements.length)];
            this.alchemySystem.addElement(randomElement);
        }, 1000);

        const soundHandler = ((e: CustomEvent<string>) => {
            if (this.cache.audio.exists(e.detail)) {
                this.sound.play(e.detail, { volume: 0.5 });
            }
        }) as EventListener;
        window.addEventListener('play_sound', soundHandler);

        const comboCastHandler = () => {
            // Reduced Screen Shake Intensity (1/2)
            this.juicePipeline.screenShake(0.00075, 150);
            this.juicePipeline.whiteFlash(50);
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
            this.nightDirector.resetForNextStage();
            this.startBGM('main_bgm');
        };
        window.addEventListener('next_stage', nextStageHandler);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener('play_sound', soundHandler);
            window.removeEventListener('combo_cast', comboCastHandler);
            window.removeEventListener('player_died', deathHandler);
            window.removeEventListener('keydown', recipeHandler);
            window.removeEventListener('next_stage', nextStageHandler);
            if (this.autoQueueIntervalId !== undefined) {
                window.clearInterval(this.autoQueueIntervalId);
            }
        });

        this.startBGM('main_bgm');
        window.addEventListener('boss_spawned', () => this.startBGM('boss_bgm'));

        this.spawnDungeonProps();
        window.dispatchEvent(new CustomEvent('game_started'));
        window.dispatchEvent(new CustomEvent('map_generated', { detail: this.dungeon.map }));
    }

    update(_time: number, delta: number) {
        this.nightDirector.update(delta);
        this.playerSystem.update(delta);

        const dX = this.joystick.vector.x;
        const dY = this.joystick.vector.y;
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
                    for (let j = 0; j < interactives.length; j++) {
                        const target = interactives[j];
                        if (SpriteInfo.textureIndex[target] === 41 && hasComponent(world, Interactive, target) && Interactive.id[target] === Interactive.id[eid]) {
                            Interactive.isActivated[target] = 1;
                        }
                    }
                }
            } else if (typeId === 32) { // Traps
                const animIdx = Math.floor(Animation.timer[eid] * 4 / 1000) % 4;
                if (animIdx >= 2) {
                    if (distSq < 20 * 20) {
                        Health.current[this.playerId] -= 0.1;
                        window.dispatchEvent(new CustomEvent('hp_updated', {
                            detail: { current: Health.current[this.playerId], max: Health.max[this.playerId] }
                        }));
                    }

                    // Trap vs Enemies collision
                    for (let j = 0; j < enemies.length; j++) {
                        const en = enemies[j];
                        const edx = Position.x[en] - Position.x[eid];
                        const edy = Position.y[en] - Position.y[eid];
                        if (edx * edx + edy * edy < 20 * 20) {
                            Health.current[en] -= 0.5; // Drain enemy health over time while standing on trap
                        }
                    }
                }
            } else if (typeId === 34) { // Explosive Barrel
            } else if (typeId === 34) { // Explosive Barrel
                if (distSq < 40 * 40 && (!hasComponent(world, Interactive, eid) || Interactive.isActivated[eid] === 0)) {
                    addComponent(world, Interactive, eid);
                    Interactive.isActivated[eid] = 1;

                    this.juicePipeline.whiteFlash(100);
                    this.juicePipeline.screenShake(0.0025, 300);
                    this.juicePipeline.vfx.playFireHit(Position.x[eid], Position.y[eid]); // Visual cue

                    Health.current[this.playerId] -= 30;
                    window.dispatchEvent(new CustomEvent('hp_updated', {
                        detail: { current: Health.current[this.playerId], max: Health.max[this.playerId] }
                    }));
                    window.dispatchEvent(new CustomEvent('play_sound', { detail: 'hit' }));

                    // Remove explosive barrel after explosion
                    removeEntity(world, eid);
                }
            } else if (typeId === 35) { // Health Potion
                if (distSq < 20 * 20) {
                    this.juicePipeline.whiteFlash(50);
                    Health.current[this.playerId] = Math.min(Health.current[this.playerId] + 40, Health.max[this.playerId]);
                    window.dispatchEvent(new CustomEvent('hp_updated', {
                        detail: { current: Health.current[this.playerId], max: Health.max[this.playerId] }
                    }));
                    window.dispatchEvent(new CustomEvent('play_sound', { detail: 'level_up' }));
                    removeEntity(world, eid);
                }
            } else if (typeId === 36) { // Treasure Chest
                if (distSq < 30 * 30 && (!hasComponent(world, Interactive, eid) || Interactive.isActivated[eid] === 0)) {
                    addComponent(world, Interactive, eid);
                    Interactive.isActivated[eid] = 1;

                    // Spawn 1000 XP
                    const dropId = addEntity(world);
                    addComponent(world, Position, dropId);
                    addComponent(world, Velocity, dropId);
                    addComponent(world, Item, dropId);
                    addComponent(world, SpriteInfo, dropId);
                    Position.x[dropId] = Position.x[eid];
                    Position.y[dropId] = Position.y[eid];
                    Velocity.x[dropId] = 0;
                    Velocity.y[dropId] = -100;
                    Item.xpValue[dropId] = 1500;
                    SpriteInfo.textureIndex[dropId] = 20;
                    Item.magnetized[dropId] = 0;

                    this.juicePipeline.whiteFlash(100);
                    window.dispatchEvent(new CustomEvent('play_sound', { detail: 'level_up' }));

                    // Change chest sprite to "open chest" or simply remove the closed chest
                    removeEntity(world, eid); // Removing it is cleaner for now
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
            if (roll > 0.8) SpriteInfo.textureIndex[eid] = 36; // treasure chest
            else if (roll > 0.4) SpriteInfo.textureIndex[eid] = 35; // health potion
            else {
                SpriteInfo.textureIndex[eid] = 32; // trap
                addComponent(world, Animation, eid);
                Animation.timer[eid] = Math.random() * 1000;
            }
        }
    }
}
