import { addEntity, addComponent, defineQuery, hasComponent, removeEntity } from 'bitecs';
import { world } from '../core/World';
import { Animation, Position, Velocity, Health, SpriteInfo, Enemy, Player, Boss, EnemyProjectile, Lifespan } from '../components';
import { DungeonGenerator } from '../core/DungeonGenerator';

const enemyQuery = defineQuery([Enemy, Position, Velocity]);
const playerQuery = defineQuery([Player, Position]);

export class NightDirector {
    private timeElapsed: number = 0; // ms
    private stage: number = 1;
    private maxEnemiesToSpawn: number = 0;
    private spawnedEnemiesCount: number = 0;
    private stageClearDispatched: boolean = false;
    private bossSpawned: boolean = false;
    private bossBarrageTimer: number = 0;
    private globalDifficultyMultiplier = 1.0;
    private lastSpawnTime: number = 0;
    private dungeon: DungeonGenerator;

    constructor(dungeon: DungeonGenerator) {
        this.dungeon = dungeon;
        this.resetForNextStage(1);
    }

    public update(dt: number) {
        if (this.stageClearDispatched) return;
        this.timeElapsed += dt;

        const isBossStage = this.stage % 3 === 0;

        if (isBossStage && !this.bossSpawned && this.timeElapsed >= 3000) {
            this.spawnBoss();
            this.bossSpawned = true;
            window.dispatchEvent(new CustomEvent('boss_spawned'));
        }

        const enemies = enemyQuery(world);

        // Spawn normal enemies up to maxEnemiesToSpawn
        const spawnInterval = Math.max(200, 1000 - (this.stage * 100));
        let maxConcurrent = 30 + (this.stage * 10);

        if (this.spawnedEnemiesCount < this.maxEnemiesToSpawn && enemies.length < maxConcurrent) {
            if (this.timeElapsed - this.lastSpawnTime > spawnInterval) {
                const intensity = Math.min(3, Math.ceil(this.stage / 2));
                this.spawnEnemy(intensity);
                this.spawnedEnemiesCount++;
                this.lastSpawnTime = this.timeElapsed;
            }
        } else if (this.spawnedEnemiesCount >= this.maxEnemiesToSpawn) {
            if (isBossStage) {
                // Boss stage clear condition: Boss is dead. Boss is marked with Boss component.
                const bosses = defineQuery([Boss])(world);
                if (this.bossSpawned && bosses.length === 0) {
                    this.stageClearDispatched = true;
                    window.dispatchEvent(new CustomEvent('stage_clear'));
                }
            } else {
                // Normal stage clear: all dead
                if (enemies.length === 0) {
                    this.stageClearDispatched = true;
                    window.dispatchEvent(new CustomEvent('stage_clear'));
                }
            }
        }

        const players = playerQuery(world);
        if (players.length === 0) return;
        const playerEid = players[0];
        const playerX = Position.x[playerEid];
        const playerY = Position.y[playerEid];

        const activeEnemies = enemyQuery(world);
        for (let i = 0; i < activeEnemies.length; i++) {
            const eid = activeEnemies[i];
            const dx = playerX - Position.x[eid];
            const dy = playerY - Position.y[eid];
            const distance = Math.hypot(dx, dy);

            if (distance > 0) {
                const currentSpeed = Math.hypot(Velocity.x[eid], Velocity.y[eid]);
                const speed = currentSpeed > 0 ? currentSpeed : 50;
                Velocity.x[eid] = (dx / distance) * speed;
                Velocity.y[eid] = (dy / distance) * speed;
            }

            if (hasComponent(world, Boss, eid)) {
                this.bossBarrageTimer += dt;
                if (this.bossBarrageTimer >= 4000) {
                    this.bossBarrageTimer = 0;
                    this.spawnBarrage(Position.x[eid], Position.y[eid]);
                }
            }
        }
    }

    private getStageEnemyType(): number {
        // 50: Demon, 51: Orc, 52: Skeleton/Undead
        const cycle = (this.stage - 1) % 3;
        if (cycle === 0) return 52; // Stage 1: Undead
        if (cycle === 1) return 51; // Stage 2: Orc
        return 50; // Stage 3: Demon
    }

