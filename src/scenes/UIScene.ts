import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { world } from '../core/World';
import { Position, Player, Enemy } from '../components';
import { globalStats } from '../core/PlayerStats';

export class UIScene extends Phaser.Scene {
    private stageLevelText!: Phaser.GameObjects.Text;
    private levelText!: Phaser.GameObjects.Text;
    private statsText!: Phaser.GameObjects.Text;
    private hpBar!: Phaser.GameObjects.Rectangle;
    private hpText!: Phaser.GameObjects.Text;
    private uiContainer!: Phaser.GameObjects.Container;
    private bossWarningText!: Phaser.GameObjects.Text;
    private bossWarningTween?: Phaser.Tweens.Tween;
    private stageClearText!: Phaser.GameObjects.Text;
    private dungeonMap: number[][] = [];
    private discoveredMap: boolean[][] = [];

    private currentLevel = 1;
    private currentStage = 1;
    private currentXp = 0;
    private xpToNextLevel = 100;

    private coinText!: Phaser.GameObjects.Text;
    private totalCoins = 0;
    private skillPoints = 0;

    // Minimap
    private minimapGraphics!: Phaser.GameObjects.Graphics;
    private readonly MINIMAP_SIZE = 150;

    private playerQuery = defineQuery([Player, Position]);
    private enemyQuery = defineQuery([Enemy, Position]);

    constructor() {
        super({ key: 'UIScene', active: true });
    }

    create() {
        this.uiContainer = this.add.container(0, 0);

        const title = this.add.text(10, 10, "Alchemist's Night", {
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold'
        });

        this.stageLevelText = this.add.text(640, 10, "Stage 1", {
            fontSize: '28px',
            color: '#ffff00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5, 0);

        this.levelText = this.add.text(10, 45, "Level 1 (0 / 100 XP) | SP: 0", {
            fontSize: '20px',
            color: '#00ffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        });

        this.statsText = this.add.text(10, 80, this.getStatsString(), {
            fontSize: '16px',
            color: '#00ff00',
            backgroundColor: '#00000088'
        });

        const hpBg = this.add.rectangle(10, 710, 400, 20, 0x333333).setOrigin(0, 1);
        this.hpBar = this.add.rectangle(10, 710, 400, 20, 0x00ff00).setOrigin(0, 1);
        this.hpText = this.add.text(210, 700, '100 / 100', { fontSize: '14px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5, 0.5);

        this.coinText = this.add.text(1270, 710, 'Coins: 0', {
            fontSize: '24px',
            color: '#ffd700',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(1, 1);

        // Minimap
        const mmX = 1280 - 10;
        const mmY = 10;
        const mmBg1 = this.add.rectangle(mmX, mmY, this.MINIMAP_SIZE + 4, this.MINIMAP_SIZE + 4, 0x222222, 1).setOrigin(1, 0);
        const mmBg2 = this.add.rectangle(mmX - 2, mmY + 2, this.MINIMAP_SIZE, this.MINIMAP_SIZE, 0x111111, 1).setOrigin(1, 0);
        this.minimapGraphics = this.add.graphics();

        this.uiContainer.add([title, this.stageLevelText, this.levelText, this.statsText, hpBg, this.hpBar, this.hpText, this.coinText, mmBg1, mmBg2, this.minimapGraphics]);
        this.uiContainer.setVisible(false);

        this.bossWarningText = this.add.text(640, 360, 'BOSS APPROACHING!', {
            fontSize: '72px',
            color: '#ff0000',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 8,
        }).setOrigin(0.5, 0.5).setVisible(false);

        this.stageClearText = this.add.text(640, 360, 'STAGE CLEAR!', {
            fontSize: '96px',
            color: '#ffff00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 10,
        }).setOrigin(0.5, 0.5).setVisible(false);

        window.addEventListener('game_started', () => {
            this.uiContainer.setVisible(true);
        });

        window.addEventListener('xp_collected', this.handleXp as EventListener);
        window.addEventListener('boss_spawned', this.handleBossSpawn as EventListener);
        window.addEventListener('hp_updated', this.handleHp as EventListener);
        window.addEventListener('stage_clear', this.handleStageClear as EventListener);
        window.addEventListener('stage_updated', ((e: CustomEvent<number>) => {
            this.currentStage = e.detail;
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

    update() {
        this.updateMinimap();
        // Keep stats updated in case of background changes
        this.statsText.setText(this.getStatsString());
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
        this.coinText.setText(`Coins: ${this.totalCoins}`);
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
        this.hpBar.displayWidth = 400 * percent;
        this.hpText.setText(`${Math.ceil(current)} / ${max}`);
        if (percent > 0.5) this.hpBar.setFillStyle(0x00ff00);
        else if (percent > 0.2) this.hpBar.setFillStyle(0xffff00);
        else this.hpBar.setFillStyle(0xff0000);
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
        const panel = this.add.rectangle(640, 360, 600, 300, 0x000000, 0.9).setStrokeStyle(4, 0xffd700);
        this.stageClearText.setVisible(true).setPosition(640, 300).setText(`STAGE ${this.currentStage} CLEAR!`);
        const reward = this.add.text(640, 400, "BATTLE REWARD:\nALL STATS +10%", {
            fontSize: '32px', color: '#00ff00', align: 'center', fontStyle: 'bold'
        }).setOrigin(0.5);

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
