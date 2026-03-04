import { addEntity, addComponent, defineQuery } from 'bitecs';
import { Position, Velocity, Spell, Player, SpriteInfo, Rotation } from '../components';
import { world } from '../core/World';
import { AlchemySystem } from '../alchemy/AlchemySystem';
import { globalStats } from '../core/PlayerStats';

const playerQuery = defineQuery([Player, Position, Velocity]);

export class SpellSystem {
    private alchemy: AlchemySystem;
    private spellCooldowns: Map<string, number> = new Map();
    private lastFacingX = 1;
    private lastFacingY = 0;
    public selectedCharId: string = 'wizard';

    constructor(alchemy: AlchemySystem) {
        this.alchemy = alchemy;

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                const spellId = this.alchemy.triggerCombo();
                if (spellId) {
                    this.castSpell(spellId);
                }
            }
        });
    }

    public update(dt: number) {
        for (const [spell, time] of this.spellCooldowns.entries()) {
            if (time > 0) {
                this.spellCooldowns.set(spell, time - dt);
            }
        }
    }

    private castSpell(spellId: string) {
        const players = playerQuery(world);
        if (players.length === 0) return;
        const playerEid = players[0];

        const px = Position.x[playerEid];
        const py = Position.y[playerEid];
        const pvx = Velocity.x[playerEid];
        const pvy = Velocity.y[playerEid];

        const playerSpeedSq = pvx * pvx + pvy * pvy;
        if (playerSpeedSq > 0.0001) {
            const playerSpeed = Math.sqrt(playerSpeedSq);
            this.lastFacingX = pvx / playerSpeed;
            this.lastFacingY = pvy / playerSpeed;
        }

        if ((this.spellCooldowns.get(spellId) ?? 0) > 0) return;
        this.spellCooldowns.set(spellId, 500 * globalStats.cooldownMult);
        window.dispatchEvent(new CustomEvent('combo_cast'));
        // Visual FX Trigger
        window.dispatchEvent(new CustomEvent('combo_cast'));

        // Apply Sound
        if (spellId.includes('fire')) window.dispatchEvent(new CustomEvent('play_sound', { detail: 'fire_cast' }));
        else if (spellId.includes('ice')) window.dispatchEvent(new CustomEvent('play_sound', { detail: 'ice_cast' }));
        else if (spellId.includes('gas')) window.dispatchEvent(new CustomEvent('play_sound', { detail: 'poison_cast' }));

        // Class-Based Attack Delivery
        if (this.selectedCharId === 'knight') {
            this.spawnKnightAttack(px, py, this.lastFacingX, this.lastFacingY);
        } else if (this.selectedCharId === 'elf') {
            this.spawnElfAttack(px, py, this.lastFacingX, this.lastFacingY);
        } else {
            this.spawnWizardAttack(px, py, this.lastFacingX, this.lastFacingY);
        }
    }

    private spawnKnightAttack(x: number, y: number, dx: number, dy: number) {
        // Fast arc swing (Sword Hitbox)
        const eid = this.createBaseSpell(x + dx * 25, y + dy * 25, 105);
        Spell.damage[eid] = 60 * globalStats.damageMult;
        Spell.radius[eid] = 60; // wide swing
        Spell.duration[eid] = 150; // very short lived (one swing)
        Spell.pierce[eid] = 10; // hits many
        Velocity.x[eid] = dx * 10; // Tiny movement to simulate thrust
        Velocity.y[eid] = dy * 10;
        Rotation.angle[eid] = Math.atan2(dy, dx);

        // Visual Slash Effect (attack_effect.png)
        const fxEid = this.createBaseSpell(x + dx * 35, y + dy * 35, 109);
        Spell.damage[fxEid] = 0; // Purely visual
        Spell.radius[fxEid] = 0;
        Spell.duration[fxEid] = 150; // Match sword duration
        Spell.pierce[fxEid] = 0;
        Velocity.x[fxEid] = dx * 10;
        Velocity.y[fxEid] = dy * 10;
        Rotation.angle[fxEid] = Math.atan2(dy, dx);
    }

    private spawnElfAttack(x: number, y: number, dx: number, dy: number) {
        // Fast piercing arrows (Bow)
        const eid = this.createBaseSpell(x, y, 108);
        Spell.damage[eid] = 30 * globalStats.damageMult;
        Spell.radius[eid] = 15;
        Spell.duration[eid] = 1500;
        Spell.pierce[eid] = 3;
        Velocity.x[eid] = dx * 700;
        Velocity.y[eid] = dy * 700;
        Rotation.angle[eid] = Math.atan2(dy, dx);
    }

    private spawnWizardAttack(x: number, y: number, dx: number, dy: number) {
        // Draw the weapon in hand for a short time
        const staffEid = addEntity(world);
        addComponent(world, Position, staffEid);
        addComponent(world, Velocity, staffEid);
        addComponent(world, SpriteInfo, staffEid);
        addComponent(world, Rotation, staffEid);
        Position.x[staffEid] = x + dx * 10;
        Position.y[staffEid] = y + dy * 10;
        SpriteInfo.textureIndex[staffEid] = 107; // weapon_staff
        Rotation.angle[staffEid] = Math.atan2(dy, dx);
        Velocity.x[staffEid] = dx * 10;
        Velocity.y[staffEid] = dy * 10;
        // Cleaned up after short time (needs lifespan - will implement shortly)
        addComponent(world, Spell, staffEid); // Tagging as spell for temp tracking
        Spell.duration[staffEid] = 200;
        Spell.damage[staffEid] = 0;


        // Elemental magic AoE cast distance
        const castDist = 100; // Casting range
        const eid = this.createBaseSpell(x + dx * castDist, y + dy * castDist, 100); // 100 is spell_fire or similar
        Spell.damage[eid] = 45 * globalStats.damageMult;
        Spell.radius[eid] = 60; // Large AoE radius
        Spell.duration[eid] = 500;
        Spell.pierce[eid] = 255; // Hits everything in area
        Velocity.x[eid] = 0; // AoE doesn't move
        Velocity.y[eid] = 0;
    }

    private createBaseSpell(x: number, y: number, typeId: number): number {
        const eid = addEntity(world);
        addComponent(world, Position, eid);
        addComponent(world, Velocity, eid);
        addComponent(world, Spell, eid);
        addComponent(world, SpriteInfo, eid);
        addComponent(world, Rotation, eid);
        Position.x[eid] = x;
        Position.y[eid] = y;
        SpriteInfo.textureIndex[eid] = typeId;
        return eid;
    }
}
