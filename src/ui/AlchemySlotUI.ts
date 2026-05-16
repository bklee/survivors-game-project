import Phaser from 'phaser';
import { AlchemySlot } from '../components/alchemy';
import { Element, ELEMENT_INFO } from '../constants/AlchemyConfig';

const SLOT_SIZE = 48;
const SLOT_GAP = 8;
const MARGIN_X = 20;
const MARGIN_Y_FROM_BOTTOM = 20;

export class AlchemySlotUI {
    private slotRects: Phaser.GameObjects.Rectangle[] = [];
    private slotIcons: Phaser.GameObjects.Text[] = [];
    private container: Phaser.GameObjects.Container;
    private playerEid: number | null = null;

    constructor(scene: Phaser.Scene) {
        const baseX = MARGIN_X;
        const baseY = scene.scale.height - MARGIN_Y_FROM_BOTTOM - SLOT_SIZE;

        this.container = scene.add.container(baseX, baseY);
        this.container.setDepth(1000);
        this.container.setScrollFactor(0);

        for (let i = 0; i < 3; i++) {
            const rect = scene.add.rectangle(
                i * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2,
                SLOT_SIZE / 2,
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
                i * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2,
                SLOT_SIZE / 2,
                '?',
                { fontSize: '24px', color: '#888888' },
            );
            icon.setOrigin(0.5);
            icon.setScrollFactor(0);
            this.container.add(icon);
            this.slotIcons.push(icon);
        }
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
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
    }

    destroy(): void {
        this.container.destroy();
    }
}
