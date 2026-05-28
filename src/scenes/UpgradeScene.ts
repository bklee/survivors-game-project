import Phaser from 'phaser';
import { AdSDK } from '../integrations/AdSDK';
import { ApiClient } from '../integrations/ApiClient';
import { I18n, tr } from '../i18n/I18n';
import { StringKey } from '../i18n/strings';
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
    titleKey: StringKey;
    descKey: StringKey;
    color: number;
    icon: string;
}[] = [
    {
        key: 'damageMult',
        pct: 0.15,
        titleKey: 'upgrade_stat_damage_title',
        descKey: 'upgrade_stat_damage_desc',
        color: 0xff5722,
        icon: '⚔',
    },
    {
        key: 'moveSpeedMult',
        pct: 0.1,
        titleKey: 'upgrade_stat_speed_title',
        descKey: 'upgrade_stat_speed_desc',
        color: 0x4caf50,
        icon: '⚡',
    },
    {
        key: 'cooldownMult',
        pct: 0.1,
        titleKey: 'upgrade_stat_cdr_title',
        descKey: 'upgrade_stat_cdr_desc',
        color: 0x2196f3,
        icon: '⏱',
    },
    {
        key: 'pickupRadiusMult',
        pct: 0.2,
        titleKey: 'upgrade_stat_pickup_title',
        descKey: 'upgrade_stat_pickup_desc',
        color: 0xffeb3b,
        icon: '🧲',
    },
    {
        key: 'damageMult',
        pct: 0.25,
        titleKey: 'upgrade_stat_bigdmg_title',
        descKey: 'upgrade_stat_bigdmg_desc',
        color: 0xb71c1c,
        icon: '🔥',
    },
];

export class UpgradeScene extends Phaser.Scene {
    private cards: Phaser.GameObjects.Container[] = [];
    private playerEid: number = -1;
    private playerLevel: number = 1;
    // 광고 시청 시 2장 선택 가능 — 기본 1.
    private maxPicks: number = 1;
    private picksDone: number = 0;

    constructor() {
        super({ key: 'UpgradeScene' });
    }

