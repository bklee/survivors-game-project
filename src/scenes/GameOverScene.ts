import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    create() {
        const { width, height } = this.scale;

        // 1. Background Image (game_over.png)
        this.add.image(width / 2, height / 2, 'game_over')
            .setDisplaySize(width, height);

        // 2. Dark Overlay for readability
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);

        // 3. GAME OVER Text
        this.add.text(width / 2, height / 2 - 100, 'GAME OVER', {
            fontFamily: '"MedievalSharp", cursive',
            fontSize: '96px',
            color: '#ff0000',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 10
        }).setOrigin(0.5);

        // 4. Retry Button
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
            this.sound.stopAll();
            window.location.reload();
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
