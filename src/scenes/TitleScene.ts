import Phaser from 'phaser';
import { I18n } from '../i18n/I18n';
import { ApiClient } from '../integrations/ApiClient';
import { TEXT_STYLES } from '../ui/Theme';

export class TitleScene extends Phaser.Scene {
    private dailyRewardChecked = false;
    private dailyBtn?: Phaser.GameObjects.Text;

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

        // 새 게임 타이틀 — 화면 상단 중앙, 2 행 (MAGICKA / SURVIVORS).
        // Theme.TEXT_STYLES.titleHero — D2 풍 Cinzel Decorative + 청동 톤.
        const titleTextObj = this.add
            .text(width / 2, 180, 'MAGICKA\nSURVIVORS', TEXT_STYLES.titleHero)
            .setOrigin(0.5)
            .setLetterSpacing(8);
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
                fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
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
                fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
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

        // 일일 퀘스트 아이콘 (lang 버튼 왼쪽). 클릭 시 popup 으로 launch.
        const questBtn = this.add
            .text(width - 20, 70, '📜 ' + I18n.t('quest_panel_title'), {
                fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
                fontSize: '20px',
                color: '#ffd700',
                backgroundColor: '#000000bb',
                padding: { x: 10, y: 5 },
                stroke: '#5a3300',
                strokeThickness: 2,
            })
            .setOrigin(1, 0)
            .setInteractive({ useHandCursor: true });
        questBtn.on('pointerdown', () => this.scene.launch('QuestPanelScene'));
        questBtn.on('pointerover', () => questBtn.setTint(0xffffaa));
        questBtn.on('pointerout', () => questBtn.clearTint());

        // 매일 보상 아이콘 (lang 버튼 y=20, 일일 퀘스트 버튼 y=70 아래 y=120). 클릭 시 popup launch.
        this.dailyBtn = this.add
            .text(width - 20, 120, I18n.t('daily_reward_btn'), {
                fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
                fontSize: '20px',
                color: '#ffd700',
                backgroundColor: '#000000bb',
                padding: { x: 10, y: 5 },
                stroke: '#5a3300',
                strokeThickness: 2,
            })
            .setOrigin(1, 0)
            .setInteractive({ useHandCursor: true });
        this.dailyBtn.on('pointerdown', () => void this.openDailyRewardModal());
        this.dailyBtn.on('pointerover', () => this.dailyBtn?.setTint(0xffffaa));
        this.dailyBtn.on('pointerout', () => this.dailyBtn?.clearTint());

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
                fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
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
                    fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
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

    private updateDailyBtnState(canClaim: boolean): void {
        if (!this.dailyBtn) return;
        if (canClaim) {
            this.dailyBtn.setText(I18n.t('daily_reward_btn'));
            this.dailyBtn.setColor('#ffd700');
        } else {
            this.dailyBtn.setText(I18n.t('daily_reward_btn_done'));
            this.dailyBtn.setColor('#44cc44');
        }
    }

    private async checkDailyReward(): Promise<void> {
        const status = await ApiClient.getDailyRewardStatus();
        if (!status) return;
        // TitleScene 이 아직 활성 상태인지 확인 (씬 전환 중이면 launch 무시)
        if (!this.scene.isActive('TitleScene')) return;
        // 버튼 외관 갱신 (받은 상태 ✅ 녹색 / 안 받음 🎁 금색)
        this.updateDailyBtnState(status.can_claim);
        // 자동 표시는 받을 수 있을 때만. 모달 닫힐 때 onClose 로 dailyBtn 외관 재갱신.
        if (status.can_claim) {
            this.scene.launch('DailyRewardModal', {
                status,
                onClose: () => void this.refreshDailyBtnState(),
            });
        }
    }

    private async openDailyRewardModal(): Promise<void> {
        const status = await ApiClient.getDailyRewardStatus();
        if (!status) return; // 네트워크 실패 시 무시
        if (!this.scene.isActive('TitleScene')) return;
        this.updateDailyBtnState(status.can_claim);
        // 사용자가 능동적으로 버튼을 눌러 진입한 경우엔 받은 상태에서도 모달 표시.
        // 모달 닫힐 때 (claim 성공 후 자동 닫힘 포함) dailyBtn 외관 즉시 재갱신.
        this.scene.launch('DailyRewardModal', {
            status,
            onClose: () => void this.refreshDailyBtnState(),
        });
    }

    private async refreshDailyBtnState(): Promise<void> {
        const status = await ApiClient.getDailyRewardStatus();
        if (!status) return;
        if (!this.scene.isActive('TitleScene')) return;
        this.updateDailyBtnState(status.can_claim);
    }
}
