import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Enemy, Position, Velocity, Health } from '../components';
import { SynergyEffect } from '../components/alchemy';
import { world } from '../core/World';

const SPAWN_FRAMES = 480;
const ZONE_RADIUS = 80;
const ZONE_DURATION_FRAMES = 180;
const DOT_TICK_FRAMES = 60;
const DOT_PERCENT = 0.02;
const SLOW_FACTOR = 0.5;
const SPAWN_RADIUS = 300;

const enemyQuery = defineQuery([Enemy, Position, Velocity, Health]);

interface MireZone {
    x: number;
    y: number;
    framesLeft: number;
    dotCounter: number;
    gfx: Phaser.GameObjects.Rectangle;
}

export class Mire {
    private scene: Phaser.Scene;
    private playerEid: number = -1;
    private spawnCounter = 0;
    private zones: MireZone[] = [];

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
    }

    tick(): void {
        if (this.playerEid < 0) return;
        if (SynergyEffect.synergyId[this.playerEid] !== 14) return;

        // Spawn new zone periodically
        this.spawnCounter++;
        if (this.spawnCounter >= SPAWN_FRAMES) {
            this.spawnCounter = 0;

            const px = Position.x[this.playerEid];
            const py = Position.y[this.playerEid];
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * SPAWN_RADIUS;
            const zx = px + Math.cos(angle) * dist;
            const zy = py + Math.sin(angle) * dist;

            const gfx = this.scene.add.rectangle(
                zx,
                zy,
                ZONE_RADIUS * 2,
                ZONE_RADIUS * 2,
                0x6d4c41,
                0.4,
            );
            gfx.setDepth(4);
            this.zones.push({ x: zx, y: zy, framesLeft: ZONE_DURATION_FRAMES, dotCounter: 0, gfx });
        }

        const enemies = enemyQuery(world);

        // Update existing zones
        this.zones = this.zones.filter((zone) => {
            zone.framesLeft--;
            if (zone.framesLeft <= 0) {
                zone.gfx.destroy();
                return false;
            }

            zone.dotCounter++;
            const doDot = zone.dotCounter >= DOT_TICK_FRAMES;
            if (doDot) zone.dotCounter = 0;

            for (const eid of enemies) {
                const dx = Position.x[eid] - zone.x;
                const dy = Position.y[eid] - zone.y;
                if (Math.abs(dx) <= ZONE_RADIUS && Math.abs(dy) <= ZONE_RADIUS) {
                    Velocity.x[eid] *= SLOW_FACTOR;
                    Velocity.y[eid] *= SLOW_FACTOR;
                    if (doDot) {
                        Health.current[eid] -= Health.max[eid] * DOT_PERCENT;
                    }
                }
            }
            return true;
        });
    }
}
