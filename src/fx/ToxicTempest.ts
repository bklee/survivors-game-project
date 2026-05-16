import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Enemy, Position, Velocity, Health } from '../components';
import { SynergyEffect } from '../components/alchemy';
import { world } from '../core/World';

const TICK_FRAMES = 720;
const DAMAGE = 50;
const PARALYZE_DURATION_MS = 1000;
const DOT_DURATION_MS = 3000;
const DOT_TICK_MS = 500;
const DOT_PERCENT = 0.01;

const enemyQuery = defineQuery([Enemy, Position, Velocity, Health]);

interface DotEntry {
    dotUntil: number;
    lastDotAt: number;
}

export class ToxicTempest {
    private scene: Phaser.Scene;
    private playerEid: number = -1;
    private frameCounter = 0;
    private dotMap = new Map<number, DotEntry>();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
    }

    tick(): void {
        if (this.playerEid < 0) return;
        if (SynergyEffect.synergyId[this.playerEid] !== 17) return;

        const now = this.scene.time.now;
        const enemies = enemyQuery(world);

        // Process existing DOTs
        for (const [eid, entry] of this.dotMap) {
            if (!enemies.includes(eid) || now >= entry.dotUntil) {
                this.dotMap.delete(eid);
                continue;
            }
            if (now - entry.lastDotAt >= DOT_TICK_MS) {
                entry.lastDotAt = now;
                Health.current[eid] -= Health.max[eid] * DOT_PERCENT;
            }
        }

        // Periodic global shockwave
        this.frameCounter++;
        if (this.frameCounter < TICK_FRAMES) return;
        this.frameCounter = 0;

        // Visual: full-screen purple flash via large rectangle
        const cam = this.scene.cameras.main;
        const flash = this.scene.add.rectangle(
            cam.scrollX + cam.width / 2,
            cam.scrollY + cam.height / 2,
            cam.width,
            cam.height,
            0x9c27b0,
            0.3,
        );
        flash.setDepth(100);
        flash.setScrollFactor(0);
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 400,
            onComplete: () => flash.destroy(),
        });

        for (const eid of enemies) {
            Health.current[eid] -= DAMAGE;
            // Paralyze
            Velocity.x[eid] = 0;
            Velocity.y[eid] = 0;
            this.scene.time.delayedCall(PARALYZE_DURATION_MS, () => {
                // Velocity resumes via enemy AI
            });
            // Apply DOT
            this.dotMap.set(eid, { dotUntil: now + DOT_DURATION_MS, lastDotAt: now });
        }
    }
}
