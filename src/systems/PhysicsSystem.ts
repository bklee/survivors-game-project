import { defineQuery } from 'bitecs';
import { Position, Velocity, Enemy } from '../components';
import { world } from '../core/World';
import { SpatialHash } from '../core/SpatialHash';

import { isHitStopped } from '../fx/JuicePipeline';

// Simple movement physics query
const physicsQuery = defineQuery([Position, Velocity]);
const enemyQuery = defineQuery([Enemy, Position]);

export const enemySpatialHash = new SpatialHash(64);

export const createPhysicsSystem = () => {
    return (dt: number) => {
        const ents = physicsQuery(world);
        const deltaSec = dt / 1000;

        if (!isHitStopped) {
            for (let i = 0; i < ents.length; i++) {
                const eid = ents[i];

                Position.x[eid] += Velocity.x[eid] * deltaSec;
                Position.y[eid] += Velocity.y[eid] * deltaSec;
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
