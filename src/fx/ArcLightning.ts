import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Enemy, Position, Health } from '../components';
import { SynergyEffect } from '../components/alchemy';
import { world } from '../core/World';

const DAMAGE = 50;
const CHAIN_RADIUS = 150;
const COOLDOWN_FRAMES = 30;

const enemyQuery = defineQuery([Enemy, Position, Health]);

export class ArcLightning {
    private scene: Phaser.Scene;
    private playerEid: number = -1;
    private cooldownCounter = 0;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
    }

    tick(): void {
        if (this.playerEid < 0) return;
        if (SynergyEffect.synergyId[this.playerEid] !== 9) return;

        if (this.cooldownCounter > 0) {
            this.cooldownCounter--;
            return;
        }

        if (Math.random() > 0.25) return;
        this.cooldownCounter = COOLDOWN_FRAMES;

        const enemies = enemyQuery(world);
        if (enemies.length === 0) return;

        const firstIdx = Math.floor(Math.random() * enemies.length);
        const firstEid = enemies[firstIdx];
        Health.current[firstEid] -= DAMAGE;

        const fx = Position.x[firstEid];
        const fy = Position.y[firstEid];

        // Find nearest chain target
        let chainEid = -1;
        let chainDist = Infinity;
        for (let i = 0; i < enemies.length; i++) {
            if (i === firstIdx) continue;
            const eid = enemies[i];
            const dx = Position.x[eid] - fx;
            const dy = Position.y[eid] - fy;
            const dist = dx * dx + dy * dy;
            if (dist <= CHAIN_RADIUS * CHAIN_RADIUS && dist < chainDist) {
                chainDist = dist;
                chainEid = eid;
            }
        }

        if (chainEid >= 0) {
            Health.current[chainEid] -= DAMAGE;

            // Visual: yellow line between enemies
            const gfx = this.scene.add.graphics();
            gfx.lineStyle(2, 0xffeb3b, 1);
            gfx.beginPath();
            gfx.moveTo(fx, fy);
            gfx.lineTo(Position.x[chainEid], Position.y[chainEid]);
            gfx.strokePath();
            gfx.setDepth(55);
            this.scene.tweens.add({
                targets: gfx,
                alpha: 0,
                duration: 150,
                onComplete: () => gfx.destroy(),
            });
        }
    }
}
