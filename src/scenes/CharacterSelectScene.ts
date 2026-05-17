import Phaser from 'phaser';
import { CHARACTERS } from '../constants/CharacterConfig';
import { MetaProgress } from '../core/MetaProgress';
import { ApiClient } from '../integrations/ApiClient';
import { I18n } from '../i18n/I18n';

export class CharacterSelectScene extends Phaser.Scene {
    constructor() {
        super('CharacterSelectScene');
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        // Background Image
        this.add
            .image(width / 2, height / 2, 'loading_bg')
            .setDisplaySize(width, height)
            .setAlpha(0.6);

        // Ensure selection BGM is playing (especially after retry)
        const isBgmPlaying = this.sound.getAllPlaying().some((s) => s.key === 'select_bgm');

        if (!isBgmPlaying && this.cache.audio.exists('select_bgm')) {
            const soundManager = this.sound as any;
            if (soundManager.context?.state === 'suspended') {
                soundManager.context.resume();
            }
            this.sound.play('select_bgm', { loop: true, volume: 0.4 });
        }

        // Title
        this.add
            .text(width / 2, 70, I18n.t('char_select_title'), {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '56px',
                color: '#ffd700',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 8,
                shadow: { offsetX: 2, offsetY: 2, color: '#333', blur: 10, fill: true },
            })
            .setOrigin(0.5)
            .setDepth(100);

        const meta = MetaProgress.load();
        const unlockedList = meta.unlockedCharacters;
        const myEssence = meta.essence;

        // 정수 표시
        this.add
            .text(width / 2, 120, I18n.t('char_select_essence', { amount: myEssence }), {
                fontSize: '22px',
                color: '#aaddff',
                fontStyle: 'bold',
            })
            .setOrigin(0.5)
            .setDepth(100);

        const charIds = Object.keys(CHARACTERS);

        // 2-row × 3-col 레이아웃
        const cardWidth = 220;
        const cardHeight = 310;
        const cols = 3;
        const gapX = 28;
        const gapY = 24;
        const totalWidth = cols * cardWidth + (cols - 1) * gapX;
        const startX = (width - totalWidth) / 2 + cardWidth / 2;
        const startY = 160 + cardHeight / 2;

        charIds.forEach((id, index) => {
            const char = CHARACTERS[id];
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * (cardWidth + gapX);
            const y = startY + row * (cardHeight + gapY);

            const isUnlocked = unlockedList.includes(char.id);
            const canAfford =
                !isUnlocked && char.unlockCost !== undefined && myEssence >= char.unlockCost;

            const cardColor = isUnlocked ? 0x1e1e1e : 0x0d0d0d;
            const strokeColor = isUnlocked ? 0x444444 : 0x222222;

            const card = this.add
                .rectangle(x, y, cardWidth, cardHeight, cardColor, 1)
                .setStrokeStyle(3, strokeColor)
                .setInteractive({ useHandCursor: true })
                .setDepth(1);

            // 캐릭터 스프라이트
            const idleFrame = char.id === 'necromancer' ? 'necromancer_f0' : `${char.id}_idle_0`;
            const sprite = this.add
                .sprite(x, y - 50, 'dungeon', idleFrame)
                .setScale(3.0)
                .setDepth(2);

            // tint 설정
            if (char.id === 'necromancer') sprite.setTint(0x9c27b0);
            else if (char.id === 'druid') sprite.setTint(0x4caf50);
            else if (char.id === 'engineer') sprite.setTint(0x607d8b);
            else if (char.id === 'dwarf') sprite.setTint(0x8d6e63);

            if (!isUnlocked) sprite.setAlpha(0.35);

            // 떠다니는 애니메이션 (해금된 캐릭터만)
            if (isUnlocked) {
                this.tweens.add({
                    targets: sprite,
                    y: y - 60,
                    duration: 1000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
            }

            // 이름
            this.add
                .text(x, y - 120, char.name, {
                    fontSize: '22px',
                    color: isUnlocked ? '#ffd700' : '#555555',
                    fontStyle: 'bold',
                })
                .setOrigin(0.5)
                .setDepth(2);

            if (isUnlocked) {
                // 스탯 표시
                const statsText = `HP: ${char.baseStats.health}  SPD: ${char.baseStats.speed}\nDMG: ×${char.baseStats.damage}`;
                this.add
                    .text(x, y + 80, statsText, {
                        fontSize: '17px',
                        color: '#aaaaaa',
                        align: 'center',
                        lineSpacing: 4,
                    })
                    .setOrigin(0.5)
                    .setDepth(2);
            } else {
                // 자물쇠 + 비용
                this.add
                    .text(
                        x,
                        y + 55,
                        I18n.t('char_select_locked', { cost: char.unlockCost ?? '?' }),
                        {
                            fontSize: '19px',
                            color: '#888888',
                        },
                    )
                    .setOrigin(0.5)
                    .setDepth(2);

                if (canAfford) {
                    this.add
                        .text(x, y + 90, I18n.t('char_select_unlock'), {
                            fontSize: '15px',
                            color: '#ffd700',
                        })
                        .setOrigin(0.5)
                        .setDepth(2);
                } else {
                    this.add
                        .text(x, y + 90, I18n.t('char_select_short'), {
                            fontSize: '15px',
                            color: '#554444',
                        })
                        .setOrigin(0.5)
                        .setDepth(2);
                }
            }

            // 포인터 이벤트
            card.on('pointerdown', () => {
                if (isUnlocked) {
                    ApiClient.trackEvent('character_select', { character_id: char.id });
                    this.sound.stopAll();
                    this.scene.start('MainScene', { characterId: id });
                } else if (
                    char.unlockCost !== undefined &&
                    MetaProgress.unlockCharacter(char.id, char.unlockCost)
                ) {
                    this.scene.restart();
                }
            });

            card.on('pointerover', () => {
                if (isUnlocked) {
                    card.setStrokeStyle(4, 0x00ffff);
                    sprite.setTint(0x00ffff);
                } else if (canAfford) {
                    card.setStrokeStyle(4, 0xffd700);
                }
            });

            card.on('pointerout', () => {
                card.setStrokeStyle(3, strokeColor);
                if (isUnlocked) {
                    if (char.id === 'necromancer') sprite.setTint(0x9c27b0);
                    else if (char.id === 'druid') sprite.setTint(0x4caf50);
                    else if (char.id === 'engineer') sprite.setTint(0x607d8b);
                    else if (char.id === 'dwarf') sprite.setTint(0x8d6e63);
                    else sprite.clearTint();
                }
            });
        });
    }
}
