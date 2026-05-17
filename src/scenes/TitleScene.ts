import Phaser from 'phaser';
import { LemonSqueezy } from '../integrations/LemonSqueezy';
import { ApiClient } from '../integrations/ApiClient';

export class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        // Background Image
        this.add.image(width / 2, height / 2, 'main_bg').setDisplaySize(width, height);

        // Home Button (Top Left)
        const homeBtn = this.add
            .text(20, 20, '🏠 Home', {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '24px',
                color: '#ffffff',
                backgroundColor: '#00000088',
                padding: { x: 10, y: 5 },
            })
            .setInteractive({ useHandCursor: true });

        homeBtn.on('pointerdown', () => {
            window.location.href = 'https://games.blocktalker.co.kr/';
        });

        homeBtn.on('pointerover', () => homeBtn.setTint(0xffff00));
        homeBtn.on('pointerout', () => homeBtn.clearTint());

        // 메뉴 레이아웃 — 720px 화면 안에 START + 보조(가로) + IAP 가 들어가도록 재배치.
        const startY = height / 2 + 100;
        const subY = startY + 90; // 가로 묶음 (스킬 트리 + 시너지 도감)
        const iapY = subY + 70; // 광고 제거 (IAP)

        // START Button (메인 액션)
        const startBtn = this.add
            .rectangle(width / 2, startY, 240, 70, 0x3d2b1f, 0.8)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(3, 0xffd700);

        const startText = this.add
            .text(width / 2, startY, 'START', {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '40px',
                color: '#ffffff',
                fontStyle: 'bold',
            })
            .setOrigin(0.5);

        // Pulsing Animation to make it blink/attract attention
        this.tweens.add({
            targets: [startBtn, startText],
            alpha: 0.5,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        startBtn.on('pointerdown', () => {
            if (this.cache.audio.exists('select_bgm')) {
                this.sound.play('select_bgm', { volume: 0.5 }); // Quick sound feedback
            }

            // Unlock audio context
            const soundManager = this.sound as any;
            if (soundManager.context?.state === 'suspended') {
                soundManager.context.resume();
            }

            // Play select BGM if not already playing
            const isPlaying = this.sound.getAllPlaying().some((s) => s.key === 'select_bgm');
            if (!isPlaying && this.cache.audio.exists('select_bgm')) {
                this.sound.play('select_bgm', { loop: true, volume: 0.4 });
            }

            // Transition to character select
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                this.scene.start('CharacterSelectScene');
            });
        });

        // Hover Effects
        startBtn.on('pointerover', () => {
            startBtn.setFillStyle(0x5a4030, 1);
            startBtn.setScale(1.05);
        });
        startBtn.on('pointerout', () => {
            startBtn.setFillStyle(0x3d2b1f, 0.8);
            startBtn.setScale(1);
        });

        // 보조 메뉴 — 가로 묶음 (스킬 트리 + 시너지 도감)
        const subW = 170;
        const subH = 52;
        const subGap = 24;
        const subLeftX = width / 2 - (subW / 2 + subGap / 2);
        const subRightX = width / 2 + (subW / 2 + subGap / 2);

        // SKILL TREE Button (왼쪽)
        const skillBtn = this.add
            .rectangle(subLeftX, subY, subW, subH, 0x1a2b3d, 0.8)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x4db8ff);

        this.add
            .text(subLeftX, subY, '스킬 트리', {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '22px',
                color: '#4db8ff',
                fontStyle: 'bold',
            })
            .setOrigin(0.5);

        skillBtn.on('pointerdown', () => {
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                this.scene.start('SkillTreeScene');
            });
        });
        skillBtn.on('pointerover', () => {
            skillBtn.setFillStyle(0x253d52, 1);
            skillBtn.setScale(1.04);
        });
        skillBtn.on('pointerout', () => {
            skillBtn.setFillStyle(0x1a2b3d, 0.8);
            skillBtn.setScale(1);
        });

        // CODEX Button (오른쪽)
        const codexBtn = this.add
            .rectangle(subRightX, subY, subW, subH, 0x2d1a3d, 0.8)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0xcc88ff);

        this.add
            .text(subRightX, subY, '시너지 도감', {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '22px',
                color: '#cc88ff',
                fontStyle: 'bold',
            })
            .setOrigin(0.5);

        codexBtn.on('pointerdown', () => {
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                this.scene.start('CodexScene');
            });
        });
        codexBtn.on('pointerover', () => {
            codexBtn.setFillStyle(0x3d2552, 1);
            codexBtn.setScale(1.04);
        });
        codexBtn.on('pointerout', () => {
            codexBtn.setFillStyle(0x2d1a3d, 0.8);
            codexBtn.setScale(1);
        });

        // No-Ads Pass 버튼 (보조 메뉴 묶음 아래)
        const hasNoAds = LemonSqueezy.hasProduct('no_ads_pass');
        if (!hasNoAds) {
            ApiClient.trackEvent('iap_funnel_view', { product_id: 'no_ads_pass' });
            const noAdsBtn = this.add
                .rectangle(width / 2, iapY, 280, 44, 0x1e2a3a, 0.85)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(2, 0xffd700);

            this.add
                .text(width / 2, iapY, '광고 제거 ₩2,000', {
                    fontFamily: '"MedievalSharp", cursive',
                    fontSize: '20px',
                    color: '#ffd700',
                })
                .setOrigin(0.5);

            noAdsBtn.on('pointerover', () => {
                noAdsBtn.setFillStyle(0x2e3a4a, 1);
                noAdsBtn.setScale(1.03);
            });
            noAdsBtn.on('pointerout', () => {
                noAdsBtn.setFillStyle(0x1e2a3a, 0.85);
                noAdsBtn.setScale(1);
            });
            noAdsBtn.on('pointerdown', () => {
                ApiClient.trackEvent('iap_funnel_click', { product_id: 'no_ads_pass' });
                void ApiClient.flush(); // 결제 페이지로 이동 전에 강제 flush
                LemonSqueezy.checkout('no_ads_pass');
            });
        } else {
            this.add
                .text(width / 2, iapY, '✦ No-Ads Pass 활성', {
                    fontFamily: '"MedievalSharp", cursive',
                    fontSize: '16px',
                    color: '#888888',
                })
                .setOrigin(0.5);
        }
    }
}
