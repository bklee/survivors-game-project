import Phaser from 'phaser';
import { ApiClient, type DailyRewardStatus } from '../integrations/ApiClient';
import { MetaProgress } from '../core/MetaProgress';
import { I18n } from '../i18n/I18n';
import { TEXT_STYLES } from '../ui/Theme';

// Day 1~7 보상 (서버와 동일 — 미리보기용. 권위는 서버 응답)
// 2026-05-21 사용자 요청으로 10배 상향. Day 7 = 1000 essence + 10000 coins.
const REWARD_PREVIEW: ReadonlyArray<{ essence: number; coins: number }> = [
    { essence: 100, coins: 0 },
    { essence: 150, coins: 0 },
    { essence: 250, coins: 0 },
    { essence: 300, coins: 0 },
    { essence: 400, coins: 0 },
    { essence: 500, coins: 0 },
    { essence: 1000, coins: 10000 },
];

interface ModalData {
    status: DailyRewardStatus;
    onClose?: () => void;
}

export class DailyRewardModal extends Phaser.Scene {
    private claiming = false;
    private statusData!: DailyRewardStatus;
    private onClose?: () => void;
    private claimBtnText?: Phaser.GameObjects.Text;
    private claimBtnBg?: Phaser.GameObjects.Rectangle;
    private cellPositions: { day: number; cx: number; cy: number }[] = [];

    constructor() {
        super('DailyRewardModal');
    }

    init(data: ModalData) {
        this.statusData = data.status;
        this.onClose = data.onClose;
        this.claiming = false;
    }

