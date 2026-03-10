import Phaser from 'phaser';
import { defineQuery, addEntity, addComponent, hasComponent, removeEntity } from 'bitecs';
import { world } from '../core/World';
import { Position, Velocity, Player, SpriteInfo, Animation, Health, Interactive, Item, Enemy } from '../components';
import { createPhysicsSystem } from '../systems/PhysicsSystem';
import { createRenderSystem } from '../systems/RenderSystem';
import { PlayerSystem } from '../systems/PlayerSystem';
import { NightDirector } from '../systems/WaveSystem';

import { CHARACTERS } from '../constants/CharacterConfig';

import { JuicePipeline } from '../fx/JuicePipeline';
import { createCombatSystem } from '../systems/CombatSystem';
import { SpellSystem } from '../systems/SpellSystem';
import { ItemSystem } from '../systems/ItemSystem';
import { DungeonGenerator, TILE_SIZE, TileType } from '../core/DungeonGenerator';
import { globalStats } from '../core/PlayerStats';
import { CharacterData } from '../constants/CharacterConfig';

export class MainScene extends Phaser.Scene {
    private physicsSystem!: (dt: number) => void;
    private renderSystem!: (dt: number) => void;
    private playerSystem!: PlayerSystem;
    private nightDirector!: NightDirector;
    private uiScene!: any;
    private playerId!: number;
    private juicePipeline!: JuicePipeline;
    private combatSystem!: (dt: number) => void;
    private spellSystem!: SpellSystem;
    private itemSystem!: ItemSystem;
    private selectedCharId: string = 'wizard';
    private currentBGM?: Phaser.Sound.BaseSound;
    private dungeon!: DungeonGenerator;
    private wallBlitter!: Phaser.GameObjects.Blitter;
    private floorSprite!: Phaser.GameObjects.TileSprite;
    private currentStage: number = 1;
    private isPausedForClear: boolean = false;
    private charData!: CharacterData;
    private secretRoomData?: { doorPixel: { x: number; y: number }; floorPixels: { x: number; y: number }[] };

    constructor() {
        super('MainScene');
    }

    init(data: { characterId: string }) {
        if (data && data.characterId) {
            this.selectedCharId = data.characterId.toLowerCase();
            console.log('Battlefield: Using character', this.selectedCharId);
        }
    }

    create() {
        // --- Fresh Start Reset ---
        // 1. Clear Bitecs World
        const allEntities = defineQuery([Position])(world);
        for (let i = 0; i < allEntities.length; i++) {
            removeEntity(world, allEntities[i]);
        }

        // 2. Reset Global Stats
        globalStats.damageMult = 1;
        globalStats.moveSpeedMult = 1;
        globalStats.cooldownMult = 1;
        globalStats.pickupRadiusMult = 1;

        // 3. Ensure UIScene is running
        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        }
        // -------------------------

        this.currentStage = 1;
        this.isPausedForClear = false;

        this.dungeon = new DungeonGenerator(100, 100);

        const charData = CHARACTERS[this.selectedCharId.toUpperCase()] || CHARACTERS.WIZARD;
        this.charData = charData; // Store it for update loop

        this.physicsSystem = createPhysicsSystem(this.dungeon);
        this.playerSystem = new PlayerSystem(charData);
        this.nightDirector = new NightDirector(this.dungeon);
        this.juicePipeline = new JuicePipeline(this);
        this.combatSystem = createCombatSystem(this.juicePipeline);
        this.spellSystem = new SpellSystem(this);
        this.itemSystem = new ItemSystem();

        this.spellSystem.selectedCharId = this.selectedCharId;

        this.floorSprite = this.add.tileSprite(0, 0, this.dungeon.width * TILE_SIZE, this.dungeon.height * TILE_SIZE, 'dungeon', 'floor')
            .setOrigin(0, 0)
            .setDepth(-3);

        this.wallBlitter = this.add.blitter(0, 0, 'walls').setDepth(-2);

        this.buildMap(this.currentStage);

        const charBlitter = this.add.blitter(0, 0, 'dungeon').setDepth(0);
        this.renderSystem = createRenderSystem(this, charBlitter);

