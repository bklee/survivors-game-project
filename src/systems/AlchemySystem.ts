import { AlchemySlot, SynergyEffect } from '../components/alchemy';
import { Element, SynergyDef, SYNERGIES, findSynergy } from '../constants/AlchemyConfig';
import { MetaProgress } from '../core/MetaProgress';

/**
 * 주어진 엔티티의 3슬롯 상태를 보고 일치하는 시너지를 반환.
 * 슬롯이 다 차지 않았으면 null.
 */
export function detectSynergy(eid: number): SynergyDef | null {
    const s0 = AlchemySlot.slot0[eid];
    const s1 = AlchemySlot.slot1[eid];
    const s2 = AlchemySlot.slot2[eid];
    if (s0 < 0 || s1 < 0 || s2 < 0) return null;
    return findSynergy([s0 as Element, s1 as Element, s2 as Element]);
}

/**
 * 빈 슬롯에 원소를 채우고, 빈 슬롯 없으면 첫 슬롯을 덮어쓴다.
 * 슬롯 변경 후 시너지 재계산하여 SynergyEffect.synergyId 갱신.
 * synergyId = SYNERGIES 배열 인덱스 (0~4), -1 = 비활성.
 */
export function applySlotChange(eid: number, element: Element): void {
    if (AlchemySlot.slot0[eid] < 0) {
        AlchemySlot.slot0[eid] = element;
    } else if (AlchemySlot.slot1[eid] < 0) {
        AlchemySlot.slot1[eid] = element;
    } else if (AlchemySlot.slot2[eid] < 0) {
        AlchemySlot.slot2[eid] = element;
    } else {
        AlchemySlot.slot0[eid] = element;
    }
    const synergy = detectSynergy(eid);
    SynergyEffect.synergyId[eid] = synergy ? SYNERGIES.findIndex((s) => s.id === synergy.id) : -1;

    if (synergy && !MetaProgress.load().discoveredSynergies.includes(synergy.id)) {
        MetaProgress.discoverSynergy(synergy.id);
        window.dispatchEvent(new CustomEvent('synergy_discovered', { detail: synergy }));
    }
}
