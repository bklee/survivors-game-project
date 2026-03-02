import Phaser from 'phaser';

export class VFXSystem {
    private scene: Phaser.Scene;
    private particleManager!: Phaser.GameObjects.Particles.ParticleEmitterManager;
    private defaultEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.initPostFX();
        // Assume 'spark' texture is loaded
        // this.initParticles();
    }

    private initPostFX() {
        // Expose bloom or glitch shortcuts
    }

    private initParticles() {
        this.particleManager = this.scene.add.particles(0, 0, 'spark', {
            speed: { min: -100, max: 100 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 300,
            emitting: false,
        });

        // Example for Phaser 3.60+ which doesn't use `add.particles(x, y, ...)` in the old way
        // Modern approach:
        // this.particleManager = this.scene.add.particles(0, 0, 'spark', {...});
        // We'll trust Phaser API documentation
    }

    public glichScreen(duration: number = 500) {
        const fx = this.scene.cameras.main.postFX?.addGlitch();
        if (fx) {
            this.scene.tweens.add({
                targets: fx,
                reveal: 1,
                duration: duration,
                onComplete: () => this.scene.cameras.main.postFX?.remove(fx),
            });
        }
    }

    public playSparks(x: number, y: number, count: number = 10) {
        if (this.particleManager) {
            this.particleManager.emitParticleAt(x, y, count);
        }
    }
}
