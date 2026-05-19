import { defineComponent, Types } from 'bitecs';

// Position in 2D space
export const Position = defineComponent({
    x: Types.f32,
    y: Types.f32,
});

// Velocity in 2D space
export const Velocity = defineComponent({
    x: Types.f32,
    y: Types.f32,
});

// Health / HP
export const Health = defineComponent({
    current: Types.f32,
    max: Types.f32,
});

// Mana / MP
export const Mana = defineComponent({
    current: Types.f32,
    max: Types.f32,
});

// Linking ECS entities with Phaser Sprites/GameObjects
export const SpriteInfo = defineComponent({
    textureIndex: Types.ui16,
});

// ECS Animation for Blitter
export const Animation = defineComponent({
    frameStart: Types.ui16,
    frameEnd: Types.ui16,
    frameRate: Types.f32,
    timer: Types.f32,
});

// Marker components for specific types
export const Player = defineComponent();
export const Enemy = defineComponent();
export const Boss = defineComponent();
// 보스 변종 마커 — 시각적 차별화에 사용 (RenderSystem 에서 스케일/틴트 분기)
export const BossClone = defineComponent();
export const BossSplit = defineComponent();
export const EnemyProjectile = defineComponent();
export const Chest = defineComponent();
export const Scale = defineComponent({ value: Types.f32 });

// Weapons & Magic
export const Spell = defineComponent({
    damage: Types.f32,
    radius: Types.f32,
    duration: Types.f32,
    pierce: Types.ui8,
});

// Drops
export const Item = defineComponent({
    xpValue: Types.f32,
    magnetized: Types.ui8,
});

// Interactive (Levers, Doors)
export const Interactive = defineComponent({
    isActivated: Types.ui8, // 0: off, 1: on
    id: Types.ui16, // link lever with door
});

// Lifespan for projectiles and temporary entities
export const Lifespan = defineComponent({
    duration: Types.f32,
});

export const Rotation = defineComponent({
    angle: Types.f32,
});

export const ActionState = defineComponent({
    attackTimer: Types.f32,
    attackDuration: Types.f32,
});

// Alchemy system components
export { AlchemySlot, SynergyEffect } from './alchemy';

// Weapon evolution component
export { WeaponEvolution } from './weapon';

// Relic component
export { Relic } from './relic';
