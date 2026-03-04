import Phaser from 'phaser';
import { defineQuery, hasComponent } from 'bitecs';
import { Animation, Position, SpriteInfo, Velocity, Health, Interactive, Rotation } from '../components';
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
            let bob = bobs[eid];
            const typeId = SpriteInfo.textureIndex[eid];

            // 1. Identify Character / Entity Type
            let charKey = '';
            if (typeId === 0) charKey = 'knight';
            else if (typeId === 1) charKey = 'wizard';
            else if (typeId === 2) charKey = 'elf';
            else if (typeId === 10) charKey = 'imp';
            else if (typeId === 11) charKey = 'demon';
            else if (typeId === 12) charKey = 'orc';
            else if (typeId === 13) charKey = 'skeleton';
            else if (typeId === 14) charKey = 'orc'; // Elite Guard
            else if (typeId === 15) charKey = 'gem'; // Big Treasure
            else if (typeId === 20) charKey = 'gem';
            else if (typeId === 30) charKey = 'prop_crate';
            else if (typeId === 31) charKey = 'prop_skull';
            else if (typeId === 32) charKey = 'prop_spikes';
            else if (typeId === 33) charKey = 'prop_column';
            else if (typeId === 34) charKey = 'prop_crate';
            else if (typeId === 35) charKey = 'spell_fire'; // Health Potion sprite
            else if (typeId === 36) charKey = 'prop_chest'; // Treasure Chest sprite
            else if (typeId === 40) charKey = 'lever';
            else if (typeId === 41) charKey = 'door';
            else if (typeId === 100) charKey = 'spell_fire';
            else if (typeId === 101) charKey = 'spell_ice';
            else if (typeId === 102) charKey = 'spell_gas';
            else if (typeId === 103) charKey = 'spell_dud';
            else if (typeId === 104) charKey = 'enemy_bullet';
            else if (typeId === 105) charKey = 'weapon_sword';
            else if (typeId === 106) charKey = 'weapon_arrow';
            else if (typeId === 107) charKey = 'weapon_staff';
            else if (typeId === 108) charKey = 'weapon_bow';

            const requiresSprite = typeId >= 100 || hasComponent(world, Rotation, eid);

            // 2. Identify State (Idle vs Run)
            let state = 'idle';
            if (hasComponent(world, Velocity, eid)) {
                const speedSq = Velocity.x[eid] * Velocity.x[eid] + Velocity.y[eid] * Velocity.y[eid];
                if (speedSq > 100) state = 'run';
            }

            // 3. Handle Animation Framing
            let frameName: string | number = '';
            if ((typeId >= 15 && typeId <= 31) || typeId === 33 || typeId === 34 || typeId === 35 || typeId === 36 || (typeId >= 100 && typeId <= 107)) {
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

            // 4. Handle Death Effect (Vanishing)
            let currentAlpha = 1.0;
            if (hasComponent(world, Health, eid) && typeId < 30) {
                if (Health.current[eid] <= 0) currentAlpha = 0.4;
            }

            // 5. Render Bob or Sprite
            let finalFrame: string | number = frameName;
            if (!blitter.texture.has(frameName.toString()) && charKey !== 'weapon_bow') {
                finalFrame = 'floor';
            }

            if (requiresSprite) {
                // If this eid previously had a bob, remove it
                if (bobs[eid]) {
                    bobs[eid]!.destroy();
                    bobs[eid] = undefined;
                }

                let sprite = sprites[eid];
                if (!sprite) {
                    if (charKey === 'weapon_bow') {
                        sprite = _scene.add.sprite(Position.x[eid], Position.y[eid], 'weapon_bow');
                    } else {
                        sprite = _scene.add.sprite(Position.x[eid], Position.y[eid], 'dungeon', finalFrame);
                    }
                    sprite.setDepth(10);
                    sprites[eid] = sprite;
                } else {
                    sprite.x = Position.x[eid];
                    sprite.y = Position.y[eid];
                    sprite.alpha = currentAlpha;
                    if (charKey !== 'weapon_bow') {
                        sprite.setFrame(finalFrame);
                    }
                }

                if (hasComponent(world, Rotation, eid)) {
                    sprite.rotation = Rotation.angle[eid];
                }

                if (typeId === 104) { sprite.tint = 0xffff00; }
            } else {
                // If this eid previously had a sprite, remove it
                if (sprites[eid]) {
                    sprites[eid]!.destroy();
                    sprites[eid] = undefined;
                }

                const frameObj = blitter.texture.get(finalFrame.toString());
                const hw = frameObj && frameObj.name !== '__BASE' ? frameObj.halfWidth : 8;
                const hh = frameObj && frameObj.name !== '__BASE' ? frameObj.halfHeight : 8;
                const targetX = Position.x[eid] - hw;
                const targetY = Position.y[eid] - hh;

                if (!bob) {
                    const newBob = blitter.create(targetX, targetY, finalFrame);
                    if (typeId === 10) { newBob.tint = 0xffaaaa; newBob.alpha = 0.9; }
                    else if (typeId === 11) { newBob.tint = 0xff5555; }
                    else if (typeId === 12 || typeId === 13) { newBob.tint = 0xffffff; }
                    else if (typeId === 14) { newBob.tint = 0xffcc00; }
                    else if (typeId === 15) { newBob.tint = 0x00ffff; }
                    else if (typeId === 34) { newBob.tint = 0xff0000; }

                    newBob.alpha = currentAlpha;
                    bobs[eid] = newBob;
                } else {
                    bob.x = targetX;
                    bob.y = targetY;
                    bob.alpha = currentAlpha;

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
            const b = bobs[i];
            if (b && !activeEids.has(i)) {
                b.destroy();
                bobs[i] = undefined;
            }
        }

        for (let i = 0; i < sprites.length; i++) {
            const s = sprites[i];
            if (s && !activeEids.has(i)) {
                s.destroy();
                sprites[i] = undefined;
            }
        }
    };
};
