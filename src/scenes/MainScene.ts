import Phaser from 'phaser';
import { defineQuery, addEntity, addComponent, hasComponent, removeEntity } from 'bitecs';
import { AdSDK } from '../integrations/AdSDK';
import { ApiClient } from '../integrations/ApiClient';
import { QuestTracker } from '../systems/QuestTracker';
import { world } from '../core/World';
import {
    Position,
    Velocity,
    Player,
    SpriteInfo,
    Animation,
    Health,
    Mana,
    Interactive,
    Item,
    Enemy,
} from '../components';
import { AlchemySlot, SynergyEffect } from '../components/alchemy';
import { WeaponEvolution } from '../components/weapon';
import { Relic } from '../components/relic';
import { RelicSystem } from '../systems/RelicSystem';
import { createPhysicsSystem } from '../systems/PhysicsSystem';
import { createRenderSystem } from '../systems/RenderSystem';
import { PlayerSystem } from '../systems/PlayerSystem';
import { NightDirector } from '../systems/WaveSystem';

import { CHARACTERS } from '../constants/CharacterConfig';
import { findChapter, isChapterStart } from '../constants/ChapterConfig';

import { JuicePipeline } from '../fx/JuicePipeline';
import { PlasmaStorm } from '../fx/PlasmaStorm';
import { VolcanicPlague } from '../fx/VolcanicPlague';
import { Tempest } from '../fx/Tempest';
import { Eruption } from '../fx/Eruption';
import { Cryotoxin } from '../fx/Cryotoxin';
import { Frostbite } from '../fx/Frostbite';
import { CinderBurst } from '../fx/CinderBurst';
import { BlizzardStrike } from '../fx/BlizzardStrike';
import { MagmaField } from '../fx/MagmaField';
import { ArcLightning } from '../fx/ArcLightning';
import { PlagueWind } from '../fx/PlagueWind';
import { BlightStorm } from '../fx/BlightStorm';
import { Whirlwind } from '../fx/Whirlwind';
import { GlacialSpike } from '../fx/GlacialSpike';
import { Mire } from '../fx/Mire';
import { GlacialNova } from '../fx/GlacialNova';
import { StaticField } from '../fx/StaticField';
import { ToxicTempest } from '../fx/ToxicTempest';
import { Cyclone } from '../fx/Cyclone';
import { Cascade } from '../fx/Cascade';
import { createCombatSystem } from '../systems/CombatSystem';
import { SpellSystem } from '../systems/SpellSystem';
import { ItemSystem } from '../systems/ItemSystem';
import { NecromancerSystem } from '../systems/NecromancerSystem';
import { DungeonGenerator, TILE_SIZE, TileType } from '../core/DungeonGenerator';
import { globalStats, applySkillTreeBonuses } from '../core/PlayerStats';
import { CharacterData } from '../constants/CharacterConfig';

export class MainScene extends Phaser.Scene {
    private physicsSystem!: (dt: number) => void;
    private renderSystem!: (dt: number) => void;
    private playerSystem!: PlayerSystem;
    private nightDirector!: NightDirector;
    private playerId!: number;
    private juicePipeline!: JuicePipeline;
    private combatSystem!: (dt: number) => void;
    private spellSystem!: SpellSystem;
    private itemSystem!: ItemSystem;
    private plasmaStorm!: PlasmaStorm;
    private volcanicPlague!: VolcanicPlague;
    private tempest!: Tempest;
    private eruption!: Eruption;
    private cryotoxin!: Cryotoxin;
    private frostbite!: Frostbite;
    private cinderBurst!: CinderBurst;
    private blizzardStrike!: BlizzardStrike;
    private magmaField!: MagmaField;
    private arcLightning!: ArcLightning;
    private plagueWind!: PlagueWind;
    private blightStorm!: BlightStorm;
    private whirlwind!: Whirlwind;
    private glacialSpike!: GlacialSpike;
    private mire!: Mire;
    private glacialNova!: GlacialNova;
    private staticField!: StaticField;
    private toxicTempest!: ToxicTempest;
    private cyclone!: Cyclone;
    private cascade!: Cascade;
    private necromancerSystem!: NecromancerSystem;
    private relicSystem!: RelicSystem;
    private selectedCharId: string = 'wizard';
    private currentBGM?: Phaser.Sound.BaseSound;
    private dungeon!: DungeonGenerator;
    private wallBlitter!: Phaser.GameObjects.Blitter;
    private doorBlitter!: Phaser.GameObjects.Blitter;
    private floorBlitter!: Phaser.GameObjects.Blitter;
    private currentStage: number = 1;
    private isPausedForClear: boolean = false;
    // player_died 가 매 프레임 발사되어 GameOverScene 이 중복 launch 되는 것 방지.
    // 부활 시 false 로 리셋해서 다음 사망도 처리.
    private deathHandled: boolean = false;
    private enemiesKilled: number = 0;
    private synergiesActivated: number = 0;
    private sessionStartMs: number = 0;
    private charData!: CharacterData;
    private secretRoomData?: {
        doorPixel: { x: number; y: number };
        floorPixels: { x: number; y: number }[];
    };
    private wallDecoGroup!: Phaser.GameObjects.Group;
    private debugTexts: Phaser.GameObjects.Text[] = []; // Debug texts for walls

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
        globalStats.bonusMaxHp = 0;
        globalStats.totalCoins = 0;

