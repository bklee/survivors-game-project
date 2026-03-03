import { addEntity, addComponent, defineQuery } from 'bitecs';
import { Position, Velocity, Spell, Player, SpriteInfo } from '../components';
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
        // Close range arc swing
        const eid = this.createBaseSpell(x + dx * 20, y + dy * 20, 105);
        Spell.damage[eid] = 60 * globalStats.damageMult;
        Spell.radius[eid] = 60; // wide swing
        Spell.duration[eid] = 200; // very short lived
        Spell.pierce[eid] = 10; // hits many
        Velocity.x[eid] = dx * 50; 
        Velocity.y[eid] = dy * 50;
    }

    private spawnElfAttack(x: number, y: number, dx: number, dy: number) {
        // Fast piercing arrows
        const eid = this.createBaseSpell(x, y, 106);
        Spell.damage[eid] = 30 * globalStats.damageMult;
        Spell.radius[eid] = 15;
        Spell.duration[eid] = 1500;
        Spell.pierce[eid] = 3;
        Velocity.x[eid] = dx * 700; 
        Velocity.y[eid] = dy * 700;
    }

    private spawnWizardAttack(x: number, y: number, dx: number, dy: number) {
        // Elemental magic projectiles
        const eid = this.createBaseSpell(x, y, 107);
        Spell.damage[eid] = 45 * globalStats.damageMult;
        Spell.radius[eid] = 25;
        Spell.duration[eid] = 2000;
        Spell.pierce[eid] = 1;
        Velocity.x[eid] = dx * 400; 
        Velocity.y[eid] = dy * 400;
    }

    private createBaseSpell(x: number, y: number, typeId: number): number {
        const eid = addEntity(world);
        addComponent(world, Position, eid);
        addComponent(world, Velocity, eid);
        addComponent(world, Spell, eid);
        addComponent(world, SpriteInfo, eid);
        Position.x[eid] = x;
        Position.y[eid] = y;
        SpriteInfo.textureIndex[eid] = typeId;
        return eid;
    }
}
