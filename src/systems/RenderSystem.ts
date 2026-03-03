import Phaser from 'phaser';
import { defineQuery, hasComponent } from 'bitecs';
import { Animation, Position, SpriteInfo } from '../components';
import { world } from '../core/World';

const renderQuery = defineQuery([Position, SpriteInfo]);

// Map entity IDs to Blitter Bobs using a dense array instead of a Map for performance
const bobs: (Phaser.GameObjects.Bob | undefined)[] = [];

export const createRenderSystem = (_scene: Phaser.Scene, blitter: Phaser.GameObjects.Blitter) => {
    return (dt: number) => {
        const ents = renderQuery(world);

        // Add bobs if they don't exist
        for (let i = 0; i < ents.length; i++) {
            const eid = ents[i];
            const bob = bobs[eid];

            if (!bob) {
                // Determine frame from SpriteInfo if needed, defaulting to 0
                const frameId = SpriteInfo.textureIndex[eid];
                const newBob = blitter.create(Position.x[eid], Position.y[eid], frameId);
                bobs[eid] = newBob;
            } else {
                if (hasComponent(world, Animation, eid) && Animation.frameRate[eid] > 0) {
                    Animation.timer[eid] += dt;

                    const frameDuration = 1000 / Animation.frameRate[eid];
                    if (Animation.timer[eid] > frameDuration) {
                        Animation.timer[eid] -= frameDuration;

                        const frameStart = Animation.frameStart[eid];
                        const frameEnd = Animation.frameEnd[eid];
                        const currentFrame = SpriteInfo.textureIndex[eid];
                        const nextFrame = currentFrame >= frameEnd ? frameStart : currentFrame + 1;

                        SpriteInfo.textureIndex[eid] = nextFrame;
                        bob.setFrame(nextFrame);
                    }
                }

                // Update position
                bob.x = Position.x[eid];
                bob.y = Position.y[eid];
            }
        }
    };
};
