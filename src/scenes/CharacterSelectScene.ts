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
                // Resume AudioContext on first user gesture (browser autoplay policy)
                if ((this.sound as any).context?.state === 'suspended') {
                    (this.sound as any).context.resume();
                }
                // Play select BGM on first card interaction if not already playing
                if (!this.sound.get('select_bgm') && this.cache.audio.exists('select_bgm')) {
                    this.sound.play('select_bgm', { loop: true, volume: 0.4 });
                }
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
