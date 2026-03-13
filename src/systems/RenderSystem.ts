import Phaser from 'phaser';
import { defineQuery, hasComponent } from 'bitecs';
import { Animation, Position, SpriteInfo, Velocity, Health, Interactive, Rotation, Boss, Player } from '../components';
import { world } from '../core/World';
import { globalStats } from '../core/PlayerStats';

const MONSTER_CONFIG: Record<number, { name: string, hasIdleRun: boolean, frames?: number }> = {
    // Demons
    60: { name: 'chort', hasIdleRun: true },
    61: { name: 'imp', hasIdleRun: true },
    62: { name: 'wogol', hasIdleRun: true },
    69: { name: 'big_demon', hasIdleRun: true }, // BOSS

    // Undeads
    70: { name: 'tiny_zombie', hasIdleRun: true },
    71: { name: 'necromancer', hasIdleRun: false },
    72: { name: 'skelet', hasIdleRun: true },
    73: { name: 'zombie', hasIdleRun: false },
    74: { name: 'doc', hasIdleRun: true },
    75: { name: 'ice_zombie', hasIdleRun: false },
    79: { name: 'big_zombie', hasIdleRun: true }, // BOSS

    // Orcs
    80: { name: 'orc_shaman', hasIdleRun: true },
    81: { name: 'orc_warrior', hasIdleRun: true },
    82: { name: 'goblin', hasIdleRun: true },
    83: { name: 'masked_orc', hasIdleRun: true },
    89: { name: 'ogre', hasIdleRun: true }, // BOSS
};

const renderQuery = defineQuery([Position, SpriteInfo]);
const bobs: (Phaser.GameObjects.Bob | undefined)[] = [];
const sprites: (Phaser.GameObjects.Sprite | undefined)[] = [];
const playerWeaponSprites: (Phaser.GameObjects.Sprite | undefined)[] = [];
let playerAttackTimer = 0;

window.addEventListener('combo_cast', (e: any) => {
    playerAttackTimer = e.detail?.duration || 400;
});

