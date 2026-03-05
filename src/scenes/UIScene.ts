import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { world } from '../core/World';
import { Position, Player, Enemy, Boss } from '../components';
import { globalStats } from '../core/PlayerStats';
import { VirtualJoystick } from '../ui/VirtualJoystick';

export class UIScene extends Phaser.Scene {
    private stageLevelText!: Phaser.GameObjects.Text;
    private levelText!: Phaser.GameObjects.Text;
    private statsText!: Phaser.GameObjects.Text;
    private hpBar!: Phaser.GameObjects.Rectangle;
    private hpText!: Phaser.GameObjects.Text;

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

    public joystick!: VirtualJoystick;
    private minimapTimer = 0;

    private playerQuery = defineQuery([Player, Position]);
    private enemyQuery = defineQuery([Enemy, Position]);
    private bossQuery = defineQuery([Boss, Position]);

    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        this.uiContainer = this.add.container(0, 0);

        this.stageLevelText = this.add.text(640, 10, "Stage 1", {
            fontSize: '28px',
            color: '#ffff00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5, 0);

        const { width, height } = this.scale;
        this.joystick = new VirtualJoystick(this, width / 2, height - 100, 60);
        this.joystick.setVisible(false);

        // 1. Level Text (Top Left)
        this.levelText = this.add.text(10, 10, "Level 1 (0 / 100 XP) | SP: 0", {
            fontSize: '20px',
            color: '#ffcc00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        });

        // 2. Coin UI (Adjusted Y from 45 to 55 for spacing)
        this.coinText = this.add.text(10, 55, '0', {
            fontFamily: '"MedievalSharp", cursive',
            fontSize: '28px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0, 0.5);

        this.coinIcon = this.add.image(this.coinText.x + this.coinText.width + 10, 55, 'coin_f0')
            .setScale(2.5)
            .setOrigin(0, 0.5);

        // 3. Stats Text (Adjusted Y to 95 for spacing)
        this.statsText = this.add.text(10, 95, this.getStatsString(), {
            fontSize: '16px',
            color: '#00ff00',
            backgroundColor: '#00000088'
        }).setVisible(false);

        // Stats Toggle (Shift + A)
        this.input.keyboard?.on('keydown-A', (event: KeyboardEvent) => {
            if (event.shiftKey) {
                const isVisible = this.statsText.visible;
                this.statsText.setVisible(!isVisible);
            }
        });

        // --- Stylized HP Bar ---
        const hpX = 20;
        const hpY = 700;
        const hpHeight = 30;
        const fullWidth = 400;

        const hpFrame = this.add.graphics();
        hpFrame.lineStyle(4, 0xffffff);
        hpFrame.strokeRoundedRect(hpX, hpY - hpHeight, fullWidth, hpHeight, 4);
        hpFrame.fillStyle(0x000000, 0.8);
        hpFrame.fillRoundedRect(hpX, hpY - hpHeight, fullWidth, hpHeight, 4);

        this.hpBar = this.add.rectangle(hpX + 4, hpY - hpHeight + 4, fullWidth - 8, hpHeight - 8, 0xffcc00)
            .setOrigin(0, 0);

        const shine = this.add.graphics();
        shine.fillStyle(0xffffff, 0.2);
        shine.fillRect(hpX + 4, hpY - hpHeight + 4, fullWidth - 8, (hpHeight - 8) / 2);

        const hpIcon = this.add.image(hpX - 1, hpY - hpHeight / 2, 'hp_icon')
            .setDisplaySize(35, 35)
            .setOrigin(0.5, 0.5)
            .setDepth(20);

        this.hpText = this.add.text(hpX + fullWidth / 2, hpY - hpHeight / 2, '100 / 100', {
            fontFamily: '"MedievalSharp", cursive',
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5, 0.5).setDepth(6);

        // --- Boss HP Bar ---
        this.bossHpContainer = this.add.container(640, 80).setVisible(false).setAlpha(0.8);
        const bossBarW = 600;
        const bossBarH = 24;

        const bFrame = this.add.graphics();
        bFrame.lineStyle(3, 0x888888);
        bFrame.strokeRect(-bossBarW / 2, -bossBarH / 2, bossBarW, bossBarH);
        bFrame.fillStyle(0x111111, 0.9);
        bFrame.fillRect(-bossBarW / 2, -bossBarH / 2, bossBarW, bossBarH);

        this.bossHpBar = this.add.rectangle(-bossBarW / 2 + 3, 0, bossBarW - 6, bossBarH - 6, 0xff0000)
            .setOrigin(0, 0.5);

        this.bossHpText = this.add.text(0, 0, 'BOSS HP', {
            fontSize: '20px', color: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);

        this.bossHpContainer.add([bFrame, this.bossHpBar, this.bossHpText]);

        // --- Minimap ---
        const mmX = 1280 - 10;
        const mmY = 10;
        const mmBg1 = this.add.rectangle(mmX, mmY, this.MINIMAP_SIZE + 4, this.MINIMAP_SIZE + 4, 0x222222, 1).setOrigin(1, 0);
        const mmBg2 = this.add.rectangle(mmX - 2, mmY + 2, this.MINIMAP_SIZE, this.MINIMAP_SIZE, 0x111111, 1).setOrigin(1, 0);
        this.minimapGraphics = this.add.graphics();
        this.arrowGraphics = this.add.graphics();

        // Pause Button
        const pauseBtn = this.add.text(1270, 170, '⏸', {
            fontSize: '32px',
            color: '#ffffff',
            backgroundColor: '#00000088',
            padding: { x: 8, y: 4 }
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        // Pause Overlays
        const pauseOverlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.7).setVisible(false).setDepth(900);
        const pauseText = this.add.text(640, 300, 'PAUSED', {
            fontFamily: '"MedievalSharp", cursive',
            fontSize: '72px',
            color: '#ffd700',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5).setVisible(false).setDepth(901);

        const resumeBtn = this.add.text(640, 400, '▶ RESUME', {
            fontFamily: '"MedievalSharp", cursive',
            fontSize: '36px',
            color: '#ffffff',
            backgroundColor: '#3d2b1f',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false).setDepth(901);

        const quitBtn = this.add.text(640, 480, '🏠 MAIN MENU', {
            fontFamily: '"MedievalSharp", cursive',
            fontSize: '30px',
            color: '#ff9999',
            backgroundColor: '#3d2b1f',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false).setDepth(901);

        pauseBtn.on('pointerdown', () => {
            const mainScene = this.scene.get('MainScene');
            if (mainScene.scene.isPaused()) {
                mainScene.scene.resume();
                pauseOverlay.setVisible(false);
                pauseText.setVisible(false);
                resumeBtn.setVisible(false);
                quitBtn.setVisible(false);
                pauseBtn.setText('⏸');
            } else {
                mainScene.scene.pause();
                pauseOverlay.setVisible(true);
                pauseText.setVisible(true);
                resumeBtn.setVisible(true);
                quitBtn.setVisible(true);
                pauseBtn.setText('⏸');
            }
        });

        resumeBtn.on('pointerdown', () => {
            const mainScene = this.scene.get('MainScene');
            mainScene.scene.resume();
            pauseOverlay.setVisible(false);
            pauseText.setVisible(false);
            resumeBtn.setVisible(false);
            quitBtn.setVisible(false);
            pauseBtn.setText('⏸');
        });

        quitBtn.on('pointerdown', () => {
            this.sound.stopAll();
            this.scene.stop('MainScene');
            this.scene.stop('UIScene');
            this.scene.start('TitleScene');
        });

        this.uiContainer.add([this.stageLevelText, this.levelText, this.statsText, hpFrame, this.hpBar, shine, hpIcon, this.hpText, this.coinText, this.coinIcon, mmBg1, mmBg2, this.minimapGraphics, this.arrowGraphics, pauseBtn]);
        this.uiContainer.setVisible(false);

        this.bossWarningText = this.add.text(640, 360, 'BOSS APPROACHING!', {
            fontSize: '72px',
            color: '#ff0000',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 8,
        }).setOrigin(0.5, 0.5).setVisible(false).setDepth(999);

        this.stageClearText = this.add.text(640, 360, 'STAGE CLEAR!', {
            fontSize: '96px',
            color: '#ffff00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 10,
        }).setOrigin(0.5, 0.5).setVisible(false).setDepth(999);

        window.addEventListener('game_started', () => {
            this.uiContainer.setVisible(true);
            this.joystick.setVisible(true);
        });

        window.addEventListener('spawning_complete', () => this.spawningComplete = true);
        window.addEventListener('xp_collected', this.handleXp as EventListener);
        window.addEventListener('boss_spawned', this.handleBossSpawn as EventListener);
        window.addEventListener('boss_hp', this.handleBossHp as EventListener);
        window.addEventListener('hp_updated', this.handleHp as EventListener);
        window.addEventListener('stage_clear', this.handleStageClear as EventListener);
        window.addEventListener('stage_updated', ((e: CustomEvent<number>) => {
            this.currentStage = e.detail;
            this.spawningComplete = false;
            this.updateStageLevelText();
        }) as EventListener);

        window.addEventListener('player_died', () => this.sound.stopAll());
        window.addEventListener('map_generated', ((e: CustomEvent<number[][]>) => {
            this.dungeonMap = e.detail;
            const h = this.dungeonMap.length;
            const w = h > 0 ? this.dungeonMap[0].length : 0;
            this.discoveredMap = Array.from({ length: h }, () => Array(w).fill(false));
        }) as EventListener);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener('xp_collected', this.handleXp as EventListener);
            window.removeEventListener('boss_spawned', this.handleBossSpawn as EventListener);
            window.removeEventListener('hp_updated', this.handleHp as EventListener);
            window.removeEventListener('stage_clear', this.handleStageClear as EventListener);
            this.bossWarningTween?.stop();
        });
    }

    private getStatsString() {
        return `ATK: x${globalStats.damageMult.toFixed(1)}\nSPD: x${globalStats.moveSpeedMult.toFixed(1)}\nCDR: -${((1 - globalStats.cooldownMult) * 100).toFixed(0)}%`;
    }

    private updateStageLevelText() {
        this.stageLevelText.setText(`Stage ${this.currentStage}`);
        this.levelText.setText(`Level ${this.currentLevel} (${Math.floor(this.currentXp)} / ${this.xpToNextLevel} XP) | SP: ${this.skillPoints}`);
    }

    update(_time: number, delta: number) {
        this.minimapTimer += delta;
        if (this.minimapTimer >= 500) {
            this.updateMinimap();
            this.minimapTimer = 0;
        }
        this.updateTargetArrows();
        this.statsText.setText(this.getStatsString());
    }

    private updateTargetArrows() {
        this.arrowGraphics.clear();
        const players = this.playerQuery(world);
        if (players.length === 0) return;

        const px = Position.x[players[0]];
        const py = Position.y[players[0]];

        const targets: { x: number, y: number, color: number }[] = [];

        const bosses = this.bossQuery(world);
        for (let i = 0; i < bosses.length; i++) {
            targets.push({ x: Position.x[bosses[i]], y: Position.y[bosses[i]], color: 0xff00ff }); // Magenta boss arrow
        }

        if (this.spawningComplete && bosses.length === 0) {
            const enemies = this.enemyQuery(world);
            if (enemies.length > 0 && enemies.length < 5) {
                for (let i = 0; i < enemies.length; i++) {
                    targets.push({ x: Position.x[enemies[i]], y: Position.y[enemies[i]], color: 0xff0000 }); // Red enemy arrow
                }
            }
        }

        const cx = 640;
        const cy = 360;
        const radius = 280;

        targets.forEach(t => {
            const dx = t.x - px;
            const dy = t.y - py;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 300) {
                const angle = Math.atan2(dy, dx);

                this.arrowGraphics.fillStyle(t.color, 1);
                this.arrowGraphics.lineStyle(2, 0xffffff, 1);

                const ptX = cx + Math.cos(angle) * radius;
                const ptY = cy + Math.sin(angle) * radius;
                const bL_X = cx + Math.cos(angle - 0.2) * (radius - 24);
                const bL_Y = cy + Math.sin(angle - 0.2) * (radius - 24);
                const bR_X = cx + Math.cos(angle + 0.2) * (radius - 24);
                const bR_Y = cy + Math.sin(angle + 0.2) * (radius - 24);

                this.arrowGraphics.fillTriangle(ptX, ptY, bL_X, bL_Y, bR_X, bR_Y);
                this.arrowGraphics.strokeTriangle(ptX, ptY, bL_X, bL_Y, bR_X, bR_Y);
            }
        });
    }

    private updateMinimap() {
        this.minimapGraphics.clear();
        if (this.dungeonMap.length === 0) return;

        const players = this.playerQuery(world);
        let pxWorld = 0;
        let pyWorld = 0;
        if (players.length > 0) {
            pxWorld = Position.x[players[0]];
            pyWorld = Position.y[players[0]];

            // Uncover map around player
            const tileX = Math.floor(pxWorld / 16);
            const tileY = Math.floor(pyWorld / 16);
            const sightRadius = 15;
            for (let dy = -sightRadius; dy <= sightRadius; dy++) {
                for (let dx = -sightRadius; dx <= sightRadius; dx++) {
                    if (dx * dx + dy * dy <= sightRadius * sightRadius) {
                        const nx = tileX + dx;
                        const ny = tileY + dy;
                        if (ny >= 0 && ny < this.dungeonMap.length && nx >= 0 && nx < this.dungeonMap[0].length) {
                            this.discoveredMap[ny][nx] = true;
                        }
                    }
                }
            }
        }

        const mapW = this.dungeonMap[0].length * 16;
        const mapH = this.dungeonMap.length * 16;
        const maxDim = Math.max(mapW, mapH);
        const scale = this.MINIMAP_SIZE / maxDim;

        const offsetX = 1280 - 12 - this.MINIMAP_SIZE;
        const offsetY = 12;

        for (let y = 0; y < this.dungeonMap.length; y++) {
            for (let x = 0; x < this.dungeonMap[0].length; x++) {
                if (this.dungeonMap[y][x] === 1) {
                    this.minimapGraphics.fillStyle(this.discoveredMap[y][x] ? 0x888888 : 0x222222, 1.0);
                } else {
                    this.minimapGraphics.fillStyle(0x000000, 1.0);
                }
                this.minimapGraphics.fillRect(
                    offsetX + x * 16 * scale,
                    offsetY + y * 16 * scale,
                    Math.ceil(16 * scale),
                    Math.ceil(16 * scale)
                );
            }
        }

        const enemies = this.enemyQuery(world);

        this.minimapGraphics.fillStyle(0xff0000, 0.8);
        for (let i = 0; i < enemies.length; i++) {
            const eid = enemies[i];
            const x = offsetX + (Position.x[eid] * scale);
            const y = offsetY + (Position.y[eid] * scale);
            this.minimapGraphics.fillRect(x, y, 2, 2);
        }

        if (players.length > 0) {
            const peid = players[0];
            const px = offsetX + (Position.x[peid] * scale);
            const py = offsetY + (Position.y[peid] * scale);
            this.minimapGraphics.fillStyle(0xffffff, 1);
            this.minimapGraphics.fillCircle(px, py, 3);
        }
    }

    private handleXp = (e: CustomEvent<number>) => {
        this.totalCoins += 1;
        this.coinText.setText(this.totalCoins.toLocaleString());
        this.coinIcon.x = this.coinText.x + this.coinText.width + 10;
        this.sound.play('coin_pickup', { volume: 0.8 });
        this.currentXp += e.detail;
        if (this.currentXp >= this.xpToNextLevel) {
            this.currentLevel++;
            this.skillPoints++;
            this.currentXp -= this.xpToNextLevel;
            this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
            this.sound.play('level_up', { volume: 0.5 });

            this.statsText.setScale(1.5).setTint(0xffff00);
            this.time.delayedCall(1000, () => {
                this.statsText.setScale(1).clearTint();
            });
        }
        this.updateStageLevelText();
    }

    private handleHp = (e: CustomEvent<{ current: number, max: number }>) => {
        const { current, max } = e.detail;
        const percent = Phaser.Math.Clamp(current / max, 0, 1);
        const fullWidth = 400 - 8;
        this.hpBar.displayWidth = fullWidth * percent;
        this.hpText.setText(`${Math.ceil(current)} / ${max}`);

        if (percent > 0.20) this.hpBar.setFillStyle(0xffcc00);
        else this.hpBar.setFillStyle(0xff0000);
    }

    private handleBossHp = (e: CustomEvent<{ current: number, max: number, name?: string }>) => {
        if (!this.bossHpContainer || !this.bossHpBar) return;
        const { current, max, name } = e.detail;
        this.bossHpContainer.setVisible(current > 0);
        const percent = Phaser.Math.Clamp(current / max, 0, 1);
        this.bossHpBar.displayWidth = (600 - 6) * percent;
        if (name && this.bossHpText) {
            this.bossHpText.setText(`${name.toUpperCase()}`);
        }
    }

    private handleBossSpawn = () => {
        this.bossWarningTween?.stop();
        this.bossWarningText.setVisible(true).setAlpha(1);
        this.bossWarningTween = this.tweens.add({
            targets: this.bossWarningText,
            alpha: 0.2,
            duration: 150,
            yoyo: true,
            repeat: 20,
        });
        this.time.delayedCall(3000, () => {
            this.bossWarningText.setVisible(false);
        });
    }

    private handleStageClear = () => {
        const panel = this.add.rectangle(640, 360, 600, 300, 0x000000, 0.9).setStrokeStyle(4, 0xffd700).setDepth(998);
        this.stageClearText.setVisible(true).setPosition(640, 300).setText(`STAGE ${this.currentStage} CLEAR!`);
        const reward = this.add.text(640, 400, "BATTLE REWARD:\nALL STATS +10%", {
            fontSize: '32px', color: '#00ff00', align: 'center', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(999);

        this.tweens.add({
            targets: [panel, this.stageClearText, reward],
            scale: { from: 0.8, to: 1 },
            alpha: { from: 0, to: 1 },
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.time.delayedCall(3000, () => {
                    panel.destroy();
                    reward.destroy();
                    this.stageClearText.setVisible(false);
                    window.dispatchEvent(new CustomEvent('next_stage'));
                });
            }
        });
        this.sound.stopAll();
    }
}
