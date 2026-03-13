import Phaser from 'phaser';
import { defineQuery, hasComponent } from 'bitecs';
import { world } from '../core/World';
import { Position, Player, Enemy, Boss, Health, Mana } from '../components';
import { globalStats } from '../core/PlayerStats';
import { VirtualJoystick } from '../ui/VirtualJoystick';

export class UIScene extends Phaser.Scene {
    private stageLevelText!: Phaser.GameObjects.Text;
    private levelText!: Phaser.GameObjects.Text;
    private statsText!: Phaser.GameObjects.Text;
    private hpBar!: Phaser.GameObjects.Rectangle;
    private hpText!: Phaser.GameObjects.Text;
    private hpFrame!: Phaser.GameObjects.Graphics;
    private hpShine!: Phaser.GameObjects.Graphics;
    private hpIcon!: Phaser.GameObjects.Image;

    private xpBar!: Phaser.GameObjects.Rectangle;
    private expLabel!: Phaser.GameObjects.Text;
    private expFrame!: Phaser.GameObjects.Graphics;
    private expShine!: Phaser.GameObjects.Graphics;
    private expIcon!: Phaser.GameObjects.Image;
    private mpBar!: Phaser.GameObjects.Rectangle;
    private mpText!: Phaser.GameObjects.Text;
    private mpContainer!: Phaser.GameObjects.Container;
    private skillPointsText!: Phaser.GameObjects.Text;
    private selectedCharId: string = 'wizard';

    private bossHpBar?: Phaser.GameObjects.Rectangle;
    private bossHpText?: Phaser.GameObjects.Text;
    private bossHpContainer?: Phaser.GameObjects.Container;
    private uiContainer!: Phaser.GameObjects.Container;
    private bossWarningText!: Phaser.GameObjects.Text;
    private bossWarningTween?: Phaser.Tweens.Tween;
    private stageClearText!: Phaser.GameObjects.Text;
    private dungeonMap: number[][] = [];
    private discoveredMap: boolean[][] = [];
    private spawningComplete = false;
    private arrowGraphics!: Phaser.GameObjects.Graphics;

    private currentLevel = 1;
    private currentStage = 1;
    private currentXp = 0;
    private xpToNextLevel = 100;

    private coinText!: Phaser.GameObjects.Text;
    private coinIcon!: Phaser.GameObjects.Image;
    private totalCoins = 0;
    private skillPoints = 0;

    // Minimap
    private minimapGraphics!: Phaser.GameObjects.Graphics;
    private readonly MINIMAP_SIZE = 150;
    private minimapContainer!: Phaser.GameObjects.Container;
    private minimapOverlay!: Phaser.GameObjects.Rectangle;
    private isMinimapEnlarged = false;

    public joystick!: VirtualJoystick;
    private minimapTimer = 0;

    private playerQuery = defineQuery([Player, Position]);
    private enemyQuery = defineQuery([Enemy, Position]);
    private bossQuery = defineQuery([Boss, Position]);

    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        // --- Reset State for Fresh Start ---
        this.currentLevel = 1;
        globalStats.currentLevel = 1;
        this.currentStage = 1;
        this.currentXp = 0;
        this.xpToNextLevel = 100;
        this.totalCoins = 0;
        this.skillPoints = 0;
        this.spawningComplete = false;
        this.dungeonMap = [];
        this.discoveredMap = [];
        this.isMinimapEnlarged = false;
        // ------------------------------------

        this.uiContainer = this.add.container(0, 0);

