import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { world } from '../core/World';
import { Position, Health, Enemy } from '../components';
import { SynergyEffect } from '../components/alchemy';

const TICK_FRAMES = 30;
const DAMAGE_BASE = 300;
const RADIUS = 80;

const enemyQuery = defineQuery([Enemy, Position, Health]);

export class PlasmaStorm {
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
        if (SynergyEffect.synergyId[this.playerEid] !== 0) return;

        this.frameCounter++;
        if (this.frameCounter < TICK_FRAMES) return;
        this.frameCounter = 0;

        const enemies = enemyQuery(world);
        if (enemies.length === 0) return;

        const targetIdx = Math.floor(Math.random() * enemies.length);
        const targetEid = enemies[targetIdx];
        const x = Position.x[targetEid];
        const y = Position.y[targetEid];

        const now = this.scene.time.now;
        const boostActive = now < SynergyEffect.boostActiveUntil[this.playerEid];
        const damage = boostActive ? DAMAGE_BASE * 2 : DAMAGE_BASE;

        const flash = this.scene.add.circle(x, y, RADIUS, 0xffee58, 0.6);
        flash.setDepth(50);
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 200,
            onComplete: () => flash.destroy(),
        });

        for (let i = 0; i < enemies.length; i++) {
            const eid = enemies[i];
            const dx = Position.x[eid] - x;
            const dy = Position.y[eid] - y;
            if (dx * dx + dy * dy <= RADIUS * RADIUS) {
                Health.current[eid] -= damage;
            }
        }
    }
}
