import Phaser from 'phaser';
import { defineQuery, addEntity, addComponent } from 'bitecs';
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
        // Setup ECS Systems
        this.physicsSystem = createPhysicsSystem();
        this.playerSystem = new PlayerSystem();
        this.nightDirector = new NightDirector();
        this.juicePipeline = new JuicePipeline(this);
        this.alchemySystem = new AlchemySystem();
        this.combatSystem = createCombatSystem(this.juicePipeline);
        this.spellSystem = new SpellSystem(this.alchemySystem);
        this.itemSystem = new ItemSystem();
        
        // Pass selection to spell system
        this.spellSystem.selectedCharId = this.selectedCharId;

        this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'dungeon', 'floor')
            .setOrigin(0, 0)
            .setDepth(-2);

        const blitter = this.add.blitter(0, 0, 'dungeon');
        
        // Render System (No Aura)
        this.renderSystem = createRenderSystem(this, blitter);

        // Spawn Player Entity
        this.playerId = addEntity(world);
        addComponent(world, Position, this.playerId);
        addComponent(world, Velocity, this.playerId);
        addComponent(world, Player, this.playerId);
        addComponent(world, SpriteInfo, this.playerId);
        addComponent(world, Animation, this.playerId);
        addComponent(world, Health, this.playerId);

        // START AT CENTER
        Position.x[this.playerId] = WORLD_WIDTH / 2;
        Position.y[this.playerId] = WORLD_HEIGHT / 2;
        
        // Map Selection
        let typeId = 1; // Wizard
        if (this.selectedCharId === 'knight') typeId = 0;
        else if (this.selectedCharId === 'elf') typeId = 2;

        const charData = CHARACTERS[this.selectedCharId.toUpperCase()] || CHARACTERS.WIZARD;

        SpriteInfo.textureIndex[this.playerId] = typeId; 
        Animation.frameStart[this.playerId] = 0;
        Animation.frameEnd[this.playerId] = 3;
        Animation.frameRate[this.playerId] = 10;
        Animation.timer[this.playerId] = 0;

        Health.current[this.playerId] = charData.baseStats.health;
        Health.max[this.playerId] = charData.baseStats.health;
        
        // Fire initial HP event
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

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            if (this.autoQueueIntervalId !== undefined) {
                window.clearInterval(this.autoQueueIntervalId);
                this.autoQueueIntervalId = undefined;
            }
        });

        const soundHandler = ((e: CustomEvent<string>) => {
            if (this.cache.audio.exists(e.detail)) {
                this.sound.play(e.detail, { volume: 0.5 });
            }
        }) as EventListener;

        window.addEventListener('play_sound', soundHandler);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener('play_sound', soundHandler);
        });

        const deathHandler = () => {
            this.time.delayedCall(1000, () => {
                this.scene.pause();
                this.scene.launch('GameOverScene');
            });
        };

        window.addEventListener('player_died', deathHandler);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener('player_died', deathHandler);
        });

        const recipeHandler = (e: KeyboardEvent) => {
            if (e.code === 'KeyE') {
                this.scene.pause();
                this.scene.launch('RecipeScene');
            }
        };
        window.addEventListener('keydown', recipeHandler);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener('keydown', recipeHandler);
        });

        // Endless mode transition listener
        const nextStageHandler = () => {
            console.log("Advancing to next stage...");
            this.nightDirector.resetForNextStage();
            this.startBGM('main_bgm');
        };
        window.addEventListener('next_stage', nextStageHandler);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener('next_stage', nextStageHandler);
        });

        this.startBGM('main_bgm');
        window.addEventListener('boss_spawned', () => this.startBGM('boss_bgm'));
        window.addEventListener('player_died', () => this.stopBGM());
        window.addEventListener('stage_clear', () => this.stopBGM());

        this.spawnDungeonProps();
        
        // Let UI know we're ready
        window.dispatchEvent(new CustomEvent('game_started'));
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

        const px = Position.x[this.playerId];
        const py = Position.y[this.playerId];
        this.cameras.main.centerOn(px, py);
    }

    private handleInteractions(_dt: number) {
        const px = Position.x[this.playerId];
        const py = Position.y[this.playerId];
        const interactives = defineQuery([Position, Interactive])(world);
        
        for (let i = 0; i < interactives.length; i++) {
            const eid = interactives[i];
            const typeId = SpriteInfo.textureIndex[eid];
            const dx = px - Position.x[eid];
            const dy = py - Position.y[eid];
            const distSq = dx * dx + dy * dy;

            if (typeId === 40) { // Lever
                if (distSq < 40 * 40 && Interactive.isActivated[eid] === 0) {
                    Interactive.isActivated[eid] = 1;
                    window.dispatchEvent(new CustomEvent('play_sound', { detail: 'hit' }));
                    for (let j = 0; j < interactives.length; j++) {
                        const target = interactives[j];
                        if (SpriteInfo.textureIndex[target] === 41 && Interactive.id[target] === Interactive.id[eid]) {
                            Interactive.isActivated[target] = 1;
                        }
                    }
                }
            } else if (typeId === 32) { // Spikes
                const animIdx = Math.floor(Animation.timer[eid] * 4 / 1000) % 4;
                if (distSq < 20 * 20 && animIdx >= 2) {
                    Health.current[this.playerId] -= 0.1; 
                    window.dispatchEvent(new CustomEvent('hp_updated', { 
                        detail: { current: Health.current[this.playerId], max: Health.max[this.playerId] } 
                    }));
                }
            } else if (typeId === 34) { // Explosive Barrel
                if (distSq < 40 * 40 && Interactive.isActivated[eid] === 0) {
                    Interactive.isActivated[eid] = 1;
                    this.juicePipeline.whiteFlash(100);
                    this.juicePipeline.screenShake(0.05, 300);
                    Health.current[this.playerId] -= 30; 
                    window.dispatchEvent(new CustomEvent('hp_updated', { 
                        detail: { current: Health.current[this.playerId], max: Health.max[this.playerId] } 
                    }));
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

    private stopBGM() {
        if (this.currentBGM) {
            this.currentBGM.stop();
            this.currentBGM = undefined;
        }
    }

    private spawnDungeonProps() {
        // Random static props
        const propCount = 80;
        for (let i = 0; i < propCount; i++) {
            const eid = addEntity(world);
            addComponent(world, Position, eid);
            addComponent(world, SpriteInfo, eid);
            Position.x[eid] = Math.random() * WORLD_WIDTH;
            Position.y[eid] = Math.random() * WORLD_HEIGHT;
            const roll = Math.random();
            if (roll > 0.8) SpriteInfo.textureIndex[eid] = 30; // crate
            else if (roll > 0.7) SpriteInfo.textureIndex[eid] = 34; // explosive barrel
            else if (roll > 0.6) SpriteInfo.textureIndex[eid] = 31; // skull
            else if (roll > 0.3) SpriteInfo.textureIndex[eid] = 33; // column
            else {
                SpriteInfo.textureIndex[eid] = 32; // spikes
                addComponent(world, Animation, eid);
                Animation.timer[eid] = Math.random() * 1000;
            }
        }

        // Special Treasure Clusters
        for (let i = 0; i < 8; i++) {
            const lx = Math.random() * (WORLD_WIDTH - 400) + 200;
            const ly = Math.random() * (WORLD_HEIGHT - 400) + 200;
            
            // Lever
            const lever = addEntity(world);
            addComponent(world, Position, lever);
            addComponent(world, SpriteInfo, lever);
            addComponent(world, Interactive, lever);
            Position.x[lever] = lx; Position.y[lever] = ly;
            SpriteInfo.textureIndex[lever] = 40;
            Interactive.id[lever] = i;

            // Locked Door
            const door = addEntity(world);
            addComponent(world, Position, door);
            addComponent(world, SpriteInfo, door);
            addComponent(world, Interactive, door);
            Position.x[door] = lx + 120; Position.y[door] = ly;
            SpriteInfo.textureIndex[door] = 41;
            Interactive.id[door] = i;

            // Treasure behind door
            const treasure = addEntity(world);
            addComponent(world, Position, treasure);
            addComponent(world, SpriteInfo, treasure);
            addComponent(world, Item, treasure);
            Position.x[treasure] = lx + 200; Position.y[treasure] = ly;
            SpriteInfo.textureIndex[treasure] = 15; // Elite Treasure
            Item.xpValue[treasure] = 1000;
            Item.magnetized[treasure] = 0;

            // 2 Guards
            for (let g = 0; g < 2; g++) {
                const guard = addEntity(world);
                addComponent(world, Position, guard);
                addComponent(world, Velocity, guard);
                addComponent(world, Health, guard);
                addComponent(world, SpriteInfo, guard);
                addComponent(world, Animation, guard);
                addComponent(world, Enemy, guard);
                Position.x[guard] = lx + 200 + (Math.random() - 0.5) * 60;
                Position.y[guard] = ly + (Math.random() - 0.5) * 60;
                SpriteInfo.textureIndex[guard] = 14; // Elite Orc
                Health.current[guard] = 150; Health.max[guard] = 150;
                Animation.frameRate[guard] = 8;
            }
        }
    }
}
