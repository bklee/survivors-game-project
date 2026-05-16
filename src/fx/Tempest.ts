import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Enemy, Position, Velocity, Health } from '../components';
import { SynergyEffect } from '../components/alchemy';
import { world } from '../core/World';

const TEMPEST_RADIUS = 200;
const SLOW_FACTOR = 0.6;
const CHAIN_TICK_FRAMES = 30;
const CHAIN_DAMAGE = 50;

const enemyQuery = defineQuery([Enemy, Position, Velocity, Health]);

export class Tempest {
    private scene: Phaser.Scene;
    private playerEid: number = -1;
    private chainCounter = 0;
    private aura: Phaser.GameObjects.Arc;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.aura = scene.add.circle(0, 0, TEMPEST_RADIUS, 0x4fc3f7, 0.1);
        this.aura.setDepth(3);
        this.aura.setVisible(false);
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
    }

    tick(): void {
        if (this.playerEid < 0) return;
        const active = SynergyEffect.synergyId[this.playerEid] === 2;
        this.aura.setVisible(active);
        if (!active) return;

        const px = Position.x[this.playerEid];
        const py = Position.y[this.playerEid];
        this.aura.setPosition(px, py);

        this.chainCounter++;
        const doChain = this.chainCounter >= CHAIN_TICK_FRAMES;
        if (doChain) this.chainCounter = 0;

        const now = this.scene.time.now;
        const boostActive = now < SynergyEffect.boostActiveUntil[this.playerEid];
        const damageMul = boostActive ? 2 : 1;

        const enemies = enemyQuery(world);
        for (const eid of enemies) {
            const dx = Position.x[eid] - px;
            const dy = Position.y[eid] - py;
            if (dx * dx + dy * dy <= TEMPEST_RADIUS * TEMPEST_RADIUS) {
                Velocity.x[eid] *= SLOW_FACTOR;
                Velocity.y[eid] *= SLOW_FACTOR;
                if (doChain) {
                    Health.current[eid] -= CHAIN_DAMAGE * damageMul;
                }
            }
        }
    }

    destroy(): void {
        this.aura.destroy();
    }
}
