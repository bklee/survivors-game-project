import { addEntity, addComponent, defineQuery, hasComponent, removeEntity } from 'bitecs';
import { world } from '../core/World';
import {
    Animation,
    Position,
    Velocity,
    Health,
    SpriteInfo,
    Enemy,
    Player,
    Boss,
    BossClone,
    BossSplit,
    EnemyProjectile,
    Lifespan,
    Scale,
    ActionState,
} from '../components';
import { DungeonGenerator } from '../core/DungeonGenerator';

const enemyQuery = defineQuery([Enemy, Position, Velocity]);
const playerQuery = defineQuery([Player, Position]);
const actionStateQuery = defineQuery([ActionState]);

export class NightDirector {
    private timeElapsed: number = 0; // ms
    private stage: number = 1;
    private maxEnemiesToSpawn: number = 0;
    private spawnedEnemiesCount: number = 0;
    private stageClearDispatched: boolean = false;
    private spawningCompleteDispatched: boolean = false;
    private bossSpawned: boolean = false;
    private bossBarrageTimer: number = 0;
    // 보스가 berserk 진입(50% HP) 시 한 번만 워닝 dispatch — 매 프레임 재발사 방지.
    private berserkWarnedBossEid: number = -1;
    private globalDifficultyMultiplier = 1.0;
    private lastSpawnTime: number = 0;
    private dungeon: DungeonGenerator;
    private scene: Phaser.Scene;

    constructor(dungeon: DungeonGenerator, scene: Phaser.Scene) {
        this.dungeon = dungeon;
        this.scene = scene;
        this.resetForNextStage(1);
    }

