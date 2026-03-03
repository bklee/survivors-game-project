import Phaser from 'phaser';

export class VFXSystem {
    private scene: Phaser.Scene;
    private defaultEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;

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
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 300,
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
}
