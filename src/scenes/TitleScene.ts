import Phaser from 'phaser';
import { I18n } from '../i18n/I18n';
import { ApiClient } from '../integrations/ApiClient';

export class TitleScene extends Phaser.Scene {
    private dailyRewardChecked = false;

    constructor() {
        super('TitleScene');
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        // Daily Reward 상태 조회 → can_claim 이면 모달 자동 표시 (fire-and-forget)
        // restart() 시 중복 호출 방지를 위해 dailyRewardChecked 플래그 사용.
        if (!this.dailyRewardChecked) {
            this.dailyRewardChecked = true;
            this.checkDailyReward();
        }

        // Background Image — 미세한 줌 & 패닝
        const bg = this.add.image(width / 2, height / 2, 'main_bg').setDisplaySize(width, height);
        bg.setScale(1.05);
        this.tweens.add({
            targets: bg,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 8000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
        // 가벼운 전체 오버레이
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.2);
        // 상단 영역 추가 마스킹 — 배경 이미지의 기존 'SURVIVORS' 글자 가리기.
        // (배경 PNG 자체를 수정하지 않고 오버레이로 처리. 위치/크기는 시각 확인 후 조정 가능)
        const maskG = this.add.graphics();
        maskG.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.95, 0.95, 0.0, 0.0);
        maskG.fillRect(0, 0, width, 220);

        // 새 게임 타이틀 — 화면 상단 중앙
        const titleTextObj = this.add
            .text(width / 2, 90, 'MAGICKA SURVIVORS', {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '64px',
                color: '#ffd700',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 8,
                shadow: { offsetX: 3, offsetY: 3, color: '#5a3300', blur: 16, fill: true },
            })
            .setOrigin(0.5);
        this.tweens.add({
            targets: titleTextObj,
            y: titleTextObj.y - 6,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Home Button (Top Left)
        const homeBtn = this.add
            .text(20, 20, I18n.t('title_home'), {
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

        // 언어 토글 (Top Right) — Home 버튼과 같은 fontSize/padding 으로 수평 정렬, 가시성 강화.
        const langBtn = this.add
            .text(width - 20, 20, I18n.getLang() === 'ko' ? '🌐 EN' : '🌐 한국어', {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '24px',
                color: '#ffd700',
                fontStyle: 'bold',
                backgroundColor: '#000000bb',
                padding: { x: 10, y: 5 },
                stroke: '#5a3300',
                strokeThickness: 2,
            })
            .setOrigin(1, 0)
            .setInteractive({ useHandCursor: true });

        langBtn.on('pointerdown', () => {
            I18n.toggle();
            this.scene.restart(); // 즉시 새 언어 반영
        });
        langBtn.on('pointerover', () => langBtn.setTint(0xffff00));
        langBtn.on('pointerout', () => langBtn.clearTint());

        // 메뉴 레이아웃 — START + 보조 메뉴 (스킬 트리 + 시너지 도감 가로 묶음)
        // 사용자 요청: 메뉴 그룹을 화면 하단쪽으로 이동.
        const startY = height / 2 + 180;
        const subY = startY + 90;

        // START Button (메인 액션)
        const startBtn = this.add
            .rectangle(width / 2, startY, 240, 70, 0x3d2b1f, 0.8)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(3, 0xffd700);

        const startText = this.add
            .text(width / 2, startY, I18n.t('title_start'), {
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

        // 보조 메뉴 — 한 줄 3개 (스킬 트리 + 시너지 도감 + 리더보드)
        const subW = 170;
        const subH = 52;
        const subGap = 18;
        const subTotalW = 3 * subW + 2 * subGap;
        const subStartX = width / 2 - subTotalW / 2 + subW / 2;
        const subPositions = [0, 1, 2].map((i) => subStartX + i * (subW + subGap));

        // helper — 보조 메뉴 버튼 1개 만들기
        const makeSubButton = (
            x: number,
            labelKey: string,
            sceneKey: string,
            colors: { fill: number; hoverFill: number; stroke: number; text: string },
        ) => {
            const btn = this.add
                .rectangle(x, subY, subW, subH, colors.fill, 0.8)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(2, colors.stroke);

            this.add
                .text(x, subY, I18n.t(labelKey), {
                    fontFamily: '"MedievalSharp", cursive',
                    fontSize: '22px',
                    color: colors.text,
                    fontStyle: 'bold',
                })
                .setOrigin(0.5);

            btn.on('pointerdown', () => {
                this.cameras.main.fadeOut(300, 0, 0, 0);
                this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                    this.scene.start(sceneKey);
                });
            });
            btn.on('pointerover', () => {
                btn.setFillStyle(colors.hoverFill, 1);
                btn.setScale(1.04);
            });
            btn.on('pointerout', () => {
                btn.setFillStyle(colors.fill, 0.8);
                btn.setScale(1);
            });
        };

        makeSubButton(subPositions[0], 'title_skill_tree', 'SkillTreeScene', {
            fill: 0x1a2b3d,
            hoverFill: 0x253d52,
            stroke: 0x4db8ff,
            text: '#4db8ff',
        });
        makeSubButton(subPositions[1], 'title_codex', 'CodexScene', {
            fill: 0x2d1a3d,
            hoverFill: 0x3d2552,
            stroke: 0xcc88ff,
            text: '#cc88ff',
        });
        makeSubButton(subPositions[2], 'title_leaderboard', 'LeaderboardScene', {
            fill: 0x3d2b1f,
            hoverFill: 0x5a4030,
            stroke: 0xffd700,
            text: '#ffd700',
        });
    }

    private async checkDailyReward(): Promise<void> {
        const status = await ApiClient.getDailyRewardStatus();
        if (!status || !status.can_claim) return;
        // TitleScene 이 아직 활성 상태인지 확인 (씬 전환 중이면 launch 무시)
        if (!this.scene.isActive('TitleScene')) return;
        this.scene.launch('DailyRewardModal', { status });
    }
}