    public update(dt: number) {
        const actionStates = actionStateQuery(world);
        for (let i = 0; i < actionStates.length; i++) {
            const eid = actionStates[i];
            if (ActionState.attackTimer[eid] > 0) {
                ActionState.attackTimer[eid] = Math.max(0, ActionState.attackTimer[eid] - dt);
            }
        }

        if (this.stageClearDispatched) return;
        this.timeElapsed += dt;

        const isBossStage = this.stage % 3 === 0;

        if (isBossStage && !this.bossSpawned && this.timeElapsed >= 3000) {
            this.spawnBoss();
            this.bossSpawned = true;
            // 보스 등장 시점에 일반 적 스폰을 즉시 종료 → spawning_complete 분기 진입, stage_clear 정상 트리거.
            this.spawnedEnemiesCount = this.maxEnemiesToSpawn;
            window.dispatchEvent(new CustomEvent('boss_spawned'));
        }

        const enemies = enemyQuery(world);

        // Spawn normal enemies up to maxEnemiesToSpawn
        let spawnInterval = Math.max(200, 1000 - this.stage * 100);
        // 고스테이지(stage 20+) 에서 적이 너무 많아 프레임 드롭 — 150 → 80 으로 cap.
        // 난이도는 적 HP/DMG 와 시너지/광폭/분신/분열로 보상.
        let maxConcurrent = Math.min(80, 30 + this.stage * 6);

        // 보스 등장 후에는 일반 적 추가 스폰을 정지 (사용자 요청: 한계치 고정).
        // 보스가 등장하면 그 시점의 적만 처리하면 됨 — 추가 적은 더 이상 spawn 하지 않음.
        if (this.bossSpawned) {
            maxConcurrent = 0;
            spawnInterval = Number.POSITIVE_INFINITY;
        }

        if (this.spawnedEnemiesCount < this.maxEnemiesToSpawn && enemies.length < maxConcurrent) {
            if (this.timeElapsed - this.lastSpawnTime > spawnInterval) {
                const intensity = Math.min(3, Math.ceil(this.stage / 2));
                this.spawnEnemy(intensity);
                this.spawnedEnemiesCount++;
                this.lastSpawnTime = this.timeElapsed;
            }
        } else if (this.spawnedEnemiesCount >= this.maxEnemiesToSpawn) {
            if (!this.spawningCompleteDispatched) {
                this.spawningCompleteDispatched = true;
                window.dispatchEvent(new CustomEvent('spawning_complete'));
            }
            if (isBossStage) {
                // Boss stage clear condition: Boss is dead. Boss is marked with Boss component.
                const bosses = defineQuery([Boss])(world);
                if (this.bossSpawned && bosses.length === 0) {
                    this.stageClearDispatched = true;
                    window.dispatchEvent(new CustomEvent('stage_clear'));
                }
            } else {
                // Normal stage clear: all dead
                if (enemies.length === 0) {
                    this.stageClearDispatched = true;
                    window.dispatchEvent(new CustomEvent('stage_clear'));
                }
            }
        }

        const players = playerQuery(world);
        if (players.length === 0) return;
        const playerEid = players[0];
        const playerX = Position.x[playerEid];
        const playerY = Position.y[playerEid];

        const activeEnemies = enemyQuery(world);
        // 화면 밖 멀리 있는 적은 chase 계산 skip — 카메라 viewport 약 1280x720 의 두 배
        // 거리(1800px²) 안에 있을 때만 매 프레임 추적. 더 멀리 있는 적은 마지막 velocity 유지.
        // Boss 는 항상 풀 update (탄막 등).
        const CHASE_DIST_SQ = 1800 * 1800;
        for (let i = 0; i < activeEnemies.length; i++) {
            const eid = activeEnemies[i];
            const dx = playerX - Position.x[eid];
            const dy = playerY - Position.y[eid];
            const distSq = dx * dx + dy * dy;
            const isBoss = hasComponent(world, Boss, eid);

            // distance-based culling: 멀고 비-보스 적은 추적 계산 skip
            if (!isBoss && distSq > CHASE_DIST_SQ) {
                continue;
            }

            const distance = Math.sqrt(distSq);
            if (distance > 0) {
                const currentSpeed = Math.hypot(Velocity.x[eid], Velocity.y[eid]);
                const speed = currentSpeed > 0 ? currentSpeed : 50;
                Velocity.x[eid] = (dx / distance) * speed;
                Velocity.y[eid] = (dy / distance) * speed;
            }

            if (isBoss) {
                const hpPercent = Health.current[eid] / Health.max[eid];
                const isBerserk = hpPercent <= 0.5;
                // berserk 첫 진입 시 워닝 — 같은 보스에 대해 1회만 발사.
                if (isBerserk && this.berserkWarnedBossEid !== eid) {
                    this.berserkWarnedBossEid = eid;
                    window.dispatchEvent(
                        new CustomEvent('boss_warning', {
                            detail: { kind: 'berserk' },
                        }),
                    );
                }
                const attackInterval = isBerserk ? 1500 : 3000; // 폭주 시 공격 주기 2배 빨라짐

                this.bossBarrageTimer += dt;
                if (this.bossBarrageTimer >= attackInterval) {
                    this.bossBarrageTimer = 0;
                    const typeId = SpriteInfo.textureIndex[eid];
                    const bx = Position.x[eid];
                    const by = Position.y[eid];
                    // 분열 보스는 약화된 패턴만 — 탄막 절반, 특수기술 미사용.
                    const isSplit = hasComponent(world, Boss, eid)
                        ? hasComponent(world, BossSplit, eid)
                        : false;

                    if (isSplit) {
                        // 분열은 항상 기본 탄막 (count 절반), 폭주/특수기술 X.
                        this.spawnBarrage(bx, by, false, 0.5);
                    } else if (typeId === 69) {
                        // Big Demon (대악마)
                        this.spawnDemonFireAttack(bx, by, playerX, playerY, isBerserk);
                    } else if (typeId === 89) {
                        // Ogre (오우거)
                        this.spawnOgreSlamAttack(eid, bx, by, isBerserk);
                    } else {
                        // Big Zombie 및 기타 보스는 기본 탄막 유지
                        this.spawnBarrage(bx, by, isBerserk);
                    }
                }
            }
        }
    }

