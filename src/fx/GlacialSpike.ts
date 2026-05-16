import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Enemy, Position, Velocity, Health } from '../components';
import { SynergyEffect } from '../components/alchemy';
import { world } from '../core/World';

const TICK_FRAMES = 15;
const DAMAGE = 250;
const SLOW_FACTOR = 0.5;

const enemyQuery = defineQuery([Enemy, Position, Velocity, Health]);

export class GlacialSpike {
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
        if (SynergyEffect.synergyId[this.playerEid] !== 13) return;

        this.frameCounter++;
        if (this.frameCounter < TICK_FRAMES) return;
        this.frameCounter = 0;

        const enemies = enemyQuery(world);
        if (enemies.length === 0) return;

        // Target enemy with highest max HP
        let strongestEid = enemies[0];
        let maxHp = Health.max[enemies[0]];
        for (const eid of enemies) {
            if (Health.max[eid] > maxHp) {
                maxHp = Health.max[eid];
                strongestEid = eid;
            }
        }

        Health.current[strongestEid] -= DAMAGE;
        Velocity.x[strongestEid] *= SLOW_FACTOR;
        Velocity.y[strongestEid] *= SLOW_FACTOR;

        // Visual: blue square marker above enemy
        const x = Position.x[strongestEid];
        const y = Position.y[strongestEid];
        const marker = this.scene.add.rectangle(x, y - 12, 16, 16, 0x82b1ff, 1);
        marker.setDepth(60);
        this.scene.tweens.add({
            targets: marker,
            alpha: 0,
            duration: 200,
            onComplete: () => marker.destroy(),
        });
    }
}
