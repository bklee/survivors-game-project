import { defineQuery } from 'bitecs';
import { Position, Velocity, Enemy, SpriteInfo, Interactive } from '../components';
import { world } from '../core/World';
import { SpatialHash } from '../core/SpatialHash';
import { isHitStopped } from '../fx/JuicePipeline';

import { DungeonGenerator, TILE_SIZE } from '../core/DungeonGenerator';

// Simple movement physics query
const physicsQuery = defineQuery([Position, Velocity]);
const enemyQuery = defineQuery([Enemy, Position]);
const doorQuery = defineQuery([Position, SpriteInfo, Interactive]);

export const enemySpatialHash = new SpatialHash(64);

export const createPhysicsSystem = (dungeon: DungeonGenerator) => {
    return (dt: number) => {
        const ents = physicsQuery(world);
        const doors = doorQuery(world);
        const deltaSec = dt / 1000;

        if (!isHitStopped) {
            for (let i = 0; i < ents.length; i++) {
                const eid = ents[i];

                let nextX = Position.x[eid] + Velocity.x[eid] * deltaSec;
                let nextY = Position.y[eid] + Velocity.y[eid] * deltaSec;

                // 1. Wall Collision (Dungeon)
                let canMoveX = dungeon.isFloorRect(nextX, Position.y[eid], 12, 12);
                let canMoveY = dungeon.isFloorRect(Position.x[eid], nextY, 12, 12);

                // 2. Door Collision (Entities)
                for (let j = 0; j < doors.length; j++) {
                    const doorEid = doors[j];
                    if (SpriteInfo.textureIndex[doorEid] === 41 && Interactive.isActivated[doorEid] === 0) {
                        // Closed Door: Block like a wall
                        const dx = nextX - Position.x[doorEid];
                        const dy = Position.y[eid] - Position.y[doorEid];
                        if (Math.abs(dx) < 16 && Math.abs(dy) < 16) canMoveX = false;

                        const dy2 = nextY - Position.y[doorEid];
                        const dx2 = Position.x[eid] - Position.x[doorEid];
                        if (Math.abs(dy2) < 16 && Math.abs(dx2) < 16) canMoveY = false;
                    }
                }

                if (canMoveX) Position.x[eid] = nextX;
                if (canMoveY) Position.y[eid] = nextY;

                // Clamp to world bounds
                const w = dungeon.width * TILE_SIZE;
                const h = dungeon.height * TILE_SIZE;
                if (Position.x[eid] < 0) Position.x[eid] = 0;
                else if (Position.x[eid] > w) Position.x[eid] = w;

                if (Position.y[eid] < 0) Position.y[eid] = 0;
                else if (Position.y[eid] > h) Position.y[eid] = h;
            }
        }

        enemySpatialHash.clear();
        const enemies = enemyQuery(world);
        for (let i = 0; i < enemies.length; i++) {
            const eid = enemies[i];
            enemySpatialHash.insert(eid, Position.x[eid], Position.y[eid]);
        }
    };
};
