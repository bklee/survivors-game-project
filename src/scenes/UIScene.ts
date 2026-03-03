import Phaser from 'phaser';
import { defineQuery } from 'bitecs';
import { world } from '../core/World';
import { Position, Player, Enemy } from '../components';
import { Element } from '../alchemy/AlchemySystem';

export class UIScene extends Phaser.Scene {
    private xpText!: Phaser.GameObjects.Text;
    private queueText!: Phaser.GameObjects.Text;
    private hpBar!: Phaser.GameObjects.Rectangle;
    private uiContainer!: Phaser.GameObjects.Container;
    private bossWarningText!: Phaser.GameObjects.Text;
    private bossWarningTween?: Phaser.Tweens.Tween;
    private stageClearText!: Phaser.GameObjects.Text;

    private currentLevel = 1;
    private currentXp = 0;
    private xpToNextLevel = 100;

    // Minimap
    private minimapGraphics!: Phaser.GameObjects.Graphics;
    private readonly MINIMAP_SIZE = 150;
    private readonly SCALE = 150 / 4000; 
    
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
        });

        this.xpText = this.add.text(10, 40, "Level: 1 | XP: 0/100", {
            fontSize: '20px',
            color: '#ffff00',
        });

        const hpBg = this.add.rectangle(640, 30, 400, 20, 0x333333).setOrigin(0.5);
        this.hpBar = this.add.rectangle(640, 30, 400, 20, 0x00ff00).setOrigin(0.5);

        this.queueText = this.add.text(640, 680, "Queue: [ ]", {
            fontSize: '24px',
            color: '#00ffff',
        }).setOrigin(0.5, 0.5);

        const mmX = 1280 - 10;
        const mmY = 10;
        const mmBg1 = this.add.rectangle(mmX, mmY, this.MINIMAP_SIZE + 4, this.MINIMAP_SIZE + 4, 0xffffff, 0.2).setOrigin(1, 0);
        const mmBg2 = this.add.rectangle(mmX - 2, mmY + 2, this.MINIMAP_SIZE, this.MINIMAP_SIZE, 0x000000, 0.5).setOrigin(1, 0);
        this.minimapGraphics = this.add.graphics();

        this.uiContainer.add([title, this.xpText, hpBg, this.hpBar, this.queueText, mmBg1, mmBg2, this.minimapGraphics]);
        this.uiContainer.setVisible(false);
        this.minimapGraphics.setVisible(false);
        this.xpText.setVisible(false);
        this.queueText.setVisible(false);
        this.hpBar.setVisible(false);

        // Alerts
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

        // Listen for game start to show UI
        window.addEventListener('game_started', () => {
            this.uiContainer.setVisible(true);
        });

        // Listen for global events
        window.addEventListener('xp_collected', this.handleXp as EventListener);
        window.addEventListener('alchemyQueueUpdated', this.handleQueue as EventListener);
        window.addEventListener('boss_spawned', this.handleBossSpawn as EventListener);
        window.addEventListener('hp_updated', this.handleHp as EventListener);
        window.addEventListener('stage_clear', this.handleStageClear as EventListener);
        window.addEventListener('player_died', () => this.sound.stopAll());

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener('xp_collected', this.handleXp as EventListener);
            window.removeEventListener('alchemyQueueUpdated', this.handleQueue as EventListener);
            window.removeEventListener('boss_spawned', this.handleBossSpawn as EventListener);
            window.removeEventListener('hp_updated', this.handleHp as EventListener);
            window.removeEventListener('stage_clear', this.handleStageClear as EventListener);
            this.bossWarningTween?.stop();
        });
    }

    update() {
        this.updateMinimap();
    }

    private updateMinimap() {
        this.minimapGraphics.clear();
        const offsetX = 1280 - 12 - this.MINIMAP_SIZE;
        const offsetY = 12;

        const players = this.playerQuery(world);
        const enemies = this.enemyQuery(world);

        // Draw Enemies
        this.minimapGraphics.fillStyle(0xff0000, 0.8);
        for (let i = 0; i < enemies.length; i++) {
            const eid = enemies[i];
            const x = offsetX + (Position.x[eid] * this.SCALE);
            const y = offsetY + (Position.y[eid] * this.SCALE);
            this.minimapGraphics.fillRect(x, y, 2, 2);
        }

        // Draw Player
        if (players.length > 0) {
            const peid = players[0];
            const px = offsetX + (Position.x[peid] * this.SCALE);
            const py = offsetY + (Position.y[peid] * this.SCALE);
            this.minimapGraphics.fillStyle(0xffffff, 1);
            this.minimapGraphics.fillCircle(px, py, 3);
        }
    }

    private handleXp = (e: CustomEvent<number>) => {
        this.currentXp += e.detail;
        if (this.currentXp >= this.xpToNextLevel) {
            this.currentLevel++;
            this.currentXp -= this.xpToNextLevel;
            this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
        }
        this.xpText.setText(`Level: ${this.currentLevel} | XP: ${Math.floor(this.currentXp)}/${this.xpToNextLevel}`);
    }

    private handleQueue = (e: CustomEvent<Element[]>) => {
        const elements = e.detail;
        this.queueText.setText(`Queue: [ ${elements.join(' + ')} ]`);
    }

    private handleHp = (e: CustomEvent<{current: number, max: number}>) => {
        const { current, max } = e.detail;
        const percent = Phaser.Math.Clamp(current / max, 0, 1);
        this.hpBar.width = 400 * percent;
        if (percent > 0.5) this.hpBar.setFillStyle(0x00ff00);
        else if (percent > 0.2) this.hpBar.setFillStyle(0xffff00);
        else this.hpBar.setFillStyle(0xff0000);
    }

    private handleBossSpawn = () => {
        this.bossWarningTween?.stop();
        this.bossWarningText.setVisible(true);
        this.bossWarningText.setAlpha(1);
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
        this.stageClearText.setVisible(true);
        this.tweens.add({
            targets: this.stageClearText,
            scale: { from: 0.5, to: 1.2 },
            alpha: { from: 0, to: 1 },
            duration: 800,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.time.delayedCall(3000, () => {
                    this.stageClearText.setVisible(false);
                    window.dispatchEvent(new CustomEvent('next_stage'));
                });
            }
        });
        this.sound.stopAll();
    }
}