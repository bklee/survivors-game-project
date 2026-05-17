import Phaser from 'phaser';
import { MetaProgress } from '../core/MetaProgress';
import { PokiSDK } from '../integrations/PokiSDK';
import { ApiClient } from '../integrations/ApiClient';
import { I18n } from '../i18n/I18n';

export class GameOverScene extends Phaser.Scene {
    private stage: number = 1;
    private enemiesKilled: number = 0;
    private synergiesActivated: number = 0;

    constructor() {
        super('GameOverScene');
    }

    init(data: { stage?: number; enemiesKilled?: number; synergiesActivated?: number } = {}) {
        this.stage = data.stage ?? 1;
        this.enemiesKilled = data.enemiesKilled ?? 0;
        this.synergiesActivated = data.synergiesActivated ?? 0;
    }

    create() {
        const { width, height } = this.scale;

        // 0. Fade In Effect when scene starts
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        // 0.5 Play Game Over BGM
        if (this.cache.audio.exists('game_over_bgm')) {
            this.sound.play('game_over_bgm', { loop: true, volume: 0.65 });
        }

        // 1. Background Image (game_over.png)
        this.add.image(width / 2, height / 2, 'game_over').setDisplaySize(width, height);

        // 2. Overlay
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.2);

        // 3. 정수 정산
        const baseEssence =
            this.stage * 10 + this.enemiesKilled * 0.5 + this.synergiesActivated * 5;
        const discoveryLevel = MetaProgress.load().skillTree.discovery;
        const discoveryBonus = 1 + discoveryLevel * 0.1;
        const finalEssence = Math.floor(baseEssence * discoveryBonus);

        MetaProgress.addEssence(finalEssence);
        const totalEssence = MetaProgress.load().essence;

        // 4. 정수 획득 표시
        this.add
            .text(
                width / 2,
                height / 2 - 80,
                I18n.t('gameover_essence', { amount: finalEssence, total: totalEssence }),
                {
                    fontFamily: '"MedievalSharp", cursive',
                    fontSize: '32px',
                    color: '#ffd700',
                    align: 'center',
                    stroke: '#000000',
                    strokeThickness: 4,
                },
            )
            .setOrigin(0.5);

        // 5. Retry Button
        const retryBtn = this.add
            .rectangle(width / 2, height / 2 + 150, 240, 70, 0x3d2b1f, 0.8)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(3, 0xffd700);

        this.add
            .text(width / 2, height / 2 + 150, I18n.t('gameover_retry'), {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '40px',
                color: '#ffffff',
                fontStyle: 'bold',
            })
            .setOrigin(0.5);

        retryBtn.on('pointerdown', () => {
            // Stop all sounds including Game Over BGM
            this.sound.stopAll();

            // Fade out and transition
            this.cameras.main.fadeOut(800, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                // To perfectly clear the previous game state (MainScene, UIScene),
                // we stop them explicitly before starting the character select.
                this.scene.stop('MainScene');
                this.scene.stop('UIScene');
                this.scene.start('CharacterSelectScene');
            });
        });

        // Button Hover Effects
        retryBtn.on('pointerover', () => {
            retryBtn.setFillStyle(0x5a4030, 1);
            retryBtn.setScale(1.05);
        });
        retryBtn.on('pointerout', () => {
            retryBtn.setFillStyle(0x3d2b1f, 0.8);
            retryBtn.setScale(1);
        });

        // 6. 부활 버튼 — 광고 보면 부활. 게임당 무한 (매 사망마다 다시 표시).
        const reviveBtn = this.add
            .text(width / 2, height / 2 + 60, I18n.t('gameover_revive_ad'), {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '24px',
                color: '#ffd700',
                backgroundColor: '#333333',
                padding: { x: 16, y: 8 },
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        reviveBtn.on('pointerdown', async () => {
            reviveBtn.disableInteractive();
            const success = await PokiSDK.rewardedBreak();
            ApiClient.trackEvent(success ? 'ad_view' : 'ad_skip', {
                placement: 'revive',
                stage: this.stage,
            });
            if (success) {
                // MainScene 의 player Health 복구 요청 (MainScene 측에서 receiver 처리)
                window.dispatchEvent(new CustomEvent('ad_revive_requested'));
                this.sound.stopAll();
                this.cameras.main.fadeOut(800, 0, 0, 0);
                this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                    this.scene.stop('GameOverScene');
                    this.scene.resume('MainScene');
                });
            } else {
                reviveBtn.setText(I18n.t('upgrade_ad_failed'));
                reviveBtn.setColor('#888888');
            }
        });
    }
}
