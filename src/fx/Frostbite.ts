import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Enemy, Position, Velocity, Health } from '../components';
import { SynergyEffect } from '../components/alchemy';
import { world } from '../core/World';

const TICK_FRAMES = 300;
const FREEZE_DURATION_MS = 1500;
const DOT_DURATION_MS = 3000;
const DOT_TICK_MS = 500;
const DOT_PERCENT = 0.01;

const enemyQuery = defineQuery([Enemy, Position, Velocity, Health]);

interface FreezeEntry {
    freezeUntil: number;
    dotUntil: number;
    lastDotAt: number;
}

export class Frostbite {
    private scene: Phaser.Scene;
    private playerEid: number = -1;
    private frameCounter = 0;
    private frozen = new Map<number, FreezeEntry>();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
    }

    tick(): void {
        if (this.playerEid < 0) return;
        if (SynergyEffect.synergyId[this.playerEid] !== 5) return;

        const now = this.scene.time.now;
        const enemies = enemyQuery(world);

        // Apply periodic freeze to nearest enemy
        this.frameCounter++;
        if (this.frameCounter >= TICK_FRAMES) {
            this.frameCounter = 0;

            if (enemies.length > 0) {
                const px = Position.x[this.playerEid];
                const py = Position.y[this.playerEid];
                let nearestEid = enemies[0];
                let nearestDist = Infinity;
                for (const eid of enemies) {
                    const dx = Position.x[eid] - px;
                    const dy = Position.y[eid] - py;
                    const dist = dx * dx + dy * dy;
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestEid = eid;
                    }
                }

                this.frozen.set(nearestEid, {
                    freezeUntil: now + FREEZE_DURATION_MS,
                    dotUntil: now + DOT_DURATION_MS,
                    lastDotAt: now,
                });

                // Visual: small blue square above enemy
                const x = Position.x[nearestEid];
                const y = Position.y[nearestEid];
                const marker = this.scene.add.rectangle(x, y - 12, 16, 16, 0x4fc3f7, 1);
                marker.setDepth(60);
                this.scene.tweens.add({
                    targets: marker,
                    alpha: 0,
                    duration: FREEZE_DURATION_MS,
                    onComplete: () => marker.destroy(),
                });
            }
        }

        // Process frozen/DOT enemies
        for (const [eid, entry] of this.frozen) {
            if (!enemies.includes(eid)) {
                this.frozen.delete(eid);
                continue;
            }

            // Freeze velocity
            if (now < entry.freezeUntil) {
                Velocity.x[eid] = 0;
                Velocity.y[eid] = 0;
            }

            // DOT tick
            if (now < entry.dotUntil && now - entry.lastDotAt >= DOT_TICK_MS) {
                entry.lastDotAt = now;
                Health.current[eid] -= Health.max[eid] * DOT_PERCENT;
            }

            if (now >= entry.dotUntil) {
                this.frozen.delete(eid);
            }
        }
    }
}