    create() {
        const { width, height } = this.scale;

        // 모달 박스 크기 — overlay 핸들러에서 모달 영역 검사에 사용
        const modalW = 720;
        const modalH = 440;
        const modalLeft = (width - modalW) / 2;
        const modalRight = modalLeft + modalW;
        const modalTop = (height - modalH) / 2;
        const modalBottom = modalTop + modalH;

        // 배경 오버레이 — 모달 영역 밖 클릭만 close. 모달 영역 클릭은 무시
        // (받기 버튼/닫기X 의 자체 핸들러가 처리하므로 overlay 가 가로채면 안 됨).
        const overlay = this.add
            .rectangle(width / 2, height / 2, width, height, 0x000000, 0.75)
            .setInteractive();
        overlay.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.claiming) return;
            if (
                pointer.x >= modalLeft &&
                pointer.x <= modalRight &&
                pointer.y >= modalTop &&
                pointer.y <= modalBottom
            ) {
                return; // 모달 영역 안 — 무시
            }
            this.close();
        });

        // 모달 박스
        this.add
            .rectangle(width / 2, height / 2, modalW, modalH, 0x2a1f10, 0.95)
            .setStrokeStyle(3, 0xffd700);

        // 타이틀 — Theme.TEXT_STYLES.titleScene (Cinzel Decorative + gold)
        this.add
            .text(
                width / 2,
                height / 2 - modalH / 2 + 40,
                I18n.t('daily_reward_title'),
                TEXT_STYLES.titleScene,
            )
            .setOrigin(0.5);

        // streak 표시
        const canClaim = this.statusData.can_claim;
        const streakLine = canClaim
            ? this.statusData.streak_count <= 1
                ? I18n.t('daily_reward_first')
                : I18n.t('daily_reward_streak_next', { n: this.statusData.streak_count })
            : I18n.t('daily_reward_streak_done', { n: this.statusData.streak_count });
        this.add
            .text(width / 2, height / 2 - modalH / 2 + 78, streakLine, {
                fontFamily: '"Cinzel Decorative", "Jua", "MedievalSharp", cursive',
                fontSize: '20px',
                color: '#cccccc',
            })
            .setOrigin(0.5);

        // 7일 캘린더 (2줄: 4 + 3)
        const cellW = 130;
        const cellH = 90;
        const gapX = 12;
        const gapY = 14;
        const row1Y = height / 2 - 30;
        const row2Y = row1Y + cellH + gapY;
        const todayDay = canClaim ? this.statusData.next_day : -1;
        const lastClaimedDay = canClaim ? -1 : ((this.statusData.streak_count - 1) % 7) + 1;

        this.cellPositions = [];
        for (let i = 0; i < 7; i++) {
            const day = i + 1;
            const reward = REWARD_PREVIEW[i];
            const isRow1 = i < 4;
            const colInRow = isRow1 ? i : i - 4;
            const colsInRow = isRow1 ? 4 : 3;
            const rowWidth = colsInRow * cellW + (colsInRow - 1) * gapX;
            const startX = width / 2 - rowWidth / 2 + cellW / 2;
            const cx = startX + colInRow * (cellW + gapX);
            const cy = isRow1 ? row1Y : row2Y;
            this.cellPositions.push({ day, cx, cy });

            const isToday = canClaim && day === todayDay;
            const isPast = canClaim ? day < todayDay : day <= lastClaimedDay;
            const fillColor = isToday ? 0x4d3a1f : isPast ? 0x1a1410 : 0x2a1f15;
            const strokeColor = isToday ? 0xffd700 : 0x5a4030;
            const strokeWidth = isToday ? 3 : 1;

            this.add
                .rectangle(cx, cy, cellW, cellH, fillColor, 1)
                .setStrokeStyle(strokeWidth, strokeColor);

            if (isPast) {
                this.add
                    .text(cx, cy - 10, '✓', {
                        fontFamily: '"Cinzel Decorative", "Jua", "MedievalSharp", cursive',
                        fontSize: '56px',
                        color: '#44cc44',
                        fontStyle: 'bold',
                    })
                    .setOrigin(0.5);
            }

            // Day 라벨
            this.add
                .text(cx, cy - 28, `Day ${day}`, {
                    fontFamily: '"Cinzel Decorative", "Jua", "MedievalSharp", cursive',
                    fontSize: '18px',
                    color: isToday ? '#ffd700' : '#aaaaaa',
                    fontStyle: 'bold',
                })
                .setOrigin(0.5);

            // 보상
            const essenceText = `+${reward.essence}E`;
            const coinText = reward.coins > 0 ? `+${reward.coins}C` : '';
            this.add
                .text(cx, cy + 2, essenceText, {
                    fontFamily: '"Cinzel Decorative", "Jua", "MedievalSharp", cursive',
                    fontSize: '20px',
                    color: isToday ? '#ffffff' : '#888888',
                })
                .setOrigin(0.5);
            if (coinText) {
                this.add
                    .text(cx, cy + 28, coinText, {
                        fontFamily: '"Cinzel Decorative", "Jua", "MedievalSharp", cursive',
                        fontSize: '16px',
                        color: isToday ? '#ffd700' : '#776633',
                    })
                    .setOrigin(0.5);
            }
        }

        // 받기 버튼
        const claimY = height / 2 + modalH / 2 - 55;
        if (canClaim) {
            this.claimBtnBg = this.add
                .rectangle(width / 2, claimY, 260, 60, 0x3d2b1f, 1)
                .setStrokeStyle(3, 0xffd700)
                .setInteractive({ useHandCursor: true });

            const previewLabel =
                this.statusData.preview_reward.coins > 0
                    ? I18n.t('daily_reward_claim_with_coins', {
                          e: this.statusData.preview_reward.essence,
                          c: this.statusData.preview_reward.coins,
                      })
                    : I18n.t('daily_reward_claim', {
                          e: this.statusData.preview_reward.essence,
                      });
            this.claimBtnText = this.add
                .text(width / 2, claimY, previewLabel, {
                    fontFamily: '"Cinzel Decorative", "Jua", "MedievalSharp", cursive',
                    fontSize: '24px',
                    color: '#ffffff',
                    fontStyle: 'bold',
                })
                .setOrigin(0.5);

            this.claimBtnBg.on('pointerover', () => {
                if (!this.claiming) this.claimBtnBg!.setFillStyle(0x5a4030);
            });
            this.claimBtnBg.on('pointerout', () => {
                if (!this.claiming) this.claimBtnBg!.setFillStyle(0x3d2b1f);
            });
            this.claimBtnBg.on('pointerdown', () => this.handleClaim());
        } else {
            this.claimBtnBg = this.add
                .rectangle(width / 2, claimY, 320, 60, 0x333333, 1)
                .setStrokeStyle(2, 0x666666);
            // setInteractive 호출 안 함 — 비활성 상태
            this.claimBtnText = this.add
                .text(width / 2, claimY, I18n.t('daily_reward_already_today'), {
                    fontFamily: '"Cinzel Decorative", "Jua", "MedievalSharp", cursive',
                    fontSize: '22px',
                    color: '#999999',
                    fontStyle: 'bold',
                })
                .setOrigin(0.5);
        }

        // 닫기 (X)
        const closeBtn = this.add
            .text(width / 2 + modalW / 2 - 30, height / 2 - modalH / 2 + 20, '✕', {
                fontFamily: '"Cinzel Decorative", "Jua", "MedievalSharp", cursive',
                fontSize: '28px',
                color: '#aaaaaa',
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => {
            if (!this.claiming) this.close();
        });
    }

    private async handleClaim() {
        if (this.claiming) return;
        this.claiming = true;
        this.claimBtnText!.setText(I18n.t('daily_reward_claiming'));
        this.claimBtnBg!.setFillStyle(0x222222);

        const result = await ApiClient.claimDailyReward();

        if (!result) {
            this.claiming = false;
            this.claimBtnText!.setText(I18n.t('daily_reward_network_error'));
            this.claimBtnBg!.setFillStyle(0x5a2020);
            return;
        }

        if (!result.ok) {
            // already_claimed 등 — 모달 닫기
            this.claimBtnText!.setText(I18n.t('daily_reward_already'));
            this.time.delayedCall(800, () => this.close());
            return;
        }

        // 성공 — essence 적립 (localStorage)
        MetaProgress.addEssence(result.granted.essence);
        if (result.granted.coins > 0) {
            MetaProgress.addCoins(result.granted.coins);
        }

        // 받은 셀에 ✓ 체크를 즉시 표시 — claim 직후 시각적 피드백
        const claimedDay =
            (result as { streak_day?: number }).streak_day ?? this.statusData.next_day;
        const cell = this.cellPositions.find((c) => c.day === claimedDay);
        if (cell) {
            this.add
                .text(cell.cx, cell.cy - 10, '✓', {
                    fontFamily: '"Cinzel Decorative", "Jua", "MedievalSharp", cursive',
                    fontSize: '56px',
                    color: '#44cc44',
                    fontStyle: 'bold',
                })
                .setOrigin(0.5);
        }

        this.claimBtnText!.setText(
            result.granted.coins > 0
                ? I18n.t('daily_reward_received_with_coins', {
                      e: result.granted.essence,
                      c: result.granted.coins,
                  })
                : I18n.t('daily_reward_received', { e: result.granted.essence }),
        );
        this.claimBtnBg!.setFillStyle(0x2d5a20);

        // 짧은 축하 tween
        this.tweens.add({
            targets: this.claimBtnText,
            scale: 1.15,
            duration: 200,
            yoyo: true,
            ease: 'Sine.easeOut',
        });

        this.time.delayedCall(1200, () => this.close());
    }

    private close() {
        this.scene.stop();
        this.onClose?.();
    }
}
