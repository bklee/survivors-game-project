import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Enemy, Position, Velocity, Health } from '../components';
import { SynergyEffect } from '../components/alchemy';
import { world } from '../core/World';

const TICK_FRAMES = 180;
const RADIUS = 80;
const DAMAGE = 180;
const SLOW_DURATION_MS = 500;
const SLOW_FACTOR = 0.5;

const enemyQuery = defineQuery([Enemy, Position, Velocity, Health]);

export class BlizzardStrike {
    private scene: Phaser.Scene;
    private playerEid: number = -1;
    private frameCounter = 0;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
    }

    tick(): void {
        if (this.playerEid < 0) return;
        if (SynergyEffect.synergyId[this.playerEid] !== 7) return;

        this.frameCounter++;
        if (this.frameCounter < TICK_FRAMES) return;
        this.frameCounter = 0;

        const px = Position.x[this.playerEid];
        const py = Position.y[this.playerEid];

        // Visual: large blue circle at player position
        const flash = this.scene.add.circle(px, py, RADIUS, 0x4fc3f7, 0.7);
        flash.setDepth(50);
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 400,
            onComplete: () => flash.destroy(),
        });

        const enemies = enemyQuery(world);
        for (const eid of enemies) {
            const dx = Position.x[eid] - px;
            const dy = Position.y[eid] - py;
            if (dx * dx + dy * dy <= RADIUS * RADIUS) {
                Health.current[eid] -= DAMAGE;
                // Apply slow via tween on a dummy object
                const slowObj = { factor: 1 };
                this.scene.tweens.add({
                    targets: slowObj,
                    factor: SLOW_FACTOR,
                    duration: SLOW_DURATION_MS,
                    onUpdate: () => {
                        Velocity.x[eid] *= SLOW_FACTOR;
                        Velocity.y[eid] *= SLOW_FACTOR;
                    },
                });
            }
        }
    }
}
