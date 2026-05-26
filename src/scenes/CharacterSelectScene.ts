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

        // 정수 + 영구 코인 — 우측 상단 위아래 stack. 사용자 요청 한 줄 아래로 (y=30/60 → 60/90).
        this.add
            .text(width - 20, 60, I18n.t('char_select_essence', { amount: myEssence }), {
                fontSize: '20px',
                color: '#aaddff',
                fontStyle: 'bold',
            })
            .setOrigin(1, 0.5)
            .setDepth(100);

        this.add
            .text(width - 20, 90, `🪙 ${meta.coins}`, {
                fontSize: '20px',
                color: '#ffd700',
                fontStyle: 'bold',
            })
            .setOrigin(1, 0.5)
            .setDepth(100);

        const charIds = Object.keys(CHARACTERS);

        // 동적 레이아웃 — 한 줄 최대 cols 개, 마지막 줄은 자동 중앙 정렬.
        // 7 캐릭터 = 첫 줄 4 + 둘째 줄 3 (center). 화면 720px 안에 들어가도록 카드 축소.
        const cardWidth = 200;
        const cardHeight = 260;
        const cols = 4;
        const gapX = 24;
        const gapY = 18;
        const startY = 150 + cardHeight / 2; // 첫 줄 top = 150

        charIds.forEach((id, index) => {
            const char = CHARACTERS[id];
            const row = Math.floor(index / cols);
            const col = index % cols;
            // 이 행의 카드 수 (마지막 행은 nCols 이하)
            const rowCardCount = Math.min(cols, charIds.length - row * cols);
            const rowWidth = rowCardCount * cardWidth + (rowCardCount - 1) * gapX;
            const rowStartX = (width - rowWidth) / 2 + cardWidth / 2;
            const x = rowStartX + col * (cardWidth + gapX);
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

            // 캐릭터 스프라이트 (카드 cardHeight 260 에 맞춰 약간 위로)
            // dwarf 는 atlas 외부 standalone 텍스처 사용
            let sprite: Phaser.GameObjects.Sprite;
            if (char.id === 'dwarf') {
                sprite = this.add
                    .sprite(x, y - 35, 'dwarf_idle_f0')
                    .setScale(2.6)
                    .setDepth(2);
            } else {
                const idleFrame =
                    char.id === 'necromancer' ? 'necromancer_f0' : `${char.id}_idle_0`;
                sprite = this.add
                    .sprite(x, y - 35, 'dungeon', idleFrame)
                    .setScale(2.6)
                    .setDepth(2);
            }

            // tint 설정 — dwarf 는 별도 스프라이트가 있으므로 tint 불필요
            if (char.id === 'necromancer') sprite.setTint(0x9c27b0);
            else if (char.id === 'druid') sprite.setTint(0x4caf50);
            else if (char.id === 'engineer') sprite.setTint(0x607d8b);

            if (!isUnlocked) sprite.setAlpha(0.35);

            // 떠다니는 애니메이션 (해금된 캐릭터만)
            if (isUnlocked) {
                this.tweens.add({
                    targets: sprite,
                    y: y - 45,
                    duration: 1000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
            }

            // 이름 — 카드 상단
            this.add
                .text(x, y - 105, char.name, {
                    fontSize: '20px',
                    color: isUnlocked ? '#ffd700' : '#555555',
                    fontStyle: 'bold',
                })
                .setOrigin(0.5)
                .setDepth(2);

            if (isUnlocked) {
                // 스탯 표시 — 카드 하단
                const statsText = `HP: ${char.baseStats.health}  SPD: ${char.baseStats.speed}\nDMG: ×${char.baseStats.damage}`;
                this.add
                    .text(x, y + 70, statsText, {
                        fontSize: '15px',
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
                        y + 45,
                        I18n.t('char_select_locked', { cost: char.unlockCost ?? '?' }),
                        {
                            fontSize: '17px',
                            color: '#888888',
                        },
                    )
                    .setOrigin(0.5)
                    .setDepth(2);

                if (canAfford) {
                    this.add
                        .text(x, y + 78, I18n.t('char_select_unlock'), {
                            fontSize: '14px',
                            color: '#ffd700',
                        })
                        .setOrigin(0.5)
                        .setDepth(2);
                } else {
                    this.add
                        .text(x, y + 78, I18n.t('char_select_short'), {
                            fontSize: '14px',
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
                    else sprite.clearTint();
                }
            });
        });

        // 디버그 — 모든 캐릭터 unlock. 두 경로 모두 제공:
        // (1) Shift+Q 단축키 (IME isComposing 우회 + code/key 다중 매치)
        // (2) UI 버튼 — 키 입력 차단 환경(한글 IME 등) 대비 보장
        const unlockAll = () => {
            const data = MetaProgress.load();
            for (const id of Object.keys(CHARACTERS)) {
                if (!data.unlockedCharacters.includes(id)) {
                    data.unlockedCharacters.push(id);
                }
            }
            MetaProgress.save(data);
            this.scene.restart();
        };

        // (1) 키 단축키 listener
        const debugHandler = (e: KeyboardEvent) => {
            if (e.isComposing) return; // IME 합성 중 무시
            const isQ = e.code === 'KeyQ' || e.key === 'Q' || e.key === 'q';
            if (isQ && e.shiftKey) {
                unlockAll();
            }
        };
        window.addEventListener('keydown', debugHandler);
        this.events.once('shutdown', () => window.removeEventListener('keydown', debugHandler));

        // (2) UI 버튼 — 우측 상단 essence/coin 아래
        const debugBtn = this.add
            .text(width - 20, 120, '🔓 ALL', {
                fontSize: '14px',
                color: '#ff66cc',
                backgroundColor: '#440022',
                padding: { x: 6, y: 3 },
                fontStyle: 'bold',
            })
            .setOrigin(1, 0.5)
            .setDepth(100)
            .setInteractive({ useHandCursor: true });
        debugBtn.on('pointerdown', () => unlockAll());
    }
}
