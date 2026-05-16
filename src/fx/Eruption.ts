import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Enemy, Position, Health } from '../components';
import { SynergyEffect } from '../components/alchemy';
import { world } from '../core/World';

const TICK_FRAMES = 300;
const DAMAGE_BASE = 200;
const RADIUS = 100;

const enemyQuery = defineQuery([Enemy, Position, Health]);

export class Eruption {
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
        if (SynergyEffect.synergyId[this.playerEid] !== 3) return;

        this.frameCounter++;
        if (this.frameCounter < TICK_FRAMES) return;
        this.frameCounter = 0;

        const enemies = enemyQuery(world);
        if (enemies.length === 0) return;

        const targetEid = enemies[Math.floor(Math.random() * enemies.length)];
        const x = Position.x[targetEid];
        const y = Position.y[targetEid];

        const now = this.scene.time.now;
        const boostActive = now < SynergyEffect.boostActiveUntil[this.playerEid];
        const damage = boostActive ? DAMAGE_BASE * 2 : DAMAGE_BASE;

        const flash = this.scene.add.circle(x, y, RADIUS, 0x8d6e63, 0.6);
        flash.setDepth(50);
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 300,
            onComplete: () => flash.destroy(),
        });

        for (const eid of enemies) {
            const dx = Position.x[eid] - x;
            const dy = Position.y[eid] - y;
            if (dx * dx + dy * dy <= RADIUS * RADIUS) {
                Health.current[eid] -= damage;
            }
        }
    }
}