    private spawnEnemy(intensity: number) {
        const eid = addEntity(world);
        addComponent(world, Position, eid);
        addComponent(world, Velocity, eid);
        addComponent(world, Health, eid);
        addComponent(world, SpriteInfo, eid);
        addComponent(world, Animation, eid);
        addComponent(world, Enemy, eid);

        const players = playerQuery(world);
        let px = 2000;
        let py = 2000;
        if (players.length > 0) {
            px = Position.x[players[0]];
            py = Position.y[players[0]];
        }

        const pos = this.dungeon.getFloorPixelNear(px, py, 400, 800);
        Position.x[eid] = pos.x;
        Position.y[eid] = pos.y;

        const typeId = this.getStageEnemyType();
        let speed = 60 * intensity * this.globalDifficultyMultiplier;
        let hp = 10 * intensity * this.globalDifficultyMultiplier;

        // Stat adjustments based on category
        if (typeId === 51) { speed = 50; hp *= 1.5; } // Orcs: slower but tougher
        else if (typeId === 50) { speed = 70; hp *= 1.2; } // Demons: faster

        const angle = Math.random() * Math.PI * 2;
        Velocity.x[eid] = Math.cos(angle) * speed;
        Velocity.y[eid] = Math.sin(angle) * speed;
        Health.current[eid] = hp;
        Health.max[eid] = hp;
        SpriteInfo.textureIndex[eid] = typeId;
        Animation.frameRate[eid] = 8;
        Animation.timer[eid] = Math.random() * 1000;
    }

    private spawnBoss() {
        const eid = addEntity(world);
        addComponent(world, Position, eid);
        addComponent(world, Velocity, eid);
        addComponent(world, Health, eid);
        addComponent(world, SpriteInfo, eid);
        addComponent(world, Animation, eid);
        addComponent(world, Enemy, eid);
        addComponent(world, Boss, eid);

        const players = playerQuery(world);
        let px = 2000;
        let py = 2000;
        if (players.length > 0) {
            px = Position.x[players[0]];
            py = Position.y[players[0]];
        }

        const pos = this.dungeon.getFloorPixelNear(px, py, 500, 1000);
        Position.x[eid] = pos.x;
        Position.y[eid] = pos.y;

        const typeId = this.getStageEnemyType();
        const angle = Math.random() * Math.PI * 2;
        Velocity.x[eid] = Math.cos(angle) * 35;
        Velocity.y[eid] = Math.sin(angle) * 35;

        let hp = 500 * this.globalDifficultyMultiplier * (this.stage / 3);
        Health.current[eid] = hp;
        Health.max[eid] = hp;
        SpriteInfo.textureIndex[eid] = typeId;
        Animation.frameRate[eid] = 6;
        Animation.timer[eid] = 0;

        // Scale boss size in RenderSystem based on Boss component presence if we had scaling there, 
        // but for now we'll just use the same sprite.
    }


    private spawnBarrage(x: number, y: number) {
        const count = 12;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const beid = addEntity(world);
            addComponent(world, Position, beid);
            addComponent(world, Velocity, beid);
            addComponent(world, EnemyProjectile, beid);
            addComponent(world, SpriteInfo, beid);
            addComponent(world, Lifespan, beid);
            Position.x[beid] = x; Position.y[beid] = y;
            Velocity.x[beid] = Math.cos(angle) * 150;
            Velocity.y[beid] = Math.sin(angle) * 150;
            Lifespan.duration[beid] = 1200;
            SpriteInfo.textureIndex[beid] = 104;
        }
    }

    public resetForNextStage(stage: number = 1) {
        console.log(`Resetting for stage ${stage}... Increasing intensity!`);
        this.stage = stage;
        this.timeElapsed = 0;
        this.bossSpawned = false;
        this.stageClearDispatched = false;
        this.lastSpawnTime = 0;
        this.globalDifficultyMultiplier = 1.0 + ((stage - 1) * 0.25);

        if (this.stage % 3 === 0) {
            this.maxEnemiesToSpawn = 50 * stage;
        } else {
            // Normal stages have reasonable counts
            this.maxEnemiesToSpawn = 20 * stage;
        }
        this.spawnedEnemiesCount = 0;

        const enemies = enemyQuery(world);
        for (let i = 0; i < enemies.length; i++) {
            removeEntity(world, enemies[i]);
        }
        const projectiles = defineQuery([EnemyProjectile, Position])(world);
        for (let i = 0; i < projectiles.length; i++) {
            removeEntity(world, projectiles[i]);
        }
    }
}
