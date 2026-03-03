import { defineQuery, removeEntity } from 'bitecs';
import { Position, Velocity, Item, Player } from '../components';
import { world } from '../core/World';
import { isHitStopped } from '../fx/JuicePipeline';
import { globalStats } from '../core/PlayerStats';

const itemQuery = defineQuery([Position, Velocity, Item]);
const playerQuery = defineQuery([Position, Player]);

export class ItemSystem {
    private magnetRadius: number = 150;
    private pickupRadius: number = 30;
    
    // We can dispatch events for UI or logic to consume
    public totalXpCollected: number = 0;

    public update(_dt: number) {
        if (isHitStopped) return;
        const players = playerQuery(world);
        if (players.length === 0) return;
        const playerEid = players[0];
        
        const px = Position.x[playerEid];
        const py = Position.y[playerEid];

        const items = itemQuery(world);

        for (let i = 0; i < items.length; i++) {
            const eid = items[i];
            
            const ix = Position.x[eid];
            const iy = Position.y[eid];

            const dx = px - ix;
            const dy = py - iy;
            const distSq = dx * dx + dy * dy;

            const currentMagnetRadius = this.magnetRadius * globalStats.pickupRadiusMult;
            const currentPickupRadius = this.pickupRadius * globalStats.pickupRadiusMult;

            // If within pickup radius
            if (distSq <= currentPickupRadius * currentPickupRadius) {
                // Collect
                this.totalXpCollected += Item.xpValue[eid];
                window.dispatchEvent(new CustomEvent('xp_collected', { detail: Item.xpValue[eid] }));
                removeEntity(world, eid);
                continue;
            }

            // If within magnet radius, set magnetized flag
            if (distSq <= currentMagnetRadius * currentMagnetRadius) {
                Item.magnetized[eid] = 1;
            }

            // Move towards player if magnetized
            if (Item.magnetized[eid] === 1) {
                // Accelerate towards player
                const dist = Math.sqrt(distSq);
                const speed = 400; // suck speed
                
                Velocity.x[eid] = (dx / dist) * speed;
                Velocity.y[eid] = (dy / dist) * speed;
            } else {
                // Friction / slow down if not magnetized (e.g. they spawn with a little burst)
                Velocity.x[eid] *= 0.9;
                Velocity.y[eid] *= 0.9;
            }
        }
    }
}
