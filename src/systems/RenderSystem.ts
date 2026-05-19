import Phaser from 'phaser';
import { defineQuery, hasComponent } from 'bitecs';
import {
    Animation,
    Position,
    SpriteInfo,
    Velocity,
    Health,
    Interactive,
    Rotation,
    Boss,
    BossClone,
    BossSplit,
    Player,
    Scale,
    ActionState,
} from '../components';
import { world } from '../core/World';
import { globalStats } from '../core/PlayerStats';

const MONSTER_CONFIG: Record<number, { name: string; hasIdleRun: boolean; frames?: number }> = {
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

window.addEventListener('combo_cast', (e: any) => {
    (window as any).playerAttackTimer = e.detail?.duration || 400;
});

export const createRenderSystem = (_scene: Phaser.Scene, blitter: Phaser.GameObjects.Blitter) => {
    return (dt: number) => {
        if ((window as any).playerAttackTimer > 0) (window as any).playerAttackTimer -= dt;

        // --- Boss ActionState (AttackTimer) Decrement ---
        const actionEntities = defineQuery([ActionState])(world);
        for (let i = 0; i < actionEntities.length; i++) {
            const eid = actionEntities[i];
            if (!hasComponent(world, Player, eid)) {
                if (ActionState.attackTimer[eid] > 0) {
                    ActionState.attackTimer[eid] -= dt;
                }
            }
        }

        const ents = renderQuery(world);
        const activeEids = new Set(ents);

        const players = defineQuery([Player, Position])(world);
        let px = 0,
            py = 0;
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

            // typeId=99: soul_bolt — 시각은 SpellSystem이 직접 관리, RenderSystem skip
            if (typeId === 99) continue;

            let bob = bobs[eid];
            let frameName: string | number = '';

            // 1. Identify Character / Entity Type
            let charKey = '';
            let textureKey = 'dungeon';
            if (typeId === 0) charKey = 'knight';
            else if (typeId === 1) charKey = 'wizard';
            else if (typeId === 2) charKey = 'elf';
            else if (typeId === 3) charKey = 'necromancer';
            else if (typeId === 4)
                charKey = 'wizard'; // druid: wizard 프레임 재사용
            else if (typeId === 5)
                charKey = 'wizard'; // engineer: wizard 프레임 재사용
            else if (typeId === 6) charKey = 'dwarf';
            else if (typeId === 10) charKey = 'imp';
            else if (typeId === 11) charKey = 'demon';
            else if (typeId === 12) charKey = 'orc';
            else if (typeId === 13) charKey = 'skeleton';
            else if (typeId === 14) charKey = 'orc';
            else if (typeId === 15) charKey = 'gem';
            else if (typeId === 20) charKey = 'gem';
            else if (typeId === 21)
                charKey = 'coin'; // Coin drop
            else if (typeId === 30) charKey = 'prop_crate';
            else if (typeId === 31) charKey = 'prop_skull';
            else if (typeId === 32) charKey = 'prop_spikes';
            else if (typeId === 37) {
                charKey = 'hole';
                textureKey = 'hole';
            } else if (typeId === 33) charKey = 'prop_column';
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
            else if (typeId === 90) {
                charKey = 'column';
                textureKey = 'walls';
            } else if (typeId === 91) {
                charKey = 'column_wall';
                textureKey = 'walls';
            } else if (typeId === 92) {
                charKey = 'wall_fountain_top_blue_f0';
                textureKey = 'walls';
            } else if (typeId === 93) {
                charKey = 'wall_fountain_mid_blue_f0';
                textureKey = 'walls';
            } else if (typeId === 94) {
                charKey = 'wall_fountain_top_red_f0';
                textureKey = 'walls';
            } else if (typeId === 95) {
                charKey = 'wall_fountain_mid_red_f0';
                textureKey = 'walls';
            } else if (typeId >= 60 && typeId <= 89) {
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
                else if (typeId === 106) {
                    charKey = 'weapon_arrow';
                    textureKey = 'dungeon';
                    frameName = 'weapon_arrow';
                } else if (typeId === 107) charKey = 'weapon_staff';
                else if (typeId === 108) {
                    charKey = 'weapon_bow';
                    textureKey = 'dungeon';
                    frameName = 'weapon_bow';
                } else if (typeId === 109) charKey = 'sword_slash';
                else if (typeId === 110) charKey = 'super_slash';
            }

            const isPlayer = hasComponent(world, Player, eid);

            // 캐릭터 typeId(0=knight,1=wizard,2=elf,3=necromancer,6=dwarf)이지만 Player 컴포넌트가 없으면 렌더링하지 않음
            // (bitECS 기본값 0으로 인해 wizard 스프라이트가 바닥 구조물로 나타나는 문제 방지)
            if (
                (typeId === 0 || typeId === 1 || typeId === 2 || typeId === 3 || typeId === 6) &&
                !isPlayer
            )
                continue;

            const isPillarPart = typeId >= 90 && typeId <= 95;
            // BOSS IDs: 69, 79, 89. Ogre(89)가 누락되지 않도록 범위를 89까지 확장.
            const requiresSprite =
                isPlayer ||
                typeId === 37 ||
                typeId >= 100 ||
                (typeId >= 60 && typeId <= 89) ||
                typeId >= 50 ||
                typeId === 36 ||
                typeId === 21 ||
                isPillarPart ||
                hasComponent(world, Rotation, eid);

            // 2. Identify State (Idle vs Run)
            let state = 'idle';
            if (hasComponent(world, Velocity, eid)) {
                const speedSq =
                    Velocity.x[eid] * Velocity.x[eid] + Velocity.y[eid] * Velocity.y[eid];
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
            } else if (
                isPillarPart ||
                typeId === 15 ||
                typeId === 20 ||
                (typeId >= 22 && typeId <= 31) ||
                [33, 34, 35, 50, 51, 52, 53, 54, 55, 56, 57].includes(typeId) ||
                (typeId >= 101 && typeId <= 107)
            ) {
                frameName = charKey;
            } else if (typeId === 40) {
                frameName = Interactive.isActivated[eid] ? 'lever_on' : 'lever_off';
            } else if (typeId === 41) {
                frameName = Interactive.isActivated[eid] ? 'door_open' : 'door_closed';
            } else if (typeId === 32) {
                const rate = 4;
                const animIdx = Math.floor((Animation.timer[eid] * rate) / 1000) % 4;
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
            } else if (typeId === 3) {
                // Necromancer: necromancer_f0~3 프레임 사용 (idle/run 구분 없음)
                const rate = Animation.frameRate[eid] || 8;
                Animation.timer[eid] += dt;
                const fIdx = Math.floor(Animation.timer[eid] / (1000 / rate)) % 4;
                frameName = `necromancer_f${fIdx}`;
            } else if (typeId === 6) {
                // Dwarf: 0x72 atlas 에 좌표 없음 → standalone 텍스처 사용
                const rate = Animation.frameRate[eid] || 8;
                Animation.timer[eid] += dt;
                const fIdx = Math.floor(Animation.timer[eid] / (1000 / rate)) % 4;
                textureKey = `dwarf_${state}_f${fIdx}`;
                frameName = '';
            } else {
                const rate = Animation.frameRate[eid] || 8;
                Animation.timer[eid] += dt;
                const currentFrameIdx = Math.floor(Animation.timer[eid] / (1000 / rate)) % 4;
                frameName = `${charKey}_${state}_${currentFrameIdx}`;
            }

            // 4. Handle Alpha (Death Effect)
            let currentAlpha = 1.0;
            if (hasComponent(world, Health, eid) && typeId < 30 && Health.current[eid] <= 0)
                currentAlpha = 0.4;

            // 5. Render Bob or Sprite
            let finalFrame: string | number = frameName;
            if (
                textureKey === 'dungeon' &&
                !blitter.texture.has(frameName.toString()) &&
                charKey !== 'weapon_bow'
            ) {
                finalFrame = 'floor';
            }

            if (requiresSprite) {
                if (bob) {
                    bob.destroy();
                    bobs[eid] = undefined;
                    bob = undefined;
                }
                let sprite = sprites[eid];
                if (!sprite) {
                    const textureArg = textureKey;
                    const frameArg =
                        finalFrame === '' || finalFrame === undefined
                            ? undefined
                            : (finalFrame as any);

                    sprite = _scene.add.sprite(
                        Position.x[eid],
                        Position.y[eid],
                        textureArg,
                        frameArg,
                    );

                    // Adjust origin for characters to ground them better
                    if (isPlayer || (typeId >= 60 && typeId <= 89)) {
                        sprite.setOrigin(0.5, 0.85); // 조금 더 하단으로 조정 (0.8 -> 0.85)
                    } else if (isPillarPart) {
                        sprite.setOrigin(0.5, 1.0); // 기둥은 발을 바닥에 붙임
                    } else if (
                        charKey === 'weapon_bow' ||
                        charKey === 'weapon_sword' ||
                        charKey === 'weapon_staff' ||
                        charKey === 'weapon_arrow'
                    ) {
                        sprite.setOrigin(0.5, 0.5);
                    }

                    sprites[eid] = sprite;
                } else {
                    const renderY = Position.y[eid];
                    // Also adjust position when recycling just in case
                    sprite.setPosition(Position.x[eid], renderY);
                    sprite.alpha = currentAlpha;
                    const frameArg =
                        finalFrame === '' || finalFrame === undefined
                            ? undefined
                            : (finalFrame as any);
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
                    // 하단 파트는 별도 상향 오프셋 없이 자신의 Y 좌표를 그대로 따름
                    depthOffset = 0;
                }

                sprite.setDepth(Position.y[eid] + depthOffset);

                sprite.setVisible(true);
                const isBoss = hasComponent(world, Boss, eid);
                const isBossSplit = hasComponent(world, BossSplit, eid);
                const isBossClone = hasComponent(world, BossClone, eid);
                if (hasComponent(world, Scale, eid)) {
                    sprite.setScale(Scale.value[eid]);
                    sprite.clearTint();
                } else if (isBossClone) {
                    // 분신 — 메인 보스의 환영 (작고 푸르스름한 반투명)
                    sprite.setScale(1.6);
                    sprite.setTint(0x88bbff);
                    sprite.setAlpha(0.7);
                } else if (isBossSplit) {
                    // 분열 — 깨진 파편 (중간 크기, 짙은 진홍 + 약한 글로우)
                    sprite.setScale(1.8);
                    sprite.setTint(0xff5544);
                    if ((sprite as any).lastGlowColor !== 0xff5544) {
                        sprite.postFX.clear();
                        sprite.postFX.addGlow(0xff2200, 2, 0);
                        (sprite as any).lastGlowColor = 0xff5544;
                    }
                } else if (isBoss) {
                    sprite.setScale(2.5);
                    const hpPercent = Health.current[eid] / Health.max[eid];
                    if (hpPercent <= 0.5) {
                        // 폭주 연출: 붉은색 점멸 및 오오라
                        const flash = Math.sin(_scene.time.now / 100) > 0;
                        if (flash) sprite.setTint(0xff0000);
                        else sprite.setTint(0xff8888);

                        if ((sprite as any).lastGlowColor !== 0xff0000) {
                            sprite.postFX.clear();
                            sprite.postFX.addGlow(0xff0000, 4, 0); // 거대한 붉은 광채
                            (sprite as any).lastGlowColor = 0xff0000;
                        }
                    } else {
                        // 일반 사이클 틴트 적용 (매 9스테이지/1사이클 마다 점진적 변화)
                        const cycleCount = Math.floor((globalStats.currentStage - 1) / 9);
                        if (cycleCount > 0) {
                            const hue = (cycleCount * 60) % 360;
                            const colorObj = Phaser.Display.Color.HSVToRGB(hue / 360, 0.8, 1);
                            sprite.setTint(colorObj.color);
                        } else {
                            sprite.clearTint();
                        }

                        if ((sprite as any).lastGlowColor === 0xff0000) {
                            sprite.postFX.clear();
                            (sprite as any).lastGlowColor = 0;
                        }
                    }
                } else if (typeId === 100) {
                    sprite.setScale(1.5);
                    sprite.clearTint();
                } else {
                    sprite.setScale(1.0);
                    if (typeId === 104) {
                        sprite.tint = 0xffff00;
                    } else if (isPlayer) {
                        // 캐릭터별 tint 적용
                        if (typeId === 3) {
                            sprite.setTint(0x9c27b0); // necromancer: 보라색
                        } else if (typeId === 4) {
                            sprite.setTint(0x4caf50); // druid: 녹색
                        } else if (typeId === 5) {
                            sprite.setTint(0x607d8b); // engineer: 회청색
                        } else {
                            sprite.clearTint();
                        }
                        // --- 캐릭터 오오라 효과 (Level thresholds) ---
                        const level = globalStats.currentLevel;
                        let glowColor = 0;
                        if (level >= 30) glowColor = 0xffd700;
                        else if (level >= 20) glowColor = 0xff00ff;
                        else if (level >= 10) glowColor = 0x00ffff;
                        else if (level >= 5) glowColor = 0x00ff00;

                        if (glowColor !== 0) {
                            if ((sprite as any).lastGlowColor !== glowColor) {
                                sprite.postFX.clear();
                                sprite.postFX.addGlow(glowColor, 2, 0);
                                (sprite as any).lastGlowColor = glowColor;
                            }
                        } else {
                            if (
                                (sprite as any).lastGlowColor &&
                                (sprite as any).lastGlowColor !== 0
                            ) {
                                sprite.postFX.clear();
                                (sprite as any).lastGlowColor = 0;
                            }
                        }
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

                // Render specific weapons (Players & Ogre Boss)
                if (isPlayer || (isBoss && charKey === 'ogre')) {
                    let wSprite = playerWeaponSprites[eid];
                    if (!wSprite) {
                        let weaponTex = 'dungeon';
                        let weaponFrame: string | undefined = undefined;

                        if (isPlayer) {
                            if (charKey === 'knight') weaponTex = 'weapon_knight_sword';
                            else if (charKey === 'wizard') weaponTex = 'weapon_green_magic_staff';
                            else if (charKey === 'necromancer') {
                                // atlas cleaver-like sprite (양손 도끼 라인 추정)
                                weaponTex = 'dungeon';
                                weaponFrame = 'weapon_cleaver_atlas';
                            } else {
                                weaponTex = 'dungeon';
                                weaponFrame = 'weapon_bow';
                            }
                        } else {
                            // Boss Weapon (Ogre)
                            weaponTex = 'weapon_baton_with_spikes';
                        }

                        wSprite = _scene.add.sprite(
                            Position.x[eid],
                            Position.y[eid],
                            weaponTex,
                            weaponFrame,
                        );
                        // Ogre의 배트는 조금 더 위쪽 정렬 및 확실한 고정
                        wSprite.setOrigin(
                            0.5,
                            charKey === 'ogre'
                                ? 1.0
                                : charKey === 'wizard' ||
                                    charKey === 'elf' ||
                                    charKey === 'necromancer'
                                  ? 1.0
                                  : 0.8,
                        );
                        wSprite.setDepth(
                            isBoss && charKey === 'ogre' ? sprite.depth - 1 : sprite.depth + 1,
                        );
                        playerWeaponSprites[eid] = wSprite;
                    }

                    // Boss Scale reflect on weapon
                    let wScale = 1.0;
                    if (hasComponent(world, Scale, eid)) {
                        wScale = Scale.value[eid] * 1.5; // 보스 무기는 조금 더 크게 (1.5배)
                    } else if (isBoss) {
                        wScale = charKey === 'ogre' ? 3.2 : 2.0; // 오우거는 특별히 거대하게 (4.0 -> 80% 축소로 3.2)
                    }
                    wSprite.setScale(wScale);

                    const wx =
                        charKey === 'wizard' || charKey === 'necromancer'
                            ? 4 // wizard 패턴: 무기를 캐릭터 가까이
                            : charKey === 'elf'
                              ? 5
                              : charKey === 'ogre'
                                ? 12
                                : 5;
                    // wy: Negative moves it UP. Ogre hand is roughly at shoulders, so moving it higher (-10)
                    const wy =
                        charKey === 'wizard' || charKey === 'elf' || charKey === 'necromancer'
                            ? 4
                            : charKey === 'ogre'
                              ? -10
                              : -7;
                    const baseRot = charKey === 'knight' || charKey === 'ogre' ? -Math.PI / 4 : 0;

                    let swingRot = 0;
                    // Player uses global timer, Bosses use their own ActionState
                    const currentAttackTimer = isPlayer
                        ? (window as any).playerAttackTimer || 0
                        : hasComponent(world, ActionState, eid)
                          ? ActionState.attackTimer[eid]
                          : 0;
                    const currentAttackDuration = isPlayer
                        ? charKey === 'knight'
                            ? 250
                            : 400
                        : hasComponent(world, ActionState, eid)
                          ? ActionState.attackDuration[eid]
                          : 400;

                    if (currentAttackTimer > 0) {
                        const progress = Math.max(
                            0,
                            1 - currentAttackTimer / currentAttackDuration,
                        );

                        if (charKey === 'knight' || charKey === 'ogre') {
                            swingRot = Math.sin(progress * Math.PI) * (Math.PI * 0.8);
                        } else if (charKey === 'wizard' || charKey === 'necromancer') {
                            swingRot = Math.sin(progress * Math.PI) * (Math.PI / 15);
                        } else if (charKey === 'elf') {
                            // 활만 움직이도록 (회전 없이 프레임 애니메이션만 적용)
                            swingRot = 0;
                            // 400ms 중 초기 300ms(400~100)는 시위를 당긴 상태(weapon_bow_2),
                            // 마지막 100ms(100~0)는 발사 후 snap 상태(weapon_bow)
                            const frame = currentAttackTimer > 100 ? 'weapon_bow_2' : 'weapon_bow';
                            wSprite.setFrame(frame);
                        }
                    } else if (state === 'run') {
                        swingRot = Math.sin(Animation.timer[eid] / 100) * 0.15;
                        if (charKey === 'elf') wSprite.setFrame('weapon_bow');
                    } else {
                        if (charKey === 'elf') wSprite.setFrame('weapon_bow');
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

                    wSprite.setDepth(
                        isBoss && charKey === 'ogre' ? sprite.depth - 1 : sprite.depth + 1,
                    ); // Depth consistency
                    wSprite.setVisible(true);
                    wSprite.alpha = currentAlpha;

                    // --- 무기도 캐릭터 색상 진화에 맞춰 오오라 동기화 (플레이어만) ---
                    if (isPlayer) {
                        wSprite.clearTint();
                        const level = globalStats.currentLevel;
                        let glowColor = 0;
                        if (level >= 30) glowColor = 0xffd700;
                        else if (level >= 20) glowColor = 0xff00ff;
                        else if (level >= 10) glowColor = 0x00ffff;
                        else if (level >= 5) glowColor = 0x00ff00;

                        if (glowColor !== 0) {
                            if ((wSprite as any).lastGlowColor !== glowColor) {
                                wSprite.postFX.clear();
                                wSprite.postFX.addGlow(glowColor, 1, 0);
                                (wSprite as any).lastGlowColor = glowColor;
                            }
                        } else {
                            if (
                                (wSprite as any).lastGlowColor &&
                                (wSprite as any).lastGlowColor !== 0
                            ) {
                                wSprite.postFX.clear();
                                (wSprite as any).lastGlowColor = 0;
                            }
                        }
                    } else {
                        wSprite.clearTint();
                    }
                }
            } else {
                if (sprites[eid]) {
                    sprites[eid]!.destroy();
                    sprites[eid] = undefined;
                }
                const frameObj = blitter.texture.get(finalFrame.toString());
                const hw = frameObj && frameObj.name !== '__BASE' ? frameObj.halfWidth : 8;
                const hh = frameObj && frameObj.name !== '__BASE' ? frameObj.halfHeight : 8;
                const tx = Position.x[eid] - hw;
                const ty = Position.y[eid] - hh;
                if (!bob) {
                    bob = blitter.create(tx, ty, finalFrame);
                    if (typeId === 10) {
                        bob.tint = 0xffaaaa;
                        bob.alpha = 0.9;
                    } else if (typeId === 11) bob.tint = 0xff5555;
                    else if (typeId === 14) bob.tint = 0xffcc00;
                    else if (typeId === 15) bob.tint = 0x00ffff;
                    else if (typeId === 34) bob.tint = 0xff0000;
                    bob.alpha = currentAlpha;
                    bobs[eid] = bob;
                } else {
                    bob.setPosition(tx, ty);
                    bob.alpha = currentAlpha;
                    bob.setVisible(true);
                    if (hasComponent(world, Velocity, eid)) {
                        if (Velocity.x[eid] < 0) bob.flipX = true;
                        else if (Velocity.x[eid] > 0) bob.flipX = false;
                    }
                    if (blitter.texture.has(frameName.toString())) {
                        try {
                            bob.setFrame(frameName);
                        } catch {
                            /* frame not found */
                        }
                    }
                }
            }
        }

        // 6. Cleanup Residue
        for (let i = 0; i < bobs.length; i++) {
            if (bobs[i] && !activeEids.has(i)) {
                bobs[i]!.destroy();
                bobs[i] = undefined;
            }
        }
        for (let i = 0; i < sprites.length; i++) {
            if (sprites[i] && !activeEids.has(i)) {
                sprites[i]!.destroy();
                sprites[i] = undefined;
            }
        }
        for (let i = 0; i < playerWeaponSprites.length; i++) {
            if (playerWeaponSprites[i] && !activeEids.has(i)) {
                playerWeaponSprites[i]!.destroy();
                playerWeaponSprites[i] = undefined;
            }
        }
    };
};
