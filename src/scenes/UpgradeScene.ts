import Phaser from 'phaser';
import { Element, ELEMENT_INFO } from '../constants/AlchemyConfig';
import { applySlotChange } from '../systems/AlchemySystem';

interface CardData {
    element: Element;
    title: string;
    description: string;
}

export class UpgradeScene extends Phaser.Scene {
    private cards: Phaser.GameObjects.Container[] = [];
    private playerEid: number = -1;

    constructor() {
        super({ key: 'UpgradeScene' });
    }

    init(data: { playerEid: number }) {
        this.playerEid = data.playerEid;
    }

    create() {
        const bg = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            0x000000,
            0.7,
        );
        bg.setDepth(0);

        const title = this.add.text(this.scale.width / 2, 80, 'LEVEL UP! 카드를 선택하세요', {
            fontSize: '32px',
            color: '#ffd700',
            fontStyle: 'bold',
        });
        title.setOrigin(0.5);
        title.setDepth(1);

        const cardData = this.pickRandomCards(3);
        const cardWidth = 200;
        const cardHeight = 280;
        const gap = 40;
        const totalWidth = cardWidth * 3 + gap * 2;
        const startX = (this.scale.width - totalWidth) / 2 + cardWidth / 2;
        const cardY = this.scale.height / 2;

        cardData.forEach((data, i) => {
            const x = startX + i * (cardWidth + gap);
            const card = this.createCard(x, cardY, cardWidth, cardHeight, data);
            this.cards.push(card);
        });
    }

    private pickRandomCards(count: number): CardData[] {
        const allElements = Object.values(Element) as Element[];
        const shuffled = [...allElements].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count).map((el) => ({
            element: el,
            title: ELEMENT_INFO[el].name,
            description: `${ELEMENT_INFO[el].icon} ${ELEMENT_INFO[el].name} 원소를 슬롯에 추가`,
        }));
    }

    private createCard(
        x: number,
        y: number,
        w: number,
        h: number,
        data: CardData,
    ): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);
        container.setDepth(1);

        const colorNum = ELEMENT_INFO[data.element].color;
        const bg = this.add.rectangle(0, 0, w, h, colorNum, 0.4);
        bg.setStrokeStyle(3, 0xffffff, 1);
        container.add(bg);

        const icon = this.add.text(0, -80, ELEMENT_INFO[data.element].icon, { fontSize: '64px' });
        icon.setOrigin(0.5);
        container.add(icon);

        const titleText = this.add.text(0, 0, data.title, {
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold',
        });
        titleText.setOrigin(0.5);
        container.add(titleText);

        const descText = this.add.text(0, 60, data.description, {
            fontSize: '14px',
            color: '#cccccc',
            wordWrap: { width: w - 20 },
            align: 'center',
        });
        descText.setOrigin(0.5);
        container.add(descText);

        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => bg.setFillStyle(colorNum, 0.7));
        bg.on('pointerout', () => bg.setFillStyle(colorNum, 0.4));
        bg.on('pointerdown', () => this.onCardSelected(data));

        return container;
    }

    private onCardSelected(data: CardData) {
        if (this.playerEid >= 0) {
            applySlotChange(this.playerEid, data.element);
        }
        this.scene.resume('MainScene');
        this.scene.stop();
    }
}
