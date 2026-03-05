import Phaser from 'phaser';
import { CHARACTERS } from '../constants/CharacterConfig';

export class CharacterSelectScene extends Phaser.Scene {
    constructor() {
        super('CharacterSelectScene');
    }

    create() {
        const { width, height } = this.scale;

        // Medieval Theme Overlay
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.9)
            .setDepth(1000)
            .setInteractive();

        // Add a gold border frame for medieval feel
        const frame = this.add.graphics().setDepth(1001);
        frame.lineStyle(4, 0xd4af37, 1); // Gold color
        frame.strokeRect(width / 2 - 300, height / 2 - 80, 600, 160);

        const enterText = this.add.text(width / 2, height / 2, 'CLICK TO START', {
            fontFamily: '"MedievalSharp", cursive',
            fontSize: '72px',
            color: '#ffd700',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 8,
            shadow: { offsetX: 2, offsetY: 2, color: '#333', blur: 10, fill: true }
        }).setOrigin(0.5).setDepth(1002);

        // Pulsing animation for the text
        this.tweens.add({
            targets: enterText,
            scale: 1.1,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        overlay.on('pointerdown', () => {
            // Unlock audio
            if ((this.sound as any).context?.state === 'suspended') {
                (this.sound as any).context.resume();
            }

            // Play select BGM
            if (this.cache.audio.exists('select_bgm')) {
                this.sound.play('select_bgm', { loop: true, volume: 0.4 });
            }

            // Fade out everything
            this.tweens.add({
                targets: [overlay, enterText, frame],
                alpha: 0,
                duration: 600,
                onComplete: () => {
                    overlay.destroy();
                    enterText.destroy();
                    frame.destroy();
                }
            });
        });
        this.add.text(width / 2, 100, 'CHOOSE YOUR HERO!', {
            fontFamily: '"MedievalSharp", cursive',
            fontSize: '56px',
            color: '#ffd700',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
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

            // Display Character Sprite
            const sprite = this.add.sprite(x, y - 50, 'dungeon', `${char.id}_idle_0`)
                .setScale(4);

            this.tweens.add({
                targets: sprite,
                y: y - 60,
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            this.add.text(x, y - 150, char.name, {
                fontSize: '32px',
                color: '#ffd700',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            const statsText = `HP: ${char.baseStats.health}\nSPD: ${char.baseStats.speed}\nDMG: x${char.baseStats.damage}`;
            this.add.text(x, y + 100, statsText, {
                fontSize: '24px',
                color: '#aaaaaa',
                align: 'center'
            }).setOrigin(0.5);

            card.on('pointerdown', () => {
                this.sound.stopAll(); // Stop selection BGM
                this.scene.start('MainScene', { characterId: id });
            });

            card.on('pointerover', () => {
                card.setStrokeStyle(4, 0x00ffff);
                sprite.setTint(0x00ffff);
            });
            card.on('pointerout', () => {
                card.setStrokeStyle(3, 0x444444);
                sprite.clearTint();
            });
        });
    }
}
