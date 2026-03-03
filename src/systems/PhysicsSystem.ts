import { defineQuery } from 'bitecs';
import { Position, Velocity } from '../components';
import { world } from '../core/World';

import { isHitStopped } from '../fx/JuicePipeline';

// Simple movement physics query
const physicsQuery = defineQuery([Position, Velocity]);

export const createPhysicsSystem = () => {
    return (dt: number) => {
        if (isHitStopped) return; // Freeze simulation during Hit Stop

        const ents = physicsQuery(world);
        const deltaSec = dt / 1000;

        for (let i = 0; i < ents.length; i++) {
            const eid = ents[i];

            Position.x[eid] += Velocity.x[eid] * deltaSec;
            Position.y[eid] += Velocity.y[eid] * deltaSec;

            // Basic boundaries or spatial hashing could go here
        }
    };
};
