import Phaser from 'phaser';

export class JuicePipeline {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public hitStop(durationMS: number) {
        // A simple way to do hit stop is pause updates to specific systems for duration
        // Or pause phaser's internal time temporarily
        this.scene.time.timeScale = 0;
        this.scene.time.delayedCall(durationMS, () => {
            // Wait this doesn't work well if timeScale is 0 because delayedCall uses the same timer.
            // A better way is using native setTimeout or a realtime timer plugin.
            this.scene.time.timeScale = 1;
        });

        // Safe fallback using native setTimeout
        setTimeout(() => {
            this.scene.time.timeScale = 1;
        }, durationMS);
    }

    public screenShake(intensity: number = 0.01, duration: number = 100) {
        this.scene.cameras.main.shake(duration, intensity);
    }

    public whiteFlash(duration: number = 50) {
        this.scene.cameras.main.flash(duration, 255, 255, 255);
    }

    public squashAndStretch(target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image) {
        this.scene.tweens.add({
            targets: target,
            scaleX: target.scaleX * 1.5,
            scaleY: target.scaleY * 0.5,
            duration: 100,
            yoyo: true,
            ease: 'Sine.easeInOut',
        });
    }

    public damageNumber(x: number, y: number, amount: number) {
        // Pooling text objects would be better, but this is a stub
        const text = this.scene.add
            .text(x, y, amount.toString(), {
                fontSize: '24px',
                color: '#ff0000',
                stroke: '#ffffff',
                strokeThickness: 2,
                fontFamily: 'monospace, sans-serif',
                fontStyle: 'bold',
            })
            .setOrigin(0.5);

        this.scene.tweens.add({
            targets: text,
            y: y - 50,
            alpha: 0,
            duration: 800,
            ease: 'Cubic.easeOut',
            onComplete: () => text.destroy(),
        });
    }
}
