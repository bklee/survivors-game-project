import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Enemy, Position, Velocity, Health } from '../components';
import { SynergyEffect } from '../components/alchemy';
import { world } from '../core/World';

const RADIUS = 150;
const DAMAGE = 100;
const DAMAGE_TICK_FRAMES = 60;
const PULL_STRENGTH = 0.5;

const enemyQuery = defineQuery([Enemy, Position, Velocity, Health]);

export class Cyclone {
    private playerEid: number = -1;
    private tickCounter = 0;
    private aura: Phaser.GameObjects.Arc;

    constructor(scene: Phaser.Scene) {
        this.aura = scene.add.circle(0, 0, RADIUS, 0x9e9e9e, 0.2);
        this.aura.setDepth(3);
        this.aura.setVisible(false);
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
    }

    tick(): void {
        if (this.playerEid < 0) return;
        const active = SynergyEffect.synergyId[this.playerEid] === 18;
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
            const distSq = dx * dx + dy * dy;
            if (distSq <= RADIUS * RADIUS) {
                // Pull toward player
                Velocity.x[eid] -= dx * PULL_STRENGTH;
                Velocity.y[eid] -= dy * PULL_STRENGTH;

                if (doDamage) {
                    Health.current[eid] -= DAMAGE;
                }
            }
        }
    }

    destroy(): void {
        this.aura.destroy();
    }
}
