import Phaser from 'phaser';
import { addEntity, addComponent } from 'bitecs';
import { world } from '../core/World';
import { Position, Velocity, Player, SpriteInfo, Animation } from '../components';
import { createPhysicsSystem } from '../systems/PhysicsSystem';
import { createRenderSystem } from '../systems/RenderSystem';
import { PlayerSystem } from '../systems/PlayerSystem';
import { NightDirector } from '../systems/WaveSystem';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../constants/GameConfig';

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
    private autoQueueIntervalId?: number;

    constructor() {
        super('MainScene');
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

        Position.x[this.playerId] = WORLD_WIDTH / 2;
        Position.y[this.playerId] = WORLD_HEIGHT / 2;
        
        // Initial frame for Wizard (Type ID: 1)
        SpriteInfo.textureIndex[this.playerId] = 1; 
        Animation.frameStart[this.playerId] = 0;
        Animation.frameEnd[this.playerId] = 3;
        Animation.frameRate[this.playerId] = 8;
        Animation.timer[this.playerId] = 0;
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

        console.log("Game started successfully!");
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
}
