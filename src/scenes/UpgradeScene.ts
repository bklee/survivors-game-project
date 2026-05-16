import Phaser from 'phaser';
import { PokiSDK } from '../integrations/PokiSDK';
import { Element, ELEMENT_INFO } from '../constants/AlchemyConfig';
import { applySlotChange } from '../systems/AlchemySystem';
import {
    EVOLUTIONS,
    WeaponEvolutionDef,
    findEligibleEvolutions,
} from '../constants/EvolutionConfig';
import { WeaponEvolution } from '../components/weapon';
import { globalStats } from '../core/PlayerStats';
import { RELICS, RelicDef, hasRelic, setRelic, countRelics } from '../constants/RelicConfig';
import { Relic } from '../components/relic';
import { MetaProgress } from '../core/MetaProgress';

interface ElementPayload {
    type: 'element';
    element: Element;
}
interface StatPayload {
    type: 'stat';
    statKey: 'damageMult' | 'moveSpeedMult' | 'cooldownMult' | 'pickupRadiusMult';
    pct: number;
}
interface EvolutionPayload {
    type: 'evolution';
    def: WeaponEvolutionDef;
}
interface RelicPayload {
    type: 'relic';
    relicDef: RelicDef;
}
type CardPayload = ElementPayload | StatPayload | EvolutionPayload | RelicPayload;

type CardData = {
    title: string;
    description: string;
    icon: string;
    color: number;
} & CardPayload;

const STAT_OPTIONS: {
    key: StatPayload['statKey'];
    pct: number;
    title: string;
    desc: string;
    color: number;
    icon: string;
}[] = [
    {
        key: 'damageMult',
        pct: 0.15,
        title: '데미지 +15%',
        desc: '모든 공격 데미지 증가',
        color: 0xff5722,
        icon: '⚔',
    },
    {
        key: 'moveSpeedMult',
        pct: 0.1,
        title: '이동속도 +10%',
        desc: '이동 속도 증가',
        color: 0x4caf50,
        icon: '⚡',
    },
    {
        key: 'cooldownMult',
        pct: 0.1,
        title: 'CDR +10%',
        desc: '쿨다운 감소',
        color: 0x2196f3,
        icon: '⏱',
    },
    {
        key: 'pickupRadiusMult',
        pct: 0.2,
        title: '획득 범위 +20%',
        desc: 'XP/아이템 픽업 범위',
        color: 0xffeb3b,
        icon: '🧲',
    },
];

export class UpgradeScene extends Phaser.Scene {
    private cards: Phaser.GameObjects.Container[] = [];
    private playerEid: number = -1;
    private playerLevel: number = 1;

    constructor() {
        super({ key: 'UpgradeScene' });
    }

    init(data: { playerEid: number; playerLevel?: number }) {
        this.playerEid = data.playerEid;
        this.playerLevel = data.playerLevel ?? globalStats.currentLevel ?? 1;
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

        // 광고 보고 카드 1장 더 버튼 (1회 한정)
        let extraCardUsed = false;
        const extraCardBtn = this.add
            .text(this.scale.width / 2, this.scale.height - 50, '광고 보고 카드 1장 더', {
                fontSize: '18px',
                color: '#aaaaaa',
                backgroundColor: '#222222',
                padding: { x: 12, y: 6 },
            })
            .setOrigin(0.5)
            .setDepth(1)
            .setInteractive({ useHandCursor: true });

        extraCardBtn.on('pointerdown', async () => {
            if (extraCardUsed) return;
            extraCardUsed = true;
            extraCardBtn.disableInteractive().setAlpha(0.5);
            const success = await PokiSDK.rewardedBreak();
            if (success) {
                const extraCards = this.pickRandomCards(1);
                if (extraCards.length > 0) {
                    const extraCard = extraCards[0];
                    const extraX = startX + 3 * (cardWidth + gap);
                    const card = this.createCard(extraX, cardY, cardWidth, cardHeight, extraCard);
                    this.cards.push(card);
                    extraCardBtn.setText(`+ ${extraCard.title}`).setColor('#ffd700');
                }
            } else {
                extraCardBtn.setText('광고 시청 실패').setColor('#888888');
            }
        });
    }

