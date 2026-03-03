import Phaser from 'phaser';
import { CHARACTERS } from '../constants/CharacterConfig';

export class CharacterSelectScene extends Phaser.Scene {
    constructor() {
        super('CharacterSelectScene');
    }

    create() {
        const { width, height } = this.scale;

        this.add.text(width / 2, 100, 'CHOOSE YOUR ALCHEMIST', {
            fontSize: '48px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const charIds = Object.keys(CHARACTERS);
        const cardWidth = 300;
        const totalWidth = charIds.length * cardWidth + (charIds.length - 1) * 50;
        const startX = (width - totalWidth) / 2 + cardWidth / 2;

        charIds.forEach((id, index) => {
            const char = CHARACTERS[id];
            const x = startX + index * (cardWidth + 50);
            const y = height / 2;

            const card = this.add.rectangle(x, y, cardWidth, 400, 0x1e1e1e, 1)
                .setStrokeStyle(3, 0x444444)
                .setInteractive({ useHandCursor: true });

            this.add.text(x, y - 150, char.name, {
                fontSize: '32px',
                color: '#ffd700',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            const statsText = `HP: ${char.baseStats.health}\nSPD: ${char.baseStats.speed}\nDMG: x${char.baseStats.damage}`;
            this.add.text(x, y + 50, statsText, {
                fontSize: '24px',
                color: '#aaaaaa',
                align: 'center'
            }).setOrigin(0.5);

            card.on('pointerdown', () => {
                this.scene.start('MainScene', { characterId: id });
            });

            card.on('pointerover', () => card.setStrokeStyle(4, 0x00ffff));
            card.on('pointerout', () => card.setStrokeStyle(3, 0x444444));
        });
    }
}
