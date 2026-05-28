import Phaser from 'phaser';

export class LevelUpUI {
    private scene: Phaser.Scene;
    private container!: Phaser.GameObjects.Container;
    private cards: Phaser.GameObjects.Rectangle[] = [];

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.createUI();
    }

    private createUI() {
        this.container = this.scene.add.container(640, 360);
        this.container.setDepth(100);
        this.container.setVisible(false);

        // BG overlay
        const bg = this.scene.add.rectangle(0, 0, 1280, 720, 0x000000, 0.8);
        this.container.add(bg);

        // Cards
        for (let i = 0; i < 3; i++) {
            const cardX = -300 + i * 300;
            const card = this.scene.add.rectangle(cardX, 0, 200, 300, 0x444444);
            card.setStrokeStyle(4, 0xaaaaaa);
            card.setInteractive();

            card.on('pointerdown', () => this.selectCard(i));
            card.on('pointerover', () => card.setStrokeStyle(4, 0xffd700));
            card.on('pointerout', () => card.setStrokeStyle(4, 0xaaaaaa));

            this.cards.push(card);
            this.container.add(card);

            // Add dummy text
            const txt = this.scene.add
                .text(cardX, -100, `Card ${i + 1}`, {
                    fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
                    fontSize: '24px',
                    color: '#fff',
                })
                .setOrigin(0.5);
            this.container.add(txt);
        }
    }

    public show() {
        this.container.setVisible(true);
        // Apply slow mo effect or pause physics, maybe add postfx
        this.scene.cameras.main.postFX?.addBloom(0xffffff, 1, 1, 0.5, 1.2);

        // Tween in cards
        this.cards.forEach((card, i) => {
            card.y = 200;
            card.alpha = 0;
            this.scene.tweens.add({
                targets: card,
                y: 0,
                alpha: 1,
                duration: 400,
                delay: i * 150,
                ease: Phaser.Math.Easing.Back.Out,
            });
        });
    }

    private selectCard(index: number) {
        console.log(`Selected card: ${index}`);
        this.hide();
    }

    public hide() {
        this.container.setVisible(false);
        this.scene.cameras.main.postFX?.clear();
        // Resume game systems
    }
}
