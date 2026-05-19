import { defineQuery, removeEntity, addEntity, addComponent, hasComponent } from 'bitecs';
import {
    Position,
    Spell,
    Health,
    Item,
    Velocity,
    SpriteInfo,
    Boss,
    BossSplit,
    Player,
    EnemyProjectile,
    Enemy,
    Lifespan,
    Animation,
} from '../components';
import { world } from '../core/World';
import { JuicePipeline } from '../fx/JuicePipeline';
import { enemySpatialHash } from './PhysicsSystem';
import { globalStats } from '../core/PlayerStats';

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
                    window.dispatchEvent(
                        new CustomEvent('hp_updated', {
                            detail: {
                                current: Health.current[playerEid],
                                max: Health.max[playerEid],
                            },
                        }),
                    );
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
                const typeId = SpriteInfo.textureIndex[epid];

                // 보스 투사체별 특성 설정
                let hitRadius = 15;
                let damage = 15;

                if (typeId === 100) {
                    // 대악마 불기둥
                    hitRadius = 12.5;
                    damage = 25;
                } else if (typeId === 102) {
                    // 좀비 독구름
                    hitRadius = 18; // 1.25배 스케일 반영
                    damage = 15;
                } else if (typeId === 101) {
                    // 오우거 충격파
                    hitRadius = 15;
                    damage = 20;
                }

                if (dx * dx + dy * dy < hitRadius * hitRadius) {
                    Health.current[playerEid] -= damage;
                    window.dispatchEvent(
                        new CustomEvent('hp_updated', {
                            detail: {
                                current: Health.current[playerEid],
                                max: Health.max[playerEid],
                            },
                        }),
                    );

                    // 불기둥은 피격 시 사라지게 할지, 아니면 일정 시간 유지할지 결정
                    // 현재는 투사체 로직을 공유하므로 히트 시 제거
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
                        const bName =
                            SpriteInfo.textureIndex[targetId] === 69
                                ? 'BIG DEMON'
                                : SpriteInfo.textureIndex[targetId] === 79
                                  ? 'BIG ZOMBIE'
                                  : 'OGRE';
                        window.dispatchEvent(
                            new CustomEvent('boss_hp', {
                                detail: {
                                    current: Health.current[targetId],
                                    max: Health.max[targetId],
                                    name: bName,
                                },
                            }),
                        );
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
                const tx = Position.x[targetId];
                const ty = Position.y[targetId];

                // === Stage 9+ 보스 분열 (30%) — 처치 시 작은 보스 2개로 분열 ===
                // 분열되면 stage_clear 발사 안 함 → WaveSystem 이 Boss count 0 될 때 자연스럽게 stage_clear
                let didSplit = false;
                if (isBoss && globalStats.currentStage >= 9 && Math.random() < 0.3) {
                    const typeId = SpriteInfo.textureIndex[targetId];
                    const newHp = Math.max(50, Health.max[targetId] * 0.25);
                    for (let off = 0; off < 2; off++) {
                        const sid = addEntity(world);
                        addComponent(world, Position, sid);
                        addComponent(world, Velocity, sid);
                        addComponent(world, Health, sid);
                        addComponent(world, SpriteInfo, sid);
                        addComponent(world, Animation, sid);
                        addComponent(world, Enemy, sid);
                        addComponent(world, Boss, sid);
                        addComponent(world, BossSplit, sid);
                        Position.x[sid] = tx + (off === 0 ? -60 : 60);
                        Position.y[sid] = ty + (off === 0 ? -30 : 30);
                        const angle = Math.random() * Math.PI * 2;
                        Velocity.x[sid] = Math.cos(angle) * 40;
                        Velocity.y[sid] = Math.sin(angle) * 40;
                        Health.current[sid] = newHp;
                        Health.max[sid] = newHp;
                        SpriteInfo.textureIndex[sid] = typeId;
                        Animation.frameRate[sid] = 8;
                        Animation.timer[sid] = 0;
                    }
                    didSplit = true;
                    // 분열된 새 보스 중 한 개의 HP 로 UI 막대 갱신 (대표 표시)
                    window.dispatchEvent(
                        new CustomEvent('boss_hp', {
                            detail: { current: newHp, max: newHp, name: 'SPLIT BOSS' },
                        }),
                    );
                }

                if (isBoss && !didSplit) {
                    window.dispatchEvent(
                        new CustomEvent('boss_hp', { detail: { current: 0, max: 100 } }),
                    ); // Hide boss bar
                    window.dispatchEvent(new CustomEvent('stage_clear'));
                }

                // 사용자 요청: 스테이지가 올라갈수록 몬스터가 주는 경험치도 비례해서 상승 (스테이지당 20%씩 복리 증가)
                const stageScale = Math.pow(1.2, globalStats.currentStage - 1);
                const totalXp = Math.floor((isBoss ? 500 : 10) * stageScale);

                window.dispatchEvent(
                    new CustomEvent('xp_collected', {
                        detail: { amount: totalXp, isDirect: true },
                    }),
                );

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
                const coinValue = Math.floor(Math.random() * 100) + 1;
                Item.xpValue[dropId] = coinValue; // Coins drop random value 1-100
                SpriteInfo.textureIndex[dropId] = 21; // Coin type
                Animation.timer[dropId] = Math.random() * 1000;
                Item.magnetized[dropId] = 0;
                window.dispatchEvent(new CustomEvent('enemy_killed'));
                removeEntity(world, targetId);
            }
        }
    };
};
