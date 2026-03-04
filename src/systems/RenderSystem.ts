import Phaser from 'phaser';
import { defineQuery, hasComponent } from 'bitecs';
import { Animation, Position, SpriteInfo, Velocity, Health, Interactive, Rotation, Boss } from '../components';
import { world } from '../core/World';

const renderQuery = defineQuery([Position, SpriteInfo]);
const bobs: (Phaser.GameObjects.Bob | undefined)[] = [];
const sprites: (Phaser.GameObjects.Sprite | undefined)[] = [];

export const createRenderSystem = (_scene: Phaser.Scene, blitter: Phaser.GameObjects.Blitter) => {
    return (dt: number) => {
        const ents = renderQuery(world);
        const activeEids = new Set(ents);

        for (let i = 0; i < ents.length; i++) {
            const eid = ents[i];
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
            else if (typeId === 30) charKey = 'prop_crate';
            else if (typeId === 31) charKey = 'prop_skull';
            else if (typeId === 32) charKey = 'prop_spikes';
            else if (typeId === 33) charKey = 'prop_column';
            else if (typeId === 34) charKey = 'prop_crate';
            else if (typeId === 35) charKey = 'spell_fire';
            else if (typeId === 36) charKey = 'prop_chest';
            else if (typeId === 40) charKey = 'lever';
            else if (typeId === 41) charKey = 'door';
            else if (typeId === 50) { charKey = 'demon_new'; textureKey = 'demons'; }
            else if (typeId === 51) { charKey = 'orc_new'; textureKey = 'orcs'; }
            else if (typeId === 52) { charKey = 'skeleton_new'; textureKey = 'undeads'; }
            else if (typeId >= 100) {
                if (typeId === 100) charKey = 'spell_fire';
                else if (typeId === 101) charKey = 'spell_ice';
                else if (typeId === 102) charKey = 'spell_gas';
                else if (typeId === 103) charKey = 'spell_dud';
                else if (typeId === 104) charKey = 'enemy_bullet';
                else if (typeId === 105) charKey = 'weapon_sword';
                else if (typeId === 106) charKey = 'weapon_arrow';
                else if (typeId === 107) charKey = 'weapon_staff';
                else if (typeId === 108) charKey = 'weapon_bow';
                else if (typeId === 109) charKey = 'attack_effect';
            }

            const requiresSprite = typeId >= 100 || typeId >= 50 || hasComponent(world, Rotation, eid);

            // 2. Identify State (Idle vs Run)
            let state = 'idle';
            if (hasComponent(world, Velocity, eid)) {
                const speedSq = Velocity.x[eid] * Velocity.x[eid] + Velocity.y[eid] * Velocity.y[eid];
                if (speedSq > 100) state = 'run';
            }

            // 3. Handle Animation Framing
            let frameName: string | number = '';
            if ((typeId >= 15 && typeId <= 31) || [33, 34, 35, 36].includes(typeId) || (typeId >= 100 && typeId <= 107)) {
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
            if (textureKey === 'dungeon' && !blitter.texture.has(frameName.toString()) && !['weapon_bow', 'attack_effect'].includes(charKey)) {
                finalFrame = 'floor';
            }

            if (requiresSprite) {
                if (bob) { bob.destroy(); bobs[eid] = undefined; bob = undefined; }
                let sprite = sprites[eid];
                if (!sprite) {
                    if (charKey === 'weapon_bow') sprite = _scene.add.sprite(Position.x[eid], Position.y[eid], 'weapon_bow');
                    else if (charKey === 'attack_effect') {
                        sprite = _scene.add.sprite(Position.x[eid], Position.y[eid], 'attack_effect').setScale(0.5);
                    } else sprite = _scene.add.sprite(Position.x[eid], Position.y[eid], textureKey, finalFrame);
                    sprite.setDepth(10);
                    sprites[eid] = sprite;
                } else {
                    sprite.setPosition(Position.x[eid], Position.y[eid]);
                    sprite.alpha = currentAlpha;
                    if (!['weapon_bow', 'attack_effect'].includes(charKey)) sprite.setTexture(textureKey, finalFrame);
                }

                if (hasComponent(world, Boss, eid)) {
                    sprite.setScale(2.5);
                } else if (charKey !== 'attack_effect') {
                    sprite.setScale(1.0);
                }

                if (hasComponent(world, Velocity, eid)) {
                    if (Velocity.x[eid] < 0) sprite.flipX = true;
                    else if (Velocity.x[eid] > 0) sprite.flipX = false;
                }
                if (hasComponent(world, Rotation, eid)) sprite.rotation = Rotation.angle[eid];
                if (typeId === 104) sprite.tint = 0xffff00;
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
    };
};
