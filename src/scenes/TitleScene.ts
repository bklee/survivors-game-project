import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    create() {
        const { width, height } = this.scale;

        // Background Image becomes the interactive area (since button is in the image)
        const bg = this.add.image(width / 2, height / 2, 'main_bg')
            .setDisplaySize(width, height)
            .setInteractive({ useHandCursor: true });

        // Hover effect: Brighten slightly by setting tint or just scale up slightly
        bg.on('pointerover', () => {
            this.tweens.add({
                targets: bg,
                scale: 1.02,
                duration: 200
            });
        });

        bg.on('pointerout', () => {
            this.tweens.add({
                targets: bg,
                scale: 1.0,
                duration: 200
            });
        });

        bg.on('pointerdown', () => {
            // Click effect: Shrink quickly
            this.tweens.add({
                targets: bg,
                scale: 0.95,
                duration: 100,
                yoyo: true
            });

            if (this.cache.audio.exists('select_bgm')) {
                this.sound.play('select_bgm', { volume: 0.5 }); // Quick sound feedback
            }

            // Unlock audio context
            if ((this.sound as any).context?.state === 'suspended') {
                (this.sound as any).context.resume();
            }

            // Play select BGM if not already playing
            if (!this.sound.get('select_bgm') && this.cache.audio.exists('select_bgm')) {
                this.sound.play('select_bgm', { loop: true, volume: 0.4 });
            }

            // Transition to character select
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('CharacterSelectScene');
            });
        });
    }
}
