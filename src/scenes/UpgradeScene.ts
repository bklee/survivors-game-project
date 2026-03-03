import Phaser from 'phaser';
import { globalStats } from '../core/PlayerStats';

interface UpgradeOption {
    id: string;
    label: string;
    desc: string;
    apply: () => void;
}

const UPGRADE_POOL: UpgradeOption[] = [
    {
        id: 'dmg_up',
        label: 'Damage Up',
        desc: 'Increases all spell damage by 15%',
        apply: () => { globalStats.damageMult += 0.15; }
    },
    {
        id: 'spd_up',
        label: 'Swiftness',
        desc: 'Increases movement speed by 15%',
        apply: () => { globalStats.moveSpeedMult += 0.15; }
    },
    {
        id: 'cdr_up',
        label: 'Haste',
        desc: 'Reduces spell cooldowns by 10%',
        apply: () => { globalStats.cooldownMult *= 0.9; }
    },
    {
        id: 'magnet_up',
        label: 'Magnetism',
        desc: 'Increases item pickup radius by 25%',
        apply: () => { globalStats.pickupRadiusMult += 0.25; }
    }
];

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

        // Pick 3 random distinct upgrades
        const shuffled = [...UPGRADE_POOL].sort(() => 0.5 - Math.random());
        const selectedOptions = shuffled.slice(0, 3);

        const cardWidth = 260;
        const cardHeight = 340;
        const cardGap = 40;
        const totalWidth = selectedOptions.length * cardWidth + (selectedOptions.length - 1) * cardGap;
        const startX = (width - totalWidth) / 2 + cardWidth / 2;
        const cardY = height / 2 + 20;

        selectedOptions.forEach((option, index) => {
            const x = startX + index * (cardWidth + cardGap);

            const card = this.add
                .rectangle(x, cardY, cardWidth, cardHeight, 0x1e1e1e, 1)
                .setStrokeStyle(3, 0xffffff, 1)
                .setInteractive({ useHandCursor: true });

            this.add
                .text(x, cardY - 50, option.label, {
                    fontSize: '28px',
                    color: '#ffd700',
                    align: 'center',
                    wordWrap: { width: cardWidth - 30 },
                })
                .setOrigin(0.5, 0.5);

            this.add
                .text(x, cardY + 40, option.desc, {
                    fontSize: '20px',
                    color: '#ffffff',
                    align: 'center',
                    wordWrap: { width: cardWidth - 30 },
                })
                .setOrigin(0.5, 0.5);

            card.on('pointerdown', () => {
                option.apply();
                console.log('Stats updated:', globalStats);
                this.scene.resume('MainScene');
                this.scene.stop('UpgradeScene');
            });
            
            // Hover effects
            card.on('pointerover', () => {
                card.setFillStyle(0x3a3a3a, 1);
            });
            card.on('pointerout', () => {
                card.setFillStyle(0x1e1e1e, 1);
            });
        });
    }
}