    init(data: { playerEid: number; playerLevel?: number }) {
        this.playerEid = data.playerEid;
        this.playerLevel = data.playerLevel ?? globalStats.currentLevel ?? 1;
        this.maxPicks = 1;
        this.picksDone = 0;
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

        const title = this.add.text(this.scale.width / 2, 80, I18n.t('upgrade_title'), {
            fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
            fontSize: '32px',
            color: '#ffd700',
            fontStyle: 'bold',
        });
        title.setOrigin(0.5);
        title.setDepth(1);

        const cardWidth = 200;
        const cardHeight = 280;
        const gap = 40;
        const cardY = this.scale.height / 2;

        const spawnCards = () => {
            // 기존 카드 모두 파괴
            this.cards.forEach((c) => c.destroy());
            this.cards = [];
            // 광고 시청 시(maxPicks=2) 4장, 기본 3장
            const count = this.maxPicks === 2 ? 4 : 3;
            const totalW = count * cardWidth + (count - 1) * gap;
            const sx = (this.scale.width - totalW) / 2 + cardWidth / 2;
            const cardData = this.pickRandomCards(count);
            cardData.forEach((data, i) => {
                const x = sx + i * (cardWidth + gap);
                const card = this.createCard(x, cardY, cardWidth, cardHeight, data);
                this.cards.push(card);
            });
        };
        spawnCards();

        // === 재추첨 버튼 (코인 100) — 카드 3장 다시 뽑기 ===
        // 카드 아래에 stack (extra-card 버튼은 cardY + cardH/2 + 45 사용). reroll 은 그 아래.
        const REROLL_COST = 100;
        const rerollBtnY = cardY + cardHeight / 2 + 100;
        const rerollBtn = this.add
            .text(this.scale.width / 2, rerollBtnY, `🎲 재추첨  💰 ${REROLL_COST}`, {
                fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
                fontSize: '22px',
                color: '#ffaa00',
                backgroundColor: '#3a2a1a',
                stroke: '#000000',
                strokeThickness: 3,
                padding: { x: 16, y: 8 },
            })
            .setOrigin(0.5)
            .setDepth(2);

        // 활성화 상태 펄스 (코인 충분 시만 — extra-card 와 동일 패턴, 시선 유도)
        let rerollPulse: Phaser.Tweens.Tween | null = null;
        const startRerollPulse = () => {
            if (rerollPulse) return;
            rerollPulse = this.tweens.add({
                targets: rerollBtn,
                scale: 1.05,
                duration: 700,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        };
        const stopRerollPulse = () => {
            if (rerollPulse) {
                rerollPulse.stop();
                rerollPulse = null;
                rerollBtn.setScale(1);
            }
        };

        const refreshRerollBtn = () => {
            const affordable = globalStats.totalCoins >= REROLL_COST;
            rerollBtn.setColor(affordable ? '#ffaa00' : '#666666');
            rerollBtn.setBackgroundColor(affordable ? '#3a2a1a' : '#1a1a1a');
            if (affordable) {
                rerollBtn.setInteractive({ useHandCursor: true });
                startRerollPulse();
            } else {
                rerollBtn.disableInteractive();
                stopRerollPulse();
            }
        };
        rerollBtn.on('pointerdown', () => {
            if (globalStats.totalCoins < REROLL_COST) return;
            // 클릭 피드백 — punch (scale 0.92 → 1.0 bounce) + 배경 플래시
            stopRerollPulse();
            this.tweens.add({
                targets: rerollBtn,
                scale: 0.92,
                duration: 80,
                yoyo: true,
                ease: 'Back.easeOut',
                onComplete: () => rerollBtn.setScale(1),
            });
            rerollBtn.setBackgroundColor('#ffaa00');
            this.time.delayedCall(120, () => rerollBtn.setBackgroundColor('#3a2a1a'));

            globalStats.totalCoins -= REROLL_COST;
            // UIScene 코인 표시 갱신 — coin_collected 이벤트 (negative 로 호환 안 됨, 직접 갱신)
            window.dispatchEvent(
                new CustomEvent('coin_collected', { detail: { amount: -REROLL_COST } }),
            );
            spawnCards();
            refreshRerollBtn();
        });
        refreshRerollBtn();

        // 카드 1장 더 버튼 (레벨업당 1회) — 광고 보면 추가 카드 1장.
        // 디자인 강화: 카드 아래 가까이 + 큰 폰트 + 노란 강조색 + 펄스로 시선 유도.
        let extraCardUsed = false;
        const extraBtnY = cardY + cardHeight / 2 + 45; // 카드 하단에서 적당히
        const extraCardBtn = this.add
            .text(this.scale.width / 2, extraBtnY, '🎬  ' + I18n.t('upgrade_extra_card_ad'), {
                fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
                fontSize: '24px',
                color: '#ffd700',
                backgroundColor: '#1e1e1e',
                stroke: '#000000',
                strokeThickness: 3,
                padding: { x: 18, y: 10 },
            })
            .setOrigin(0.5)
            .setDepth(2)
            .setInteractive({ useHandCursor: true });
        this.tweens.add({
            targets: extraCardBtn,
            scale: 1.05,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        extraCardBtn.on('pointerdown', async () => {
            if (extraCardUsed) return;
            extraCardUsed = true;
            extraCardBtn.disableInteractive().setAlpha(0.5);
            const success = await AdSDK.rewardedBreak();
            ApiClient.trackEvent(success ? 'ad_view' : 'ad_skip', {
                placement: 'extra_card',
            });
            if (success) {
                const extraCards = this.pickRandomCards(1);
                if (extraCards.length > 0) {
                    const extraCard = extraCards[0];
                    // 임시 위치에 생성 — 곧 4장 균형 배치로 setPosition.
                    const tempX = this.scale.width / 2;
                    const card = this.createCard(tempX, cardY, cardWidth, cardHeight, extraCard);
                    this.cards.push(card);
                    // 4장 중앙 재정렬 (3장 레이아웃은 한쪽으로 치우치므로 X 좌표 다시 계산)
                    const totalCount = this.cards.length;
                    const newTotalW = totalCount * cardWidth + (totalCount - 1) * gap;
                    const newStartX = (this.scale.width - newTotalW) / 2 + cardWidth / 2;
                    this.cards.forEach((c, idx) => {
                        const nx = newStartX + idx * (cardWidth + gap);
                        this.tweens.add({
                            targets: c,
                            x: nx,
                            duration: 350,
                            ease: 'Quad.easeOut',
                        });
                    });
                }
                // 광고 시청 보상: 카드 2장 선택 허용
                this.maxPicks = 2;
                extraCardBtn
                    .setText(I18n.t('upgrade_extra_card_unlocked'))
                    .setColor('#ffd700')
                    .setAlpha(0.95);
            } else {
                extraCardBtn.setText(I18n.t('upgrade_ad_failed')).setColor('#888888');
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
                title: I18n.t(stat.titleKey),
                description: I18n.t(stat.descKey),
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
                    description: tr(ev.description),
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
                        description: tr(relic.description),
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

        // Rarity 글로우 — evolution(금) / relic(주황) 카드에 펄스 애니메이션
        if (isEvolution || isRelic) {
            const glow = this.add.rectangle(
                0,
                0,
                w + 12,
                h + 12,
                isEvolution ? 0xffd700 : 0xff6b00,
                0.25,
            );
            container.add(glow);
            this.tweens.add({
                targets: glow,
                alpha: 0.5,
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }

        const bg = this.add.rectangle(0, 0, w, h, data.color, 0.4);
        bg.setStrokeStyle(strokeWidth, strokeColor, 1);
        container.add(bg);

        const icon = this.add.text(0, -80, data.icon, {
            fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
            fontSize: '64px',
        });
        icon.setOrigin(0.5);
        container.add(icon);

        const titleText = this.add.text(0, 0, data.title, {
            fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
            fontSize: '20px',
            color: isEvolution ? '#ffd700' : isRelic ? '#ff6b00' : '#ffffff',
            fontStyle: 'bold',
        });
        titleText.setOrigin(0.5);
        container.add(titleText);

        const descText = this.add.text(0, 60, data.description, {
            fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
            fontSize: '14px',
            color: '#cccccc',
            wordWrap: { width: w - 20 },
            align: 'center',
        });
        descText.setOrigin(0.5);
        container.add(descText);

        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => {
            bg.setFillStyle(data.color, 0.7);
            this.tweens.add({
                targets: container,
                scale: 1.06,
                duration: 150,
                ease: 'Back.easeOut',
            });
        });
        bg.on('pointerout', () => {
            bg.setFillStyle(data.color, 0.4);
            this.tweens.add({
                targets: container,
                scale: 1,
                duration: 150,
                ease: 'Sine.easeOut',
            });
        });
        bg.on('pointerdown', () => this.onCardSelected(data, container));

        return container;
    }

    private onCardSelected(data: CardData, container: Phaser.GameObjects.Container) {
        ApiClient.trackEvent('card_select', {
            type: data.type,
            title: data.title,
        });
        if (this.playerEid >= 0) {
            this.applyCard(data);
        }
        this.picksDone += 1;

        if (this.picksDone >= this.maxPicks) {
            this.scene.resume('MainScene');
            this.scene.stop();
            return;
        }

        // 광고로 2장 모드 — 첫 카드 선택 후 컨테이너 제거 + 안내 표시
        container.destroy();
        this.cards = this.cards.filter((c) => c !== container);
        // 화면 상단 안내 — '카드 1장 더 선택!'
        this.add
            .text(this.scale.width / 2, 180, I18n.t('upgrade_pick_one_more'), {
                fontFamily: '"Cinzel Decorative", "MedievalSharp", cursive',
                fontSize: '24px',
                color: '#ffd700',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(3);
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
