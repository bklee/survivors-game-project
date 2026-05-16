import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Enemy, Position, Health } from '../components';
import { SynergyEffect } from '../components/alchemy';
import { world } from '../core/World';

const RADIUS = 120;
const DOT_PERCENT = 0.02;
const DOT_TICK_FRAMES = 60;

const enemyQuery = defineQuery([Enemy, Position, Health]);

export class MagmaField {
    private playerEid: number = -1;
    private dotCounter = 0;
    private aura: Phaser.GameObjects.Arc;

    constructor(scene: Phaser.Scene) {
        this.aura = scene.add.circle(0, 0, RADIUS, 0xff4500, 0.15);
        this.aura.setDepth(3);
        this.aura.setVisible(false);
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
    }

    tick(): void {
        if (this.playerEid < 0) return;
        const active = SynergyEffect.synergyId[this.playerEid] === 8;
        this.aura.setVisible(active);
        if (!active) return;

        const px = Position.x[this.playerEid];
        const py = Position.y[this.playerEid];
        this.aura.setPosition(px, py);

        this.dotCounter++;
        if (this.dotCounter < DOT_TICK_FRAMES) return;
        this.dotCounter = 0;

        const enemies = enemyQuery(world);
        for (const eid of enemies) {
            const dx = Position.x[eid] - px;
            const dy = Position.y[eid] - py;
            if (dx * dx + dy * dy <= RADIUS * RADIUS) {
                Health.current[eid] -= Health.max[eid] * DOT_PERCENT;
            }
        }
    }

    destroy(): void {
        this.aura.destroy();
    }
}
