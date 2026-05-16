import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Enemy, Position, Health } from '../components';
import { SynergyEffect } from '../components/alchemy';
import { world } from '../core/World';

const RADIUS = 60;
const DAMAGE = 100;
const PROC_CHANCE = 0.25;

const enemyQuery = defineQuery([Enemy, Position, Health]);

export class CinderBurst {
    private scene: Phaser.Scene;
    private playerEid: number = -1;
    private trackedAlive = new Set<number>();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
    }

    tick(): void {
        if (this.playerEid < 0) return;
        const active = SynergyEffect.synergyId[this.playerEid] === 6;

        const enemies = enemyQuery(world);
        const currentEids = new Set<number>();
        for (const eid of enemies) {
            if (Health.current[eid] > 0) currentEids.add(eid);
        }

        if (active) {
            for (const eid of this.trackedAlive) {
                if (!currentEids.has(eid) && Math.random() < PROC_CHANCE) {
                    const x = Position.x[eid];
                    const y = Position.y[eid];

                    // Visual: brown circle particle
                    const flash = this.scene.add.circle(x, y, RADIUS, 0x8d6e63, 1);
                    flash.setDepth(50);
                    this.scene.tweens.add({
                        targets: flash,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => flash.destroy(),
                    });

                    for (const teid of currentEids) {
                        const dx = Position.x[teid] - x;
                        const dy = Position.y[teid] - y;
                        if (dx * dx + dy * dy <= RADIUS * RADIUS) {
                            Health.current[teid] -= DAMAGE;
                        }
                    }
                }
            }
        }
        this.trackedAlive = currentEids;
    }
}
