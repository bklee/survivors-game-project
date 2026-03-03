import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    create() {
        const { width, height } = this.scale;

        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

        this.add.text(width / 2, height / 2 - 50, 'GAME OVER', {
            fontSize: '64px',
            color: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const retryBtn = this.add.rectangle(width / 2, height / 2 + 100, 200, 60, 0xffffff, 0.2)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0xffffff);

        this.add.text(width / 2, height / 2 + 100, 'RETRY', {
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5);

        retryBtn.on('pointerdown', () => {
            window.location.reload(); 
        });

        retryBtn.on('pointerover', () => retryBtn.setFillStyle(0xffffff, 0.4));
        retryBtn.on('pointerout', () => retryBtn.setFillStyle(0xffffff, 0.2));
    }
}
