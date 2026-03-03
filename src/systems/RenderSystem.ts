import Phaser from 'phaser';
import { defineQuery, hasComponent } from 'bitecs';
import { Animation, Position, SpriteInfo, Velocity, Health, Interactive } from '../components';
import { world } from '../core/World';

const renderQuery = defineQuery([Position, SpriteInfo]);
const bobs: (Phaser.GameObjects.Bob | undefined)[] = [];

export const createRenderSystem = (_scene: Phaser.Scene, blitter: Phaser.GameObjects.Blitter) => {
    return (dt: number) => {
        const ents = renderQuery(world);

        for (let i = 0; i < ents.length; i++) {
            const eid = ents[i];
            const bob = bobs[eid];
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

            // 2. Identify State (Idle vs Run)
            let state = 'idle';
            if (hasComponent(world, Velocity, eid)) {
                const speedSq = Velocity.x[eid] * Velocity.x[eid] + Velocity.y[eid] * Velocity.y[eid];
                if (speedSq > 100) state = 'run';
            }

            // 3. Handle Animation Framing
            let frameName: string | number = '';
            if ((typeId >= 15 && typeId <= 31) || typeId === 33 || typeId === 34 || (typeId >= 100 && typeId <= 107)) {
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

            // 5. Render or Create Bob
            if (!bob) {
                const newBob = blitter.create(Position.x[eid], Position.y[eid], frameName);
                if (typeId === 10) { newBob.tint = 0xffaaaa; newBob.alpha = 0.9; }
                else if (typeId === 11) { newBob.tint = 0xff5555; }
                else if (typeId === 12 || typeId === 13) { newBob.tint = 0xffffff; }
                else if (typeId === 14) { newBob.tint = 0xffcc00; } // GOLDEN ELITE
                else if (typeId === 15) { newBob.tint = 0x00ffff; } // CYAN TREASURE
                else if (typeId === 34) { newBob.tint = 0xff0000; } 
                else if (typeId === 104) { newBob.tint = 0xffff00; }
                
                newBob.alpha = currentAlpha;
                bobs[eid] = newBob;
            } else {
                bob.x = Position.x[eid];
                bob.y = Position.y[eid];
                bob.alpha = currentAlpha;

                // Sprite Flipping
                if (hasComponent(world, Velocity, eid)) {
                    if (Velocity.x[eid] < 0) bob.flipX = true;
                    else if (Velocity.x[eid] > 0) bob.flipX = false;
                }

                try { bob.setFrame(frameName); } catch (e) {}
            }
        }
        // Residue cleanup
        // We know which EIDs were processed this frame. 
        // Let's build a Set of active ones.
        const activeEids = new Set(ents);
        for (let i = 0; i < bobs.length; i++) {
            const b = bobs[i];
            if (b && !activeEids.has(i)) {
                b.destroy();
                bobs[i] = undefined;
            }
        }
    };
};
