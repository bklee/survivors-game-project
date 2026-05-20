import Phaser from 'phaser';
import { I18n } from '../i18n/I18n';
import {
    ApiClient,
    type LeaderboardEntry,
    type LeaderboardResponse,
    type LeaderboardWindow,
} from '../integrations/ApiClient';
import { Identity } from '../core/Identity';

type TabKey = LeaderboardWindow;
type ViewState = 'loading' | 'error' | 'empty' | 'ready';

const TAB_CONFIG: ReadonlyArray<{ key: TabKey; labelKey: string }> = [
    { key: 'all', labelKey: 'leaderboard_tab_all' },
    { key: 'weekly', labelKey: 'leaderboard_tab_weekly' },
    { key: 'daily', labelKey: 'leaderboard_tab_daily' },
];

const COL_WIDTHS = { rank: 70, nickname: 240, character: 130, score: 130, stage: 90 };
const ROW_HEIGHT = 38;
const MAX_VISIBLE_ROWS = 12;

export class LeaderboardScene extends Phaser.Scene {
    private currentTab: TabKey = 'all';
    private deviceId = '';

    // 동적으로 갱신되는 UI 노드 — clear 후 재생성
    private contentGroup?: Phaser.GameObjects.Group;
    private tabButtons: Map<TabKey, Phaser.GameObjects.Text> = new Map();
    private state: ViewState = 'loading';
    private cachedResponse: LeaderboardResponse | null = null;

    constructor() {
        super('LeaderboardScene');
    }

    create() {
        const { width, height } = this.scale;
        this.deviceId = Identity.getDeviceId();
        this.cameras.main.fadeIn(400, 0, 0, 0);

        // 배경
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1410, 1);

        // 타이틀
        this.add
            .text(width / 2, 50, I18n.t('leaderboard_title'), {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '44px',
                color: '#ffd700',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 6,
            })
            .setOrigin(0.5);

