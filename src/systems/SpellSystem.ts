import { addEntity, addComponent, defineQuery } from 'bitecs';
import { Position, Velocity, Spell, Player, SpriteInfo, Rotation, Animation } from '../components';
import { world } from '../core/World';
import { globalStats } from '../core/PlayerStats';

const playerQuery = defineQuery([Player, Position, Velocity]);

export class SpellSystem {
    private spellCooldowns: Map<string, number> = new Map();
    private lastFacingX = 1;
    private lastFacingY = 0;
    public selectedCharId: string = 'wizard';
    private autoAttackTimer: number = 0;
    private scene: Phaser.Scene;

    private keys: Record<string, boolean> = {};

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
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

    public setFacing(ix: number, iy: number) {
        const mag = Math.sqrt(ix * ix + iy * iy);
        if (mag > 0.01) {
            this.lastFacingX = ix / mag;
            this.lastFacingY = iy / mag;
        }
    }

    private updateFacingFromKeys() {
        let ix = 0,
            iy = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) iy -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) iy += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) ix -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) ix += 1;

        this.setFacing(ix, iy);
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

        const animDuration =
            this.selectedCharId === 'knight' || this.selectedCharId === 'dwarf' ? 250 : 400;
        this.spellCooldowns.set(spellId, 500 * globalStats.cooldownMult);

        window.dispatchEvent(new CustomEvent('combo_cast', { detail: { duration: animDuration } }));

        const extraProjectiles = Math.floor((globalStats.currentLevel || 1) / 10);

        if (this.selectedCharId === 'knight' || this.selectedCharId === 'dwarf') {
            // dwarf 는 knight 와 동일한 검 슬래시 공격 (도끼 시각 + 슬래시 이펙트)
            window.dispatchEvent(new CustomEvent('play_sound', { detail: 'fire_cast' }));
            for (let i = 0; i <= extraProjectiles; i++) {
                const angle = this.calculateAngleOffset(i);
                const dir = this.rotateVector(this.lastFacingX, this.lastFacingY, angle);
                this.spawnKnightAttack(px, py, dir.x, dir.y);
            }
            // 레벨 보너스 — 10레벨마다 파이어볼 1개씩 추가 발사 (정면 + 좌우 분산)
            const bonusFireballs = Math.floor((globalStats.currentLevel || 1) / 10);
            for (let i = 0; i < bonusFireballs; i++) {
                const angle = this.calculateAngleOffset(i);
                const dir = this.rotateVector(this.lastFacingX, this.lastFacingY, angle);
                this.spawnFireballProjectile(px, py, dir.x, dir.y);
            }
        } else if (this.selectedCharId === 'elf') {
            this.scene.time.delayedCall(300, () => {
                const playersNow = playerQuery(world);
                if (playersNow.length > 0) {
                    const eidNow = playersNow[0];
                    window.dispatchEvent(new CustomEvent('play_sound', { detail: 'fire_cast' }));
                    for (let i = 0; i <= extraProjectiles; i++) {
                        const angle = this.calculateAngleOffset(i);
                        const dir = this.rotateVector(this.lastFacingX, this.lastFacingY, angle);
                        this.spawnElfAttack(Position.x[eidNow], Position.y[eidNow], dir.x, dir.y);
                    }
                }
            });
        } else if (this.selectedCharId === 'necromancer') {
            window.dispatchEvent(new CustomEvent('play_sound', { detail: 'fire_cast' }));
            for (let i = 0; i <= extraProjectiles; i++) {
                const angle = this.calculateAngleOffset(i);
                const dir = this.rotateVector(this.lastFacingX, this.lastFacingY, angle);
                this.spawnSoulBoltAttack(px, py, dir.x, dir.y, i === 0);
            }
        } else if (this.selectedCharId === 'druid') {
            window.dispatchEvent(new CustomEvent('play_sound', { detail: 'fire_cast' }));
            for (let i = 0; i <= extraProjectiles; i++) {
                const angle = this.calculateAngleOffset(i);
                const dir = this.rotateVector(this.lastFacingX, this.lastFacingY, angle);
                this.spawnDruidAttack(px, py, dir.x, dir.y, i === 0);
            }
        } else if (this.selectedCharId === 'engineer') {
            window.dispatchEvent(new CustomEvent('play_sound', { detail: 'fire_cast' }));
            for (let i = 0; i <= extraProjectiles; i++) {
                const angle = this.calculateAngleOffset(i);
                const dir = this.rotateVector(this.lastFacingX, this.lastFacingY, angle);
                this.spawnEngineerAttack(px, py, dir.x, dir.y, i === 0);
            }
        } else {
            window.dispatchEvent(new CustomEvent('play_sound', { detail: 'fire_cast' }));
            for (let i = 0; i <= extraProjectiles; i++) {
                const angle = this.calculateAngleOffset(i);
                const dir = this.rotateVector(this.lastFacingX, this.lastFacingY, angle);
                this.spawnWizardAttack(px, py, dir.x, dir.y, i === 0);
            }
        }
    }

    private calculateAngleOffset(index: number): number {
        if (index === 0) return 0;
        // 1 -> 15, 2 -> -15, 3 -> 30, 4 -> -30...
        return 15 * Math.ceil(index / 2) * (index % 2 === 1 ? 1 : -1);
    }

    private rotateVector(x: number, y: number, angleDeg: number): { x: number; y: number } {
        const rad = angleDeg * (Math.PI / 180);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        return {
            x: x * cos - y * sin,
            y: x * sin + y * cos,
        };
    }

    private spawnKnightAttack(x: number, y: number, dx: number, dy: number) {
        const fxEid = this.createBaseSpell(
            x + dx * 35,
            y + dy * 35,
            Math.random() > 0.5 ? 109 : 110,
        );
        Spell.damage[fxEid] = 60 * globalStats.damageMult;
        Spell.radius[fxEid] = 60;
        Spell.duration[fxEid] = 250;
        Spell.pierce[fxEid] = 10;
        Velocity.x[fxEid] = dx * 10;
        Velocity.y[fxEid] = dy * 10;
        Rotation.angle[fxEid] = Math.atan2(dy, dx);
    }

    private spawnElfAttack(x: number, y: number, dx: number, dy: number) {
        const eid = this.createBaseSpell(x, y, 106);
        Spell.damage[eid] = 30 * globalStats.damageMult;
        Spell.radius[eid] = 15;
        Spell.duration[eid] = 400;
        Spell.pierce[eid] = 3;
        Velocity.x[eid] = dx * 400;
        Velocity.y[eid] = dy * 400;
        Rotation.angle[eid] = Math.atan2(dy, dx);
    }

    // Knight/Dwarf 레벨 보너스 — 정면으로 날아가는 파이어볼 (검 슬래시와 별개).
    // 사거리는 약 245px (vx 350 × 0.7s) — 화면 절반 못 미치는 정도로 절제.
    private spawnFireballProjectile(x: number, y: number, dx: number, dy: number) {
        const eid = this.createBaseSpell(x + dx * 25, y + dy * 25, 100);
        Spell.damage[eid] = 35 * globalStats.damageMult;
        Spell.radius[eid] = 25;
        Spell.duration[eid] = 700;
        Spell.pierce[eid] = 3;
        Velocity.x[eid] = dx * 350;
        Velocity.y[eid] = dy * 350;
        Rotation.angle[eid] = Math.atan2(dy, dx);
    }

    private spawnWizardAttack(x: number, y: number, dx: number, dy: number, playSound: boolean) {
        const explosionCount = 3;
        const spacing = 25;
        const firstDist = 20;
        const delay = 80;

        for (let i = 0; i < explosionCount; i++) {
            this.scene.time.delayedCall(i * delay, () => {
                const castDist = firstDist + i * spacing;
                const eid = this.createBaseSpell(x + dx * castDist, y + dy * castDist, 100);
                Spell.damage[eid] = 45 * globalStats.damageMult;
                Spell.radius[eid] = 45;
                Spell.duration[eid] = 400;
                Spell.pierce[eid] = 255;
                Velocity.x[eid] = 0;
                Velocity.y[eid] = 0;

                if (playSound) {
                    window.dispatchEvent(new CustomEvent('play_sound', { detail: 'fire_cast' }));
                }
            });
        }
    }

    private spawnSoulBoltAttack(x: number, y: number, dx: number, dy: number, playSound: boolean) {
        const startX = x + dx * 20;
        const startY = y + dy * 20;
        const speed = 420;
        const lifetimeMs = 700;

        // createBaseSpell 사용: SpriteInfo 부착(typeId=99) → PhysicsSystem 벽 충돌 적용,
        // RenderSystem은 typeId=99를 skip하므로 기본 sprite는 표시 안 됨
        const eid = this.createBaseSpell(startX, startY, 99);
        Spell.damage[eid] = 55 * globalStats.damageMult;
        Spell.radius[eid] = 12;
        Spell.duration[eid] = lifetimeMs;
        Spell.pierce[eid] = 2;
        Velocity.x[eid] = dx * speed;
        Velocity.y[eid] = dy * speed;
        Rotation.angle[eid] = Math.atan2(dy, dx);

        // 시각: 작은 보라 막대 (완드형) + 꼬리 원 — ECS Position 추적
        const wand = this.scene.add.rectangle(startX, startY, 18, 4, 0x9c27b0, 1);
        wand.setStrokeStyle(1, 0xe1bee7, 0.8);
        wand.setRotation(Math.atan2(dy, dx));
        wand.setDepth(20);
        const trail = this.scene.add.circle(startX, startY, 5, 0xce93d8, 0.6);
        trail.setDepth(19);

        let prevX = startX;
        let prevY = startY;
        let stalledFrames = 0;

        const cleanup = () => {
            wand.destroy();
            trail.destroy();
            this.scene.events.off('update', onUpdate);
        };

        const onUpdate = () => {
            // 엔티티가 아직 살아있는지 확인 (duration > 0, Spell 컴포넌트 존재 여부)
            if (Spell.duration[eid] <= 0) {
                cleanup();
                return;
            }
            const cx = Position.x[eid];
            const cy = Position.y[eid];

            // 벽에 막혀 위치가 변하지 않으면 2프레임 후 즉시 제거
            if (Math.abs(cx - prevX) < 0.1 && Math.abs(cy - prevY) < 0.1) {
                stalledFrames++;
                if (stalledFrames >= 2) {
                    Spell.duration[eid] = 0;
                    cleanup();
                    return;
                }
            } else {
                stalledFrames = 0;
            }

            prevX = cx;
            prevY = cy;
            wand.x = cx;
            wand.y = cy;
            trail.x = cx;
            trail.y = cy;
        };

        this.scene.events.on('update', onUpdate);

        // 안전망: lifetime 이후 정리
        this.scene.time.delayedCall(lifetimeMs + 100, cleanup);

        if (playSound) {
            window.dispatchEvent(new CustomEvent('play_sound', { detail: 'fire_cast' }));
        }
    }

    private spawnDruidAttack(x: number, y: number, dx: number, dy: number, playSound: boolean) {
        // 녹색 마법탄 — wizard 변종, 더 빠르고 덩굴 느낌
        const speed = 380;
        const lifetimeMs = 600;
        const eid = this.createBaseSpell(x + dx * 20, y + dy * 20, 99);
        Spell.damage[eid] = 40 * globalStats.damageMult;
        Spell.radius[eid] = 14;
        Spell.duration[eid] = lifetimeMs;
        Spell.pierce[eid] = 3;
        Velocity.x[eid] = dx * speed;
        Velocity.y[eid] = dy * speed;
        Rotation.angle[eid] = Math.atan2(dy, dx);

        const bolt = this.scene.add.circle(x + dx * 20, y + dy * 20, 7, 0x4caf50, 0.9);
        bolt.setDepth(20);

        const cleanup = () => {
            bolt.destroy();
            this.scene.events.off('update', onUpdate);
        };
        const onUpdate = () => {
            if (Spell.duration[eid] <= 0) {
                cleanup();
                return;
            }
            bolt.setPosition(Position.x[eid], Position.y[eid]);
        };
        this.scene.events.on('update', onUpdate);
        this.scene.time.delayedCall(lifetimeMs + 100, cleanup);

        if (playSound) {
            window.dispatchEvent(new CustomEvent('play_sound', { detail: 'fire_cast' }));
        }
    }

    private spawnEngineerAttack(x: number, y: number, dx: number, dy: number, playSound: boolean) {
        // 회청색 빠른 마법탄 — 관통력 낮지만 빠름
        const speed = 500;
        const lifetimeMs = 500;
        const eid = this.createBaseSpell(x + dx * 20, y + dy * 20, 99);
        Spell.damage[eid] = 35 * globalStats.damageMult;
        Spell.radius[eid] = 10;
        Spell.duration[eid] = lifetimeMs;
        Spell.pierce[eid] = 1;
        Velocity.x[eid] = dx * speed;
        Velocity.y[eid] = dy * speed;
        Rotation.angle[eid] = Math.atan2(dy, dx);

        const bolt = this.scene.add.rectangle(x + dx * 20, y + dy * 20, 16, 4, 0x607d8b, 1);
        bolt.setStrokeStyle(1, 0x90a4ae, 0.9);
        bolt.setRotation(Math.atan2(dy, dx));
        bolt.setDepth(20);

        const cleanup = () => {
            bolt.destroy();
            this.scene.events.off('update', onUpdate);
        };
        const onUpdate = () => {
            if (Spell.duration[eid] <= 0) {
                cleanup();
                return;
            }
            bolt.setPosition(Position.x[eid], Position.y[eid]);
        };
        this.scene.events.on('update', onUpdate);
        this.scene.time.delayedCall(lifetimeMs + 100, cleanup);

        if (playSound) {
            window.dispatchEvent(new CustomEvent('play_sound', { detail: 'fire_cast' }));
        }
    }

    private createBaseSpell(x: number, y: number, typeId: number): number {
        const eid = addEntity(world);
        addComponent(world, Position, eid);
        addComponent(world, Velocity, eid);
        addComponent(world, Spell, eid);
        addComponent(world, SpriteInfo, eid);
        addComponent(world, Rotation, eid);
        addComponent(world, Animation, eid); // Animation 컴포넌트 추가
        Position.x[eid] = x;
        Position.y[eid] = y;
        SpriteInfo.textureIndex[eid] = typeId;
        return eid;
    }
}
