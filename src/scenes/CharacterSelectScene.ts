import Phaser from 'phaser';
import { CHARACTERS } from '../constants/CharacterConfig';

export class CharacterSelectScene extends Phaser.Scene {
    constructor() {
        super('CharacterSelectScene');
    }

    create() {
        const { width, height } = this.scale;

        // Background Image
        this.add.image(width / 2, height / 2, 'main_bg')
            .setDisplaySize(width, height)
            .setAlpha(0.6);

        // Medieval Theme Overlay (Start Button Container)
        const overlay = this.add.container(0, 0).setDepth(1000);

        const darkBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
        overlay.add(darkBg);

        // Start Button Graphics
        const btnWidth = 400;
        const btnHeight = 100;
        const btnX = width / 2;
        const btnY = height / 2;

        const btnBg = this.add.rectangle(btnX, btnY, btnWidth, btnHeight, 0x3d2b1f, 1)
            .setStrokeStyle(4, 0xd4af37)
            .setInteractive({ useHandCursor: true });

        const btnText = this.add.text(btnX, btnY, 'START GAME', {
            fontFamily: '"MedievalSharp", cursive',
            fontSize: '48px',
            color: '#ffd700',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        overlay.add([btnBg, btnText]);

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
            this.sound.play('select_bgm', { volume: 0.5 }); // Quick sound feedback

            // Unlock audio context
            if ((this.sound as any).context?.state === 'suspended') {
                (this.sound as any).context.resume();
            }

            // Play select BGM if not already playing
            if (!this.sound.get('select_bgm') && this.cache.audio.exists('select_bgm')) {
                this.sound.play('select_bgm', { loop: true, volume: 0.4 });
            }

            // Fade out everything
            this.tweens.add({
                targets: overlay,
                alpha: 0,
                duration: 600,
                onComplete: () => {
                    overlay.destroy();
                }
            });
        });

        // Title
        this.add.text(width / 2, 100, 'CHOOSE YOUR HERO!', {
            fontFamily: '"MedievalSharp", cursive',
            fontSize: '64px',
            color: '#ffd700',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 8,
            shadow: { offsetX: 2, offsetY: 2, color: '#333', blur: 10, fill: true }
        }).setOrigin(0.5).setDepth(100);

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
