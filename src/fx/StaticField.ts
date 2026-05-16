import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Enemy, Position, Velocity, Health } from '../components';
import { SynergyEffect } from '../components/alchemy';
import { world } from '../core/World';

const RADIUS = 180;
const DAMAGE = 25;
const TICK_FRAMES = 60;
const PARALYZE_CHANCE = 0.05;
const PARALYZE_DURATION_MS = 500;

const enemyQuery = defineQuery([Enemy, Position, Velocity, Health]);

export class StaticField {
    private scene: Phaser.Scene;
    private playerEid: number = -1;
    private tickCounter = 0;
    private aura: Phaser.GameObjects.Arc;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.aura = scene.add.circle(0, 0, RADIUS, 0xffeb3b, 0.15);
        this.aura.setDepth(3);
        this.aura.setVisible(false);
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
    }

    tick(): void {
        if (this.playerEid < 0) return;
        const active = SynergyEffect.synergyId[this.playerEid] === 16;
        this.aura.setVisible(active);
        if (!active) return;

        const px = Position.x[this.playerEid];
        const py = Position.y[this.playerEid];
        this.aura.setPosition(px, py);

        this.tickCounter++;
        if (this.tickCounter < TICK_FRAMES) return;
        this.tickCounter = 0;

        const enemies = enemyQuery(world);
        for (const eid of enemies) {
            const dx = Position.x[eid] - px;
            const dy = Position.y[eid] - py;
            if (dx * dx + dy * dy <= RADIUS * RADIUS) {
                Health.current[eid] -= DAMAGE;

                if (Math.random() < PARALYZE_CHANCE) {
                    Velocity.x[eid] = 0;
                    Velocity.y[eid] = 0;
                    this.scene.time.delayedCall(PARALYZE_DURATION_MS, () => {
                        // Velocity will naturally resume on next enemy AI tick
                    });
                }
            }
        }
    }

    destroy(): void {
        this.aura.destroy();
    }
}