        this.stageLevelText = this.add.text(10, 10, "Stage 1", {
            fontSize: '56px',
            color: '#ffff00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0, 0);

        const { width, height } = this.scale;
        this.joystick = new VirtualJoystick(this, width / 2, height - 100, 60);
        this.joystick.setVisible(false);

        // redundnant dummy text to keep compatibility if referenced elsewhere
        this.levelText = this.add.text(0, 0, "", { fontSize: '0px' }).setVisible(false);

        this.skillPointsText = this.add.text(1270, 710, "SP: 0", {
            fontSize: '48px',
            color: '#ffcc00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(1, 1);

        this.coinText = this.add.text(10, 115, '0', {
            fontFamily: '"MedievalSharp", cursive',
            fontSize: '56px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 10
        }).setOrigin(0, 0.5);

        this.coinIcon = this.add.image(this.coinText.x + this.coinText.width + 20, 115, 'dungeon', 'coin_f0')
            .setScale(5.0)
            .setOrigin(0, 0.5);

        this.statsText = this.add.text(10, 170, this.getStatsString(), {
            fontSize: '32px',
            color: '#00ff00',
            backgroundColor: '#00000088'
        }).setVisible(false);

        this.input.keyboard?.on('keydown-A', (event: KeyboardEvent) => {
            if (event.shiftKey) {
                const isVisible = this.statsText.visible;
                this.statsText.setVisible(!isVisible);
            }
        });

        const hpX = 20;
        const fullWidth = 400;
        const barHeight = 30;

        this.hpFrame = this.add.graphics();
        this.hpBar = this.add.rectangle(hpX + 4, 0, fullWidth - 8, barHeight - 8, 0xffcc00).setOrigin(0, 0);
        this.hpShine = this.add.graphics();
        this.hpIcon = this.add.image(hpX - 1, 0, 'hp_icon').setDisplaySize(40, 40).setOrigin(0.5, 0.5).setDepth(20);
        this.hpText = this.add.text(hpX + fullWidth / 2, 0, '100 / 100', {
            fontFamily: '"MedievalSharp", cursive', fontSize: '20px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5, 0.5).setDepth(6);

        this.mpContainer = this.add.container(0, 0);
        const mpFrameGraphic = this.add.graphics();
        this.mpBar = this.add.rectangle(hpX + 4, 0, fullWidth - 8, barHeight - 8, 0x0099ff).setOrigin(0, 0);
        const mpShineGraphic = this.add.graphics();
        const mpIconImg = this.add.image(hpX - 1, 0, 'dungeon', 'flask_big_blue').setDisplaySize(40, 40).setOrigin(0.5, 0.5).setDepth(20);
        this.mpText = this.add.text(hpX + fullWidth / 2, 0, '100 / 100', {
            fontFamily: '"MedievalSharp", cursive', fontSize: '20px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5, 0.5).setDepth(6);
        this.mpContainer.add([mpFrameGraphic, this.mpBar, mpShineGraphic, mpIconImg, this.mpText]);

        this.expFrame = this.add.graphics();
        this.xpBar = this.add.rectangle(hpX + 4, 0, 1, barHeight - 8, 0x00ff00).setOrigin(0, 0);
        this.expShine = this.add.graphics();
        this.expIcon = this.add.image(hpX - 1, 0, 'dungeon', 'flask_big_green').setDisplaySize(40, 40).setOrigin(0.5, 0.5).setDepth(20);
        this.expLabel = this.add.text(hpX + fullWidth / 2, 0, 'Level 1', {
            fontFamily: '"MedievalSharp", cursive', fontSize: '20px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5, 0.5).setDepth(6);

        this.repositionUIBars();

        this.bossHpContainer = this.add.container(640, 80).setVisible(false).setAlpha(0.8);
        const bossBarW = 600;
        const bossBarH = 24;
        const bFrame = this.add.graphics();
        bFrame.lineStyle(3, 0x888888);
        bFrame.strokeRect(-bossBarW / 2, -bossBarH / 2, bossBarW, bossBarH);
        bFrame.fillStyle(0x111111, 0.9);
        bFrame.fillRect(-bossBarW / 2, -bossBarH / 2, bossBarW, bossBarH);
        this.bossHpBar = this.add.rectangle(-bossBarW / 2 + 3, 0, bossBarW - 6, bossBarH - 6, 0xff0000).setOrigin(0, 0.5);
        this.bossHpText = this.add.text(0, 0, 'BOSS HP', {
            fontSize: '20px', color: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);
        this.bossHpContainer.add([bFrame, this.bossHpBar, this.bossHpText]);

        // --- Minimap ---
        this.minimapContainer = this.add.container(1280 - 10, 10).setDepth(800);
        const mmBg1 = this.add.graphics();
        mmBg1.fillStyle(0x000000, 0.8);
        mmBg1.fillRoundedRect(-(this.MINIMAP_SIZE + 4), 0, this.MINIMAP_SIZE + 4, this.MINIMAP_SIZE + 4, 10); // x, y, width, height, radius
        const mmBg2 = this.add.rectangle(0, 0, this.MINIMAP_SIZE, this.MINIMAP_SIZE, 0x333333, 0.9).setOrigin(1, 0);
        this.minimapGraphics = this.add.graphics();
        this.arrowGraphics = this.add.graphics();
        const mmHitArea = this.add.rectangle(0, 0, this.MINIMAP_SIZE, this.MINIMAP_SIZE, 0x000000, 0).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        this.minimapContainer.add([mmBg1, mmBg2, this.minimapGraphics, this.arrowGraphics, mmHitArea]);
        this.minimapContainer.setVisible(false); // Initially hidden, shown on game_started

        this.minimapOverlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0).setVisible(false).setDepth(850).setInteractive();
        
        mmHitArea.on('pointerdown', () => this.toggleMinimap());
        this.minimapOverlay.on('pointerdown', () => this.toggleMinimap());

        // Buttons
        const muteBtn = this.add.text(1210, 170, '🔊', {
            fontSize: '32px', color: '#ffffff', backgroundColor: '#00000088', padding: { x: 8, y: 4 }
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        const pauseBtn = this.add.text(1270, 170, '⏸', {
            fontSize: '32px', color: '#ffffff', backgroundColor: '#00000088', padding: { x: 8, y: 4 }
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        // Pause Overlays
        const pauseOverlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.7).setVisible(false).setDepth(900);
        const pauseText = this.add.text(640, 300, 'PAUSED', {
            fontFamily: '"MedievalSharp", cursive', fontSize: '72px', color: '#ffd700', fontStyle: 'bold', stroke: '#000000', strokeThickness: 8
        }).setOrigin(0.5).setVisible(false).setDepth(901);
        const resumeBtnBg = this.add.rectangle(640, 400, 300, 60, 0x3d2b1f, 0.9).setStrokeStyle(2, 0xffd700).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false).setDepth(901);
        const resumeBtnText = this.add.text(640, 400, '▶ RESUME', {
            fontFamily: '"MedievalSharp", cursive', fontSize: '32px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false).setDepth(902);
        const quitBtnBg = this.add.rectangle(640, 480, 300, 60, 0x3d2b1f, 0.9).setStrokeStyle(2, 0xff9999).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false).setDepth(901);
        const quitBtnText = this.add.text(640, 480, '🏠 MAIN MENU', {
            fontFamily: '"MedievalSharp", cursive', fontSize: '32px', color: '#ff9999', fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false).setDepth(902);

        const setPauseVisible = (v: boolean) => {
            pauseOverlay.setVisible(v); pauseText.setVisible(v);
            resumeBtnBg.setVisible(v); resumeBtnText.setVisible(v);
            quitBtnBg.setVisible(v); quitBtnText.setVisible(v);
        };

        pauseBtn.on('pointerdown', () => {
            const ms = this.scene.get('MainScene');
            if (ms.scene.isActive()) { ms.scene.pause(); setPauseVisible(true); }
            else { ms.scene.resume(); setPauseVisible(false); }
        });

        resumeBtnBg.on('pointerdown', () => { this.scene.get('MainScene').scene.resume(); setPauseVisible(false); });
        quitBtnBg.on('pointerdown', () => { this.sound.stopAll(); this.scene.stop('MainScene'); this.scene.stop('UIScene'); this.scene.start('TitleScene'); });

        this.uiContainer.add([this.stageLevelText, this.levelText, this.skillPointsText, this.statsText, this.hpFrame, this.hpBar, this.hpShine, this.hpIcon, this.hpText, this.expFrame, this.xpBar, this.expShine, this.expIcon, this.expLabel, this.mpContainer, this.coinText, this.coinIcon, pauseBtn, muteBtn]);
        this.uiContainer.setVisible(false);

        this.bossWarningText = this.add.text(640, 360, 'BOSS APPROACHING!', {
            fontSize: '72px', color: '#ff0000', fontStyle: 'bold', stroke: '#000000', strokeThickness: 8,
        }).setOrigin(0.5).setVisible(false).setDepth(999);

        this.stageClearText = this.add.text(640, 360, 'STAGE CLEAR!', {
            fontSize: '96px', color: '#ffff00', fontStyle: 'bold', stroke: '#000000', strokeThickness: 10,
        }).setOrigin(0.5).setVisible(false).setDepth(999);

        // Define Handlers
        const gameStartedHandler = () => {
            this.uiContainer.setVisible(true);
            this.joystick.setVisible(true);
            this.minimapContainer.setVisible(true);
        };
        const spawningCompleteHandler = () => this.spawningComplete = true;
        const stageUpdatedHandler = ((e: CustomEvent<number>) => {
            this.currentStage = e.detail; this.spawningComplete = false; this.updateStageLevelText(); this.bossHpContainer?.setVisible(false);
        }) as EventListener;
        const mapGeneratedHandler = ((e: CustomEvent<number[][]>) => {
            this.dungeonMap = e.detail;
            const h = this.dungeonMap.length; const w = h > 0 ? this.dungeonMap[0].length : 0;
            this.discoveredMap = Array.from({ length: h }, () => Array(w).fill(false));
        }) as EventListener;

        // Register Handlers
        window.addEventListener('game_started', gameStartedHandler);
        window.addEventListener('spawning_complete', spawningCompleteHandler);
        window.addEventListener('xp_collected', this.handleXp as EventListener);
        window.addEventListener('xp_percent_collected', this.handleXpPercent as EventListener);
        window.addEventListener('coin_collected', this.handleCoinCollected as EventListener);
        window.addEventListener('boss_spawned', this.handleBossSpawn as EventListener);
        window.addEventListener('boss_hp', this.handleBossHp as EventListener);
        window.addEventListener('hp_updated', this.handleHp as EventListener);
        window.addEventListener('stage_clear', this.handleStageClear as EventListener);
        window.addEventListener('stage_updated', stageUpdatedHandler);
        window.addEventListener('map_generated', mapGeneratedHandler);
        window.addEventListener('mp_updated', this.handleMp as EventListener);
        window.addEventListener('char_selected', ((e: CustomEvent<string>) => {
            this.selectedCharId = e.detail;
            this.repositionUIBars();
        }) as EventListener);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener('game_started', gameStartedHandler);
            window.removeEventListener('spawning_complete', spawningCompleteHandler);
            window.removeEventListener('xp_collected', this.handleXp as EventListener);
            window.removeEventListener('xp_percent_collected', this.handleXpPercent as EventListener);
            window.removeEventListener('coin_collected', this.handleCoinCollected as EventListener);
            window.removeEventListener('boss_spawned', this.handleBossSpawn as EventListener);
            window.removeEventListener('boss_hp', this.handleBossHp as EventListener);
            window.removeEventListener('hp_updated', this.handleHp as EventListener);
            window.removeEventListener('stage_clear', this.handleStageClear as EventListener);
            window.removeEventListener('stage_updated', stageUpdatedHandler);
            window.removeEventListener('map_generated', mapGeneratedHandler);
            window.removeEventListener('mp_updated', this.handleMp as EventListener);
            window.removeEventListener('char_selected', ((e: CustomEvent<string>) => {
                this.selectedCharId = e.detail;
                this.repositionUIBars();
            }) as EventListener);
        });



        this.updateStageLevelText();
    }

    private toggleMinimap() {
        const ms = this.scene.get('MainScene');
        this.isMinimapEnlarged = !this.isMinimapEnlarged;

        if (this.isMinimapEnlarged) {
            ms.scene.pause();
            this.minimapOverlay.setVisible(true).setAlpha(0);
            this.tweens.add({ targets: this.minimapOverlay, alpha: 0.6, duration: 300 });
            this.tweens.add({
                targets: this.minimapContainer,
                x: 640 + (this.MINIMAP_SIZE * 3.5) / 2, y: 360 - (this.MINIMAP_SIZE * 3.5) / 2,
                scale: 3.5, duration: 500, ease: 'Cubic.easeOut'
            });
        } else {
            ms.scene.resume();
            this.tweens.add({ targets: this.minimapOverlay, alpha: 0, duration: 300, onComplete: () => this.minimapOverlay.setVisible(false) });
            this.tweens.add({
                targets: this.minimapContainer,
                x: 1280 - 10, y: 10,
                scale: 1, duration: 400, ease: 'Back.easeIn'
            });
        }
    }

    private getStatsString() {
        return `ATK: x${globalStats.damageMult.toFixed(1)}\nSPD: x${globalStats.moveSpeedMult.toFixed(1)}\nCDR: -${((1 - globalStats.cooldownMult) * 100).toFixed(0)}%`;
    }

    private updateStageLevelText() {
        this.stageLevelText.setText(`Stage ${this.currentStage}`);
        this.expLabel.setText(`Level ${this.currentLevel}`);
        this.skillPointsText.setText(`SP: ${this.skillPoints}`);
        const p = Phaser.Math.Clamp(this.currentXp / this.xpToNextLevel, 0, 1);
        this.xpBar.width = Math.max(1, (400 - 8) * p);
    }

    update(_t: number, delta: number) {
        this.minimapTimer += delta;
        if (this.minimapTimer >= 500) { this.updateMinimap(); this.minimapTimer = 0; }
        this.updateTargetArrows();
        this.statsText.setText(this.getStatsString());
    }

    private updateTargetArrows() {
        this.arrowGraphics.clear();
        const players = this.playerQuery(world);
        if (players.length === 0) return;
        const px = Position.x[players[0]]; const py = Position.y[players[0]];
        const targets: { x: number, y: number, color: number }[] = [];
        const bosses = this.bossQuery(world);
        for (let i = 0; i < bosses.length; i++) targets.push({ x: Position.x[bosses[i]], y: Position.y[bosses[i]], color: 0xff00ff });

        if (this.spawningComplete && bosses.length === 0) {
            const enemies = this.enemyQuery(world);
            if (enemies.length > 0 && enemies.length < 5) {
                for (let i = 0; i < enemies.length; i++) targets.push({ x: Position.x[enemies[i]], y: Position.y[enemies[i]], color: 0xff0000 });
            }
        }

        const arrowDist = this.MINIMAP_SIZE / 2 - 10;
        const mmCenterRelX = -this.MINIMAP_SIZE / 2 - 2;
        const mmCenterRelY = this.MINIMAP_SIZE / 2 + 2;

        for (const t of targets) {
            const angle = Math.atan2(t.y - py, t.x - px);
            const ax = mmCenterRelX + Math.cos(angle) * arrowDist;
            const ay = mmCenterRelY + Math.sin(angle) * arrowDist;
            this.arrowGraphics.fillStyle(t.color, 1);
            this.arrowGraphics.fillTriangle(
                ax + Math.cos(angle) * 8, ay + Math.sin(angle) * 8,
                ax + Math.cos(angle + 2.4) * 5, ay + Math.sin(angle + 2.4) * 5,
                ax + Math.cos(angle - 2.4) * 5, ay + Math.sin(angle - 2.4) * 5
            );
        }

        // Screen boundary arrows
        const cx = 640; const cy = 360; const radius = 280;
        targets.forEach(t => {
            const dx = t.x - px; const dy = t.y - py;
            if (Math.sqrt(dx * dx + dy * dy) > 300) {
                const angle = Math.atan2(dy, dx);
                this.arrowGraphics.fillStyle(t.color, 1).lineStyle(2, 0xffffff, 1);
                const pX = cx + Math.cos(angle) * radius; const pY = cy + Math.sin(angle) * radius;
                const bLX = cx + Math.cos(angle - 0.2) * (radius - 24); const bLY = cy + Math.sin(angle - 0.2) * (radius - 24);
                const bRX = cx + Math.cos(angle + 0.2) * (radius - 24); const bRY = cy + Math.sin(angle + 0.2) * (radius - 24);
                this.arrowGraphics.fillTriangle(pX, pY, bLX, bLY, bRX, bRY);
                this.arrowGraphics.strokeTriangle(pX, pY, bLX, bLY, bRX, bRY);
            }
        });
    }

    private updateMinimap() {
        this.minimapGraphics.clear();
        if (this.dungeonMap.length === 0) return;
        const players = this.playerQuery(world);
        if (players.length > 0) {
            const tX = Math.floor(Position.x[players[0]] / 16); const tY = Math.floor(Position.y[players[0]] / 16);
            for (let dy = -15; dy <= 15; dy++) {
                for (let dx = -15; dx <= 15; dx++) {
                    if (dx * dx + dy * dy <= 225) {
                        const nx = tX + dx; const ny = tY + dy;
                        if (ny >= 0 && ny < this.dungeonMap.length && nx >= 0 && nx < this.dungeonMap[0].length) this.discoveredMap[ny][nx] = true;
                    }
                }
            }
        }
        const scale = this.MINIMAP_SIZE / Math.max(this.dungeonMap[0].length * 16, this.dungeonMap.length * 16);
        const oX = -2 - this.MINIMAP_SIZE; const oY = 2;

        for (let y = 0; y < this.dungeonMap.length; y++) {
            for (let x = 0; x < this.dungeonMap[0].length; x++) {
                if (this.dungeonMap[y][x] === 1) this.minimapGraphics.fillStyle(this.discoveredMap[y][x] ? 0x888888 : 0x222222, 1.0);
                else this.minimapGraphics.fillStyle(0x000000, 1.0);
                this.minimapGraphics.fillRect(oX + x * 16 * scale, oY + y * 16 * scale, Math.ceil(16 * scale), Math.ceil(16 * scale));
            }
        }

        const enemies = this.enemyQuery(world);
        for (let i = 0; i < enemies.length; i++) {
            const eid = enemies[i]; const ex = oX + (Position.x[eid] * scale); const ey = oY + (Position.y[eid] * scale);
            if (hasComponent(world, Boss, eid)) { this.minimapGraphics.fillStyle(0xff0000, 1).fillCircle(ex, ey, 4); }
            else { this.minimapGraphics.fillStyle(0xff0000, 0.8).fillRect(ex - 1, ey - 1, 2, 2); }
        }
        if (players.length > 0) {
            const peid = players[0];
            this.minimapGraphics.fillStyle(0xffffff, 1).fillCircle(oX + (Position.x[peid] * scale), oY + (Position.y[peid] * scale), 3);
        }
    }

    private handleCoinCollected = (e: CustomEvent<any>) => {
        this.totalCoins += e.detail?.amount || 1;
        this.coinText.setText(this.totalCoins.toLocaleString());
        this.coinIcon.x = this.coinText.x + this.coinText.width + 20;
        this.sound.play('coin_pickup', { volume: 0.8 });
    }

    private handleXpPercent = (e: CustomEvent<number>) => {
        const amount = Math.floor(this.xpToNextLevel * (e.detail / 100));
        this.handleXp(new CustomEvent('xp_collected', { detail: { amount, isDirect: true } }));
    }

    private handleXp = (e: CustomEvent<any>) => {
        const amount = typeof e.detail === 'number' ? e.detail : e.detail.amount;
        this.currentXp += amount;
        if (this.currentXp >= this.xpToNextLevel) {
            this.currentLevel++; globalStats.currentLevel = this.currentLevel; this.skillPoints++;
            this.currentXp -= this.xpToNextLevel; this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
            this.sound.play('level_up', { volume: 0.5 });
            this.statsText.setScale(1.5).setTint(0xffff00);
            this.time.delayedCall(1000, () => { this.statsText.setScale(1).clearTint(); });

            const players = this.playerQuery(world);
            if (players.length > 0) {
                const peid = players[0];
                Health.max[peid] = Math.ceil(Health.max[peid] * 1.05);
                Health.current[peid] = Health.max[peid];
                window.dispatchEvent(new CustomEvent('hp_updated', { detail: { current: Health.current[peid], max: Health.max[peid] } }));
                if (hasComponent(world, Mana, peid)) {
                    globalStats.mana.max = Math.ceil(globalStats.mana.max * 1.05);
                    globalStats.mana.current = globalStats.mana.max;
                    Mana.current[peid] = Mana.max[peid] = globalStats.mana.max;
                    window.dispatchEvent(new CustomEvent('mp_updated', { detail: { current: Mana.current[peid], max: Mana.max[peid] } }));
                }
                globalStats.damageMult *= 1.05; globalStats.moveSpeedMult *= 1.03;
            }
        }
        this.updateStageLevelText();
    }

    private handleHp = (e: CustomEvent<{ current: number, max: number }>) => {
        const { current, max } = e.detail;
        const p = Phaser.Math.Clamp(current / max, 0, 1);
        this.hpBar.displayWidth = (400 - 8) * p;
        this.hpText.setText(`${Math.ceil(current)} / ${max}`);
        this.hpBar.setFillStyle(p > 0.20 ? 0xffcc00 : 0xff0000);
    }

    private handleMp = (e: CustomEvent<{ current: number, max: number }>) => {
        const p = Phaser.Math.Clamp(e.detail.current / e.detail.max, 0, 1);
        this.mpBar.displayWidth = (400 - 8) * p;
        this.mpText.setText(`${Math.ceil(e.detail.current)} / ${e.detail.max}`);
    }

    private handleBossHp = (e: CustomEvent<{ current: number, max: number, name?: string }>) => {
        if (!this.bossHpContainer || !this.bossHpBar) return;
        this.bossHpContainer.setVisible(e.detail.current > 0);
        this.bossHpBar.displayWidth = (600 - 6) * Phaser.Math.Clamp(e.detail.current / e.detail.max, 0, 1);
        if (e.detail.name && this.bossHpText) this.bossHpText.setText(e.detail.name.toUpperCase());
    }

    private handleBossSpawn = () => {
        this.bossWarningTween?.stop(); this.bossWarningText.setVisible(true).setAlpha(1);
        this.bossWarningTween = this.tweens.add({ targets: this.bossWarningText, alpha: 0.2, duration: 150, yoyo: true, repeat: 20 });
        this.time.delayedCall(3000, () => this.bossWarningText.setVisible(false));
    }

    private handleStageClear = () => {
        this.bossHpContainer?.setVisible(false);
        const panel = this.add.rectangle(640, 360, 600, 340, 0x000000, 0.9).setStrokeStyle(4, 0xffd700).setDepth(998);
        this.stageClearText.setVisible(true).setPosition(640, 280).setText(`STAGE ${this.currentStage} CLEAR!`);
        const reward = this.add.text(640, 360, "BATTLE REWARD:\nALL STATS +10%", { fontSize: '32px', color: '#00ff00', align: 'center', fontStyle: 'bold' }).setOrigin(0.5).setDepth(999);
        const tapToContinue = this.add.text(640, 460, "- Touch to continue -", { fontSize: '24px', color: '#ffffff', fontStyle: 'italic' }).setOrigin(0.5).setDepth(999);

        this.tweens.add({
            targets: [panel, this.stageClearText, reward, tapToContinue],
            scale: { from: 0.8, to: 1 }, alpha: { from: 0, to: 1 }, duration: 500, ease: 'Back.easeOut',
            onComplete: () => {
                const proceed = () => {
                    this.input.off('pointerdown', proceed); this.input.keyboard?.off('keydown', proceed);
                    panel.destroy(); reward.destroy(); tapToContinue.destroy();
                    this.stageClearText.setVisible(false); window.dispatchEvent(new CustomEvent('next_stage'));
                };
                this.input.once('pointerdown', proceed); this.input.keyboard?.once('keydown', proceed);
            }
        });
    }

    private repositionUIBars() {
        const hpX = 20; const bottomY = 710; const barHeight = 28; const fullWidth = 400; const spacing = 34;
        const needsMana = (this.selectedCharId === 'wizard' || this.selectedCharId === 'elf');
        this.mpContainer.setVisible(needsMana);

        const expY = bottomY;
        this.expFrame.clear().lineStyle(4, 0xffffff).strokeRoundedRect(hpX, expY - barHeight, fullWidth, barHeight, 4).fillStyle(0x000000, 0.8).fillRoundedRect(hpX, expY - barHeight, fullWidth, barHeight, 4);
        this.xpBar.setPosition(hpX + 4, expY - barHeight + 4);
        this.xpBar.height = barHeight - 8;
        this.expShine.clear().fillStyle(0xffffff, 0.2).fillRect(hpX + 4, expY - barHeight + 4, fullWidth - 8, (barHeight - 8) / 2);
        this.expIcon.setPosition(hpX - 1, expY - barHeight / 2);
        this.expLabel.setPosition(hpX + fullWidth / 2, expY - barHeight / 2);

        let nextY = expY - spacing;
        if (needsMana) {
            this.mpContainer.setPosition(0, nextY);
            const mpFrame = this.mpContainer.list[0] as Phaser.GameObjects.Graphics;
            const mpShine = this.mpContainer.list[2] as Phaser.GameObjects.Graphics;
            const mpIcon = this.mpContainer.list[3] as Phaser.GameObjects.Image;
            mpFrame.clear().lineStyle(4, 0xffffff).strokeRoundedRect(hpX, -barHeight, fullWidth, barHeight, 4).fillStyle(0x000000, 0.8).fillRoundedRect(hpX, -barHeight, fullWidth, barHeight, 4);
            this.mpBar.setPosition(hpX + 4, -barHeight + 4);
            this.mpBar.height = barHeight - 8;
            mpShine.clear().fillStyle(0xffffff, 0.2).fillRect(hpX + 4, -barHeight + 4, fullWidth - 8, (barHeight - 8) / 2);
            mpIcon.setPosition(hpX - 1, -barHeight / 2);
            this.mpText.setPosition(hpX + fullWidth / 2, -barHeight / 2);
            nextY -= spacing;
        }

        const hpY = nextY;
        this.hpFrame.clear().lineStyle(4, 0xffffff).strokeRoundedRect(hpX, hpY - barHeight, fullWidth, barHeight, 4).fillStyle(0x000000, 0.8).fillRoundedRect(hpX, hpY - barHeight, fullWidth, barHeight, 4);
        this.hpBar.setPosition(hpX + 4, hpY - barHeight + 4);
        this.hpBar.height = barHeight - 8;
        this.hpShine.clear().fillStyle(0xffffff, 0.2).fillRect(hpX + 4, hpY - barHeight + 4, fullWidth - 8, (barHeight - 8) / 2);
        this.hpIcon.setPosition(hpX - 1, hpY - barHeight / 2);
        this.hpText.setPosition(hpX + fullWidth / 2, hpY - barHeight / 2);
    }
}
