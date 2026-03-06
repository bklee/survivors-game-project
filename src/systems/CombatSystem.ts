import { defineQuery, removeEntity, addEntity, addComponent, hasComponent } from 'bitecs';
import { Position, Spell, Health, Item, Velocity, SpriteInfo, Boss, Player, EnemyProjectile, Enemy, Lifespan, Animation } from '../components';
import { world } from '../core/World';
import { JuicePipeline } from '../fx/JuicePipeline';
import { enemySpatialHash } from './PhysicsSystem';

const spellQuery = defineQuery([Position, Spell]);
const playerHealthQuery = defineQuery([Player, Position, Health]);
const enemyContactQuery = defineQuery([Enemy, Position]);
const enemyDeathQuery = defineQuery([Enemy, Position, Health]);
const enemyProjQuery = defineQuery([EnemyProjectile, Position]);

let lastSoundTime = 0;
const SOUND_THROTTLE_MS = 50;
let dmgNumbersThisFrame = 0;
const MAX_DMG_NUMBERS_PER_FRAME = 8;

export const createCombatSystem = (juice: JuicePipeline) => {
    return (dt: number) => {
        const deltaSec = dt / 1000;
        const now = performance.now();
        dmgNumbersThisFrame = 0;
        const players = playerHealthQuery(world);

        if (players.length > 0) {
            const playerEid = players[0];
            const px = Position.x[playerEid];
            const py = Position.y[playerEid];

            // 1. Enemy -> Player Damage (Contact)
            const enemies = enemyContactQuery(world);
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

            // 2. Projectile -> Player Damage & Lifespan Evaluation
            const eProjectiles = enemyProjQuery(world);
            for (let i = 0; i < eProjectiles.length; i++) {
                const epid = eProjectiles[i];

                if (hasComponent(world, Lifespan, epid)) {
                    Lifespan.duration[epid] -= dt;
                    if (Lifespan.duration[epid] <= 0) {
                        removeEntity(world, epid);
                        continue;
                    }
                }

                const dx = px - Position.x[epid];
                const dy = py - Position.y[epid];
                if (dx * dx + dy * dy < 15 * 15) {
                    Health.current[playerEid] -= 15;
                    window.dispatchEvent(new CustomEvent('hp_updated', {
                        detail: { current: Health.current[playerEid], max: Health.max[playerEid] }
                    }));
                    removeEntity(world, epid);
                }
            }

            // 3. Player Death Check
            if (Health.current[playerEid] <= 0) {
                juice.whiteFlash(500);
                window.dispatchEvent(new CustomEvent('player_died'));
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
                    if (now - lastSoundTime > SOUND_THROTTLE_MS) {
                        window.dispatchEvent(new CustomEvent('play_sound', { detail: 'hit' }));
                        lastSoundTime = now;
                    }

                    const typeId = SpriteInfo.textureIndex[eid];
                    if (typeId === 100) {
                        juice.vfx.playFireHit(tx, ty);
                    } else if (typeId === 101) {
                        // Reduced Hit Stop for balance
                        juice.hitStop(20);
                        juice.vfx.playIceHit(tx, ty);
                    } else if (typeId === 102) {
                        juice.vfx.playPoisonHit(tx, ty);
                    }

                    Health.current[targetId] -= Spell.damage[eid];

                    if (hasComponent(world, Boss, targetId)) {
                        const bName = SpriteInfo.textureIndex[targetId] === 69 ? "BIG DEMON" : (SpriteInfo.textureIndex[targetId] === 79 ? "BIG ZOMBIE" : "OGRE");
                        window.dispatchEvent(new CustomEvent('boss_hp', {
                            detail: { current: Health.current[targetId], max: Health.max[targetId], name: bName }
                        }));
                    }

                    if (dmgNumbersThisFrame < MAX_DMG_NUMBERS_PER_FRAME) {
                        juice.damageNumber(tx, ty, Spell.damage[eid]);
                        dmgNumbersThisFrame++;
                    }
                    juice.hitStop(10);

                    Spell.pierce[eid] -= 1;
                    if (Spell.pierce[eid] <= 0) {
                        removeEntity(world, eid);
                        break;
                    }
                }
            }
        }

        // Generic Enemy Death Check
        const allEnemies = enemyDeathQuery(world);
        for (let i = 0; i < allEnemies.length; i++) {
            const targetId = allEnemies[i];
            if (Health.current[targetId] <= 0) {
                const isBoss = hasComponent(world, Boss, targetId);
                if (isBoss) {
                    window.dispatchEvent(new CustomEvent('boss_hp', { detail: { current: 0, max: 100 } })); // Hide boss bar
                    window.dispatchEvent(new CustomEvent('stage_clear'));
                }

                const tx = Position.x[targetId];
                const ty = Position.y[targetId];

                // Direct XP Gain on Death (100% as requested)
                const totalXp = isBoss ? 500 : 10;
                window.dispatchEvent(new CustomEvent('xp_collected', {
                    detail: { amount: totalXp, isDirect: true }
                }));

                const dropId = addEntity(world);
                addComponent(world, Position, dropId);
                addComponent(world, Velocity, dropId);
                addComponent(world, Item, dropId);
                addComponent(world, SpriteInfo, dropId);
                addComponent(world, Animation, dropId);
                Position.x[dropId] = tx;
                Position.y[dropId] = ty;
                Velocity.x[dropId] = (Math.random() - 0.5) * 100;
                Velocity.y[dropId] = (Math.random() - 0.5) * 100;
                Item.xpValue[dropId] = 0; // Coins only increase coin count now, no EXP
                SpriteInfo.textureIndex[dropId] = 21; // Coin type
                Animation.timer[dropId] = Math.random() * 1000;
                Item.magnetized[dropId] = 0;
                removeEntity(world, targetId);
            }
        }
    };
};
