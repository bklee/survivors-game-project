import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    create() {
        const { width, height } = this.scale;

        // 0. Fade In Effect when scene starts
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        // 0.5 Play Game Over BGM
        if (this.cache.audio.exists('game_over_bgm')) {
            this.sound.play('game_over_bgm', { loop: true, volume: 0.5 });
        }

        // 1. Background Image (game_over.png)
        this.add.image(width / 2, height / 2, 'game_over')
            .setDisplaySize(width, height);

        // 2. Overlay
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.2);

        // 3. Retry Button
        const retryBtn = this.add.rectangle(width / 2, height / 2 + 150, 240, 70, 0x3d2b1f, 0.8)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(3, 0xffd700);

        this.add.text(width / 2, height / 2 + 150, 'RETRY', {
            fontFamily: '"MedievalSharp", cursive',
            fontSize: '40px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        retryBtn.on('pointerdown', () => {
            // Stop all sounds including Game Over BGM
            this.sound.stopAll();

            // Fade out and transition
            this.cameras.main.fadeOut(800, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                // To perfectly clear the previous game state (MainScene, UIScene), 
                // we stop them explicitly before starting the character select.
                this.scene.stop('MainScene');
                this.scene.stop('UIScene');
                this.scene.start('CharacterSelectScene');
            });
        });

        // Button Hover Effects
        retryBtn.on('pointerover', () => {
            retryBtn.setFillStyle(0x5a4030, 1);
            retryBtn.setScale(1.05);
        });
        retryBtn.on('pointerout', () => {
            retryBtn.setFillStyle(0x3d2b1f, 0.8);
            retryBtn.setScale(1);
        });
    }
}
