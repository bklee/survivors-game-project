import Phaser from 'phaser';
import { defineQuery, ComponentRef } from 'bitecs';
import { Position, SpriteInfo } from '../components';
import { world } from '../core/World';

const renderQuery = defineQuery([Position, SpriteInfo]);

// Map entity IDs to Blitter Bobs
const bobs = new Map<number, Phaser.GameObjects.Bob>();

export const createRenderSystem = (scene: Phaser.Scene, blitter: Phaser.GameObjects.Blitter) => {
    return () => {
        const ents = renderQuery(world);

        // Add bobs if they don't exist
        for (let i = 0; i < ents.length; i++) {
            const eid = ents[i];

            if (!bobs.has(eid)) {
                // Determine frame from SpriteInfo if needed, defaulting to 0
                const frameId = SpriteInfo.textureIndex[eid];
                const bob = blitter.create(Position.x[eid], Position.y[eid], frameId);
                bobs.set(eid, bob);
            } else {
                // Update position
                const bob = bobs.get(eid);
                if (bob) {
                    bob.x = Position.x[eid];
                    bob.y = Position.y[eid];
                }
            }
        }
    };
};
