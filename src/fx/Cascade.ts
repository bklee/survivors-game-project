import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Enemy, Position, Health } from '../components';
import { SynergyEffect } from '../components/alchemy';
import { world } from '../core/World';

const CHAIN_RADIUS = 100;
const DAMAGE_PERCENT = 0.3;

const enemyQuery = defineQuery([Enemy, Position, Health]);

export class Cascade {
    private scene: Phaser.Scene;
    private playerEid: number = -1;
    private trackedAlive = new Map<number, number>(); // eid -> max HP at time of tracking

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
    }

    tick(): void {
        if (this.playerEid < 0) return;
        const active = SynergyEffect.synergyId[this.playerEid] === 19;

        const enemies = enemyQuery(world);
        const currentEids = new Set<number>();
        for (const eid of enemies) {
            if (Health.current[eid] > 0) currentEids.add(eid);
        }

        if (active) {
            for (const [eid, maxHp] of this.trackedAlive) {
                if (!currentEids.has(eid)) {
                    const dx_pos = Position.x[eid];
                    const dy_pos = Position.y[eid];

                    // Visual: orange circle at death position
                    const flash = this.scene.add.circle(dx_pos, dy_pos, 50, 0xff7043, 0.6);
                    flash.setDepth(50);
                    this.scene.tweens.add({
                        targets: flash,
                        alpha: 0,
                        duration: 200,
                        onComplete: () => flash.destroy(),
                    });

                    // Find 1 nearest enemy to chain to
                    let nearestEid = -1;
                    let nearestDist = Infinity;
                    for (const teid of currentEids) {
                        const dx = Position.x[teid] - dx_pos;
                        const dy = Position.y[teid] - dy_pos;
                        const dist = dx * dx + dy * dy;
                        if (dist <= CHAIN_RADIUS * CHAIN_RADIUS && dist < nearestDist) {
                            nearestDist = dist;
                            nearestEid = teid;
                        }
                    }

                    if (nearestEid >= 0) {
                        Health.current[nearestEid] -= maxHp * DAMAGE_PERCENT;
                    }
                }
            }
        }

        // Rebuild tracked map with current enemies and their max HPs
        this.trackedAlive.clear();
        for (const eid of currentEids) {
            this.trackedAlive.set(eid, Health.max[eid]);
        }
    }
}