    private getStageEnemyType(): number {
        // 3개 스테이지 단위로 카테고리(0:Undead, 1:Orc, 2:Demon) 고정
        const categoryIndex = Math.floor((this.stage - 1) / 3) % 3;
        let pool: number[] = [];
        if (categoryIndex === 0)
            pool = [70, 71, 72, 73, 74, 75]; // Undead
        else if (categoryIndex === 1)
            pool = [80, 81, 82, 83]; // Orc
        else pool = [60, 61, 62]; // Demon
        return pool[Math.floor(Math.random() * pool.length)];
    }

    private getStageBossType(): number {
        // 몹 카테고리와 동일한 인덱스를 사용하여 보스 결정
        const categoryIndex = Math.floor((this.stage - 1) / 3) % 3;
        if (categoryIndex === 0) return 79; // Big Zombie
        if (categoryIndex === 1) return 89; // Ogre
        return 69; // Big Demon
    }

    private spawnEnemy(intensity: number) {
        const eid = addEntity(world);
        addComponent(world, Position, eid);
        addComponent(world, Velocity, eid);
        addComponent(world, Health, eid);
        addComponent(world, SpriteInfo, eid);
        addComponent(world, Animation, eid);
        addComponent(world, Enemy, eid);

        const players = playerQuery(world);
        let px = 2000;
        let py = 2000;
        if (players.length > 0) {
            px = Position.x[players[0]];
            py = Position.y[players[0]];
        }

        const pos = this.dungeon.getFloorPixelNear(px, py, 400, 800);
        Position.x[eid] = pos.x;
        Position.y[eid] = pos.y;

        const typeId = this.getStageEnemyType();
        let speed = 60; // Base speed, no longer scaled by stage/intensity
        let hp = 10 * intensity * this.globalDifficultyMultiplier;

        // Stat adjustments based on category
        if (typeId >= 80) {
            speed *= 0.8;
            hp *= 1.5;
        } // Orcs: slower but tougher
        else if (typeId >= 60 && typeId < 70) {
            speed *= 1.05;
            hp *= 1.1;
        } // Demons: slightly faster (was 1.2)

        // Cap speed to 190 (player is 200) to ensure maneuvering is possible
        speed = Math.min(speed, 190);

        // Specific monster tweaks
        if (typeId === 71) {
            speed *= 0.7;
            hp *= 1.2;
        } // Necromancer: slightly slower

        const angle = Math.random() * Math.PI * 2;
        Velocity.x[eid] = Math.cos(angle) * speed;
        Velocity.y[eid] = Math.sin(angle) * speed;
        Health.current[eid] = hp;
        Health.max[eid] = hp;
        SpriteInfo.textureIndex[eid] = typeId;
        Animation.frameRate[eid] = 8;
        Animation.timer[eid] = Math.random() * 1000;
    }

