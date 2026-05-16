import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Enemy, Health, Position } from '../components';
import { world } from '../core/World';

const SUMMON_EVERY_KILLS = 10;
const ZOMBIE_DURATION_MS = 5000;
const ZOMBIE_DAMAGE = 30;
const ZOMBIE_MOVE_SPEED = 60;

interface Zombie {
    gfx: Phaser.GameObjects.Arc;
    spawnedAt: number;
}

export class NecromancerSystem {
    private scene: Phaser.Scene;
    private playerEid: number = -1;
    private isNecromancer: boolean = false;
    private kills = 0;
    private prevAliveCount = 0;
    private zombies: Zombie[] = [];
    private enemyQuery = defineQuery([Enemy, Health, Position]);

    constructor(scene: Phaser.Scene, isNecromancer: boolean) {
        this.scene = scene;
        this.isNecromancer = isNecromancer;
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
    }

    tick(): void {
        if (!this.isNecromancer || this.playerEid < 0) return;

        const allEnemies = this.enemyQuery(world);
        const aliveEnemies = allEnemies.filter((e) => Health.current[e] > 0);

        // 사망 감지: 이전 프레임 대비 적 수 감소만큼 킬 카운트
        const aliveCount = aliveEnemies.length;
        if (this.prevAliveCount > aliveCount) {
            this.kills += this.prevAliveCount - aliveCount;
        }
        this.prevAliveCount = aliveCount;

        // 좀비 소환
        if (this.kills >= SUMMON_EVERY_KILLS) {
            this.kills = 0;
            this.spawnZombie();
        }

        // 좀비 업데이트: 시간 만료 + 가장 가까운 적 추격 + 충돌 시 데미지
        const now = this.scene.time.now;
        this.zombies = this.zombies.filter((z) => {
            if (now - z.spawnedAt > ZOMBIE_DURATION_MS) {
                z.gfx.destroy();
                return false;
            }

            // 가장 가까운 적 찾아 추격
            let nearestDist2 = Infinity;
            let nearestX = 0;
            let nearestY = 0;
            let hasNearest = false;

            for (const e of aliveEnemies) {
                const dx = Position.x[e] - z.gfx.x;
                const dy = Position.y[e] - z.gfx.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < nearestDist2) {
                    nearestDist2 = d2;
                    nearestX = Position.x[e];
                    nearestY = Position.y[e];
                    hasNearest = true;
                }
            }

            if (hasNearest) {
                const dx = nearestX - z.gfx.x;
                const dy = nearestY - z.gfx.y;
                const dist = Math.sqrt(nearestDist2);
                if (dist < 16) {
                    // 근접 시 데미지
                    for (const e of aliveEnemies) {
                        const ex = Position.x[e] - z.gfx.x;
                        const ey = Position.y[e] - z.gfx.y;
                        if (ex * ex + ey * ey < 16 * 16) {
                            Health.current[e] -= ZOMBIE_DAMAGE * (1 / 60);
                        }
                    }
                } else {
                    z.gfx.x += (dx / dist) * ZOMBIE_MOVE_SPEED * (1 / 60);
                    z.gfx.y += (dy / dist) * ZOMBIE_MOVE_SPEED * (1 / 60);
                }
            }

            return true;
        });
    }

    private spawnZombie(): void {
        const px = Position.x[this.playerEid];
        const py = Position.y[this.playerEid];
        const x = px + (Math.random() - 0.5) * 40;
        const y = py + (Math.random() - 0.5) * 40;
        const gfx = this.scene.add.circle(x, y, 8, 0x6a1b9a, 1);
        gfx.setStrokeStyle(2, 0xb39ddb, 1);
        gfx.setDepth(15);
        this.zombies.push({ gfx, spawnedAt: this.scene.time.now });
    }

    destroy(): void {
        this.zombies.forEach((z) => z.gfx.destroy());
        this.zombies = [];
    }
}
