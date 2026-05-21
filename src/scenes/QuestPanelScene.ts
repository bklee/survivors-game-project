import Phaser from 'phaser';
import { I18n } from '../i18n/I18n';
import { QuestClient, type QuestStatus } from '../integrations/QuestClient';
import { MetaProgress } from '../core/MetaProgress';

type ViewState = 'loading' | 'error' | 'ready';

export class QuestPanelScene extends Phaser.Scene {
    private state: ViewState = 'loading';
    private quests: QuestStatus[] = [];
    private comboBonusCoins = 0;
    private comboClaimed = false;
    private contentGroup?: Phaser.GameObjects.Group;

    constructor() {
        super('QuestPanelScene');
    }

    create() {
        const { width, height } = this.scale;
        this.contentGroup = this.add.group();

        // 모달 배경
        const overlay = this.add
            .rectangle(width / 2, height / 2, width, height, 0x000000, 0.75)
            .setInteractive();
        overlay.on('pointerdown', () => this.close());

        const modalW = 640;
        const modalH = 440;
        this.add
            .rectangle(width / 2, height / 2, modalW, modalH, 0x2a1f10, 0.95)
            .setStrokeStyle(3, 0xffd700)
            .setInteractive();

        this.add
            .text(width / 2, height / 2 - modalH / 2 + 30, I18n.t('quest_panel_title'), {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '32px',
                color: '#ffd700',
                fontStyle: 'bold',
            })
            .setOrigin(0.5);

        // 닫기 X
        const closeBtn = this.add
            .text(width / 2 + modalW / 2 - 30, height / 2 - modalH / 2 + 20, '✕', {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '24px',
                color: '#aaaaaa',
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => this.close());

        void this.load();
    }

    private async load() {
        this.state = 'loading';
        this.render();
        const r = await QuestClient.fetchStatus();
        if (!r) {
            this.state = 'error';
            this.render();
            return;
        }
        this.quests = r.quests;
        this.comboBonusCoins = r.combo_bonus_coins;
        this.comboClaimed = r.combo_claimed;
        this.state = 'ready';
        this.render();
    }

    private render() {
        this.contentGroup?.clear(true, true);
        const { width, height } = this.scale;

        if (this.state === 'loading') {
            this.addToGroup(
                this.add
                    .text(width / 2, height / 2, '...', {
                        fontFamily: '"MedievalSharp", cursive',
                        fontSize: '28px',
                        color: '#888888',
                    })
                    .setOrigin(0.5),
            );
            return;
        }

        if (this.state === 'error') {
            const errText = this.add
                .text(width / 2, height / 2, '네트워크 오류 — 다시 시도', {
                    fontFamily: '"MedievalSharp", cursive',
                    fontSize: '20px',
                    color: '#ff6666',
                    backgroundColor: '#330000',
                    padding: { x: 12, y: 6 },
                })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });
            errText.on('pointerdown', () => void this.load());
            this.addToGroup(errText);
            return;
        }

        // 3개 quest row
        const rowH = 80;
        const startY = height / 2 - 80;
        this.quests.forEach((q, i) => this.renderQuestRow(q, startY + i * rowH));

        // combo 안내
        const comboText = this.add
            .text(
                width / 2,
                height / 2 + 130,
                I18n.t('quest_panel_combo', { coins: this.comboBonusCoins }),
                {
                    fontFamily: '"MedievalSharp", cursive',
                    fontSize: '18px',
                    color: this.comboClaimed ? '#ffd700' : '#aaaaaa',
                    fontStyle: this.comboClaimed ? 'bold' : 'normal',
                },
            )
            .setOrigin(0.5);
        this.addToGroup(comboText);
    }

    private renderQuestRow(q: QuestStatus, y: number) {
        const { width } = this.scale;
        const rowW = 560;
        const rowH = 64;
        const x = width / 2;

        // 배경
        const bg = this.add
            .rectangle(x, y, rowW, rowH, q.completed ? 0x3d2b1f : 0x1a1410, 0.9)
            .setStrokeStyle(2, q.completed ? 0xffd700 : 0x5a4030);
        this.addToGroup(bg);

        // 설명
        const desc = this.add
            .text(x - rowW / 2 + 15, y - 12, I18n.t(q.description_key), {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '18px',
                color: '#ffffff',
                fontStyle: 'bold',
            })
            .setOrigin(0, 0.5);
        this.addToGroup(desc);

        // 진행도
        const progressText = this.add
            .text(
                x - rowW / 2 + 15,
                y + 14,
                `${q.current_value} / ${q.target_value}  •  +${q.reward_essence} 정수`,
                {
                    fontFamily: '"MedievalSharp", cursive',
                    fontSize: '15px',
                    color: q.completed ? '#ffd700' : '#aaaaaa',
                },
            )
            .setOrigin(0, 0.5);
        this.addToGroup(progressText);

        // 진행 바
        const barW = 400;
        const barX = x - rowW / 2 + 15;
        const barY = y + rowH / 2 - 6;
        const fillRatio = Math.min(1, q.current_value / q.target_value);
        const barBg = this.add.rectangle(barX, barY, barW, 4, 0x000000, 0.6).setOrigin(0, 0.5);
        const barFill = this.add
            .rectangle(barX, barY, barW * fillRatio, 4, q.completed ? 0xffd700 : 0x66aaff, 1)
            .setOrigin(0, 0.5);
        this.addToGroup(barBg);
        this.addToGroup(barFill);

        // 청구 버튼 (claimed 면 비활성, completed 가 아니면 잠금)
        const btnLabel = q.claimed
            ? I18n.t('quest_claimed')
            : q.completed
              ? I18n.t('quest_claim_btn')
              : I18n.t('quest_locked');
        const btnColor = q.claimed ? 0x333333 : q.completed ? 0x4d3a1f : 0x222222;
        const btnTextColor = q.claimed ? '#666666' : q.completed ? '#ffd700' : '#888888';

        const btnBg = this.add
            .rectangle(x + rowW / 2 - 60, y, 100, 36, btnColor, 1)
            .setStrokeStyle(2, q.completed && !q.claimed ? 0xffd700 : 0x444444);

        const btnText = this.add
            .text(x + rowW / 2 - 60, y, btnLabel, {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '16px',
                color: btnTextColor,
                fontStyle: 'bold',
            })
            .setOrigin(0.5);

        this.addToGroup(btnBg);
        this.addToGroup(btnText);

        if (q.completed && !q.claimed) {
            btnBg.setInteractive({ useHandCursor: true });
            btnBg.on('pointerdown', () => void this.handleClaim(q.quest_id));
        }
    }

    private async handleClaim(quest_id: string) {
        const r = await QuestClient.claim(quest_id);
        if (!r || !r.ok) {
            // 실패 — 다시 load 로 상태 보정
            void this.load();
            return;
        }
        if (r.granted_essence) {
            MetaProgress.addEssence(r.granted_essence);
        }
        // 단순화: 재로드로 UI 갱신
        void this.load();
    }

    private addToGroup(obj: Phaser.GameObjects.GameObject) {
        this.contentGroup?.add(obj);
    }

    private close() {
        this.scene.stop();
        // QuestPanelScene 은 launch 로 호출되므로 호출자(TitleScene 등) 가 유지됨
    }
}
