import { defineQuery, removeEntity, addEntity, addComponent, hasComponent } from 'bitecs';
import { Position, Spell, Health, Item, Velocity, SpriteInfo, Boss, Player, EnemyProjectile, Enemy } from '../components';
import { world } from '../core/World';
import { JuicePipeline } from '../fx/JuicePipeline';
import { enemySpatialHash } from './PhysicsSystem';

const spellQuery = defineQuery([Position, Spell]);

export const createCombatSystem = (juice: JuicePipeline) => {
    return (dt: number) => {
        const deltaSec = dt / 1000;
        const players = defineQuery([Player, Position, Health])(world);
        
        if (players.length > 0) {
            const playerEid = players[0];
            const px = Position.x[playerEid];
            const py = Position.y[playerEid];

            // 1. Enemy -> Player Damage (Contact)
            const enemies = defineQuery([Enemy, Position])(world);
            for (let i = 0; i < enemies.length; i++) {
                const eeid = enemies[i];
                if (hasComponent(world, Boss, eeid)) continue; 
                
                const dx = px - Position.x[eeid];
                const dy = py - Position.y[eeid];
                if (dx * dx + dy * dy < 20 * 20) {
                    Health.current[playerEid] -= 10 * deltaSec; 
                    window.dispatchEvent(new CustomEvent('hp_updated', { 
                        detail: { current: Health.current[playerEid], max: Health.max[playerEid] } 
                    }));
                }
            }

            // 2. Projectile -> Player Damage
            const eProjectiles = defineQuery([EnemyProjectile, Position])(world);
            for (let i = 0; i < eProjectiles.length; i++) {
                const epid = eProjectiles[i];
                const dx = px - Position.x[epid];
                const dy = py - Position.y[epid];
                if (dx * dx + dy * dy < 15 * 15) {
                    Health.current[playerEid] -= 15;
                    window.dispatchEvent(new CustomEvent('hp_updated', { 
                        detail: { current: Health.current[playerEid], max: Health.max[playerEid] } 
                    }));
                    removeEntity(world, epid);
                    juice.screenShake(0.01, 100);
                }
            }

            // 3. Player Death Check
            if (Health.current[playerEid] <= 0) {
                juice.whiteFlash(500);
                window.dispatchEvent(new CustomEvent('player_died'));
                console.log("GAME OVER");
            }
        }

        const spells = spellQuery(world);
        for (let i = 0; i < spells.length; i++) {
            const eid = spells[i];
            Spell.duration[eid] -= dt;
            if (Spell.duration[eid] <= 0) {
                removeEntity(world, eid);
                continue;
            }

            const sx = Position.x[eid];
            const sy = Position.y[eid];
            const sRadius = Spell.radius[eid];
            const potentialEnemies = enemySpatialHash.queryRect(sx, sy, sRadius * 2, sRadius * 2);

            for (const targetId of potentialEnemies) {
                const tx = Position.x[targetId];
                const ty = Position.y[targetId];
                const dx = tx - sx;
                const dy = ty - sy;
                if (dx * dx + dy * dy <= sRadius * sRadius) {
                    window.dispatchEvent(new CustomEvent('play_sound', { detail: 'hit' }));
                    
                    const typeId = SpriteInfo.textureIndex[eid];
                    if (typeId === 100) {
                        juice.whiteFlash(20); 
                        juice.vfx.playFireHit(tx, ty);
                    } else if (typeId === 101) {
                        juice.hitStop(30); 
                        juice.vfx.playIceHit(tx, ty);
                    } else if (typeId === 102) {
                        juice.vfx.playPoisonHit(tx, ty);
                    }
                    Health.current[targetId] -= Spell.damage[eid];
                    juice.damageNumber(tx, ty, Spell.damage[eid]);
                    juice.hitStop(20);
                    
                    if (Health.current[targetId] <= 0) {
                        const isBoss = hasComponent(world, Boss, targetId);
                        if (isBoss) {
                            window.dispatchEvent(new CustomEvent('stage_clear'));
                        }

                        const dropId = addEntity(world);
                        addComponent(world, Position, dropId);
                        addComponent(world, Velocity, dropId);
                        addComponent(world, Item, dropId);
                        addComponent(world, SpriteInfo, dropId);
                        Position.x[dropId] = tx;
                        Position.y[dropId] = ty;
                        Velocity.x[dropId] = (Math.random() - 0.5) * 100;
                        Velocity.y[dropId] = (Math.random() - 0.5) * 100;
                        Item.xpValue[dropId] = hasComponent(world, Boss, targetId) ? 500 : 10;
                        SpriteInfo.textureIndex[dropId] = 20; 
                        Item.magnetized[dropId] = 0;
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