        // 뒤로 버튼
        const backBtn = this.add
            .text(30, 30, I18n.t('leaderboard_back'), {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '22px',
                color: '#ffffff',
                backgroundColor: '#00000088',
                padding: { x: 12, y: 6 },
            })
            .setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => this.goBack());
        backBtn.on('pointerover', () => backBtn.setTint(0xffff00));
        backBtn.on('pointerout', () => backBtn.clearTint());

        // 탭 영역
        this.renderTabs();

        // 콘텐츠 영역 (동적 재생성)
        this.contentGroup = this.add.group();
        void this.loadTab(this.currentTab);
    }

    private renderTabs() {
        const { width } = this.scale;
        const tabY = 110;
        const tabW = 140;
        const tabH = 40;
        const totalW = TAB_CONFIG.length * tabW + (TAB_CONFIG.length - 1) * 12;
        const startX = width / 2 - totalW / 2 + tabW / 2;

        TAB_CONFIG.forEach((cfg, i) => {
            const x = startX + i * (tabW + 12);
            const isActive = cfg.key === this.currentTab;
            const bg = this.add
                .rectangle(x, tabY, tabW, tabH, isActive ? 0x4d3a1f : 0x2a1f15, 1)
                .setStrokeStyle(2, isActive ? 0xffd700 : 0x5a4030)
                .setInteractive({ useHandCursor: true });
            const text = this.add
                .text(x, tabY, I18n.t(cfg.labelKey), {
                    fontFamily: '"MedievalSharp", cursive',
                    fontSize: '20px',
                    color: isActive ? '#ffd700' : '#aaaaaa',
                    fontStyle: 'bold',
                })
                .setOrigin(0.5);
            this.tabButtons.set(cfg.key, text);
            bg.on('pointerdown', () => {
                if (cfg.key !== this.currentTab) {
                    this.currentTab = cfg.key;
                    this.scene.restart();
                }
            });
        });
    }

    private async loadTab(window: TabKey) {
        this.state = 'loading';
        this.renderContent();

        const response = await ApiClient.fetchLeaderboard(window, undefined, 50);
        if (!response) {
            this.state = 'error';
            this.cachedResponse = null;
            this.renderContent();
            return;
        }

        this.cachedResponse = response;
        this.state = response.entries.length === 0 ? 'empty' : 'ready';
        this.renderContent();
    }

    private renderContent() {
        const { width } = this.scale;
        // 이전 콘텐츠 제거
        this.contentGroup?.clear(true, true);

        if (this.state === 'loading') {
            this.addToGroup(
                this.add
                    .text(width / 2, 360, I18n.t('leaderboard_loading'), {
                        fontFamily: '"MedievalSharp", cursive',
                        fontSize: '24px',
                        color: '#aaaaaa',
                    })
                    .setOrigin(0.5),
            );
            return;
        }

        if (this.state === 'error') {
            const errText = this.add
                .text(width / 2, 360, I18n.t('leaderboard_error'), {
                    fontFamily: '"MedievalSharp", cursive',
                    fontSize: '22px',
                    color: '#ff6666',
                    backgroundColor: '#330000',
                    padding: { x: 12, y: 6 },
                })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });
            errText.on('pointerdown', () => void this.loadTab(this.currentTab));
            this.addToGroup(errText);
            return;
        }

        // 헤더 + 본인 순위
        this.renderHeader();
        this.renderMeRank();

        if (this.state === 'empty') {
            this.addToGroup(
                this.add
                    .text(width / 2, 360, I18n.t('leaderboard_empty'), {
                        fontFamily: '"MedievalSharp", cursive',
                        fontSize: '22px',
                        color: '#888888',
                    })
                    .setOrigin(0.5),
            );
            return;
        }

        // 엔트리 리스트
        const entries = this.cachedResponse!.entries.slice(0, MAX_VISIBLE_ROWS);
        const myRank = this.cachedResponse!.me?.rank ?? null;
        entries.forEach((entry, idx) => this.renderRow(entry, idx, myRank));
    }

    private renderHeader() {
        const { width } = this.scale;
        const headerY = 180;
        const totalW =
            COL_WIDTHS.rank +
            COL_WIDTHS.nickname +
            COL_WIDTHS.character +
            COL_WIDTHS.score +
            COL_WIDTHS.stage;
        let cursorX = width / 2 - totalW / 2;

        const headerStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: '"MedievalSharp", cursive',
            fontSize: '18px',
            color: '#ffd700',
            fontStyle: 'bold',
        };

        const headers: {
            key: keyof typeof COL_WIDTHS;
            labelKey: string;
            align: 'left' | 'right';
        }[] = [
            { key: 'rank', labelKey: 'leaderboard_col_rank', align: 'left' },
            { key: 'nickname', labelKey: 'leaderboard_col_nickname', align: 'left' },
            { key: 'character', labelKey: 'leaderboard_col_character', align: 'left' },
            { key: 'score', labelKey: 'leaderboard_col_score', align: 'right' },
            { key: 'stage', labelKey: 'leaderboard_col_stage', align: 'right' },
        ];

        for (const h of headers) {
            const colW = COL_WIDTHS[h.key];
            const text = this.add.text(
                h.align === 'right' ? cursorX + colW - 10 : cursorX + 10,
                headerY,
                I18n.t(h.labelKey),
                headerStyle,
            );
            text.setOrigin(h.align === 'right' ? 1 : 0, 0.5);
            this.addToGroup(text);
            cursorX += colW;
        }

        // 구분선
        const line = this.add.rectangle(width / 2, headerY + 18, totalW, 2, 0x5a4030, 1);
        this.addToGroup(line);
    }

    private renderRow(entry: LeaderboardEntry, idx: number, myRank: number | null) {
        const { width } = this.scale;
        const rowY = 220 + idx * ROW_HEIGHT;
        const totalW =
            COL_WIDTHS.rank +
            COL_WIDTHS.nickname +
            COL_WIDTHS.character +
            COL_WIDTHS.score +
            COL_WIDTHS.stage;
        const rowRank = Number(entry.rank);
        const isMe = myRank !== null && myRank === rowRank;

        // 본인 행 하이라이트
        if (isMe) {
            const bg = this.add.rectangle(
                width / 2,
                rowY,
                totalW + 20,
                ROW_HEIGHT - 4,
                0x4d3a1f,
                0.5,
            );
            this.addToGroup(bg);
        }

        let cursorX = width / 2 - totalW / 2;
        const textColor = isMe ? '#ffd700' : '#dddddd';
        const cellStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: '"MedievalSharp", cursive',
            fontSize: '18px',
            color: textColor,
        };

        // rank
        const rankText = this.add.text(cursorX + 10, rowY, `#${rowRank}`, cellStyle);
        rankText.setOrigin(0, 0.5);
        this.addToGroup(rankText);
        cursorX += COL_WIDTHS.rank;

        // nickname (with truncation)
        const nick = entry.nickname || '—';
        const nickText = this.add.text(
            cursorX + 10,
            rowY,
            nick.length > 16 ? nick.slice(0, 15) + '…' : nick,
            cellStyle,
        );
        nickText.setOrigin(0, 0.5);
        this.addToGroup(nickText);
        cursorX += COL_WIDTHS.nickname;

        // character
        const charText = this.add.text(cursorX + 10, rowY, entry.character_id, cellStyle);
        charText.setOrigin(0, 0.5);
        this.addToGroup(charText);
        cursorX += COL_WIDTHS.character;

        // score
        const scoreText = this.add.text(
            cursorX + COL_WIDTHS.score - 10,
            rowY,
            entry.score.toLocaleString(),
            cellStyle,
        );
        scoreText.setOrigin(1, 0.5);
        this.addToGroup(scoreText);
        cursorX += COL_WIDTHS.score;

        // stage
        const stageText = this.add.text(
            cursorX + COL_WIDTHS.stage - 10,
            rowY,
            entry.stage_reached !== null ? String(entry.stage_reached) : '—',
            cellStyle,
        );
        stageText.setOrigin(1, 0.5);
        this.addToGroup(stageText);
    }

    private renderMeRank() {
        const { width, height } = this.scale;
        const me = this.cachedResponse?.me;
        const label = me
            ? I18n.t('leaderboard_me_rank', {
                  rank: me.rank,
                  score: me.score.toLocaleString(),
              })
            : I18n.t('leaderboard_me_none');

        const text = this.add
            .text(width / 2, height - 50, label, {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '20px',
                color: me ? '#ffd700' : '#888888',
                fontStyle: 'bold',
            })
            .setOrigin(0.5);
        this.addToGroup(text);
    }

    private addToGroup(obj: Phaser.GameObjects.GameObject) {
        this.contentGroup?.add(obj);
    }

    private goBack() {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('TitleScene');
        });
    }
}
