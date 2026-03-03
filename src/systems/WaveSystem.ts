import { addEntity, addComponent, defineQuery } from 'bitecs';
import { world } from '../core/World';
import { Animation, Position, Velocity, Health, SpriteInfo, Enemy, Player, Boss } from '../components';

const enemyQuery = defineQuery([Enemy, Position, Velocity]);
const playerQuery = defineQuery([Player, Position]);

export class NightDirector {
    private timeElapsed: number = 0; // ms
    private bossSpawnThreshold = 30000;
    private bossSpawned = false;
    private spawnPauseUntil = 0;
    private bossSpawnPauseDuration = 4000;
    private waveConfig = [
        { time: 0, spawnInterval: 1000, intensity: 1 },
        { time: 60000, spawnInterval: 500, intensity: 2 }, // 1 min (Dawn)
        { time: 300000, spawnInterval: 100, intensity: 3 }, // 5 min (Midnight)
    ];

    private currentWaveIndex: number = 0;
    private lastSpawnTime: number = 0;

    public update(dt: number) {
        this.timeElapsed += dt;

        // Check if wave should advance
        const nextWaveConfig = this.waveConfig[this.currentWaveIndex + 1];
        if (nextWaveConfig && this.timeElapsed >= nextWaveConfig.time) {
            this.currentWaveIndex++;
            console.log(
                `Advancing to wave ${this.currentWaveIndex}, Night Intensity: ${nextWaveConfig.intensity}`,
            );
            // visually update night tint, fog, etc. via events
        }

        const currentWave = this.waveConfig[this.currentWaveIndex];

        if (!this.bossSpawned && this.timeElapsed >= this.bossSpawnThreshold) {
            this.spawnBoss();
            this.bossSpawned = true;
            this.spawnPauseUntil = this.timeElapsed + this.bossSpawnPauseDuration;
            this.lastSpawnTime = this.spawnPauseUntil;
            window.dispatchEvent(new CustomEvent('boss_spawned'));
        }

        // Should we spawn enemies? (Handle bursts)
        if (
            this.timeElapsed >= this.spawnPauseUntil
            && this.timeElapsed - this.lastSpawnTime > currentWave.spawnInterval
        ) {
            // Calculate how many enemies we should have spawned since last time to avoid missing spawns
            const timePassed = this.timeElapsed - this.lastSpawnTime;
            const spawnCount = Math.floor(timePassed / currentWave.spawnInterval);
            
            for (let i = 0; i < spawnCount; i++) {
                this.spawnEnemy(currentWave.intensity);
            }
            this.lastSpawnTime += spawnCount * currentWave.spawnInterval;
        }

        const players = playerQuery(world);
        if (players.length === 0) {
            return;
        }

        const playerEid = players[0];
        const playerX = Position.x[playerEid];
        const playerY = Position.y[playerEid];
        const enemies = enemyQuery(world);

        for (let i = 0; i < enemies.length; i++) {
            const eid = enemies[i];
            const dx = playerX - Position.x[eid];
            const dy = playerY - Position.y[eid];
            const distance = Math.hypot(dx, dy);

            if (distance === 0) {
                Velocity.x[eid] = 0;
                Velocity.y[eid] = 0;
                continue;
            }

            const currentSpeed = Math.hypot(Velocity.x[eid], Velocity.y[eid]);
            const speed = currentSpeed > 0 ? currentSpeed : 50;

            Velocity.x[eid] = (dx / distance) * speed;
            Velocity.y[eid] = (dy / distance) * speed;
        }
    }
    private spawnEnemy(intensity: number) {
        // Find a spawn point edge of camera
        // For now random position around 640, 360 center
        const angle = Math.random() * Math.PI * 2;
        const radius = 800;
        const spawnX = 640 + Math.cos(angle) * radius;
        const spawnY = 360 + Math.sin(angle) * radius;

        const eid = addEntity(world);
        addComponent(world, Position, eid);
        addComponent(world, Velocity, eid);
        addComponent(world, Health, eid);
        addComponent(world, SpriteInfo, eid);
        addComponent(world, Animation, eid);
        addComponent(world, Enemy, eid);

        Position.x[eid] = spawnX;
        Position.y[eid] = spawnY;

        const speed = 50 * intensity;
        Velocity.x[eid] = Math.cos(angle) * speed;
        Velocity.y[eid] = Math.sin(angle) * speed;

        Health.current[eid] = 10 * intensity;
        Health.max[eid] = 10 * intensity;

        // Imp Type ID
        SpriteInfo.textureIndex[eid] = 10;
        Animation.frameStart[eid] = 0;
        Animation.frameEnd[eid] = 3;
        Animation.frameRate[eid] = 8;
        Animation.timer[eid] = 0;
    }

    private spawnBoss() {
        const angle = Math.random() * Math.PI * 2;
        const radius = 900;
        const spawnX = 640 + Math.cos(angle) * radius;
        const spawnY = 360 + Math.sin(angle) * radius;

        const eid = addEntity(world);
        addComponent(world, Position, eid);
        addComponent(world, Velocity, eid);
        addComponent(world, Health, eid);
        addComponent(world, SpriteInfo, eid);
        addComponent(world, Animation, eid);
        addComponent(world, Enemy, eid);
        addComponent(world, Boss, eid);

        Position.x[eid] = spawnX;
        Position.y[eid] = spawnY;

        const speed = 35;
        Velocity.x[eid] = Math.cos(angle) * speed;
        Velocity.y[eid] = Math.sin(angle) * speed;

        Health.current[eid] = 500;
        Health.max[eid] = 500;

        // Demon Type ID
        SpriteInfo.textureIndex[eid] = 11;
        Animation.frameStart[eid] = 0;
        Animation.frameEnd[eid] = 3;
        Animation.frameRate[eid] = 6;
        Animation.timer[eid] = 0;
}

}