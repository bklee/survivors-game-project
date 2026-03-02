import Phaser from 'phaser';
import { addEntity, addComponent } from 'bitecs';
import { world } from '../core/World';
import { Position, Velocity, Player, SpriteInfo } from '../components';
import { createPhysicsSystem } from '../systems/PhysicsSystem';
import { createRenderSystem } from '../systems/RenderSystem';
import { PlayerSystem } from '../systems/PlayerSystem';
import { NightDirector } from '../systems/WaveSystem';
import { VirtualJoystick } from '../ui/VirtualJoystick';

export class MainScene extends Phaser.Scene {
    private physicsSystem!: (dt: number) => void;
    private renderSystem!: () => void;
    private playerSystem!: PlayerSystem;
    private nightDirector!: NightDirector;
    private joystick!: VirtualJoystick;

    constructor() {
        super('MainScene');
    }

    create() {
        // We don't need dummy graphics anymore, as we preload 'dungeon' in BootScene

        // Setup ECS Systems
        this.physicsSystem = createPhysicsSystem();
        this.playerSystem = new PlayerSystem();
        this.nightDirector = new NightDirector();

        const blitter = this.add.blitter(0, 0, 'dungeon');
        this.renderSystem = createRenderSystem(this, blitter);

        // Spawn Player Entity
        const playerId = addEntity(world);
        addComponent(world, Position, playerId);
        addComponent(world, Velocity, playerId);
        addComponent(world, Player, playerId);
        addComponent(world, SpriteInfo, playerId);

        Position.x[playerId] = 640;
        Position.y[playerId] = 360;
        // Frame 85 roughly is the white wizard/hero in 0x72 tileset
        SpriteInfo.textureIndex[playerId] = 85;

        // Visual UI
        this.add
            .text(10, 10, "Alchemist's Night (Runtime active)", {
                fontSize: '24px',
                color: '#ffffff',
            });

        // Add Virtual Joystick at bottom left
        this.joystick = new VirtualJoystick(this, 150, 600, 50);

        console.log("Game started successfully!");
    }

    update(time: number, delta: number) {
        // Process Systems
        this.nightDirector.update(delta);
        this.playerSystem.update(delta);

        // Link joystick to player velocity manually for now
        // A proper input system component would be better, but this demonstrates it working
        // Using player eid = 1 (usually is if it's the first entity added)
        // Let's use quick search or assumed eid logic.
        const dX = this.joystick.vector.x;
        const dY = this.joystick.vector.y;

        Velocity.x[1] = dX * 200; // placeholder speed
        Velocity.y[1] = dY * 200;

        this.physicsSystem(delta);
        this.renderSystem();
    }
}