        this.playerId = addEntity(world);
        addComponent(world, Position, this.playerId);
        addComponent(world, Velocity, this.playerId);
        addComponent(world, Player, this.playerId);
        addComponent(world, SpriteInfo, this.playerId);
        addComponent(world, Animation, this.playerId);
        addComponent(world, Health, this.playerId);

        const startPos = this.dungeon.getRandomFloorPixel();
        Position.x[this.playerId] = startPos.x;
        Position.y[this.playerId] = startPos.y;

        let charTypeId = 1;
        if (this.selectedCharId === 'knight') charTypeId = 0;
        else if (this.selectedCharId === 'elf') charTypeId = 2;

        SpriteInfo.textureIndex[this.playerId] = charTypeId;
        Animation.frameRate[this.playerId] = 10;
        Health.current[this.playerId] = this.charData.baseStats.health;
        Health.max[this.playerId] = this.charData.baseStats.health;

        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('hp_updated', {
                detail: { current: Health.current[this.playerId], max: Health.max[this.playerId] }
            }));
            window.dispatchEvent(new CustomEvent('stage_updated', { detail: this.currentStage }));
        }, 100);

        import('../core/PlayerStats').then(m => {
            m.globalStats.damageMult = charData.baseStats.damage;
        });

        this.cameras.main.setZoom(2.5);
        this.uiScene = this.scene.get('UIScene');

        const soundHandler = ((e: CustomEvent<string>) => {
            if (this.cache.audio.exists(e.detail)) {
                this.sound.play(e.detail, { volume: 0.5 });
            }
        }) as EventListener;
        window.addEventListener('play_sound', soundHandler);

        const comboCastHandler = () => {
        };
        window.addEventListener('combo_cast', comboCastHandler);

        const deathHandler = () => {
            this.time.delayedCall(1000, () => {
                this.scene.pause();
                this.scene.launch('GameOverScene');
            });
        };
        window.addEventListener('player_died', deathHandler);

        const recipeHandler = (e: KeyboardEvent) => {
            if (e.code === 'KeyE') {
                this.scene.pause();
                this.scene.launch('RecipeScene');
            }
            // Debug: Skip to boss stage
            if (e.code === 'KeyB' && e.shiftKey) {
                this.currentStage = 2; // Will become 3 in nextStageHandler
                window.dispatchEvent(new CustomEvent('next_stage'));
            }
            // Debug: Trigger stage clear
            if (e.code === 'KeyC' && e.shiftKey) {
                window.dispatchEvent(new CustomEvent('stage_clear'));
            }
            // Debug: Trigger Game Over
            if (e.code === 'KeyR' && e.shiftKey) {
                window.dispatchEvent(new CustomEvent('player_died'));
            }
        };
        window.addEventListener('keydown', recipeHandler);

        const nextStageHandler = () => {
            this.currentStage++;
            this.isPausedForClear = false;

            // Remove old props, items, and spells from previous stage
            const allEntities = defineQuery([Position, SpriteInfo])(world);
            for (let i = 0; i < allEntities.length; i++) {
                const eid = allEntities[i];
                if (eid === this.playerId) continue; // Keep player
                const tid = SpriteInfo.textureIndex[eid];
                // Props (32-36), Items/Coins (20-21), Spells (100+), Enemies (60-89)
                if ((tid >= 20 && tid <= 36) || tid >= 60) {
                    removeEntity(world, eid);
                }
            }

            this.buildMap(this.currentStage);

            const startPos = this.dungeon.getRandomFloorPixel();
            Position.x[this.playerId] = startPos.x;
            Position.y[this.playerId] = startPos.y;

            this.nightDirector.resetForNextStage(this.currentStage);

            // Restore HP to 100% on new stage
            Health.current[this.playerId] = Health.max[this.playerId];
            window.dispatchEvent(new CustomEvent('hp_updated', {
                detail: { current: Health.current[this.playerId], max: Health.max[this.playerId] }
            }));

            // Re-spawn props on new map
            this.spawnDungeonProps();

            // Stop any ongoing sounds (like victory fanfare) before starting a new stage
            this.sound.stopAll();

            // Random BGM selection for normal stages, specific for boss stages
            if (this.currentStage % 3 === 0) {
                this.startBGM('boss_bgm');
            } else {
                const normalBGMs = ['main_bgm', 'bgm_metal', 'bgm_unchained'];
                const randomBGM = normalBGMs[Math.floor(Math.random() * normalBGMs.length)];
                this.startBGM(randomBGM);
            }
            window.dispatchEvent(new CustomEvent('stage_updated', { detail: this.currentStage }));
        };
        window.addEventListener('next_stage', nextStageHandler);

        const stageClearInternalHandler = () => {
            this.isPausedForClear = true;
            Velocity.x[this.playerId] = 0;
            Velocity.y[this.playerId] = 0;
            this.sound.stopAll();
            if (this.cache.audio.exists('victory_fanfare')) {
                this.sound.play('victory_fanfare', { volume: 0.5 });
            }
        };
        window.addEventListener('stage_clear', stageClearInternalHandler);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener('play_sound', soundHandler);
            window.removeEventListener('combo_cast', comboCastHandler);
            window.removeEventListener('player_died', deathHandler);
            window.removeEventListener('keydown', recipeHandler);
            window.removeEventListener('next_stage', nextStageHandler);
            window.removeEventListener('stage_clear', stageClearInternalHandler);
        });

        this.startBGM('main_bgm');
        window.addEventListener('boss_spawned', () => this.startBGM('boss_bgm'));

        this.spawnDungeonProps();
        window.dispatchEvent(new CustomEvent('game_started'));
    }

    private buildMap(stage: number) {
        const scale = Math.pow(1.10, Math.max(0, stage - 1));
        const mapW = Math.floor(100 * scale);
        const mapH = Math.floor(100 * scale);

        this.dungeon.width = mapW;
        this.dungeon.height = mapH;
        this.dungeon.generate();

        // 비밀 방 생성 (맵 타일을 수정하므로 벽 렌더링 전에 호출)
        this.secretRoomData = this.dungeon.carveSecretRoom();

        const wPx = mapW * TILE_SIZE;
        const hPx = mapH * TILE_SIZE;

        this.floorSprite.setSize(wPx, hPx);
        this.cameras.main.setBounds(0, 0, wPx, hPx);

        this.wallBlitter.clear();
        for (let y = 0; y < mapH; y++) {
            for (let x = 0; x < mapW; x++) {
                if (this.dungeon.map[y][x] === TileType.WALL) {
                    let frame = 'wall_top';
                    const bottom = y < mapH - 1 ? this.dungeon.map[y + 1][x] : TileType.WALL;
                    if (bottom === TileType.FLOOR) frame = 'wall_top';
                    else frame = 'wall_inner';

                    this.wallBlitter.create(x * TILE_SIZE, y * TILE_SIZE, frame);
                } else if (this.dungeon.map[y][x] === TileType.DOOR) {
                    // Render door frames
                    // The leftmost tile of the 2-tile wide door:
                    if (x > 0 && this.dungeon.map[y][x - 1] === TileType.WALL) {
                        this.wallBlitter.create(x * TILE_SIZE - 8, y * TILE_SIZE, 'doors_frame_left');
                    }
                    // The rightmost tile of the 2-tile wide door:
                    if (x < mapW - 1 && this.dungeon.map[y][x + 1] === TileType.WALL) {
                        this.wallBlitter.create(x * TILE_SIZE + TILE_SIZE + 8, y * TILE_SIZE, 'doors_frame_right');
                    }
                    // The top frame of the door
                    if (y > 0 && this.dungeon.map[y - 1][x] === TileType.WALL) {
                        this.wallBlitter.create(x * TILE_SIZE, y * TILE_SIZE - 16, 'doors_frame_top');
                    }
                }
            }
        }
        window.dispatchEvent(new CustomEvent('map_generated', { detail: this.dungeon.map }));
    }

    update(_time: number, delta: number) {
        if (this.isPausedForClear) {
            this.renderSystem(delta);
            return;
        }

        this.nightDirector.update(delta);
        this.playerSystem.update(delta);

        const dX = this.uiScene?.joystick?.vector?.x || 0;
        const dY = this.uiScene?.joystick?.vector?.y || 0;
        if (dX !== 0 || dY !== 0) {
            const speed = this.charData.baseStats.speed * globalStats.moveSpeedMult;
            Velocity.x[this.playerId] = dX * speed;
            Velocity.y[this.playerId] = dY * speed;
            this.spellSystem.setFacing(dX, dY);
        }

        this.spellSystem.update(delta);
        this.physicsSystem(delta);
        this.combatSystem(delta);
        this.itemSystem.update(delta);
        this.renderSystem(delta);
        this.handleInteractions(delta);

        this.cameras.main.centerOn(Position.x[this.playerId], Position.y[this.playerId]);
    }

    private handleInteractions(_dt: number) {
        const px = Position.x[this.playerId];
        const py = Position.y[this.playerId];
        const interactives = defineQuery([Position, SpriteInfo])(world);
        const enemies = defineQuery([Enemy, Position, Health])(world);

        for (let i = 0; i < interactives.length; i++) {
            const eid = interactives[i];
            const typeId = SpriteInfo.textureIndex[eid];
            const dx = px - Position.x[eid];
            const dy = py - Position.y[eid];
            const distSq = dx * dx + dy * dy;

            if (typeId === 40) {
                if (distSq < 40 * 40 && hasComponent(world, Interactive, eid) && Interactive.isActivated[eid] === 0) {
                    Interactive.isActivated[eid] = 1;
                    const linkId = Interactive.id[eid];
                    window.dispatchEvent(new CustomEvent('play_sound', { detail: 'hit' }));

                    // Link: Activate all items with same ID (e.g. Doors)
                    if (linkId > 0) {
                        for (let j = 0; j < interactives.length; j++) {
                            const targetEid = interactives[j];
                            if (targetEid !== eid && hasComponent(world, Interactive, targetEid) && Interactive.id[targetEid] === linkId) {
                                Interactive.isActivated[targetEid] = 1;
                            }
                        }
                    }
                }
            } else if (typeId === 32) {
                const animIdx = Math.floor(Animation.timer[eid] * 4 / 1000) % 4;
                if (animIdx >= 2) {
                    if (distSq < 20 * 20) {
                        Health.current[this.playerId] -= 0.1;
                        window.dispatchEvent(new CustomEvent('hp_updated', {
                            detail: { current: Health.current[this.playerId], max: Health.max[this.playerId] }
                        }));
                    }
                    for (let j = 0; j < enemies.length; j++) {
                        const en = enemies[j];
                        const edx = Position.x[en] - Position.x[eid];
                        const edy = Position.y[en] - Position.y[eid];
                        if (edx * edx + edy * edy < 20 * 20) {
                            Health.current[en] -= 0.5;
                        }
                    }
                }
            } else if (typeId === 34) {
                if (distSq < 40 * 40 && (!hasComponent(world, Interactive, eid) || Interactive.isActivated[eid] === 0)) {
                    addComponent(world, Interactive, eid);
                    Interactive.isActivated[eid] = 1;

                    this.juicePipeline.screenShake(0.0025, 300);
                    this.juicePipeline.vfx.playFireHit(Position.x[eid], Position.y[eid]);

                    Health.current[this.playerId] -= 30;
                    window.dispatchEvent(new CustomEvent('hp_updated', {
                        detail: { current: Health.current[this.playerId], max: Health.max[this.playerId] }
                    }));
                    window.dispatchEvent(new CustomEvent('play_sound', { detail: 'hit' }));
                    removeEntity(world, eid);
                }
            } else if (typeId >= 50 && typeId <= 57) {
                if (distSq < 20 * 20) {
                    // Potion Effects (50-53 Small, 54-57 Big)
                    const isBig = typeId >= 54;
                    const baseType = isBig ? typeId - 4 : typeId;

                    if (baseType === 50) { // Green: EXP (~50% of current level requirement)
                        const multiplier = isBig ? 1.5 : 1.0;
                        const randomPercent = (40 + Math.random() * 20) * multiplier;
                        window.dispatchEvent(new CustomEvent('xp_percent_collected', { detail: randomPercent }));
                    } else if (baseType === 51) { // Yellow: Refill Health 100%
                        Health.current[this.playerId] = Health.max[this.playerId];
                        window.dispatchEvent(new CustomEvent('hp_updated', {
                            detail: { current: Health.current[this.playerId], max: Health.max[this.playerId] }
                        }));
                    } else if (baseType === 52) { // Red/Orange: Kill nearby monsters
                        const multiplier = isBig ? 2.0 : 1.0;
                        const killRadiusSq = (400 * multiplier) * (400 * multiplier);
                        for (let j = 0; j < enemies.length; j++) {
                            const enemyEid = enemies[j];
                            const edx = Position.x[enemyEid] - px;
                            const edy = Position.y[enemyEid] - py;
                            if (edx * edx + edy * edy < killRadiusSq) {
                                Health.current[enemyEid] = 0;
                            }
                        }
                        this.juicePipeline.screenShake(0.01 * multiplier, 500);
                        this.juicePipeline.vfx.playFireHit(px, py);
                    } else if (baseType === 53) { // Blue: Refill MP (Not Implemented yet)
                        // TODO: Add MP refill logic when MP system is added
                    }

                    window.dispatchEvent(new CustomEvent('play_sound', { detail: 'level_up' }));
                    removeEntity(world, eid);
                }
            } else if (typeId === 35) { // Old potion (remove just in case)
                if (distSq < 20 * 20) {
                    removeEntity(world, eid);
                }
            } else if (typeId === 36) {
                if (distSq < 30 * 30 && (!hasComponent(world, Interactive, eid) || Interactive.isActivated[eid] === 0)) {
                    addComponent(world, Interactive, eid);
                    Interactive.isActivated[eid] = 1;

                    // Ensure Animation component exists for chest opening frames
                    if (!hasComponent(world, Animation, eid)) {
                        addComponent(world, Animation, eid);
                    }
                    Animation.timer[eid] = 0;

                    // Spawn loot (Coins)
                    for (let j = 0; j < 5; j++) {
                        const dropId = addEntity(world);
                        addComponent(world, Position, dropId);
                        addComponent(world, Velocity, dropId);
                        addComponent(world, Item, dropId);
                        addComponent(world, SpriteInfo, dropId);
                        Position.x[dropId] = Position.x[eid];
                        Position.y[dropId] = Position.y[eid];
                        Velocity.x[dropId] = (Math.random() - 0.5) * 200;
                        Velocity.y[dropId] = (Math.random() - 0.5) * 200 - 100;
                        // Random value per coin (5 items * max 200 = 1000 total)
                        Item.xpValue[dropId] = Math.floor(Math.random() * 100) + 100;
                        SpriteInfo.textureIndex[dropId] = 21; // Coin type
                        Item.magnetized[dropId] = 0;
                    }

                    // Always spawn a random potion (Green, Yellow, Red/Orange, Blue)
                    // Randomly choose between Small (50-53) and Big (54-57)
                    const isBig = Math.random() > 0.7; // 30% chance for big potion
                    const potionBase = isBig ? 54 : 50;
                    const potId = addEntity(world);
                    addComponent(world, Position, potId);
                    addComponent(world, SpriteInfo, potId);
                    Position.x[potId] = Position.x[eid];
                    Position.y[potId] = Position.y[eid] + 16;
                    SpriteInfo.textureIndex[potId] = potionBase + Math.floor(Math.random() * 4);

                    window.dispatchEvent(new CustomEvent('play_sound', { detail: 'level_up' }));
                }
            }
        }
    }

    private startBGM(key: string) {
        if (this.currentBGM && this.currentBGM.key === key && this.currentBGM.isPlaying) return;
        if (this.currentBGM) this.currentBGM.stop();
        if (this.cache.audio.exists(key)) {
            // Volume adjustment: boss music slightly louder, select music slightly softer
            const vol = key === 'boss_bgm' ? 0.4 : (key === 'select_bgm' ? 0.25 : 0.3);
            this.currentBGM = this.sound.add(key, { loop: true, volume: vol });
            this.currentBGM.play();
        }
    }

    private spawnDungeonProps() {
        for (let i = 0; i < 80; i++) {
            const eid = addEntity(world);
            addComponent(world, Position, eid);
            addComponent(world, SpriteInfo, eid);
            const pos = this.dungeon.getRandomFloorPixel();
            Position.x[eid] = pos.x;
            Position.y[eid] = pos.y;

            // bitECS 슬롯 재사용 시 이전 typeId(wizard=1 등) 오염 방지: 먼저 안전한 값으로 초기화
            SpriteInfo.textureIndex[eid] = 31; // 기본값 prop_skull

            const roll = Math.random();
            if (roll > 0.9) {
                SpriteInfo.textureIndex[eid] = 36; // 보물 상자 (10%)
                addComponent(world, Animation, eid);
                Animation.timer[eid] = 0;
            } else if (roll > 0.7) {
                SpriteInfo.textureIndex[eid] = 32; // 가시덫 (20%)
                addComponent(world, Animation, eid);
                Animation.timer[eid] = Math.random() * 1000;
            } else {
                SpriteInfo.textureIndex[eid] = 31; // 해골 소품 (70%)
                addComponent(world, Animation, eid);
                Animation.timer[eid] = Math.random() * 1000;
            }
        }
        this.spawnSecretRoom();
    }

    private spawnSecretRoom() {
        if (!this.secretRoomData) return;
        const { doorPixel, floorPixels } = this.secretRoomData;

        // ── 잠긴 문 (비밀 방 입구) ──
        const doorId = addEntity(world);
        addComponent(world, Position, doorId);
        addComponent(world, SpriteInfo, doorId);
        addComponent(world, Interactive, doorId);
        SpriteInfo.textureIndex[doorId] = 41; // Door
        Position.x[doorId] = doorPixel.x;
        Position.y[doorId] = doorPixel.y;
        Interactive.isActivated[doorId] = 0;
        Interactive.id[doorId] = 99;

        // ── 레버 (먼 곳에 배치) ──
        const leverPos = this.dungeon.getFloorPixelNear(doorPixel.x, doorPixel.y, 400, 800);
        const leverId = addEntity(world);
        addComponent(world, Position, leverId);
        addComponent(world, SpriteInfo, leverId);
        addComponent(world, Interactive, leverId);
        SpriteInfo.textureIndex[leverId] = 40; // Lever
        Position.x[leverId] = leverPos.x;
        Position.y[leverId] = leverPos.y;
        Interactive.isActivated[leverId] = 0;
        Interactive.id[leverId] = 99;

        // ── 방 내부에 보물 배치 ──
        if (floorPixels.length < 3) return;

        // 보물상자 3개 (방 안 아래쪽에 균등 배치)
        const chestPositions = [
            floorPixels[Math.floor(floorPixels.length * 0.6)],
            floorPixels[Math.floor(floorPixels.length * 0.7)],
            floorPixels[Math.floor(floorPixels.length * 0.8)],
        ];
        for (const cPos of chestPositions) {
            const chestId = addEntity(world);
            addComponent(world, Position, chestId);
            addComponent(world, SpriteInfo, chestId);
            addComponent(world, Animation, chestId);
            SpriteInfo.textureIndex[chestId] = 36;
            Position.x[chestId] = cPos.x;
            Position.y[chestId] = cPos.y;
            Animation.timer[chestId] = 0;
        }

        // 물약 2개 (방 안 랜덤 위치)
        for (let i = 0; i < 2; i++) {
            const pPos = floorPixels[Math.floor(Math.random() * floorPixels.length)];
            const potId = addEntity(world);
            addComponent(world, Position, potId);
            addComponent(world, SpriteInfo, potId);
            SpriteInfo.textureIndex[potId] = 54 + Math.floor(Math.random() * 4); // big potion (54~57)
            Position.x[potId] = pPos.x;
            Position.y[potId] = pPos.y;
        }
    }
}
