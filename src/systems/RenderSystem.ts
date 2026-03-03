import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { Position, SpriteInfo } from '../components';
import { world } from '../core/World';

const renderQuery = defineQuery([Position, SpriteInfo]);

// Map entity IDs to Blitter Bobs using a dense array instead of a Map for performance
const bobs: (Phaser.GameObjects.Bob | undefined)[] = [];

export const createRenderSystem = (_scene: Phaser.Scene, blitter: Phaser.GameObjects.Blitter) => {
    return () => {
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
                // Update position
                bob.x = Position.x[eid];
                bob.y = Position.y[eid];
            }
        }
    };
};
