import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Player, Health } from '../components';
import { Relic } from '../components/relic';
import { world } from '../core/World';
import { hasRelic } from '../constants/RelicConfig';
import { globalStats } from '../core/PlayerStats';

const TIME_CRYSTAL_INTERVAL_MS = 5000;
const TIME_CRYSTAL_DURATION_MS = 300;
const BERSERKER_HP_THRESHOLD = 0.3;
const BERSERKER_DMG_BOOST = 1.5;

const playerQuery = defineQuery([Player, Relic, Health]);

export class RelicSystem {
    private scene: Phaser.Scene;
    private lastTimeCrystal = 0;
    private berserkerActive = false;
    private berserkerBase = 1;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * 게임 시작 시 1회 호출 — passive 유물 효과 적용
     */
    applyPassives(eid: number): void {
        const mask = Relic.bitmask[eid];
        if (hasRelic(mask, 3)) globalStats.coinMult = (globalStats.coinMult ?? 1) * 1.5; // Greed Pouch
        if (hasRelic(mask, 4)) globalStats.pickupRadiusMult *= 2.0; // Magnet Core
        if (hasRelic(mask, 6)) globalStats.manaRegenMult = (globalStats.manaRegenMult ?? 1) * 1.3; // Mana Battery
        if (hasRelic(mask, 12)) globalStats.bonusMaxHp += 30; // Iron Hide
        if (hasRelic(mask, 13)) globalStats.damageMult *= 1.2; // Bronze Anvil
        if (hasRelic(mask, 14)) globalStats.pickupRadiusMult *= 1.5; // Hawk Eye
        if (hasRelic(mask, 15)) globalStats.cooldownMult *= 0.85; // Quickdraw
        // Scout Helmet (bit 7), Echo Boots (bit 10) 는 UI/PlayerSystem에서 별도 처리
    }

    /**
     * 매 프레임 호출 — tick 기반 효과 (time_crystal, berserker_belt)
     */
    tick(): void {
        const players = playerQuery(world);
        if (players.length === 0) return;
        const eid = players[0];
        const mask = Relic.bitmask[eid];
        const now = this.scene.time.now;

        // Time Crystal (bit 2)
        if (hasRelic(mask, 2)) {
            if (now - this.lastTimeCrystal >= TIME_CRYSTAL_INTERVAL_MS) {
                this.lastTimeCrystal = now;
                const until = now + TIME_CRYSTAL_DURATION_MS;
                window.dispatchEvent(
                    new CustomEvent('relic_time_crystal_proc', { detail: { until } }),
                );
            }
        }

        // Berserker Belt (bit 5)
        if (hasRelic(mask, 5)) {
            const ratio = Health.current[eid] / Health.max[eid];
            if (ratio < BERSERKER_HP_THRESHOLD && !this.berserkerActive) {
                this.berserkerBase = globalStats.damageMult;
                globalStats.damageMult = this.berserkerBase * BERSERKER_DMG_BOOST;
                this.berserkerActive = true;
            } else if (ratio >= BERSERKER_HP_THRESHOLD && this.berserkerActive) {
                globalStats.damageMult = this.berserkerBase;
                this.berserkerActive = false;
            }
        }
    }

    /**
     * 적 사망 이벤트 처리 — healing_crystal, vampire_fang
     */
    onEnemyKilled(): void {
        const players = playerQuery(world);
        if (players.length === 0) return;
        const eid = players[0];
        const mask = Relic.bitmask[eid];

        if (hasRelic(mask, 0)) {
            // Healing Crystal: 1% HP 회복
            Health.current[eid] = Math.min(
                Health.max[eid],
                Health.current[eid] + Health.max[eid] * 0.01,
            );
        }
        if (hasRelic(mask, 9)) {
            // Vampire Fang: 1 HP 흡혈
            Health.current[eid] = Math.min(Health.max[eid], Health.current[eid] + 1);
        }
    }

    /**
     * 플레이어 사망 직전 호출 — phoenix_feather 부활
     * @returns true면 부활 성공 (사망 처리 스킵)
     */
    tryRevive(eid: number): boolean {
        const mask = Relic.bitmask[eid];
        if (!hasRelic(mask, 1)) return false;
        // 부활 1회 — bit 1 비트 끄기 (재부활 방지)
        Relic.bitmask[eid] = mask & ~(1 << 1);
        Health.current[eid] = Math.floor(Health.max[eid] * 0.5);
        window.dispatchEvent(
            new CustomEvent('hp_updated', {
                detail: { current: Health.current[eid], max: Health.max[eid] },
            }),
        );
        return true;
    }
}
