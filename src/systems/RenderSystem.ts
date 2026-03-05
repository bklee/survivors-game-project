import Phaser from 'phaser';
import { defineQuery, hasComponent } from 'bitecs';
import { Animation, Position, SpriteInfo, Velocity, Health, Interactive, Rotation, Boss, Player } from '../components';
import { world } from '../core/World';

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

window.addEventListener('combo_cast', () => {
    playerAttackTimer = 150;
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
            else if (typeId >= 60 && typeId <= 82) {
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
                else if (typeId === 106) charKey = 'weapon_arrow';
                else if (typeId === 107) charKey = 'weapon_staff';
                else if (typeId === 108) charKey = 'weapon_bow';
                else if (typeId === 109) charKey = 'sword_slash';
                else if (typeId === 110) charKey = 'super_slash';
            }

            const isPlayer = hasComponent(world, Player, eid);
            const requiresSprite = isPlayer || typeId >= 100 || (typeId >= 60 && typeId <= 82) || typeId >= 50 || typeId === 36 || typeId === 21 || hasComponent(world, Rotation, eid);

            // 2. Identify State (Idle vs Run)
            let state = 'idle';
            if (hasComponent(world, Velocity, eid)) {
                const speedSq = Velocity.x[eid] * Velocity.x[eid] + Velocity.y[eid] * Velocity.y[eid];
                if (speedSq > 100) state = 'run';
            }

            // 3. Handle Animation Framing
            let frameName: string | number = '';
            if (typeId === 15 || typeId === 20 || (typeId >= 22 && typeId <= 31) || [33, 34, 35].includes(typeId) || (typeId >= 100 && typeId <= 107)) {
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
                if (hasComponent(world, Interactive, eid) && Interactive.isActivated[eid]) {
                    textureKey = `chest_empty_open_2`;
                    frameName = '';
                } else {
                    const dx = Position.x[eid] - px;
                    const dy = Position.y[eid] - py;
                    if (dx * dx + dy * dy < 60 * 60) {
                        textureKey = `chest_full_open_2`;
                    } else {
                        textureKey = `chest_full_open_0`;
                    }
                    frameName = '';
                }
            } else if (typeId === 21) {
                // Coin Animation
                const rate = 8;
                Animation.timer[eid] = (Animation.timer[eid] || 0) + dt;
                const fIdx = Math.floor(Animation.timer[eid] / (1000 / rate)) % 4;
                textureKey = `coin_f${fIdx}`;
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
                    if (config.hasIdleRun) {
                        textureKey = `${config.name}_${state}_f${fIdx}`;
                    } else {
                        textureKey = `${config.name}_f${fIdx}`;
                    }
                    frameName = ''; // individual asset is the whole texture
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
                    if (charKey === 'weapon_bow') sprite = _scene.add.sprite(Position.x[eid], Position.y[eid], 'weapon_bow');
                    else sprite = _scene.add.sprite(Position.x[eid], Position.y[eid], textureKey, finalFrame === '' ? undefined : finalFrame as any);

                    let depth = 10;
                    if (isPlayer) depth = 30; // Player on top of everything
                    else if (typeId >= 100) depth = 20; // Spells above enemies
                    else if (typeId >= 60 && typeId <= 89) depth = 15; // Enemies above props

                    sprite.setDepth(depth);
                    sprites[eid] = sprite;
                } else {
                    sprite.setPosition(Position.x[eid], Position.y[eid]);
                    sprite.alpha = currentAlpha;
                    if (charKey !== 'weapon_bow') {
                        sprite.setTexture(textureKey, finalFrame === '' ? undefined : finalFrame as any);
                    }
                }

                sprite.setVisible(true);
                if (hasComponent(world, Boss, eid)) {
                    sprite.setScale(2.5);
                } else {
                    sprite.setScale(1.0);
                }

                if (hasComponent(world, Velocity, eid) && !hasComponent(world, Rotation, eid)) {
                    if (Velocity.x[eid] < 0) sprite.flipX = true;
                    else if (Velocity.x[eid] > 0) sprite.flipX = false;
                }
                if (hasComponent(world, Rotation, eid)) {
                    sprite.rotation = Rotation.angle[eid];
                    // Slash sprites natively face left; offset by π so rotation=0 faces right
                    if (typeId === 109 || typeId === 110) {
                        sprite.rotation = Rotation.angle[eid] + Math.PI;
                        sprite.flipX = false;
                        sprite.flipY = false;
                    }
                }
                if (typeId === 104) sprite.tint = 0xffff00;

                // Render specific player weapons
                if (isPlayer && (charKey === 'knight' || charKey === 'wizard')) {
                    let wSprite = playerWeaponSprites[eid];
                    if (!wSprite) {
                        const weaponTex = charKey === 'knight' ? 'weapon_knight_sword' : 'weapon_green_magic_staff';
                        wSprite = _scene.add.sprite(Position.x[eid], Position.y[eid], weaponTex);
                        wSprite.setOrigin(0.5, charKey === 'wizard' ? 0.5 : 0.8);
                        wSprite.setDepth(31);
                        playerWeaponSprites[eid] = wSprite;
                    }

                    const wx = charKey === 'wizard' ? 7 : 8;
                    const wy = charKey === 'wizard' ? 2 : 2;
                    let baseRot = charKey === 'knight' ? Math.PI / 6 : 0;

                    let swingRot = 0;
                    if (playerAttackTimer > 0) {
                        const progress = 1 - (playerAttackTimer / 150);
                        if (charKey === 'knight') swingRot = Math.sin(progress * Math.PI) * Math.PI / 2;
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
