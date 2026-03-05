import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    create() {
        const { width, height } = this.scale;

        // Background Image
        this.add.image(width / 2, height / 2, 'main_bg')
            .setDisplaySize(width, height)
            .setAlpha(1.0);

        // Start Button Graphics
        const btnWidth = 400;
        const btnHeight = 100;
        const btnX = width / 2;
        const btnY = height / 2 + 200; // Position below the center

        const btnBg = this.add.rectangle(btnX, btnY, btnWidth, btnHeight, 0x3d2b1f, 1)
            .setStrokeStyle(4, 0xd4af37)
            .setInteractive({ useHandCursor: true });

        const btnText = this.add.text(btnX, btnY, 'START GAME', {
            fontFamily: '"MedievalSharp", cursive',
            fontSize: '48px',
            color: '#ffd700',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Button Interactions
        btnBg.on('pointerover', () => {
            btnBg.setFillStyle(0x5d4037);
            this.tweens.add({
                targets: btnText,
                scale: 1.1,
                duration: 200
            });
        });

        btnBg.on('pointerout', () => {
            btnBg.setFillStyle(0x3d2b1f);
            this.tweens.add({
                targets: btnText,
                scale: 1.0,
                duration: 200
            });
        });

        btnBg.on('pointerdown', () => {
            // Click effect
            btnBg.setScale(0.95);
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

        // Add a pulsing effect to the button background
        this.tweens.add({
            targets: btnBg,
            alpha: 0.8,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
}
