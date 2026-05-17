import Phaser from 'phaser';
import { AlchemySlot, SynergyEffect } from '../components/alchemy';
import { Element, ELEMENT_INFO, SYNERGIES } from '../constants/AlchemyConfig';
import { tr } from '../i18n/I18n';

const SLOT_SIZE = 48;
const SLOT_GAP = 8;
// 우측 가장자리에서 슬롯 안쪽 가장자리까지 여백
const MARGIN_RIGHT = 20;
// 슬롯 묶음 전체 높이 = 슬롯 3개 + 간격 2개
const PANEL_HEIGHT = SLOT_SIZE * 3 + SLOT_GAP * 2;

export class AlchemySlotUI {
    private slotRects: Phaser.GameObjects.Rectangle[] = [];
    private slotIcons: Phaser.GameObjects.Text[] = [];
    private container: Phaser.GameObjects.Container;
    private synergyNameText!: Phaser.GameObjects.Text;
    private synergyDescText!: Phaser.GameObjects.Text;
    private playerEid: number | null = null;

    constructor(scene: Phaser.Scene) {
        // 우측 가장자리에 세로 정렬, 화면 수직 중앙
        const baseX = scene.scale.width - MARGIN_RIGHT - SLOT_SIZE;
        const baseY = (scene.scale.height - PANEL_HEIGHT) / 2;

        this.container = scene.add.container(baseX, baseY);
        this.container.setDepth(1000);
        this.container.setScrollFactor(0);

        for (let i = 0; i < 3; i++) {
            // 수직 배치: y가 슬롯 인덱스에 따라 증가
            const rect = scene.add.rectangle(
                SLOT_SIZE / 2,
                i * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2,
                SLOT_SIZE,
                SLOT_SIZE,
                0x222222,
                0.75,
            );
            rect.setStrokeStyle(2, 0xffffff, 0.4);
            rect.setScrollFactor(0);
            this.container.add(rect);
            this.slotRects.push(rect);

            const icon = scene.add.text(
                SLOT_SIZE / 2,
                i * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2,
                '?',
                { fontSize: '24px', color: '#888888' },
            );
            icon.setOrigin(0.5);
            icon.setScrollFactor(0);
            this.container.add(icon);
            this.slotIcons.push(icon);
        }

        // 슬롯 패널 왼쪽에 시너지 이름 + 설명 박스 (활성 시너지 안내)
        // origin (1, 0.5) = 우측 정렬, 슬롯 왼쪽에서 좌측으로 텍스트 펼침
        this.synergyNameText = scene.add
            .text(-12, SLOT_SIZE * 0.5, '', {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '20px',
                fontStyle: 'bold',
                color: '#ffd700',
                align: 'right',
                stroke: '#000000',
                strokeThickness: 4,
            })
            .setOrigin(1, 0.5);
        this.synergyNameText.setScrollFactor(0);
        this.container.add(this.synergyNameText);

        this.synergyDescText = scene.add
            .text(-12, SLOT_SIZE * 1.4, '', {
                fontSize: '12px',
                color: '#cccccc',
                align: 'right',
                wordWrap: { width: 240 },
                stroke: '#000000',
                strokeThickness: 3,
            })
            .setOrigin(1, 0);
        this.synergyDescText.setScrollFactor(0);
        this.container.add(this.synergyDescText);
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
    }

    setVisible(visible: boolean): void {
        this.container.setVisible(visible);
    }

    update(): void {
        if (this.playerEid === null) return;
        const slots = [
            AlchemySlot.slot0[this.playerEid],
            AlchemySlot.slot1[this.playerEid],
            AlchemySlot.slot2[this.playerEid],
        ];
        for (let i = 0; i < 3; i++) {
            const el = slots[i];
            if (el < 0) {
                this.slotIcons[i].setText('?');
                this.slotIcons[i].setColor('#888888');
                this.slotRects[i].setFillStyle(0x222222, 0.75);
            } else {
                const info = ELEMENT_INFO[el as Element];
                this.slotIcons[i].setText(info.icon);
                this.slotIcons[i].setColor('#ffffff');
                this.slotRects[i].setFillStyle(info.color, 0.5);
            }
        }

        // 활성 시너지 이름·설명 표시 (3슬롯 채워지고 정의된 조합일 때)
        const synergyId = SynergyEffect.synergyId[this.playerEid];
        if (synergyId >= 0 && synergyId < SYNERGIES.length) {
            const synergy = SYNERGIES[synergyId];
            this.synergyNameText.setText(`✦ ${synergy.name}`);
            this.synergyDescText.setText(tr(synergy.description));
        } else {
            this.synergyNameText.setText('');
            this.synergyDescText.setText('');
        }
    }

    destroy(): void {
        this.container.destroy();
    }
}
