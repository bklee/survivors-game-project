import Phaser from 'phaser';
import { addEntity, addComponent } from 'bitecs';
import { world } from '../core/World';
import { Position, Velocity, Player, SpriteInfo, Animation, Health } from '../components';
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
            this.selectedCharId = data.characterId;
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

        this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'dungeon', 'floor')
            .setOrigin(0, 0)
            .setDepth(-2);

        const blitter = this.add.blitter(0, 0, 'dungeon');
        const playerAura = this.add.graphics();
        playerAura.fillStyle(0x00ffff, 0.3);
        playerAura.fillCircle(0, 0, 16);
        
        this.renderSystem = createRenderSystem(this, blitter, playerAura);

        // Spawn Player Entity
        this.playerId = addEntity(world);
        addComponent(world, Position, this.playerId);
        addComponent(world, Velocity, this.playerId);
        addComponent(world, Player, this.playerId);
        addComponent(world, SpriteInfo, this.playerId);
        addComponent(world, Animation, this.playerId);
        addComponent(world, Health, this.playerId);

        // Initialize Player based on selection
        const charData = CHARACTERS[this.selectedCharId.toUpperCase()] || CHARACTERS.WIZARD;
        
        let typeId = 1; // Wizard
        if (this.selectedCharId === 'knight') typeId = 0;
        else if (this.selectedCharId === 'elf') typeId = 2;

        SpriteInfo.textureIndex[this.playerId] = typeId; 
        Animation.frameStart[this.playerId] = 0;
        Animation.frameEnd[this.playerId] = 3;
        Animation.frameRate[this.playerId] = 10;
        Animation.timer[this.playerId] = 0;

        Health.current[this.playerId] = charData.baseStats.health;
        Health.max[this.playerId] = charData.baseStats.health;
        
        // Ensure global stats reflect character damage
        import('../core/PlayerStats').then(m => {
            m.globalStats.damageMult = charData.baseStats.damage;
        });
        // Setup Camera Boundaries
        this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this.cameras.main.setZoom(2.5);

        // We migrated UI to UIScene, removing it from here.
        // Add Virtual Joystick at bottom left
        this.joystick = new VirtualJoystick(this, 150, 600, 50);
        // We can't directly use setScrollFactor on complex DOM/Graphic elements easily here,
        // so we will position it correctly or rely on CSS/fixed UI overlay later. 
        // For now let's just leave it.

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

        // Initialize Sound System (BGM)
        this.startBGM('main_bgm');

        window.addEventListener('boss_spawned', () => this.startBGM('boss_bgm'));
        window.addEventListener('player_died', () => this.stopBGM());
        window.addEventListener('stage_clear', () => this.stopBGM());
        this.spawnDungeonProps();
        console.log("Game started successfully!");
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
    }

    update(_time: number, delta: number) {
        // Process Systems
        this.nightDirector.update(delta);
        this.playerSystem.update(delta);

        // Link joystick to player velocity manually for now
        const dX = this.joystick.vector.x;
        const dY = this.joystick.vector.y;

        if (dX !== 0 || dY !== 0) {
            Velocity.x[this.playerId] = dX * 200; // placeholder speed
            Velocity.y[this.playerId] = dY * 200;
        }

        this.spellSystem.update(delta);

        this.physicsSystem(delta);
        this.combatSystem(delta);
        this.itemSystem.update(delta);
        this.renderSystem(delta);

        // Make camera follow player manually
        const px = Position.x[this.playerId];
        const py = Position.y[this.playerId];
        this.cameras.main.centerOn(px, py);
    }
    private startBGM(key: string) {
        if (this.currentBGM && this.currentBGM.key === key) return;
        
        if (this.currentBGM) {
            this.currentBGM.stop();
        }

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
        const propCount = 150;
        for (let i = 0; i < propCount; i++) {
            const eid = addEntity(world);
            addComponent(world, Position, eid);
            addComponent(world, SpriteInfo, eid);
            
            Position.x[eid] = Math.random() * WORLD_WIDTH;
            Position.y[eid] = Math.random() * WORLD_HEIGHT;
            
            const roll = Math.random();
            if (roll > 0.8) {
                SpriteInfo.textureIndex[eid] = 30; // crate
            } else if (roll > 0.6) {
                SpriteInfo.textureIndex[eid] = 31; // skull
            } else if (roll > 0.3) {
                SpriteInfo.textureIndex[eid] = 33; // column
            } else {
                SpriteInfo.textureIndex[eid] = 32; // spikes
                addComponent(world, Animation, eid);
                Animation.timer[eid] = Math.random() * 1000;
            }
        }
    }

}