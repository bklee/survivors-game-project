import Phaser from 'phaser';
import { SYNERGIES, ELEMENT_INFO } from '../constants/AlchemyConfig';
import { MetaProgress } from '../core/MetaProgress';
import { I18n, tr } from '../i18n/I18n';

export class CodexScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CodexScene' });
    }

    create() {
        const { width, height } = this.scale;

        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.9);

        const discovered = MetaProgress.load().discoveredSynergies;
        const total = SYNERGIES.length;
        const progress = total > 0 ? discovered.length / total : 0;

        this.add
            .text(width / 2, 40, I18n.t('codex_title', { found: discovered.length, total }), {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '36px',
                color: '#ffd700',
                fontStyle: 'bold',
            })
            .setOrigin(0.5);

        // 진행도 막대 — 헤더 아래
        const barW = 600;
        const barH = 8;
        const barX = width / 2 - barW / 2;
        const barY = 70;
        this.add.rectangle(barX, barY, barW, barH, 0x222222, 0.9).setOrigin(0, 0);
        const fillW = Math.max(2, barW * progress);
        // 진행도에 따른 색 변화: red(0%) → yellow(50%) → green(100%)
        const fillColor =
            progress >= 1
                ? 0x00ff66
                : progress >= 0.5
                  ? 0xffd700
                  : progress > 0
                    ? 0xff9933
                    : 0xff3333;
        this.add.rectangle(barX, barY, fillW, barH, fillColor, 1).setOrigin(0, 0);

        // 20 시너지 — 5 cols × 4 rows 로 배치하여 뒤로가기 버튼(y≈690)과 겹치지 않게.
        const cols = 5;
        const cardW = 220;
        const cardH = 110;
        const gap = 12;
        const totalW = cols * cardW + (cols - 1) * gap;
        const startX = (width - totalW) / 2 + cardW / 2;
        const startY = 110 + cardH / 2;

        SYNERGIES.forEach((syn, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const x = startX + col * (cardW + gap);
            const y = startY + row * (cardH + gap);

            const isDiscovered = discovered.includes(syn.id);

            this.add
                .rectangle(x, y, cardW, cardH, isDiscovered ? 0x222244 : 0x111111, 0.85)
                .setStrokeStyle(2, isDiscovered ? 0xffd700 : 0x444444, 0.7);

            if (isDiscovered) {
                const elementIcons = syn.elements.map((e) => ELEMENT_INFO[e].icon).join(' ');
                this.add
                    .text(x, y - 32, elementIcons, {
                        fontSize: '20px',
                    })
                    .setOrigin(0.5);

                this.add
                    .text(x, y - 5, syn.name, {
                        fontFamily: '"MedievalSharp", cursive',
                        fontSize: '18px',
                        color: '#ffd700',
                        fontStyle: 'bold',
                    })
                    .setOrigin(0.5);

                this.add
                    .text(x, y + 28, tr(syn.description), {
                        fontSize: '11px',
                        color: '#cccccc',
                        wordWrap: { width: cardW - 16 },
                        align: 'center',
                    })
                    .setOrigin(0.5);
            } else {
                // 미발견 — 원소 조합 힌트만 흐릿하게 (조합 자체는 시도 가능)
                const elementIcons = syn.elements.map((e) => ELEMENT_INFO[e].icon).join(' ');
                this.add
                    .text(x, y - 20, elementIcons, {
                        fontSize: '20px',
                    })
                    .setOrigin(0.5)
                    .setAlpha(0.35);
                this.add
                    .text(x, y + 18, '???', {
                        fontSize: '26px',
                        color: '#555555',
                        fontStyle: 'bold',
                    })
                    .setOrigin(0.5);
            }
        });

        const back = this.add
            .text(width / 2, height - 30, I18n.t('common_back'), {
                fontSize: '24px',
                color: '#ffffff',
                backgroundColor: '#222222',
                padding: { x: 16, y: 8 },
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        back.on('pointerdown', () => this.scene.start('TitleScene'));
        back.on('pointerover', () => back.setTint(0xffff00));
        back.on('pointerout', () => back.clearTint());
    }
}