    private pickRandomCards(count: number): CardData[] {
        const pool: CardData[] = [];

        // 1. 원소 카드 (전체 셔플 후 4개 후보)
        const allElements = Object.values(Element) as Element[];
        const shuffledElements = [...allElements].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(4, shuffledElements.length); i++) {
            const el = shuffledElements[i];
            pool.push({
                type: 'element',
                element: el,
                title: ELEMENT_INFO[el].name,
                description: `${ELEMENT_INFO[el].icon} ${ELEMENT_INFO[el].name} 원소를 슬롯에 추가`,
                icon: ELEMENT_INFO[el].icon,
                color: ELEMENT_INFO[el].color,
            });
        }

        // 2. 스탯 카드 (4개 전부 후보)
        for (const stat of STAT_OPTIONS) {
            pool.push({
                type: 'stat',
                statKey: stat.key,
                pct: stat.pct,
                title: stat.title,
                description: stat.desc,
                icon: stat.icon,
                color: stat.color,
            });
        }

        // 3. 진화 카드 (조건 만족 시만)
        if (this.playerEid >= 0) {
            const eligibleEvolutions = findEligibleEvolutions(this.playerEid, this.playerLevel);
            for (const ev of eligibleEvolutions) {
                pool.push({
                    type: 'evolution',
                    def: ev,
                    title: ev.name,
                    description: ev.description,
                    icon: '✦',
                    color: 0xffd700,
                });
            }
        }

        // 4. 유물 카드 — 미보유 + relicSlots 한도 체크
        if (this.playerEid >= 0) {
            const playerMask = Relic.bitmask[this.playerEid];
            const ownedCount = countRelics(playerMask);
            const maxSlots = MetaProgress.load().relicSlots;
            if (ownedCount < maxSlots) {
                const available = RELICS.filter((r) => !hasRelic(playerMask, r.bit));
                const shuffledRelics = [...available].sort(() => Math.random() - 0.5);
                for (const relic of shuffledRelics.slice(0, 4)) {
                    pool.push({
                        type: 'relic',
                        relicDef: relic,
                        title: relic.name,
                        description: relic.description,
                        icon: '✦',
                        color: 0xff6b00,
                    });
                }
            }
        }

        const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
        return shuffledPool.slice(0, count);
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

        const isEvolution = data.type === 'evolution';
        const isRelic = data.type === 'relic';
        const strokeColor = isEvolution ? 0xffd700 : isRelic ? 0xff6b00 : 0xffffff;
        const strokeWidth = isEvolution || isRelic ? 4 : 3;

        const bg = this.add.rectangle(0, 0, w, h, data.color, 0.4);
        bg.setStrokeStyle(strokeWidth, strokeColor, 1);
        container.add(bg);

        const icon = this.add.text(0, -80, data.icon, { fontSize: '64px' });
        icon.setOrigin(0.5);
        container.add(icon);

        const titleText = this.add.text(0, 0, data.title, {
            fontSize: '20px',
            color: isEvolution ? '#ffd700' : isRelic ? '#ff6b00' : '#ffffff',
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
        bg.on('pointerover', () => bg.setFillStyle(data.color, 0.7));
        bg.on('pointerout', () => bg.setFillStyle(data.color, 0.4));
        bg.on('pointerdown', () => this.onCardSelected(data));

        return container;
    }

    private onCardSelected(data: CardData) {
        if (this.playerEid >= 0) {
            this.applyCard(data);
        }
        this.scene.resume('MainScene');
        this.scene.stop();
    }

    private applyCard(card: CardData) {
        switch (card.type) {
            case 'element':
                applySlotChange(this.playerEid, card.element);
                break;
            case 'stat':
                globalStats[card.statKey] *= 1 + card.pct;
                break;
            case 'evolution': {
                const idx = EVOLUTIONS.findIndex((e) => e.id === card.def.id);
                if (idx >= 0) {
                    WeaponEvolution.evolutionId[this.playerEid] = idx;
                }
                break;
            }
            case 'relic': {
                const mask = Relic.bitmask[this.playerEid];
                Relic.bitmask[this.playerEid] = setRelic(mask, card.relicDef.bit);
                break;
            }
        }
    }
}