export const createRenderSystem = (_scene: Phaser.Scene, blitter: Phaser.GameObjects.Blitter) => {
    return (dt: number) => {
        if (playerAttackTimer > 0) playerAttackTimer -= dt;

        const ents = renderQuery(world);
        const activeEids = new Set(ents);

        const players = defineQuery([Player, Position])(world);
        let px = 0, py = 0;
        if (players.length > 0) {
            px = Position.x[players[0]];
            py = Position.y[players[0]];
        }

        for (let i = 0; i < ents.length; i++) {
            const eid = ents[i];

            // 0. Viewport Culling for Performance
            const dx_p = Position.x[eid] - px;
            const dy_p = Position.y[eid] - py;
            if (dx_p * dx_p + dy_p * dy_p > 500 * 500) {
                const b = bobs[eid];
                if (b) b.setVisible(false);
                const s = sprites[eid];
                if (s) s.setVisible(false);
                continue;
            }

            const typeId = SpriteInfo.textureIndex[eid];
            let bob = bobs[eid];
            let frameName: string | number = '';

            // 1. Identify Character / Entity Type
            let charKey = '';
            let textureKey = 'dungeon';
            if (typeId === 0) charKey = 'knight';
            else if (typeId === 1) charKey = 'wizard';
            else if (typeId === 2) charKey = 'elf';
            else if (typeId === 10) charKey = 'imp';
            else if (typeId === 11) charKey = 'demon';
            else if (typeId === 12) charKey = 'orc';
            else if (typeId === 13) charKey = 'skeleton';
            else if (typeId === 14) charKey = 'orc';
            else if (typeId === 15) charKey = 'gem';
            else if (typeId === 20) charKey = 'gem';
            else if (typeId === 21) charKey = 'coin'; // Coin drop
            else if (typeId === 30) charKey = 'prop_crate';
            else if (typeId === 31) charKey = 'prop_skull';
            else if (typeId === 32) charKey = 'prop_spikes';
            else if (typeId === 33) charKey = 'prop_column';
            else if (typeId === 34) charKey = 'prop_crate';
            else if (typeId === 35) charKey = 'spell_fire';
            else if (typeId === 36) charKey = 'prop_chest';
            else if (typeId === 40) charKey = 'lever';
            else if (typeId === 41) charKey = 'door';
            else if (typeId === 50) charKey = 'flask_green';
            else if (typeId === 51) charKey = 'flask_yellow';
            else if (typeId === 52) charKey = 'flask_red';
            else if (typeId === 53) charKey = 'flask_blue';
            else if (typeId === 54) charKey = 'flask_big_green';
            else if (typeId === 55) charKey = 'flask_big_yellow';
            else if (typeId === 56) charKey = 'flask_big_red';
            else if (typeId === 57) charKey = 'flask_big_blue';
            else if (typeId === 90) { charKey = 'column'; textureKey = 'walls'; }
            else if (typeId === 91) { charKey = 'column_wall'; textureKey = 'walls'; }
            else if (typeId === 92) { charKey = 'wall_fountain_top_blue_f0'; textureKey = 'walls'; }
            else if (typeId === 93) { charKey = 'wall_fountain_mid_blue_f0'; textureKey = 'walls'; }
            else if (typeId === 94) { charKey = 'wall_fountain_top_red_f0'; textureKey = 'walls'; }
            else if (typeId === 95) { charKey = 'wall_fountain_mid_red_f0'; textureKey = 'walls'; }
            else if (typeId >= 60 && typeId <= 89) {
                const config = MONSTER_CONFIG[typeId];
                if (config) {
                    charKey = config.name;
                    textureKey = config.name; // We'll handle exact frame name later
                }
            } else if (typeId >= 100) {
                if (typeId === 100) charKey = 'spell_fire';
                else if (typeId === 101) charKey = 'spell_ice';
                else if (typeId === 102) charKey = 'spell_gas';
                else if (typeId === 103) charKey = 'spell_dud';
                else if (typeId === 104) charKey = 'enemy_bullet';
                else if (typeId === 105) charKey = 'weapon_sword';
                else if (typeId === 106) { charKey = 'weapon_arrow'; textureKey = 'dungeon'; frameName = 'weapon_arrow'; }
                else if (typeId === 107) charKey = 'weapon_staff';
                else if (typeId === 108) { charKey = 'weapon_bow'; textureKey = 'dungeon'; frameName = 'weapon_bow'; }
                else if (typeId === 109) charKey = 'sword_slash';
                else if (typeId === 110) charKey = 'super_slash';
            }

            const isPlayer = hasComponent(world, Player, eid);

            // 캐릭터 typeId(0=knight,1=wizard,2=elf)이지만 Player 컴포넌트가 없으면 렌더링하지 않음
            // (bitECS 기본값 0으로 인해 wizard 스프라이트가 바닥 구조물로 나타나는 문제 방지)
            if ((typeId === 0 || typeId === 1 || typeId === 2) && !isPlayer) continue;

            const isPillarPart = typeId >= 90 && typeId <= 95;
            // BOSS IDs: 69, 79, 89. Ogre(89)가 누락되지 않도록 범위를 89까지 확장.
            const requiresSprite = isPlayer || typeId >= 100 || (typeId >= 60 && typeId <= 89) || typeId >= 50 || typeId === 36 || typeId === 21 || isPillarPart || hasComponent(world, Rotation, eid);

            // 2. Identify State (Idle vs Run)
            let state = 'idle';
            if (hasComponent(world, Velocity, eid)) {
                const speedSq = Velocity.x[eid] * Velocity.x[eid] + Velocity.y[eid] * Velocity.y[eid];
                if (speedSq > 100) state = 'run';
            }

            // 3. Handle Animation Framing
            if (typeId === 93) {
                // 블루 분수 하단 애니메이션
                const rate = 8;
                Animation.timer[eid] = (Animation.timer[eid] || 0) + dt;
                const fIdx = Math.floor(Animation.timer[eid] / (1000 / rate)) % 3;
                frameName = `wall_fountain_mid_blue_f${fIdx}`;
            } else if (typeId === 94) {
                // 레드 분수 상단 애니메이션
                const rate = 8;
                Animation.timer[eid] = (Animation.timer[eid] || 0) + dt;
                const fIdx = Math.floor(Animation.timer[eid] / (1000 / rate)) % 3;
                frameName = `wall_fountain_top_red_f${fIdx}`;
            } else if (typeId === 95) {
                // 레드 분수 하단 애니메이션
                const rate = 8;
                Animation.timer[eid] = (Animation.timer[eid] || 0) + dt;
                const fIdx = Math.floor(Animation.timer[eid] / (1000 / rate)) % 3;
                frameName = `wall_fountain_mid_red_f${fIdx}`;
            } else if (isPillarPart || typeId === 15 || typeId === 20 || (typeId >= 22 && typeId <= 31) || [33, 34, 35, 50, 51, 52, 53, 54, 55, 56, 57].includes(typeId) || (typeId >= 101 && typeId <= 107)) {
                frameName = charKey;
            } else if (typeId === 40) {
                frameName = Interactive.isActivated[eid] ? 'lever_on' : 'lever_off';
            } else if (typeId === 41) {
                frameName = Interactive.isActivated[eid] ? 'door_open' : 'door_closed';
            } else if (typeId === 32) {
                const rate = 4;
                const animIdx = Math.floor(Animation.timer[eid] * rate / 1000) % 4;
                frameName = `prop_spikes_${animIdx}`;
                Animation.timer[eid] += dt;
            } else if (typeId === 36) {
                textureKey = 'dungeon';
                if (hasComponent(world, Interactive, eid) && Interactive.isActivated[eid]) {
                    frameName = `chest_empty_open_f2`;
                } else {
                    const dx = Position.x[eid] - px;
                    const dy = Position.y[eid] - py;
                    if (dx * dx + dy * dy < 60 * 60) {
                        frameName = `chest_full_open_f2`;
                    } else {
                        frameName = `chest_full_open_f0`;
                    }
                }
            } else if (typeId === 21) {
                // Coin Animation
                const rate = 8;
                Animation.timer[eid] = (Animation.timer[eid] || 0) + dt;
                const fIdx = Math.floor(Animation.timer[eid] / (1000 / rate)) % 4;
                textureKey = 'dungeon';
                frameName = `coin_f${fIdx}`;
            } else if (typeId === 100) {
                // Spell Fire Animation (Wizard Attack)
                const rate = 12;
                Animation.timer[eid] = (Animation.timer[eid] || 0) + dt;
                const fIdx = Math.floor(Animation.timer[eid] / (1000 / rate)) % 3;
                textureKey = `spell_fire_f${fIdx}`;
                frameName = '';
            } else if (typeId === 109 || typeId === 110) {
                // Slash Animation
                const rate = 12;
                Animation.timer[eid] = (Animation.timer[eid] || 0) + dt;
                const fIdx = Math.floor(Animation.timer[eid] / (1000 / rate)) % 3;
                textureKey = `${charKey}_f${fIdx}`;
                frameName = '';
            } else if (typeId >= 60 && typeId <= 89) {
                const config = MONSTER_CONFIG[typeId];
                if (config) {
                    const rate = Animation.frameRate[eid] || 8;
                    Animation.timer[eid] += dt;
                    const maxF = config.frames || 4;
                    const fIdx = Math.floor(Animation.timer[eid] / (1000 / rate)) % maxF;
                    textureKey = 'dungeon';
                    if (config.hasIdleRun) {
                        frameName = `${config.name}_${state}_f${fIdx}`;
                    } else {
                        frameName = `${config.name}_f${fIdx}`;
                    }
                }
            } else {
                const rate = Animation.frameRate[eid] || 8;
                Animation.timer[eid] += dt;
                const currentFrameIdx = Math.floor(Animation.timer[eid] / (1000 / rate)) % 4;
                frameName = `${charKey}_${state}_${currentFrameIdx}`;
            }

            // 4. Handle Alpha (Death Effect)
            let currentAlpha = 1.0;
            if (hasComponent(world, Health, eid) && typeId < 30 && Health.current[eid] <= 0) currentAlpha = 0.4;

            // 5. Render Bob or Sprite
            let finalFrame: string | number = frameName;
            if (textureKey === 'dungeon' && !blitter.texture.has(frameName.toString()) && charKey !== 'weapon_bow') {
                finalFrame = 'floor';
            }

            if (requiresSprite) {
                if (bob) { bob.destroy(); bobs[eid] = undefined; bob = undefined; }
                let sprite = sprites[eid];
                if (!sprite) {
                    const textureArg = textureKey;
                    const frameArg = (finalFrame === '' || finalFrame === undefined) ? undefined : finalFrame as any;

                    sprite = _scene.add.sprite(Position.x[eid], Position.y[eid], textureArg, frameArg);

                    // Adjust origin for characters to ground them better
                    if (isPlayer || (typeId >= 60 && typeId <= 89)) {
                        sprite.setOrigin(0.5, 0.85); // 조금 더 하단으로 조정 (0.8 -> 0.85)
                    } else if (isPillarPart) {
                        sprite.setOrigin(0.5, 1.0); // 기둥은 발을 바닥에 붙임
                    } else if (charKey === 'weapon_bow' || charKey === 'weapon_sword' || charKey === 'weapon_staff' || charKey === 'weapon_arrow') {
                        sprite.setOrigin(0.5, 0.5);
                    }

                    sprites[eid] = sprite;
                } else {
                    let renderY = Position.y[eid];
                    // Also adjust position when recycling just in case
                    sprite.setPosition(Position.x[eid], renderY);
                    sprite.alpha = currentAlpha;
                    const frameArg = (finalFrame === '' || finalFrame === undefined) ? undefined : finalFrame as any;
                    sprite.setTexture(textureKey, frameArg);
                }

                // Y-Sorting 적용: depth를 Y좌표로 설정 (프롭, 캐릭터 모두 동일 기준)
                let depthOffset = 0;
                if (typeId >= 100) {
                    depthOffset = 10; // 스펠은 공중에 떠있으므로 조금 더 위로
                } else if (typeId === 90 || typeId === 92 || typeId === 94) {
                    // 기둥 및 분수 상부 파트의 깊이를 하부 베이스라인(Position.y + 32)으로 통합 투영
                    depthOffset = 32; 
                } else if (typeId === 93 || typeId === 95) {
                    // 하단 파트는 별도 상향 오프셋 없이 자신의 Y 좌표를 그대로 따름 (MainScene에서 개별 조정)
                    depthOffset = 0;
                }
                
                sprite.setDepth(Position.y[eid] + depthOffset);

                sprite.setVisible(true);
                const isBoss = hasComponent(world, Boss, eid);
                if (isBoss) {
                    sprite.setScale(2.5);
                    // --- 루프 반복 시 색상 변경 (매 9스테이지/1사이클 마다 점진적 변화) ---
                    const cycleCount = Math.floor((globalStats.currentStage - 1) / 9);
                    if (cycleCount > 0) {
                        const hue = (cycleCount * 60) % 360; 
                        const colorObj = Phaser.Display.Color.HSVToRGB(hue / 360, 0.8, 1);
                        sprite.setTint(colorObj.color);
                    } else {
                        sprite.clearTint();
                    }
                } else if (typeId === 100) {
                    sprite.setScale(1.5);
                    sprite.clearTint();
                } else {
                    sprite.setScale(1.0);
                    if (typeId === 104) {
                        sprite.tint = 0xffff00;
                    } else if (isPlayer) {
                        // --- 캐릭터 색상 진화 (요청하신 청록색 위저드 스타일 반영) ---
                        const level = globalStats.currentLevel;
                        // XP가 많아도 레벨업 로직이 돌아야 적용되므로 UI에서 레벨업 체크 확인 필수
                        if (level >= 30) sprite.setTint(0xffd700);      // Lv 30+ Gold
                        else if (level >= 20) sprite.setTint(0xff00ff); // Lv 20+ Purple
                        else if (level >= 10) sprite.setTint(0x00ffff); // Lv 10+ Cyan
                        else if (level >= 5) sprite.setTint(0x00ff00);  // Lv 5+ Green
                        else sprite.clearTint();
                    } else {
                        sprite.clearTint();
                    }
                }

                if (hasComponent(world, Velocity, eid) && !hasComponent(world, Rotation, eid)) {
                    if (Velocity.x[eid] < 0) sprite.flipX = true;
                    else if (Velocity.x[eid] > 0) sprite.flipX = false;
                }
                if (hasComponent(world, Rotation, eid)) {
                    // Arrow (typeId 106/108) needs a 90-degree offset because it is vertical in tileset
                    if (charKey === 'weapon_arrow' || typeId === 108 || typeId === 106) {
                        sprite.rotation = Rotation.angle[eid] + Math.PI / 2;
                    } else {
                        sprite.rotation = Rotation.angle[eid];
                    }
                    // Slash sprites: ensure no flip interferes with rotation
                    if (typeId === 109 || typeId === 110) {
                        sprite.flipX = false;
                        sprite.flipY = false;
                    }
                }
                // 이전 중복 Tint 초기화 코드 제거 (이곳에서 clearTint를 호출하여 위에서 설정한 색상이 무효화되고 있었음)
                // if (typeId === 104) sprite.tint = 0xffff00;
                // else sprite.clearTint();

                // Render specific player weapons
                if (isPlayer && (charKey === 'knight' || charKey === 'wizard' || charKey === 'elf')) {
                    let wSprite = playerWeaponSprites[eid];
                    if (!wSprite) {
                        let weaponTex = 'dungeon';
                        let weaponFrame: string | undefined = undefined;

                        if (charKey === 'knight') weaponTex = 'weapon_knight_sword';
                        else if (charKey === 'wizard') weaponTex = 'weapon_green_magic_staff';
                        else {
                            weaponTex = 'dungeon';
                            weaponFrame = 'weapon_bow';
                        }

                        wSprite = _scene.add.sprite(Position.x[eid], Position.y[eid], weaponTex, weaponFrame);
                        // Wizard와 Elf의 무기(지팡이, 활)은 하단 끝(1.0)을 기준으로 정렬하여 발끝과 맞춤
                        wSprite.setOrigin(0.5, (charKey === 'wizard' || charKey === 'elf') ? 1.0 : 0.8);
                        wSprite.setDepth(29); 
                        playerWeaponSprites[eid] = wSprite;
                    }

                    const wx = charKey === 'wizard' ? 4 : (charKey === 'elf' ? 5 : 5); 
                    const wy = (charKey === 'wizard' || charKey === 'elf') ? 4 : -7; 
                    let baseRot = charKey === 'knight' ? -Math.PI / 4 : 0;

                    let swingRot = 0;
                    if (playerAttackTimer > 0) {
                        const animDuration = (charKey === 'knight') ? 250 : 400;
                        const progress = Math.max(0, 1 - (playerAttackTimer / animDuration));

                        if (charKey === 'knight') {
                            swingRot = Math.sin(progress * Math.PI) * (Math.PI * 0.8);
                        }
                        else if (charKey === 'wizard') swingRot = Math.sin(progress * Math.PI) * (Math.PI / 15); // 까딱(약 12도) 하는 효과로 최소화
                        else swingRot = Math.sin(progress * Math.PI) * (Math.PI / 4);
                    } else if (state === 'run') {
                        swingRot = Math.sin(Animation.timer[eid] / 100) * 0.15;
                    }

                    if (sprite.flipX) {
                        wSprite.setPosition(Position.x[eid] - wx, Position.y[eid] + wy);
                        wSprite.flipX = true;
                        wSprite.rotation = -baseRot - swingRot;
                    } else {
                        wSprite.setPosition(Position.x[eid] + wx, Position.y[eid] + wy);
                        wSprite.flipX = false;
                        wSprite.rotation = baseRot + swingRot;
                    }

                    wSprite.setVisible(true);
                    wSprite.alpha = currentAlpha;

                    // --- 무기도 캐릭터 색상 진화에 맞춰 Tint 동기화 ---
                    const level = globalStats.currentLevel;
                    if (level >= 30) wSprite.setTint(0xffd700);
                    else if (level >= 20) wSprite.setTint(0xff00ff);
                    else if (level >= 10) wSprite.setTint(0x00ffff);
                    else if (level >= 5) wSprite.setTint(0x00ff00);
                    else wSprite.clearTint();
                }

            } else {
                if (sprites[eid]) { sprites[eid]!.destroy(); sprites[eid] = undefined; }
                const frameObj = blitter.texture.get(finalFrame.toString());
                const hw = frameObj && frameObj.name !== '__BASE' ? frameObj.halfWidth : 8;
                const hh = frameObj && frameObj.name !== '__BASE' ? frameObj.halfHeight : 8;
                const tx = Position.x[eid] - hw;
                const ty = Position.y[eid] - hh;
                if (!bob) {
                    bob = blitter.create(tx, ty, finalFrame);
                    if (typeId === 10) { bob.tint = 0xffaaaa; bob.alpha = 0.9; }
                    else if (typeId === 11) bob.tint = 0xff5555;
                    else if (typeId === 14) bob.tint = 0xffcc00;
                    else if (typeId === 15) bob.tint = 0x00ffff;
                    else if (typeId === 34) bob.tint = 0xff0000;
                    bob.alpha = currentAlpha;
                    bobs[eid] = bob;
                } else {
                    bob.setPosition(tx, ty); bob.alpha = currentAlpha;
                    bob.setVisible(true);
                    if (hasComponent(world, Velocity, eid)) {
                        if (Velocity.x[eid] < 0) bob.flipX = true;
                        else if (Velocity.x[eid] > 0) bob.flipX = false;
                    }
                    if (blitter.texture.has(frameName.toString())) {
                        try { bob.setFrame(frameName); } catch (e) { }
                    }
                }
            }
        }

        // 6. Cleanup Residue
        for (let i = 0; i < bobs.length; i++) {
            if (bobs[i] && !activeEids.has(i)) { bobs[i]!.destroy(); bobs[i] = undefined; }
        }
        for (let i = 0; i < sprites.length; i++) {
            if (sprites[i] && !activeEids.has(i)) { sprites[i]!.destroy(); sprites[i] = undefined; }
        }
        for (let i = 0; i < playerWeaponSprites.length; i++) {
            if (playerWeaponSprites[i] && !activeEids.has(i)) { playerWeaponSprites[i]!.destroy(); playerWeaponSprites[i] = undefined; }
        }
    };
};
