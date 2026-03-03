import Phaser from 'phaser';

export class VFXSystem {
    private scene: Phaser.Scene;
    private defaultEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
    private fireEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
    private iceEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
    private poisonEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.initPostFX();
        if (this.scene.textures.exists('spark')) {
            this.initParticles();
        }
    }

    private initPostFX() {
        // Expose bloom or glitch shortcuts
    }

    private initParticles() {
        this.defaultEmitter = this.scene.add.particles(0, 0, 'spark', {
            speed: { min: -100, max: 100 },
            scale: { start: 0.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 300,
            emitting: false,
        });

        this.fireEmitter = this.scene.add.particles(0, 0, 'spark', {
            speed: { min: 100, max: 200 },
            scale: { start: 0.8, end: 0 },
            tint: 0xff5500,
            blendMode: 'ADD',
            lifespan: 400,
            emitting: false,
        });

        this.iceEmitter = this.scene.add.particles(0, 0, 'spark', {
            speed: { min: 50, max: 100 },
            scale: { start: 0.6, end: 0.2 },
            tint: 0x00ffff,
            alpha: { start: 1, end: 0 },
            lifespan: 500,
            emitting: false,
        });

        this.poisonEmitter = this.scene.add.particles(0, 0, 'spark', {
            speed: { min: 20, max: 80 },
            scale: { start: 1, end: 0 },
            tint: 0x00ff00,
            lifespan: 600,
            emitting: false,
        });
    }

    public glichScreen(duration: number = 500) {
        const postFX = this.scene.cameras.main.postFX as
            | { addGlitch?: () => { reveal: number }; remove: (effect: unknown) => void }
            | undefined;
        const fx = postFX?.addGlitch?.();
        if (fx) {
            this.scene.tweens.add({
                targets: fx,
                reveal: 1,
                duration: duration,
                onComplete: () => postFX?.remove(fx),
            });
        }
    }

    public playSparks(x: number, y: number, count: number = 10) {
        if (this.defaultEmitter) {
            this.defaultEmitter.emitParticleAt(x, y, count);
        }
    }
    public playFireHit(x: number, y: number) { this.fireEmitter?.emitParticleAt(x, y, 15); }
    public playIceHit(x: number, y: number) { this.iceEmitter?.emitParticleAt(x, y, 12); }
    public playPoisonHit(x: number, y: number) { this.poisonEmitter?.emitParticleAt(x, y, 10); }
}
