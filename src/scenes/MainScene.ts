import Phaser from 'phaser';
import { addEntity, addComponent } from 'bitecs';
import { world } from '../core/World';
import { Position, Velocity, Player, SpriteInfo } from '../components';
import { createPhysicsSystem } from '../systems/PhysicsSystem';
import { createRenderSystem } from '../systems/RenderSystem';
import { PlayerSystem } from '../systems/PlayerSystem';
import { NightDirector } from '../systems/WaveSystem';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../constants/GameConfig';

export class MainScene extends Phaser.Scene {
    private physicsSystem!: (dt: number) => void;
    private renderSystem!: () => void;
    private playerSystem!: PlayerSystem;
    private nightDirector!: NightDirector;
    private joystick!: VirtualJoystick;
    private playerId!: number;

    constructor() {
        super('MainScene');
    }

    create() {
        // Setup ECS Systems
        this.physicsSystem = createPhysicsSystem();
        this.playerSystem = new PlayerSystem();
        this.nightDirector = new NightDirector();

        const blitter = this.add.blitter(0, 0, 'dungeon');
        this.renderSystem = createRenderSystem(this, blitter);

        // Spawn Player Entity
        this.playerId = addEntity(world);
        addComponent(world, Position, this.playerId);
        addComponent(world, Velocity, this.playerId);
        addComponent(world, Player, this.playerId);
        addComponent(world, SpriteInfo, this.playerId);

        Position.x[this.playerId] = WORLD_WIDTH / 2;
        Position.y[this.playerId] = WORLD_HEIGHT / 2;
        SpriteInfo.textureIndex[this.playerId] = 85; // White wizard

        // Setup Camera Boundaries
        this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // Visual UI
        this.add
            .text(10, 10, "Alchemist's Night (Runtime active)", {
                fontSize: '24px',
                color: '#ffffff',
            }).setScrollFactor(0); // Pin to camera

        // Add Virtual Joystick at bottom left
        this.joystick = new VirtualJoystick(this, 150, 600, 50);
        // We can't directly use setScrollFactor on complex DOM/Graphic elements easily here,
        // so we will position it correctly or rely on CSS/fixed UI overlay later. 
        // For now let's just leave it.

        console.log("Game started successfully!");
    }

    update(time: number, delta: number) {
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

        this.physicsSystem(delta);
        this.renderSystem();

        // Make camera follow player manually
        this.cameras.main.centerOn(Position.x[this.playerId], Position.y[this.playerId]);
    }
}
