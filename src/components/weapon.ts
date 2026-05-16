import { defineComponent, Types } from 'bitecs';

/**
 * 진화된 무기 상태.
 * evolutionId: EVOLUTIONS 인덱스 (0~11), -1 = 기본 무기
 * baseWeaponId: 0=Knight, 1=Wizard, 2=Elf, 3=Necromancer
 */
export const WeaponEvolution = defineComponent({
    evolutionId: Types.i8,
    baseWeaponId: Types.i8,
});
