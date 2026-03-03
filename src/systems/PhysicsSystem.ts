import { defineQuery } from 'bitecs';
import { Position, Velocity, Enemy } from '../components';
import { world } from '../core/World';
import { SpatialHash } from '../core/SpatialHash';
import { isHitStopped } from '../fx/JuicePipeline';

import { DungeonGenerator, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../core/DungeonGenerator';

// Simple movement physics query
const physicsQuery = defineQuery([Position, Velocity]);
const enemyQuery = defineQuery([Enemy, Position]);

export const enemySpatialHash = new SpatialHash(64);

export const createPhysicsSystem = (dungeon: DungeonGenerator) => {
    return (dt: number) => {
        const ents = physicsQuery(world);
        const deltaSec = dt / 1000;

        if (!isHitStopped) {
            for (let i = 0; i < ents.length; i++) {
                const eid = ents[i];

                const nextX = Position.x[eid] + Velocity.x[eid] * deltaSec;
                const nextY = Position.y[eid] + Velocity.y[eid] * deltaSec;

                // Wall Collision check
                if (dungeon.isFloor(nextX, Position.y[eid])) {
                    Position.x[eid] = nextX;
                }
                if (dungeon.isFloor(Position.x[eid], nextY)) {
                    Position.y[eid] = nextY;
                }

                // Clamp to world bounds
                const w = MAP_WIDTH * TILE_SIZE;
                const h = MAP_HEIGHT * TILE_SIZE;
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
