import { addEntity, addComponent, defineQuery, hasComponent, removeEntity } from 'bitecs';
import { world } from '../core/World';
import { Animation, Position, Velocity, Health, SpriteInfo, Enemy, Player, Boss, EnemyProjectile, Lifespan } from '../components';
import { DungeonGenerator } from '../core/DungeonGenerator';

const enemyQuery = defineQuery([Enemy, Position, Velocity]);
const playerQuery = defineQuery([Player, Position]);

export class NightDirector {
    private timeElapsed: number = 0; // ms
    private bossSpawnThreshold = 30000;
    private bossSpawned = false;
    private spawnPauseUntil = 0;
    private bossSpawnPauseDuration = 4000;
    private bossBarrageTimer: number = 0;
    private globalDifficultyMultiplier = 1.0;
    private waveConfig = [
        { time: 0, spawnInterval: 1000, intensity: 1, maxEnemies: 30 },
        { time: 60000, spawnInterval: 500, intensity: 2, maxEnemies: 70 },
        { time: 300000, spawnInterval: 100, intensity: 3, maxEnemies: 150 },
    ];

    private currentWaveIndex: number = 0;
    private lastSpawnTime: number = 0;
    private dungeon: DungeonGenerator;

    constructor(dungeon: DungeonGenerator) {
        this.dungeon = dungeon;
    }

    public update(dt: number) {
        this.timeElapsed += dt;

        const nextWaveConfig = this.waveConfig[this.currentWaveIndex + 1];
        if (nextWaveConfig && this.timeElapsed >= nextWaveConfig.time) {
            this.currentWaveIndex++;
            console.log(`Advancing to wave ${this.currentWaveIndex}`);
        }

        const currentWave = this.waveConfig[this.currentWaveIndex];

        if (!this.bossSpawned && this.timeElapsed >= this.bossSpawnThreshold) {
            this.spawnBoss();
            this.bossSpawned = true;
            this.spawnPauseUntil = this.timeElapsed + this.bossSpawnPauseDuration;
            this.lastSpawnTime = this.spawnPauseUntil;
            window.dispatchEvent(new CustomEvent('boss_spawned'));
        }

        const enemies = enemyQuery(world);

        if (this.timeElapsed >= this.spawnPauseUntil && this.timeElapsed - this.lastSpawnTime > currentWave.spawnInterval) {
            const timePassed = this.timeElapsed - this.lastSpawnTime;
            const targetSpawnCount = Math.floor(timePassed / currentWave.spawnInterval);
            let actualSpawnCount = targetSpawnCount;

            // Limit spawn count by maxEnemies
            if (enemies.length + actualSpawnCount > currentWave.maxEnemies) {
                actualSpawnCount = Math.max(0, currentWave.maxEnemies - enemies.length);
            }

            for (let i = 0; i < actualSpawnCount; i++) {
                this.spawnEnemy(currentWave.intensity);
            }
            this.lastSpawnTime += targetSpawnCount * currentWave.spawnInterval;
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

        const pos = this.dungeon.getFloorPixelNear(px, py, 500, 1000);
        Position.x[eid] = pos.x;
        Position.y[eid] = pos.y;

        const typeRoll = Math.random();
        let typeId = 10;
        let speed = 60 * intensity * this.globalDifficultyMultiplier;
        let hp = 10 * intensity * this.globalDifficultyMultiplier;

        if (typeRoll > 0.8) { typeId = 12; speed = 40 * intensity * this.globalDifficultyMultiplier; hp = 40 * intensity * this.globalDifficultyMultiplier; }
        else if (typeRoll > 0.5) { typeId = 13; speed = 90 * intensity * this.globalDifficultyMultiplier; hp = 5 * intensity * this.globalDifficultyMultiplier; }

        const angle = Math.random() * Math.PI * 2;
        Velocity.x[eid] = Math.cos(angle) * speed;
        Velocity.y[eid] = Math.sin(angle) * speed;
        Health.current[eid] = hp;
        Health.max[eid] = hp;
        SpriteInfo.textureIndex[eid] = typeId;
        Animation.frameRate[eid] = 8;
        Animation.timer[eid] = 0;
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

        const angle = Math.random() * Math.PI * 2;
        Velocity.x[eid] = Math.cos(angle) * 35;
        Velocity.y[eid] = Math.sin(angle) * 35;
        Health.current[eid] = 500 * this.globalDifficultyMultiplier;
        Health.max[eid] = 500 * this.globalDifficultyMultiplier;
        SpriteInfo.textureIndex[eid] = 11;
        Animation.frameRate[eid] = 6;
        Animation.timer[eid] = 0;
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
            Lifespan.duration[beid] = 1200; // Limits attack to a specific radius range (1.2s * 150 = 180px radius)
            SpriteInfo.textureIndex[beid] = 104;
        }
    }
    public resetForNextStage() {
        console.log("Resetting for next stage... Increasing intensity!");
        this.timeElapsed = 0;
        this.currentWaveIndex = 0;
        this.bossSpawned = false;
        this.spawnPauseUntil = 0;
        this.lastSpawnTime = 0;
        this.globalDifficultyMultiplier += 0.25;

        this.waveConfig.forEach(cfg => {
            cfg.intensity += 1;
            cfg.spawnInterval = Math.max(50, cfg.spawnInterval - 50);
        });

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
