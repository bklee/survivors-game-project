import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Enemy, Position, Velocity, Health } from '../components';
import { SynergyEffect } from '../components/alchemy';
import { world } from '../core/World';

const RADIUS = 180;
const SLOW_FACTOR = 0.6;
const DOT_TICK_FRAMES = 60;
const DOT_PERCENT = 0.015;

const enemyQuery = defineQuery([Enemy, Position, Velocity, Health]);

export class BlightStorm {
    private playerEid: number = -1;
    private dotCounter = 0;
    private aura: Phaser.GameObjects.Arc;

    constructor(scene: Phaser.Scene) {
        this.aura = scene.add.circle(0, 0, RADIUS, 0x9c27b0, 0.15);
        this.aura.setDepth(3);
        this.aura.setVisible(false);
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
    }

    tick(): void {
        if (this.playerEid < 0) return;
        const active = SynergyEffect.synergyId[this.playerEid] === 11;
        this.aura.setVisible(active);
        if (!active) return;

        const px = Position.x[this.playerEid];
        const py = Position.y[this.playerEid];
        this.aura.setPosition(px, py);

        this.dotCounter++;
        const doDot = this.dotCounter >= DOT_TICK_FRAMES;
        if (doDot) this.dotCounter = 0;

        const enemies = enemyQuery(world);
        for (const eid of enemies) {
            const dx = Position.x[eid] - px;
            const dy = Position.y[eid] - py;
            if (dx * dx + dy * dy <= RADIUS * RADIUS) {
                Velocity.x[eid] *= SLOW_FACTOR;
                Velocity.y[eid] *= SLOW_FACTOR;
                if (doDot) {
                    Health.current[eid] -= Health.max[eid] * DOT_PERCENT;
                }
            }
        }
    }

    destroy(): void {
        this.aura.destroy();
    }
}