    private spawnBoss() {
        const eid = addEntity(world);
        addComponent(world, Position, eid);
        addComponent(world, Velocity, eid);
        addComponent(world, Health, eid);
        addComponent(world, SpriteInfo, eid);
        addComponent(world, Animation, eid);
        addComponent(world, Enemy, eid);
        addComponent(world, Boss, eid);

        const players = playerQuery(world);
        let px = 2000;
        let py = 2000;
        if (players.length > 0) {
            px = Position.x[players[0]];
            py = Position.y[players[0]];
        }

        const pos = this.dungeon.getFloorPixelNear(px, py, 500, 1000);
        Position.x[eid] = pos.x;
        Position.y[eid] = pos.y;

        const typeId = this.getStageBossType();
        const angle = Math.random() * Math.PI * 2;
        Velocity.x[eid] = Math.cos(angle) * 35;
        Velocity.y[eid] = Math.sin(angle) * 35;

        const hp = 1000 * this.globalDifficultyMultiplier * (this.stage / 3);
        Health.current[eid] = hp;
        Health.max[eid] = hp;
        SpriteInfo.textureIndex[eid] = typeId;
        Animation.frameRate[eid] = 6;
        Animation.timer[eid] = 0;

        if (typeId === 89) {
            // Ogre
            addComponent(world, ActionState, eid);
            ActionState.attackDuration[eid] = 600;
        }

        const bName = typeId === 69 ? 'BIG DEMON' : typeId === 79 ? 'BIG ZOMBIE' : 'OGRE';
        window.dispatchEvent(
            new CustomEvent('boss_hp', {
                detail: { current: hp, max: hp, name: bName },
            }),
        );
        window.dispatchEvent(new CustomEvent('boss_lore_shown', { detail: { typeId } }));
        // 보스 등장 임팩트 사운드
        window.dispatchEvent(new CustomEvent('play_sound', { detail: 'level_up' }));

        // === Stage 6+ 분신 변종 — 25% 확률 ===
        // 메인 보스 옆에 약화된 분신 1개 spawn (HP 30%, dmg 50%, 더 작음).
        // Boss component 없음 → 별도 보스 HP 막대 표시 안 됨, 사망 시 분열 처리 X.
        if (this.stage >= 6 && Math.random() < 0.25) {
            this.spawnBossClone(pos.x + 150, pos.y, typeId, hp * 0.3);
        }
    }

    /** 분신 — 메인 보스의 약화 복제본 (Boss 컴포넌트 없음, 별도 HP 막대 없음) */
    private spawnBossClone(x: number, y: number, typeId: number, hp: number) {
        const eid = addEntity(world);
        addComponent(world, Position, eid);
        addComponent(world, Velocity, eid);
        addComponent(world, Health, eid);
        addComponent(world, SpriteInfo, eid);
        addComponent(world, Animation, eid);
        addComponent(world, Enemy, eid);
        // 의도적으로 Boss 컴포넌트 미부착 — 일반 강한 적으로 취급
        addComponent(world, BossClone, eid);

        Position.x[eid] = x;
        Position.y[eid] = y;
        const angle = Math.random() * Math.PI * 2;
        Velocity.x[eid] = Math.cos(angle) * 50;
        Velocity.y[eid] = Math.sin(angle) * 50;
        Health.current[eid] = hp;
        Health.max[eid] = hp;
        SpriteInfo.textureIndex[eid] = typeId;
        Animation.frameRate[eid] = 8;
        Animation.timer[eid] = 0;
    }

