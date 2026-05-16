import { defineComponent, Types } from 'bitecs';

export const Relic = defineComponent({
    bitmask: Types.ui32, // bit N = bit 위치의 relic 보유 여부
});
