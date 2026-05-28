import Phaser from 'phaser';

const RECIPES = [
    { name: 'Fireball', combo: 'FIRE' },
    { name: 'Ice Nova', combo: 'ICE' },
    { name: 'Toxic Cloud', combo: 'POISON' },
    { name: 'Explosive Gas', combo: 'FIRE + POISON' },
    { name: 'Superconduct', combo: 'ICE + LIGHTNING' },
    { name: 'Steam Blast', combo: 'FIRE + ICE' },
    { name: 'Plasma Arc', combo: 'FIRE + LIGHTNING' },
    { name: 'Corrosive Ice', combo: 'ICE + POISON' },
];

export class RecipeScene extends Phaser.Scene {
    constructor() {
        super('RecipeScene');
    }

    create() {
        const { width, height } = this.scale;

        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);

        this.add
            .text(width / 2, 80, 'ALCHEMY ENCYCLOPEDIA', {
                fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
                fontSize: '42px',
                color: '#00ffff',
                fontStyle: 'bold',
            })
            .setOrigin(0.5);

        const startY = 180;
        const col1X = width / 2 - 200;
        const col2X = width / 2 + 50;

        RECIPES.forEach((r, i) => {
            const y = startY + i * 50;
            this.add.text(col1X, y, r.name, {
                fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
                fontSize: '24px',
                color: '#ffd700',
            });
            this.add.text(col2X, y, r.combo, {
                fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
                fontSize: '24px',
                color: '#ffffff',
            });
        });

        const closeBtn = this.add
            .text(width / 2, height - 80, '[ PRESS E OR CLICK TO CLOSE ]', {
                fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
                fontSize: '28px',
                color: '#aaaaaa',
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', () => this.close());
        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-E', () => this.close());
            this.input.keyboard.on('keydown-ESC', () => this.close());
        }
    }

    private close() {
        this.scene.resume('MainScene');
        this.scene.stop('RecipeScene');
    }
}
