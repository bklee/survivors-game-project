import { addEntity, addComponent, defineQuery } from 'bitecs';
import { Position, Velocity, Spell, Player, SpriteInfo } from '../components';
import { world } from '../core/World';
import { AlchemySystem } from '../alchemy/AlchemySystem';

const playerQuery = defineQuery([Player, Position]);

export class SpellSystem {
    private alchemy: AlchemySystem;
    private spellCooldowns: Map<string, number> = new Map();

    constructor(alchemy: AlchemySystem) {
        this.alchemy = alchemy;
        
        // Listen for alchemy cast event from UI or keyboard
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
        // Decrease cooldowns
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

        // Ensure we don't spam if we add auto-casting later
        if ((this.spellCooldowns.get(spellId) ?? 0) > 0) return;
        this.spellCooldowns.set(spellId, 500); // 500ms global cast cd

        // Simple mapping to spawn entities
        switch (spellId) {
            case 'fireball':
                this.spawnProjectile(px, py, 400, 0, 50, 20, 1); // straight right for now
                break;
            case 'ice_nova':
                this.spawnAoE(px, py, 150, 30, 1000, 999);
                break;
            case 'explosive_gas':
                this.spawnAoE(px, py, 200, 100, 200, 999);
                break;
            case 'backfire':
                // Take damage or drop a weak dud
                this.spawnAoE(px, py, 50, 1, 100, 999);
                break;
            default:
                // Fallback for superconduct, toxic_cloud, etc.
                this.spawnProjectile(px, py, 300, 0, 30, 30, 3);
                break;
        }
    }

    private spawnProjectile(x: number, y: number, vx: number, vy: number, damage: number, radius: number, pierce: number) {
        const eid = addEntity(world);
        addComponent(world, Position, eid);
        addComponent(world, Velocity, eid);
        addComponent(world, Spell, eid);
        addComponent(world, SpriteInfo, eid);

        Position.x[eid] = x;
        Position.y[eid] = y;
        Velocity.x[eid] = vx;
        Velocity.y[eid] = vy;

        Spell.damage[eid] = damage;
        Spell.radius[eid] = radius;
        Spell.duration[eid] = 2000; // 2 sec life
        Spell.pierce[eid] = pierce;
        
        SpriteInfo.textureIndex[eid] = 120; // Some magic sprite index
    }

    private spawnAoE(x: number, y: number, radius: number, damage: number, duration: number, pierce: number) {
        const eid = addEntity(world);
        addComponent(world, Position, eid);
        addComponent(world, Velocity, eid); // AoE stays still
        addComponent(world, Spell, eid);
        addComponent(world, SpriteInfo, eid);

        Position.x[eid] = x;
        Position.y[eid] = y;
        Velocity.x[eid] = 0;
        Velocity.y[eid] = 0;

        Spell.damage[eid] = damage;
        Spell.radius[eid] = radius;
        Spell.duration[eid] = duration;
        Spell.pierce[eid] = pierce;
        
        SpriteInfo.textureIndex[eid] = 121; // Some aura sprite index
    }
}
