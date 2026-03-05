import Phaser from 'phaser';
import { CHARACTERS } from '../constants/CharacterConfig';

export class CharacterSelectScene extends Phaser.Scene {
    constructor() {
        super('CharacterSelectScene');
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        // Background Image
        this.add.image(width / 2, height / 2, 'loading_bg')
            .setDisplaySize(width, height)
            .setAlpha(0.6);

        // Ensure selection BGM is playing (especially after retry)
        // Check if ANY instance of select_bgm is currently playing
        const isBgmPlaying = this.sound.getAllPlaying().some(s => s.key === 'select_bgm');

        if (!isBgmPlaying && this.cache.audio.exists('select_bgm')) {
            // Force resume audio context if suspended (common in browsers)
            const soundManager = this.sound as any;
            if (soundManager.context?.state === 'suspended') {
                soundManager.context.resume();
            }
            this.sound.play('select_bgm', { loop: true, volume: 0.4 });
        }




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