        // Apply meta-progression skill tree bonuses on top of base stats
        applySkillTreeBonuses();

        // 3. Ensure UIScene is running
        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        }
        // -------------------------

        this.currentStage = 1;
        globalStats.currentStage = 1;
        this.isPausedForClear = false;
        this.enemiesKilled = 0;
        this.synergiesActivated = 0;
        this.sessionStartMs = Date.now();
        ApiClient.trackEvent('session_start', { character_id: this.selectedCharId });
        // Daily quest: play_2_sessions (세션 시작당 1)
        QuestTracker.add('play_2_sessions', 1);

        this.dungeon = new DungeonGenerator(100, 100);

        // --- 4. Create Player FIRST so other systems can reference it ---
        this.playerId = addEntity(world);
        addComponent(world, Position, this.playerId);
        addComponent(world, Velocity, this.playerId);
        addComponent(world, Player, this.playerId);
        addComponent(world, SpriteInfo, this.playerId);
        addComponent(world, Animation, this.playerId);
        addComponent(world, Health, this.playerId);
        addComponent(world, AlchemySlot, this.playerId);
        addComponent(world, SynergyEffect, this.playerId);
        AlchemySlot.slot0[this.playerId] = -1;
        AlchemySlot.slot1[this.playerId] = -1;
        AlchemySlot.slot2[this.playerId] = -1;
        SynergyEffect.synergyId[this.playerId] = -1;
        this.plasmaStorm = new PlasmaStorm(this);
        this.plasmaStorm.setPlayerEid(this.playerId);
        this.volcanicPlague = new VolcanicPlague(this);
        this.volcanicPlague.setPlayerEid(this.playerId);
        this.tempest = new Tempest(this);
        this.tempest.setPlayerEid(this.playerId);
        this.eruption = new Eruption(this);
        this.eruption.setPlayerEid(this.playerId);
        this.cryotoxin = new Cryotoxin(this);
        this.cryotoxin.setPlayerEid(this.playerId);
        this.frostbite = new Frostbite(this);
        this.frostbite.setPlayerEid(this.playerId);
        this.cinderBurst = new CinderBurst(this);
        this.cinderBurst.setPlayerEid(this.playerId);
        this.blizzardStrike = new BlizzardStrike(this);
        this.blizzardStrike.setPlayerEid(this.playerId);
        this.magmaField = new MagmaField(this);
        this.magmaField.setPlayerEid(this.playerId);
        this.arcLightning = new ArcLightning(this);
        this.arcLightning.setPlayerEid(this.playerId);
        this.plagueWind = new PlagueWind(this);
        this.plagueWind.setPlayerEid(this.playerId);
        this.blightStorm = new BlightStorm(this);
        this.blightStorm.setPlayerEid(this.playerId);
        this.whirlwind = new Whirlwind(this);
        this.whirlwind.setPlayerEid(this.playerId);
        this.glacialSpike = new GlacialSpike(this);
        this.glacialSpike.setPlayerEid(this.playerId);
        this.mire = new Mire(this);
        this.mire.setPlayerEid(this.playerId);
        this.glacialNova = new GlacialNova(this);
        this.glacialNova.setPlayerEid(this.playerId);
        this.staticField = new StaticField(this);
        this.staticField.setPlayerEid(this.playerId);
        this.toxicTempest = new ToxicTempest(this);
        this.toxicTempest.setPlayerEid(this.playerId);
        this.cyclone = new Cyclone(this);
        this.cyclone.setPlayerEid(this.playerId);
        this.cascade = new Cascade(this);
        this.cascade.setPlayerEid(this.playerId);
        this.necromancerSystem = new NecromancerSystem(this, this.selectedCharId === 'necromancer');
        this.necromancerSystem.setPlayerEid(this.playerId);
        SynergyEffect.boostActiveUntil[this.playerId] = 0;
        SynergyEffect.boostCooldownUntil[this.playerId] = 0;

        const charData = CHARACTERS[this.selectedCharId.toUpperCase()] || CHARACTERS.WIZARD;
        this.charData = charData;

        // Add Mana component if character uses mana
        if (
            this.selectedCharId === 'wizard' ||
            this.selectedCharId === 'elf' ||
            this.selectedCharId === 'necromancer' ||
            this.selectedCharId === 'lizard'
        ) {
            addComponent(world, Mana, this.playerId);
            Mana.current[this.playerId] = this.charData.baseStats.mana;
            Mana.max[this.playerId] = this.charData.baseStats.mana;
        }

        let charTypeId = 1;
        if (this.selectedCharId === 'knight') charTypeId = 0;
        else if (this.selectedCharId === 'elf') charTypeId = 2;
        else if (this.selectedCharId === 'necromancer') charTypeId = 3;
        else if (this.selectedCharId === 'lizard') charTypeId = 5;
        else if (this.selectedCharId === 'dwarf') charTypeId = 6; // dwarf 전용 스프라이트

        // dwarf 는 knight 무기 evolution(0) 공유 — sprite 만 별도
        const weaponFamily = this.selectedCharId === 'dwarf' ? 0 : charTypeId;
        addComponent(world, WeaponEvolution, this.playerId);
        WeaponEvolution.evolutionId[this.playerId] = -1;
        WeaponEvolution.baseWeaponId[this.playerId] = weaponFamily;

        addComponent(world, Relic, this.playerId);
        Relic.bitmask[this.playerId] = 0;

        SpriteInfo.textureIndex[this.playerId] = charTypeId;
        Animation.frameRate[this.playerId] = 10;
        Health.max[this.playerId] = this.charData.baseStats.health + globalStats.bonusMaxHp;
        Health.current[this.playerId] = Health.max[this.playerId];

        // Player initial position (temp, will be refined after buildMap)
        Position.x[this.playerId] = 0;
        Position.y[this.playerId] = 0;

        this.physicsSystem = createPhysicsSystem(this.dungeon);
        this.playerSystem = new PlayerSystem(charData);
        this.nightDirector = new NightDirector(this.dungeon, this);
        this.juicePipeline = new JuicePipeline(this);
        this.combatSystem = createCombatSystem(this.juicePipeline, this);
        this.spellSystem = new SpellSystem(this);
        this.itemSystem = new ItemSystem();

        this.spellSystem.selectedCharId = this.selectedCharId;

        this.relicSystem = new RelicSystem(this);
        this.relicSystem.applyPassives(this.playerId);

        this.floorBlitter = this.add.blitter(0, 0, 'floors').setDepth(-3);

        this.wallBlitter = this.add.blitter(0, 0, 'walls').setDepth(-2);
        this.doorBlitter = this.add.blitter(0, 0, 'dungeon').setDepth(-2);
        this.wallDecoGroup = this.add.group();
        // wallDecoGroup manages North wall specific decorations like wall_holes
        // wallDecoGroup doesn't have setDepth, but images added to it can have depths.
        // We'll set depths on creation or just leave as group.

        this.buildMap(this.currentStage);

        const charBlitter = this.add.blitter(0, 0, 'dungeon').setDepth(0);
        this.renderSystem = createRenderSystem(this, charBlitter);

        // Character initial position refined
        const startPos = this.dungeon.getRandomFloorPixel();
        Position.x[this.playerId] = startPos.x;
        Position.y[this.playerId] = startPos.y;

        setTimeout(() => {
            window.dispatchEvent(
                new CustomEvent('hp_updated', {
                    detail: {
                        current: Health.current[this.playerId],
                        max: Health.max[this.playerId],
                    },
                }),
            );
            if (hasComponent(world, Mana, this.playerId)) {
                window.dispatchEvent(
                    new CustomEvent('mp_updated', {
                        detail: {
                            current: Mana.current[this.playerId],
                            max: Mana.max[this.playerId],
                        },
                    }),
                );
            }
            window.dispatchEvent(new CustomEvent('stage_updated', { detail: this.currentStage }));
            window.dispatchEvent(new CustomEvent('char_selected', { detail: this.selectedCharId }));
            // 게임 시작 — Ch1 인트로 토스트
            window.dispatchEvent(new CustomEvent('chapter_started', { detail: findChapter(1) }));
        }, 100);

        import('../core/PlayerStats').then((m) => {
            m.globalStats.damageMult = charData.baseStats.damage;
            m.globalStats.mana.max = charData.baseStats.mana; // Initialize global mana max
            m.globalStats.mana.current = charData.baseStats.mana; // Initialize global mana current
        });

        this.cameras.main.setZoom(2.5);

        const soundHandler = ((e: CustomEvent<string>) => {
            if (this.cache.audio.exists(e.detail)) {
                this.sound.play(e.detail, { volume: 0.5 });
            }
        }) as EventListener;
        window.addEventListener('play_sound', soundHandler);

        const comboCastHandler = () => {};
        window.addEventListener('combo_cast', comboCastHandler);

        const enemyKilledHandler = () => {
            this.relicSystem.onEnemyKilled();
            this.enemiesKilled++;
            // Daily quest: kill_100 / kill_300 누적 (5초 batch flush)
            QuestTracker.add('kill_100', 1);
            QuestTracker.add('kill_300', 1);
        };
        window.addEventListener('enemy_killed', enemyKilledHandler);

        const synergyActivatedHandler = (e: Event) => {
            this.synergiesActivated++;
            const detail = (e as CustomEvent).detail;
            ApiClient.trackEvent('synergy_discover', {
                synergy: typeof detail === 'object' ? detail : { value: detail },
                stage: this.currentStage,
            });
            // Daily quest: synergy_5
            QuestTracker.add('synergy_5', 1);
        };
        window.addEventListener('synergy_discovered', synergyActivatedHandler);

        // 광고 부활 — GameOverScene 에서 rewarded ad 성공 시 dispatch.
        // Player Health 를 max 의 50% 로 복구하고, 주변 적/보스가 없는 안전한 floor 로 텔레포트.
        const adReviveHandler = () => {
            if (this.playerId === undefined) return;
            // 다음 사망도 다시 처리될 수 있도록 guard 리셋.
            this.deathHandled = false;
            Health.current[this.playerId] = Math.floor(Health.max[this.playerId] * 0.5);

            // 안전한 위치 찾기: 현재 위치로부터 300~800px 떨어진 floor 중
            // 250px 반경 안에 적/보스 없는 지점. 최대 12회 시도, 실패 시 최선의 후보.
            const px = Position.x[this.playerId];
            const py = Position.y[this.playerId];
            const enemyPosQuery = defineQuery([Enemy, Position]);
            const enemies = enemyPosQuery(world);
            const SAFE_RADIUS_SQ = 250 * 250;

            let best = { x: px, y: py };
            let bestMinDistSq = -1;
            for (let attempt = 0; attempt < 12; attempt++) {
                const candidate = this.dungeon.getFloorPixelNear(px, py, 300, 800);
                let minDistSq = Infinity;
                for (let i = 0; i < enemies.length; i++) {
                    const eid = enemies[i];
                    const dx = candidate.x - Position.x[eid];
                    const dy = candidate.y - Position.y[eid];
                    const distSq = dx * dx + dy * dy;
                    if (distSq < minDistSq) minDistSq = distSq;
                }
                if (minDistSq >= SAFE_RADIUS_SQ) {
                    best = candidate;
                    break;
                }
                if (minDistSq > bestMinDistSq) {
                    bestMinDistSq = minDistSq;
                    best = candidate;
                }
            }
            Position.x[this.playerId] = best.x;
            Position.y[this.playerId] = best.y;
            // 카메라도 새 위치로 즉시 따라가게 — pan effect 없이 snap
            this.cameras.main.centerOn(best.x, best.y);

            window.dispatchEvent(
                new CustomEvent('hp_updated', {
                    detail: {
                        current: Health.current[this.playerId],
                        max: Health.max[this.playerId],
                    },
                }),
            );
        };
        window.addEventListener('ad_revive_requested', adReviveHandler);

        const deathHandler = () => {
            // 중복 호출 방지 — CombatSystem 이 매 프레임 player_died 를 dispatch 하므로
            // deathHandled guard 없이는 GameOverScene 이 60+ 회 launch 큐잉됨 (부활 시 폭주).
            if (this.deathHandled) return;

            // Phoenix Feather 부활 시도
            if (this.relicSystem.tryRevive(this.playerId)) {
                return; // 부활 성공 — 사망 처리 스킵 (deathHandled 는 아직 false 유지)
            }
            this.deathHandled = true;

            // 세션 종료 분석 + leaderboard 제출 (best-effort)
            const durationSec = Math.max(0, Math.floor((Date.now() - this.sessionStartMs) / 1000));
            const score = this.enemiesKilled * 10 + this.currentStage * 100;
            ApiClient.trackEvent('session_end', {
                character_id: this.selectedCharId,
                stage_reached: this.currentStage,
                enemies_killed: this.enemiesKilled,
                synergies_activated: this.synergiesActivated,
                duration_seconds: durationSec,
                outcome: 'death',
            });
            // Daily quest: survive_5m (300초 이상 생존 시 1)
            if (durationSec >= 300) {
                QuestTracker.setMax('survive_5m', 1);
            }
            void ApiClient.flush();
            void QuestTracker.flush();
            void ApiClient.submitLeaderboard({
                score,
                character_id: this.selectedCharId,
                stage_reached: this.currentStage,
                duration_seconds: durationSec,
            });

            this.time.delayedCall(1000, () => {
                if (this.scene.isActive('UpgradeScene')) this.scene.stop('UpgradeScene');
                if (this.scene.isActive('RecipeScene')) this.scene.stop('RecipeScene');
                this.scene.pause();
                this.scene.launch('GameOverScene', {
                    stage: this.currentStage,
                    enemiesKilled: this.enemiesKilled,
                    synergiesActivated: this.synergiesActivated,
                });
            });
        };
        window.addEventListener('player_died', deathHandler);
        window.addEventListener('screen_shake', (e: any) => {
            const intensity = e.detail?.intensity || 0.01;
            const duration = e.detail?.duration || 200;
            this.juicePipeline.screenShake(intensity, duration);
        });

        const recipeHandler = (e: KeyboardEvent) => {
            if (e.code === 'KeyE') {
                this.scene.pause();
                this.scene.launch('RecipeScene');
            }
            // Debug: Skip to next boss stage (3, 6, 9, 12...)
            if (e.code === 'KeyB' && e.shiftKey) {
                const nextBossStage = (Math.floor(this.currentStage / 3) + 1) * 3;
                this.currentStage = nextBossStage - 1; // It will be incremented in nextStageHandler
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
            // Debug: Level Up
            if (e.code === 'KeyL' && e.shiftKey) {
                window.dispatchEvent(new CustomEvent('xp_percent_collected', { detail: 100 }));
            }
        };
        window.addEventListener('keydown', recipeHandler);

        const nextStageHandler = () => {
            this.currentStage++;
            globalStats.currentStage = this.currentStage;
            this.isPausedForClear = false;
            // Daily quest: stage_3 / stage_5 — setMax 로 도달 최댓값만 유지
            QuestTracker.setMax('stage_3', this.currentStage);
            QuestTracker.setMax('stage_5', this.currentStage);

            // 새 챕터 진입 시 인트로 토스트
            if (isChapterStart(this.currentStage)) {
                window.dispatchEvent(
                    new CustomEvent('chapter_started', {
                        detail: findChapter(this.currentStage),
                    }),
                );
            }

            // 5 스테이지마다 interstitial 광고 (수익 채널 — 게임 흐름 자연스러운 break)
            if (this.currentStage > 1 && this.currentStage % 5 === 0) {
                AdSDK.gameplayStop();
                void AdSDK.commercialBreak().then(() => {
                    ApiClient.trackEvent('ad_view', {
                        placement: 'stage_interstitial',
                        stage: this.currentStage,
                    });
                    AdSDK.gameplayStart();
                });
            }

            // Remove old props, items, and spells from previous stage
            const allEntities = defineQuery([Position, SpriteInfo])(world);
            for (let i = 0; i < allEntities.length; i++) {
                const eid = allEntities[i];
                if (eid === this.playerId) continue; // Keep player
                const tid = SpriteInfo.textureIndex[eid];
                // Props (31-36), Items/Coins (20-21), Potions (50-57), Spells (100+), Enemies (60-89)
                // Also remove lever(40) and secret door(41) from previous stage
                if (
                    (tid >= 20 && tid <= 36) ||
                    (tid >= 50 && tid <= 57) ||
                    tid === 40 ||
                    tid === 41 ||
                    tid >= 60
                ) {
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
            window.dispatchEvent(
                new CustomEvent('hp_updated', {
                    detail: {
                        current: Health.current[this.playerId],
                        max: Health.max[this.playerId],
                    },
                }),
            );
            // Restore MP to 100% on new stage if applicable
            if (hasComponent(world, Mana, this.playerId)) {
                Mana.current[this.playerId] = Mana.max[this.playerId];
                window.dispatchEvent(
                    new CustomEvent('mp_updated', {
                        detail: {
                            current: Mana.current[this.playerId],
                            max: Mana.max[this.playerId],
                        },
                    }),
                );
            }

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
            // 게임플레이 종료 — 광고 표시 허용
            AdSDK.gameplayStop();
            window.removeEventListener('play_sound', soundHandler);
            window.removeEventListener('combo_cast', comboCastHandler);
            window.removeEventListener('enemy_killed', enemyKilledHandler);
            window.removeEventListener('synergy_discovered', synergyActivatedHandler);
            window.removeEventListener('player_died', deathHandler);
            window.removeEventListener('ad_revive_requested', adReviveHandler);
            window.removeEventListener('keydown', recipeHandler);
            window.removeEventListener('next_stage', nextStageHandler);
            window.removeEventListener('stage_clear', stageClearInternalHandler);
            if (this.tempest) this.tempest.destroy();
            if (this.magmaField) this.magmaField.destroy();
            if (this.blightStorm) this.blightStorm.destroy();
            if (this.whirlwind) this.whirlwind.destroy();
            if (this.staticField) this.staticField.destroy();
            if (this.cyclone) this.cyclone.destroy();
            if (this.necromancerSystem) this.necromancerSystem.destroy();
        });

        this.startBGM('main_bgm');
        window.addEventListener('boss_spawned', () => this.startBGM('boss_bgm'));

        this.spawnDungeonProps();
        window.dispatchEvent(new CustomEvent('game_started'));

        // 게임플레이 시작 — 광고 차단 시점
        AdSDK.gameplayStart();
    }

    private buildMap(stage: number) {
        const scale = Math.pow(1.01, Math.max(0, stage - 1));
        const mapW = Math.floor(100 * scale);
        const mapH = Math.floor(100 * scale);

        this.dungeon.width = mapW;
        this.dungeon.height = mapH;
        const isBossStage = stage % 3 === 0;
        this.dungeon.generate(isBossStage);

        // 비밀 방 생성 (보스 대전에서는 미로가 없으므로 제외)
        if (!isBossStage) {
            this.secretRoomData = this.dungeon.carveSecretRoom();
        } else {
            this.secretRoomData = undefined;
        }

        const wPx = mapW * TILE_SIZE;
        const hPx = mapH * TILE_SIZE;

        this.cameras.main.setBounds(0, 0, wPx, hPx);

        this.floorBlitter.clear();
        this.wallBlitter.clear();
        this.doorBlitter.clear();
        this.wallDecoGroup.clear(true, true);
        this.debugTexts.forEach((t) => t.destroy());
        this.debugTexts = [];

        for (let y = 0; y < mapH; y++) {
            const createPart = (px: number, py: number, typeIdx: number) => {
                const ent = addEntity(world);
                addComponent(world, Position, ent);
                addComponent(world, SpriteInfo, ent);
                Position.x[ent] = px;
                Position.y[ent] = py;
                SpriteInfo.textureIndex[ent] = typeIdx;
            };

            for (let x = 0; x < mapW; x++) {
                const cell = this.dungeon.map[y][x];

                // ── Floor base ──────────────────────────────────────────────
                if (cell !== TileType.WALL) {
                    const floorIds = [1, 2, 3, 9, 10, 11, 12, 13, 14];
                    const randomId = floorIds[Math.floor(Math.random() * floorIds.length)];
                    this.floorBlitter.create(x * TILE_SIZE, y * TILE_SIZE, `floor_${randomId}`);
                }

                // ── Pillars & Obstacles ──────────────────────────────────────
                if (cell === TileType.PILLAR) {
                    const basePX = x * TILE_SIZE + 8;
                    const basePY = y * TILE_SIZE + 11;

                    // 기본 기둥 (몸통 + 베이스)
                    createPart(basePX, basePY, 91); // column_wall
                    createPart(basePX, basePY - 32, 90); // column

                    // 기둥에는 바닥 웅덩이인 '푸른 분수'만 자연스럽게 배치 (개연성 확보)
                    if (Math.random() < 0.1) {
                        createPart(basePX, basePY + 0.5, 93);
                    }
                }

                // ── Walls ───────────────────────────────────────────────────
                if (cell === TileType.WALL) {
                    // 북쪽 벽 판정: 타일 바로 아래(y+1)가 바닥(FLOOR), 문(DOOR) 또는 기둥(PILLAR)인 경우
                    const isNorthWall =
                        y < mapH - 1 &&
                        (this.dungeon.map[y + 1][x] === TileType.FLOOR ||
                            this.dungeon.map[y + 1][x] === TileType.DOOR ||
                            this.dungeon.map[y + 1][x] === TileType.PILLAR);

                    if (isNorthWall) {
                        // 에셋 매핑 수정으로 wall_n_mid가 심플한 일자벽을 가리키게 됨
                        this.wallBlitter.create(x * TILE_SIZE, y * TILE_SIZE, 'wall_n_mid');

                        // 사용자 요청: 북쪽 벽에만 2% 확률로 구멍(Wall Hole) 장식 추가
                        if (Math.random() < 0.02) {
                            const wx = x * TILE_SIZE + 8; // Center X
                            const wy = y * TILE_SIZE + 24; // 1픽셀 더 아래로 (+22 -> +23)
                            const holeAsset = Math.random() < 0.5 ? 'wall_hole_1' : 'wall_hole_2';
                            const deco = this.add.image(wx, wy, holeAsset);
                            deco.setDepth(y * TILE_SIZE + 32); // Match wall depth
                            this.wallDecoGroup.add(deco);
                        }
                    }

                    // ── 남쪽 벽 판정 및 렌더링 (Floor 4-7 사용) ──────────────────
                    // 남쪽 벽: 타일 바로 위(y-1)가 바닥(FLOOR/SECRET_FLOOR), 문(DOOR) 또는 기둥(PILLAR)인 경우
                    const isSouthWall =
                        y > 0 &&
                        (this.dungeon.map[y - 1][x] === TileType.FLOOR ||
                            this.dungeon.map[y - 1][x] === TileType.SECRET_FLOOR ||
                            this.dungeon.map[y - 1][x] === TileType.DOOR ||
                            this.dungeon.map[y - 1][x] === TileType.PILLAR);

                    if (isSouthWall) {
                        // 사용자 요청: floor_4 ~ floor_7 중 랜덤하게 배치하여 남쪽 벽으로 사용
                        const wallFloorIds = [4, 5, 6, 7];
                        const randomId =
                            wallFloorIds[Math.floor(Math.random() * wallFloorIds.length)];
                        this.floorBlitter.create(x * TILE_SIZE, y * TILE_SIZE, `floor_${randomId}`);
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

        // 가상 조이스틱 입력 제거 — PlayerSystem 의 window touch (전 화면 드래그) 가 대체.

        this.spellSystem.update(delta);
        this.physicsSystem(delta);
        this.combatSystem(delta);
        this.itemSystem.update(delta);
        this.plasmaStorm.tick();
        this.volcanicPlague.tick();
        this.tempest.tick();
        this.eruption.tick();
        this.cryotoxin.tick();
        this.frostbite.tick();
        this.cinderBurst.tick();
        this.blizzardStrike.tick();
        this.magmaField.tick();
        this.arcLightning.tick();
        this.plagueWind.tick();
        this.blightStorm.tick();
        this.whirlwind.tick();
        this.glacialSpike.tick();
        this.mire.tick();
        this.glacialNova.tick();
        this.staticField.tick();
        this.toxicTempest.tick();
        this.cyclone.tick();
        this.cascade.tick();
        this.necromancerSystem.tick();
        this.relicSystem.tick();
        this.renderSystem(delta);
        this.handleInteractions();

        this.cameras.main.centerOn(Position.x[this.playerId], Position.y[this.playerId]);
    }

    private handleInteractions() {
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
                if (
                    distSq < 40 * 40 &&
                    hasComponent(world, Interactive, eid) &&
                    Interactive.isActivated[eid] === 0
                ) {
                    Interactive.isActivated[eid] = 1;
                    const linkId = Interactive.id[eid];
                    window.dispatchEvent(new CustomEvent('play_sound', { detail: 'hit' }));

                    // Link: Activate all items with same ID (e.g. Doors)
                    if (linkId > 0) {
                        for (let j = 0; j < interactives.length; j++) {
                            const targetEid = interactives[j];
                            if (
                                targetEid !== eid &&
                                hasComponent(world, Interactive, targetEid) &&
                                Interactive.id[targetEid] === linkId
                            ) {
                                Interactive.isActivated[targetEid] = 1;

                                // 비밀 문(ID 41)이 활성화되면 맵의 DOOR 타일을 FLOOR로 변경하여 충돌 해제
                                if (SpriteInfo.textureIndex[targetEid] === 41) {
                                    const dtx = Math.floor(Position.x[targetEid] / TILE_SIZE);
                                    const dty = Math.floor(Position.y[targetEid] / TILE_SIZE);
                                    for (let dy = -1; dy <= 1; dy++) {
                                        for (let dx = -1; dx <= 1; dx++) {
                                            const yy = dty + dy;
                                            const xx = dtx + dx;
                                            if (
                                                yy >= 0 &&
                                                yy < this.dungeon.height &&
                                                xx >= 0 &&
                                                xx < this.dungeon.width
                                            ) {
                                                if (this.dungeon.map[yy][xx] === TileType.DOOR) {
                                                    this.dungeon.map[yy][xx] = TileType.FLOOR;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } else if (typeId === 32) {
                // 32: Spikes (인접 시 데미지, 애니메이션 프레임 기반)
                const animIdx = Math.floor((Animation.timer[eid] * 4) / 1000) % 4;
                const canDamage = animIdx >= 2;

                if (canDamage) {
                    if (distSq < 20 * 20) {
                        Health.current[this.playerId] -= 0.1;
                        window.dispatchEvent(
                            new CustomEvent('hp_updated', {
                                detail: {
                                    current: Health.current[this.playerId],
                                    max: Health.max[this.playerId],
                                },
                            }),
                        );
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
                if (
                    distSq < 40 * 40 &&
                    (!hasComponent(world, Interactive, eid) || Interactive.isActivated[eid] === 0)
                ) {
                    addComponent(world, Interactive, eid);
                    Interactive.isActivated[eid] = 1;

                    this.juicePipeline.screenShake(0.0025, 300);
                    this.juicePipeline.vfx.playFireHit(Position.x[eid], Position.y[eid]);

                    Health.current[this.playerId] -= 30;
                    window.dispatchEvent(
                        new CustomEvent('hp_updated', {
                            detail: {
                                current: Health.current[this.playerId],
                                max: Health.max[this.playerId],
                            },
                        }),
                    );
                    window.dispatchEvent(new CustomEvent('play_sound', { detail: 'hit' }));
                    removeEntity(world, eid);
                }
            } else if (typeId >= 50 && typeId <= 57) {
                if (distSq < 20 * 20) {
                    // Potion Effects (50-53 Small, 54-57 Big)
                    const isBig = typeId >= 54;
                    const baseType = isBig ? typeId - 4 : typeId;

                    if (baseType === 50) {
                        // Green: EXP (~50% of current level requirement)
                        const multiplier = isBig ? 1.5 : 1.0;
                        const randomPercent = (40 + Math.random() * 20) * multiplier;
                        window.dispatchEvent(
                            new CustomEvent('xp_percent_collected', { detail: randomPercent }),
                        );
                    } else if (baseType === 51) {
                        // Yellow: Refill Health
                        if (isBig) {
                            Health.current[this.playerId] = Health.max[this.playerId];
                        } else {
                            // 소형: 최대 체력의 1/2만큼 회복 (최대치 초과 불가)
                            const healAmount = Health.max[this.playerId] / 2;
                            Health.current[this.playerId] = Math.min(
                                Health.max[this.playerId],
                                Health.current[this.playerId] + healAmount,
                            );
                        }
                        window.dispatchEvent(
                            new CustomEvent('hp_updated', {
                                detail: {
                                    current: Health.current[this.playerId],
                                    max: Health.max[this.playerId],
                                },
                            }),
                        );
                    } else if (baseType === 52) {
                        // Red: Kill monsters
                        if (isBig) {
                            // 대형: 반경 50px 내 섬멸 및 약간의 화면 흔들림
                            const killRadiusSq = 50 * 50;
                            for (let j = 0; j < enemies.length; j++) {
                                const enemyEid = enemies[j];
                                const edx = Position.x[enemyEid] - px;
                                const edy = Position.y[enemyEid] - py;
                                if (edx * edx + edy * edy < killRadiusSq) {
                                    Health.current[enemyEid] = 0;
                                }
                            }
                            this.juicePipeline.screenShake(0.005, 400);
                        } else {
                            // 소형: 화면 내(현재 활성화된 모든 적) 섬멸
                            for (let j = 0; j < enemies.length; j++) {
                                Health.current[enemies[j]] = 0;
                            }
                            this.juicePipeline.screenShake(0.01, 500);
                        }
                        this.juicePipeline.vfx.playFireHit(px, py);
                    } else if (baseType === 53) {
                        // Blue: Refill MP
                        if (isBig) {
                            globalStats.mana.current = globalStats.mana.max;
                        } else {
                            // 소형: 최대 마나의 1/2만큼 회복 (최대치 초과 불가)
                            const refillAmount = globalStats.mana.max / 2;
                            globalStats.mana.current = Math.min(
                                globalStats.mana.max,
                                globalStats.mana.current + refillAmount,
                            );
                        }
                        window.dispatchEvent(
                            new CustomEvent('mp_updated', {
                                detail: {
                                    current: globalStats.mana.current,
                                    max: globalStats.mana.max,
                                },
                            }),
                        );
                    }

                    window.dispatchEvent(new CustomEvent('play_sound', { detail: 'level_up' }));
                    removeEntity(world, eid);
                }
            } else if (typeId === 35) {
                // Old potion (remove just in case)
                if (distSq < 20 * 20) {
                    removeEntity(world, eid);
                }
            } else if (typeId === 36) {
                if (
                    distSq < 30 * 30 &&
                    (!hasComponent(world, Interactive, eid) || Interactive.isActivated[eid] === 0)
                ) {
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
                    const isBig = Math.random() > 0.7;
                    const potionBase = isBig ? 54 : 50;
                    const potId = addEntity(world);
                    addComponent(world, Position, potId);
                    addComponent(world, SpriteInfo, potId);
                    Position.x[potId] = Position.x[eid];

                    // 사용자 요청: 물약이 던전을 벗어나지 않도록 바닥 여부 확인 후 위치 결정
                    let potY = Position.y[eid] + 16;
                    if (!this.dungeon.isFloor(Position.x[potId], potY)) {
                        potY = Position.y[eid] - 8;
                        // 상자 위쪽도 바닥이 아니면 상자 자체의 위치(확실한 바닥)로 결정
                        if (!this.dungeon.isFloor(Position.x[potId], potY)) {
                            potY = Position.y[eid];
                        }
                    }
                    Position.y[potId] = potY;
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
            const vol = key === 'boss_bgm' ? 0.4 : key === 'select_bgm' ? 0.25 : 0.3;
            this.currentBGM = this.sound.add(key, { loop: true, volume: vol });
            this.currentBGM.play();
        }
    }

    private spawnDungeonProps() {
        const isBossStage = this.currentStage % 3 === 0;
        if (isBossStage) {
            // 사용자 요청: 보스 스테이지의 네 귀퉁이에 물약 랜덤 배치
            const margin = 5;
            const corners = [
                { x: margin, y: margin },
                { x: this.dungeon.width - margin, y: margin },
                { x: margin, y: this.dungeon.height - margin },
                { x: this.dungeon.width - margin, y: this.dungeon.height - margin },
            ];

            corners.forEach((pos) => {
                const potId = addEntity(world);
                addComponent(world, Position, potId);
                addComponent(world, SpriteInfo, potId);
                // 대형 물약(54-57: HP, MP, EXP, Kill) 중 랜덤 배치
                SpriteInfo.textureIndex[potId] = 54 + Math.floor(Math.random() * 4);
                Position.x[potId] = pos.x * TILE_SIZE;
                Position.y[potId] = pos.y * TILE_SIZE;
            });

            this.spawnSecretRoom();
            return;
        }

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
                // 장애물 (20%): 가시덫과 구멍을 5:5 비율로 배치
                const isHole = Math.random() < 0.5;
                const typeIdx = isHole ? 37 : 32;
                SpriteInfo.textureIndex[eid] = typeIdx;
                addComponent(world, Animation, eid);
                Animation.timer[eid] = Math.random() * 1000;

                // 구멍(37)인 경우 해당 위치의 맵 타일을 OBSTACLE로 변경하여 통행 불가 처리
                if (isHole) {
                    const tx = Math.floor(pos.x / TILE_SIZE);
                    const ty = Math.floor(pos.y / TILE_SIZE);
                    if (ty >= 0 && ty < this.dungeon.height && tx >= 0 && tx < this.dungeon.width) {
                        this.dungeon.map[ty][tx] = TileType.OBSTACLE;
                    }
                }
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

        // ── [중요] 중복 생성 방지: 기존 비밀의 방 엔티티(ID 99) 제거 ──
        const interactives = defineQuery([Interactive])(world);
        for (let i = 0; i < interactives.length; i++) {
            const eid = interactives[i];
            if (Interactive.id[eid] === 99) {
                removeEntity(world, eid);
            }
        }

        const tx = Math.floor(doorPixel.x / TILE_SIZE);
        const ty = Math.floor(doorPixel.y / TILE_SIZE);

        // ── 문 프레임 배치 ──
        // (DungeonGenerator의 문 위치와 동기화하여 시각적 완성도 높임)
        // North/South 문 프레임 (32x16)
        this.doorBlitter.create((tx - 1) * TILE_SIZE, (ty - 1) * TILE_SIZE, 'doors_frame_top');

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

        // ── 레버 (너무 멀지 않게 150~400px 범위로 조정) ──
        const leverPos = this.dungeon.getFloorPixelNear(doorPixel.x, doorPixel.y, 150, 400);
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
        if (floorPixels.length < 10) return;

        // 문 근처(64px 이내)에는 상자나 물약을 배치하지 않음 (사용자 요청)
        const spawnableFloors = floorPixels.filter((fp) => {
            const dist = Phaser.Math.Distance.Between(fp.x, fp.y, doorPixel.x, doorPixel.y);
            return dist > 64;
        });

        if (spawnableFloors.length < 5) return;

        // 보물상자 6개 (방 크기가 커졌으므로 갯수 상향)
        const sortedFloors = [...spawnableFloors].sort((a, b) => b.y - a.y);
        const chestPositions = [
            sortedFloors[Math.floor(sortedFloors.length * 0.1)],
            sortedFloors[Math.floor(sortedFloors.length * 0.2)],
            sortedFloors[Math.floor(sortedFloors.length * 0.3)],
            sortedFloors[Math.floor(sortedFloors.length * 0.4)],
            sortedFloors[Math.floor(sortedFloors.length * 0.5)],
            sortedFloors[Math.floor(sortedFloors.length * 0.6)],
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

        // 물약 5개
        for (let i = 0; i < 5; i++) {
            const pPos = spawnableFloors[Math.floor(Math.random() * spawnableFloors.length)];
            const potId = addEntity(world);
            addComponent(world, Position, potId);
            addComponent(world, SpriteInfo, potId);
            SpriteInfo.textureIndex[potId] = 54 + Math.floor(Math.random() * 4);
            Position.x[potId] = pPos.x;
            Position.y[potId] = pPos.y;
        }
    }
}
