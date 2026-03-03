import { addEntity, addComponent } from 'bitecs';
import { world } from '../core/World';
import { Position, Velocity, Health, SpriteInfo, Enemy } from '../components';

export class NightDirector {
    private timeElapsed: number = 0; // ms
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

        // Should we spawn enemies? (Handle bursts)
        if (this.timeElapsed - this.lastSpawnTime > currentWave.spawnInterval) {
            // Calculate how many enemies we should have spawned since last time to avoid missing spawns
            const timePassed = this.timeElapsed - this.lastSpawnTime;
            const spawnCount = Math.floor(timePassed / currentWave.spawnInterval);
            
            for (let i = 0; i < spawnCount; i++) {
                this.spawnEnemy(currentWave.intensity);
            }
            this.lastSpawnTime += spawnCount * currentWave.spawnInterval;
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
        addComponent(world, Enemy, eid);

        Position.x[eid] = spawnX;
        Position.y[eid] = spawnY;

        // Walk towards center (simplified)
        const speed = 50 * intensity;
        Velocity.x[eid] = -Math.cos(angle) * speed;
        Velocity.y[eid] = -Math.sin(angle) * speed;

        Health.current[eid] = 10 * intensity;
        Health.max[eid] = 10 * intensity;

        // Roughly frame 109 is a small monster (like a demon or slime) in 0x72
        SpriteInfo.textureIndex[eid] = 109;
    }
}
