import Phaser from 'phaser';

export class UpgradeScene extends Phaser.Scene {
    constructor() {
        super('UpgradeScene');
    }

    create() {
        const { width, height } = this.scale;

        this.add
            .rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
            .setOrigin(0.5, 0.5);

        this.add
            .text(width / 2, 120, 'Choose an Upgrade', {
                fontSize: '42px',
                color: '#ffffff',
            })
            .setOrigin(0.5, 0.5);

        const cards = ['Damage Up', 'Speed Up', 'Radius Up'];
        const cardWidth = 260;
        const cardHeight = 340;
        const cardGap = 40;
        const totalWidth = cards.length * cardWidth + (cards.length - 1) * cardGap;
        const startX = (width - totalWidth) / 2 + cardWidth / 2;
        const cardY = height / 2 + 20;

        cards.forEach((label, index) => {
            const x = startX + index * (cardWidth + cardGap);

            const card = this.add
                .rectangle(x, cardY, cardWidth, cardHeight, 0x1e1e1e, 1)
                .setStrokeStyle(3, 0xffffff, 1)
                .setInteractive({ useHandCursor: true });

            this.add
                .text(x, cardY, label, {
                    fontSize: '30px',
                    color: '#ffffff',
                    align: 'center',
                    wordWrap: { width: cardWidth - 30 },
                })
                .setOrigin(0.5, 0.5);

            card.on('pointerdown', () => {
                this.scene.resume('MainScene');
                this.scene.stop('UpgradeScene');
            });
        });
    }
}
