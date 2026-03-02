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

// Linking ECS entities with Phaser Sprites/GameObjects
export const SpriteInfo = defineComponent({
    textureIndex: Types.ui8, // e.g. 0: player, 1: enemyA, etc.
    // other visual data could be added here
});

// Marker components for specific types
export const Player = defineComponent();
export const Enemy = defineComponent();
