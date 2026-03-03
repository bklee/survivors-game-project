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
    textureIndex: Types.ui16, // e.g. 0: player, 1: enemyA, etc.
});

// ECS Animation for Blitter
export const Animation = defineComponent({
    frameStart: Types.ui16,
    frameEnd: Types.ui16,
    frameRate: Types.f32, // Frames per second
    timer: Types.f32,     // Internal timer accumulator
});

// Marker components for specific types
export const Player = defineComponent();
export const Enemy = defineComponent();
export const Boss = defineComponent();
export const Scale = defineComponent({ value: Types.f32 });
export const Chest = defineComponent();

// Weapons & Magic
export const Spell = defineComponent({
    damage: Types.f32,
    radius: Types.f32, // hit radius
    duration: Types.f32, // remaining lifespan in ms
    pierce: Types.ui8, // how many enemies it can hit
});

// Drops (XP gems, health potions, gold)
export const Item = defineComponent({
    xpValue: Types.f32,
    magnetized: Types.ui8, // 1 = flying towards player
});
