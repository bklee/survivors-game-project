import { defineComponent, Types } from 'bitecs';

/**
 * Player가 보유한 3개 원소 슬롯. 값은 AlchemyConfig.Element enum.
 * -1 = 빈 슬롯.
 */
export const AlchemySlot = defineComponent({
    slot0: Types.i8,
    slot1: Types.i8,
    slot2: Types.i8,
});

/**
 * 현재 활성화된 시너지 효과 상태.
 * synergyId == -1 → 비활성
 * boostActiveUntil: TRIGGER로 활성된 강화 효과 종료 시각 (ms)
 * boostCooldownUntil: TRIGGER 쿨다운 종료 시각 (ms)
 */
export const SynergyEffect = defineComponent({
    synergyId: Types.i16,
    boostActiveUntil: Types.f64,
    boostCooldownUntil: Types.f64,
});
