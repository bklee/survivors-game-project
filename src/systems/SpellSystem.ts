import { addEntity, addComponent, defineQuery } from 'bitecs';
import { Position, Velocity, Spell, Player, SpriteInfo, Rotation } from '../components';
import { world } from '../core/World';
import { globalStats } from '../core/PlayerStats';

const playerQuery = defineQuery([Player, Position, Velocity]);

export class SpellSystem {
    private spellCooldowns: Map<string, number> = new Map();
    private lastFacingX = 1;
    private lastFacingY = 0;
    public selectedCharId: string = 'wizard';
    private autoAttackTimer: number = 0;

    private keys: Record<string, boolean> = {};

    constructor() {
        // Track keyboard input for attack direction
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') {
                this.castSpell('basic');
            }
            this.updateFacingFromKeys();
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.updateFacingFromKeys();
        });
    }

    private updateFacingFromKeys() {
        let ix = 0, iy = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) iy -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) iy += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) ix -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) ix += 1;

        const mag = Math.sqrt(ix * ix + iy * iy);
        if (mag > 0) {
            this.lastFacingX = ix / mag;
            this.lastFacingY = iy / mag;
        }
    }

    public update(dt: number) {
        for (const [spell, time] of this.spellCooldowns.entries()) {
            if (time > 0) {
                this.spellCooldowns.set(spell, time - dt);
            }
        }

        this.autoAttackTimer += dt;
        const attackInterval = 1000 * globalStats.cooldownMult;
        if (this.autoAttackTimer >= attackInterval) {
            this.autoAttackTimer = 0;
            this.castSpell('basic');
        }
    }

    private castSpell(spellId: string) {
        const players = playerQuery(world);
        if (players.length === 0) return;
        const playerEid = players[0];

        const px = Position.x[playerEid];
        const py = Position.y[playerEid];

        if ((this.spellCooldowns.get(spellId) ?? 0) > 0) return;
        this.spellCooldowns.set(spellId, 500 * globalStats.cooldownMult);

        window.dispatchEvent(new CustomEvent('combo_cast'));
        window.dispatchEvent(new CustomEvent('play_sound', { detail: 'fire_cast' }));

        if (this.selectedCharId === 'knight') {
            this.spawnKnightAttack(px, py, this.lastFacingX, this.lastFacingY);
        } else if (this.selectedCharId === 'elf') {
            this.spawnElfAttack(px, py, this.lastFacingX, this.lastFacingY);
        } else {
            this.spawnWizardAttack(px, py, this.lastFacingX, this.lastFacingY);
        }
    }

    private spawnKnightAttack(x: number, y: number, dx: number, dy: number) {
        const fxEid = this.createBaseSpell(x + dx * 35, y + dy * 35, Math.random() > 0.5 ? 109 : 110);
        Spell.damage[fxEid] = 60 * globalStats.damageMult;
        Spell.radius[fxEid] = 60;
        Spell.duration[fxEid] = 150;
        Spell.pierce[fxEid] = 10;
        Velocity.x[fxEid] = dx * 10;
        Velocity.y[fxEid] = dy * 10;
        Rotation.angle[fxEid] = Math.atan2(dy, dx);
    }

    private spawnElfAttack(x: number, y: number, dx: number, dy: number) {
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
        const staffEid = addEntity(world);
        addComponent(world, Position, staffEid);
        addComponent(world, Velocity, staffEid);
        addComponent(world, SpriteInfo, staffEid);
        addComponent(world, Rotation, staffEid);
        Position.x[staffEid] = x + dx * 10;
        Position.y[staffEid] = y + dy * 10;
        SpriteInfo.textureIndex[staffEid] = 107;
        Rotation.angle[staffEid] = Math.atan2(dy, dx);
        Velocity.x[staffEid] = dx * 10;
        Velocity.y[staffEid] = dy * 10;
        addComponent(world, Spell, staffEid);
        Spell.duration[staffEid] = 200;
        Spell.damage[staffEid] = 0;

        const castDist = 100;
        const eid = this.createBaseSpell(x + dx * castDist, y + dy * castDist, 100);
        Spell.damage[eid] = 45 * globalStats.damageMult;
        Spell.radius[eid] = 60;
        Spell.duration[eid] = 500;
        Spell.pierce[eid] = 255;
        Velocity.x[eid] = 0;
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
