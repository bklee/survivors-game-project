import { defineQuery, removeEntity, addEntity, addComponent } from 'bitecs';
import { Position, Spell, Health, Item, Velocity, SpriteInfo } from '../components';
import { world } from '../core/World';
import { JuicePipeline } from '../fx/JuicePipeline';
import { enemySpatialHash } from './PhysicsSystem';
const spellQuery = defineQuery([Position, Spell]);

export const createCombatSystem = (juice: JuicePipeline) => {
    return (dt: number) => {
        const spells = spellQuery(world);

        for (let i = 0; i < spells.length; i++) {
            const eid = spells[i];
            
            // Age the spell
            Spell.duration[eid] -= dt;
            if (Spell.duration[eid] <= 0) {
                removeEntity(world, eid);
                continue;
            }

            // Check collisions using spatial hash
            const sx = Position.x[eid];
            const sy = Position.y[eid];
            const sRadius = Spell.radius[eid];
            
            const potentialEnemies = enemySpatialHash.queryRect(sx, sy, sRadius * 2, sRadius * 2);

            for (const targetId of potentialEnemies) {
                const tx = Position.x[targetId];
                const ty = Position.y[targetId];

                // Simple circle collision
                const dx = tx - sx;
                const dy = ty - sy;
                const distSq = dx * dx + dy * dy;

                if (distSq <= sRadius * sRadius) {
                    // HIT!
                    Health.current[targetId] -= Spell.damage[eid];
                    
                    // Visual Juice
                    juice.damageNumber(tx, ty, Spell.damage[eid]);
                    juice.hitStop(20); // freeze frames slightly on hit
                    
                    if (Health.current[targetId] <= 0) {
                        // Dead
                        
                        // Drop XP Gem
                        const dropId = addEntity(world);
                        addComponent(world, Position, dropId);
                        addComponent(world, Velocity, dropId);
                        addComponent(world, Item, dropId);
                        addComponent(world, SpriteInfo, dropId);

                        Position.x[dropId] = tx;
                        Position.y[dropId] = ty;
                        
                        // Random pop out
                        Velocity.x[dropId] = (Math.random() - 0.5) * 100;
                        Velocity.y[dropId] = (Math.random() - 0.5) * 100;

                        Item.xpValue[dropId] = 10;
                        Item.magnetized[dropId] = 0;
                        
                        SpriteInfo.textureIndex[dropId] = 40; // Some small gem sprite

                        removeEntity(world, targetId);
                    }

                    Spell.pierce[eid] -= 1;
                    if (Spell.pierce[eid] <= 0) {
                        removeEntity(world, eid);
                        break;
                    }
                }
            }
        }
    };
};
