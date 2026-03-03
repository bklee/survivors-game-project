import Phaser from 'phaser';
import { defineQuery, hasComponent } from 'bitecs';
import { Animation, Position, SpriteInfo, Velocity, Health } from '../components';
import { world } from '../core/World';

const renderQuery = defineQuery([Position, SpriteInfo]);

// Map entity IDs to Blitter Bobs using a dense array instead of a Map for performance
const bobs: (Phaser.GameObjects.Bob | undefined)[] = [];

export const createRenderSystem = (_scene: Phaser.Scene, blitter: Phaser.GameObjects.Blitter, playerAura: Phaser.GameObjects.Graphics) => {
    return (dt: number) => {
        const ents = renderQuery(world);

        for (let i = 0; i < ents.length; i++) {
            const eid = ents[i];
            const bob = bobs[eid];
            const typeId = SpriteInfo.textureIndex[eid];

            // 1. Identify Character / Entity Type
            let charKey = '';
            if (typeId === 0) charKey = 'knight';
            else if (typeId === 1) charKey = 'wizard';
            else if (typeId === 2) charKey = 'elf';
            else if (typeId === 10) charKey = 'imp';
            else if (typeId === 11) charKey = 'demon';
            else if (typeId === 20) charKey = 'gem';
            else if (typeId === 12) charKey = 'orc';
            else if (typeId === 13) charKey = 'skeleton';
            else if (typeId === 100) charKey = 'spell_fire';
            else if (typeId === 101) charKey = 'spell_ice';
            else if (typeId === 102) charKey = 'spell_gas';
            else if (typeId === 103) charKey = 'spell_dud';
            else if (typeId === 104) charKey = 'enemy_bullet';

            // 2. Identify State (Idle vs Run)
            let state = 'idle';
            if (hasComponent(world, Velocity, eid)) {
                const speedSq = Velocity.x[eid] * Velocity.x[eid] + Velocity.y[eid] * Velocity.y[eid];
                if (speedSq > 100) state = 'run';
            }

            // 3. Handle Animation Framing
            let frameName: string | number = '';
            if (typeId >= 20 && typeId <= 104) {
                frameName = charKey;
            } else {
                const rate = Animation.frameRate[eid] || 8;
                Animation.timer[eid] += dt;
                const frameDuration = 1000 / rate;
                
                // Calculate current frame index in the cycle (0-3 usually)
                const currentFrameIdx = Math.floor(Animation.timer[eid] / frameDuration) % 4;
                frameName = `${charKey}_${state}_${currentFrameIdx}`;
            }
            // 4. Handle Death Effect (Vanishing)
            let currentAlpha = 1.0;
            if (hasComponent(world, Health, eid)) {
                if (Health.current[eid] <= 0) {
                    currentAlpha = 0.4; // fade out
                }
            }
            // 4. Render or Create Bob
            if (!bob) {
                const newBob = blitter.create(Position.x[eid], Position.y[eid], frameName);
                
                // Distinctions
                if (typeId === 10) { // imp
                    newBob.tint = 0xffaaaa;
                    newBob.alpha = 0.9;
                } else if (typeId === 11) { // demon
                    newBob.tint = 0xff5555;
                } else if (typeId === 104) { // enemy bullet
                    newBob.tint = 0xffff00; // yellow
                }
                
                newBob.alpha = currentAlpha;
                
                bobs[eid] = newBob;
            } else {
                bob.x = Position.x[eid];
                bob.y = Position.y[eid];
                bob.alpha = currentAlpha;
                try {
                    bob.setFrame(frameName);
                } catch (e) {
                    // fallback if frame name missing
                }

                // Player Aura (linked to any player type 0, 1, 2)
                if (typeId >= 0 && typeId <= 2) {
                    playerAura.setPosition(bob.x + 8, bob.y + 14);
                }
            }
        }
    };
};
