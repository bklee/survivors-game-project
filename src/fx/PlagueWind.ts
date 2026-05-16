import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Enemy, Position, Health } from '../components';
import { SynergyEffect } from '../components/alchemy';
import { world } from '../core/World';

const TICK_FRAMES = 480;
const RADIUS = 70;
const DAMAGE = 200;
const NUM_STRIKES = 4;

const enemyQuery = defineQuery([Enemy, Position, Health]);

export class PlagueWind {
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
        if (SynergyEffect.synergyId[this.playerEid] !== 10) return;

        this.frameCounter++;
        if (this.frameCounter < TICK_FRAMES) return;
        this.frameCounter = 0;

        const enemies = enemyQuery(world);
        if (enemies.length === 0) return;

        // Pick 4 random enemy positions as strike centers
        for (let s = 0; s < NUM_STRIKES; s++) {
            const targetEid = enemies[Math.floor(Math.random() * enemies.length)];
            const x = Position.x[targetEid];
            const y = Position.y[targetEid];

            // Visual: green circle explosion
            const flash = this.scene.add.circle(x, y, RADIUS, 0x66bb6a, 0.7);
            flash.setDepth(50);
            this.scene.tweens.add({
                targets: flash,
                alpha: 0,
                duration: 300,
                onComplete: () => flash.destroy(),
            });

            for (const eid of enemies) {
                const dx = Position.x[eid] - x;
                const dy = Position.y[eid] - y;
                if (dx * dx + dy * dy <= RADIUS * RADIUS) {
                    Health.current[eid] -= DAMAGE;
                }
            }
        }
    }
}
