import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Enemy, Position, Velocity, Health } from '../components';
import { SynergyEffect } from '../components/alchemy';
import { world } from '../core/World';

const RADIUS = 200;
const DAMAGE = 80;
const DAMAGE_TICK_FRAMES = 60;

const enemyQuery = defineQuery([Enemy, Position, Velocity, Health]);

export class Whirlwind {
    private playerEid: number = -1;
    private tickCounter = 0;
    private aura: Phaser.GameObjects.Arc;

    constructor(scene: Phaser.Scene) {
        this.aura = scene.add.circle(0, 0, RADIUS, 0x00bcd4, 0.2);
        this.aura.setDepth(3);
        this.aura.setVisible(false);
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
    }

    tick(): void {
        if (this.playerEid < 0) return;
        const active = SynergyEffect.synergyId[this.playerEid] === 12;
        this.aura.setVisible(active);
        if (!active) return;

        const px = Position.x[this.playerEid];
        const py = Position.y[this.playerEid];
        this.aura.setPosition(px, py);

        this.tickCounter++;
        const doDamage = this.tickCounter >= DAMAGE_TICK_FRAMES;
        if (doDamage) this.tickCounter = 0;

        const enemies = enemyQuery(world);
        for (const eid of enemies) {
            const dx = Position.x[eid] - px;
            const dy = Position.y[eid] - py;
            if (dx * dx + dy * dy <= RADIUS * RADIUS) {
                if (doDamage) {
                    Health.current[eid] -= DAMAGE;
                    // Knockback: flip velocity direction for 1 frame
                    Velocity.x[eid] = -Velocity.x[eid];
                    Velocity.y[eid] = -Velocity.y[eid];
                }
            }
        }
    }

    destroy(): void {
        this.aura.destroy();
    }
}
