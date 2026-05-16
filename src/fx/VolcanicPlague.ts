import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Enemy, Position, Health } from '../components';
import { SynergyEffect } from '../components/alchemy';
import { world } from '../core/World';

const POISON_PUDDLE_DURATION_MS = 5000;
const POISON_TICK_INTERVAL_MS = 1000;
const POISON_DOT_PERCENT_PER_TICK = 0.08;
const PUDDLE_RADIUS = 60;
const PROC_CHANCE = 0.5;

interface Puddle {
    x: number;
    y: number;
    spawnedAt: number;
    lastTickAt: number;
    gfx: Phaser.GameObjects.Arc;
}

const enemyQuery = defineQuery([Enemy, Position, Health]);

export class VolcanicPlague {
    private scene: Phaser.Scene;
    private playerEid: number = -1;
    private puddles: Puddle[] = [];
    private trackedAlive = new Set<number>();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
    }

    tick(): void {
        if (this.playerEid < 0) return;
        const now = this.scene.time.now;
        const active = SynergyEffect.synergyId[this.playerEid] === 1;

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
                    const gfx = this.scene.add.circle(x, y, PUDDLE_RADIUS, 0x9ccc65, 0.5);
                    gfx.setDepth(5);
                    this.puddles.push({ x, y, spawnedAt: now, lastTickAt: now, gfx });
                }
            }
        }
        this.trackedAlive = currentEids;

        this.puddles = this.puddles.filter((p) => {
            if (now - p.spawnedAt > POISON_PUDDLE_DURATION_MS) {
                p.gfx.destroy();
                return false;
            }
            return true;
        });

        for (const p of this.puddles) {
            if (now - p.lastTickAt < POISON_TICK_INTERVAL_MS) continue;
            p.lastTickAt = now;
            for (const eid of currentEids) {
                const dx = Position.x[eid] - p.x;
                const dy = Position.y[eid] - p.y;
                if (dx * dx + dy * dy <= PUDDLE_RADIUS * PUDDLE_RADIUS) {
                    Health.current[eid] -= Health.max[eid] * POISON_DOT_PERCENT_PER_TICK;
                }
            }
        }
    }
}
