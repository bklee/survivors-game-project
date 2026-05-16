import Phaser from 'phaser';
import { SYNERGIES, ELEMENT_INFO } from '../constants/AlchemyConfig';
import { MetaProgress } from '../core/MetaProgress';

export class CodexScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CodexScene' });
    }

    create() {
        const { width, height } = this.scale;

        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.9);

        const discovered = MetaProgress.load().discoveredSynergies;
        this.add
            .text(width / 2, 40, `시너지 도감  (${discovered.length}/20)`, {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '36px',
                color: '#ffd700',
                fontStyle: 'bold',
            })
            .setOrigin(0.5);

        const cols = 4;
        const cardW = 280;
        const cardH = 110;
        const gap = 12;
        const totalW = cols * cardW + (cols - 1) * gap;
        const startX = (width - totalW) / 2 + cardW / 2;
        const startY = 100 + cardH / 2;

        SYNERGIES.forEach((syn, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const x = startX + col * (cardW + gap);
            const y = startY + row * (cardH + gap);

            const isDiscovered = discovered.includes(syn.id);

            this.add
                .rectangle(x, y, cardW, cardH, isDiscovered ? 0x222244 : 0x111111, 0.85)
                .setStrokeStyle(2, isDiscovered ? 0xffd700 : 0x444444, 0.7);

            if (isDiscovered) {
                const elementIcons = syn.elements.map((e) => ELEMENT_INFO[e].icon).join(' ');
                this.add
                    .text(x, y - 32, elementIcons, {
                        fontSize: '20px',
                    })
                    .setOrigin(0.5);

                this.add
                    .text(x, y - 5, syn.name, {
                        fontFamily: '"MedievalSharp", cursive',
                        fontSize: '18px',
                        color: '#ffd700',
                        fontStyle: 'bold',
                    })
                    .setOrigin(0.5);

                this.add
                    .text(x, y + 28, syn.description, {
                        fontSize: '11px',
                        color: '#cccccc',
                        wordWrap: { width: cardW - 16 },
                        align: 'center',
                    })
                    .setOrigin(0.5);
            } else {
                this.add
                    .text(x, y, '???', {
                        fontSize: '32px',
                        color: '#555555',
                    })
                    .setOrigin(0.5);
            }
        });

        const back = this.add
            .text(width / 2, height - 30, '뒤로 가기', {
                fontSize: '24px',
                color: '#ffffff',
                backgroundColor: '#222222',
                padding: { x: 16, y: 8 },
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        back.on('pointerdown', () => this.scene.start('TitleScene'));
        back.on('pointerover', () => back.setTint(0xffff00));
        back.on('pointerout', () => back.clearTint());
    }
}