    private spawnBarrage(
        x: number,
        y: number,
        isBerserk: boolean = false,
        countMultiplier: number = 1,
    ) {
        const baseCount = 12;
        // 폭주 시 탄막 2배, 분열 등 약화 모드 (countMultiplier 0.5) 시 절반.
        const count = Math.max(
            2,
            Math.floor((isBerserk ? baseCount * 2 : baseCount) * countMultiplier),
        );
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const beid = addEntity(world);
            addComponent(world, Position, beid);
            addComponent(world, Velocity, beid);
            addComponent(world, EnemyProjectile, beid);
            addComponent(world, SpriteInfo, beid);
            addComponent(world, Lifespan, beid);
            Position.x[beid] = x;
            Position.y[beid] = y;
            Velocity.x[beid] = Math.cos(angle) * 150;
            Velocity.y[beid] = Math.sin(angle) * 150;
            Lifespan.duration[beid] = 1200;
            SpriteInfo.textureIndex[beid] = 104;
        }
    }

    private spawnDemonFireAttack(
        bx: number,
        by: number,
        px: number,
        py: number,
        isBerserk: boolean = false,
    ) {
        // 플레이어 방향으로 연쇄 불기둥 생성
        const baseCount = 5;
        const count = isBerserk ? baseCount * 2 : baseCount; // 폭주 시 불기둥 10개 (거리 증가)
        const dx = px - bx;
        const dy = py - by;
        const dist = Math.hypot(dx, dy);
        const ux = dx / dist;
        const uy = dy / dist;

        for (let i = 0; i < count; i++) {
            const delay = isBerserk ? i * 100 : i * 200; // 폭주 시 더 빠르게 연쇄 발동
            this.scene.time.delayedCall(delay, () => {
                const spawnX = bx + ux * (i * 30 + 30);
                const spawnY = by + uy * (i * 30 + 30);

                const feid = addEntity(world);
                addComponent(world, Position, feid);
                addComponent(world, Velocity, feid);
                addComponent(world, EnemyProjectile, feid);
                addComponent(world, SpriteInfo, feid);
                addComponent(world, Lifespan, feid);
                addComponent(world, Animation, feid);
                addComponent(world, Scale, feid);

                Position.x[feid] = spawnX;
                Position.y[feid] = spawnY;
                Velocity.x[feid] = 0;
                Velocity.y[feid] = 0;
                SpriteInfo.textureIndex[feid] = 100; // Wizard's Fire Pillar (Spell Fire)
                Scale.value[feid] = 1.25; // 크기 2.5 -> 1.25 (1/2 축소)
                Lifespan.duration[feid] = 800;
                Animation.timer[feid] = 0;

                // 불기둥 소환 시 효과음
                window.dispatchEvent(new CustomEvent('play_sound', { detail: 'fire_cast' }));
            });
        }
    }

    private spawnOgreSlamAttack(eid: number, bx: number, by: number, isBerserk: boolean = false) {
        // 배트 휘두르기 애니메이션 트리거
        if (hasComponent(world, ActionState, eid)) {
            ActionState.attackTimer[eid] = ActionState.attackDuration[eid];
        }

        // 보스 중심에서 퍼져나가는 고밀도 충격파 (지면 강타)
        const baseCount = 16;
        const count = isBerserk ? baseCount * 2 : baseCount; // 폭주 시 32개 충격파
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const feid = addEntity(world);
            addComponent(world, Position, feid);
            addComponent(world, Velocity, feid);
            addComponent(world, EnemyProjectile, feid);
            addComponent(world, SpriteInfo, feid);
            addComponent(world, Lifespan, feid);
            addComponent(world, Animation, feid);
            addComponent(world, Scale, feid);

            Position.x[feid] = bx;
            Position.y[feid] = by;
            Velocity.x[feid] = Math.cos(angle) * 200;
            Velocity.y[feid] = Math.sin(angle) * 200;
            SpriteInfo.textureIndex[feid] = 101; // Wizard's Ice (Spell Ice) - 충격파 대용
            Scale.value[feid] = 1.0;
            Lifespan.duration[feid] = 1000;
            Animation.timer[feid] = 0;
        }
        window.dispatchEvent(new CustomEvent('play_sound', { detail: 'hit' }));
    }

    public resetForNextStage(stage: number = 1) {
        console.log(`Resetting for stage ${stage}... Increasing intensity!`);
        this.stage = stage;
        this.timeElapsed = 0;
        this.bossSpawned = false;
        this.berserkWarnedBossEid = -1;
        this.stageClearDispatched = false;
        this.spawningCompleteDispatched = false;
        this.lastSpawnTime = 0;
        // 매 스테이지마다 적의 체력과 공격력이 25%씩 중첩(복리)되어 강화
        this.globalDifficultyMultiplier = Math.pow(1.25, stage - 1);

        // 적 생성 수량: 현재 스테이지 번호 × 20마리, 최대 100마리 제한
        this.maxEnemiesToSpawn = Math.min(stage * 20, 100);

        this.spawnedEnemiesCount = 0;

        const enemies = enemyQuery(world);
        for (let i = 0; i < enemies.length; i++) {
            removeEntity(world, enemies[i]);
        }
        const projectiles = defineQuery([EnemyProjectile, Position])(world);
        for (let i = 0; i < projectiles.length; i++) {
            removeEntity(world, projectiles[i]);
        }
    }
}
