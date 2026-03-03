import Phaser from 'phaser';
import { Element } from '../alchemy/AlchemySystem';

export class UIScene extends Phaser.Scene {
    private xpText!: Phaser.GameObjects.Text;
    private queueText!: Phaser.GameObjects.Text;
    private bossWarningText!: Phaser.GameObjects.Text;
    private bossWarningTween?: Phaser.Tweens.Tween;

    private currentLevel = 1;
    private currentXp = 0;
    private xpToNextLevel = 100;

    constructor() {
        super({ key: 'UIScene', active: true }); // Automatically starts alongside others
    }

    create() {
        this.add.text(10, 10, "Alchemist's Night", {
            fontSize: '24px',
            color: '#ffffff',
        });

        this.xpText = this.add.text(10, 40, "Level: 1 | XP: 0/100", {
            fontSize: '20px',
            color: '#ffff00',
        });

        // Fixed at bottom center of 1280x720 canvas
        this.queueText = this.add.text(640, 680, "Queue: [ ]", {
            fontSize: '24px',
            color: '#00ffff',
        }).setOrigin(0.5, 0.5);

        this.bossWarningText = this.add.text(640, 360, 'BOSS APPROACHING!', {
            fontSize: '72px',
            color: '#ff0000',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 8,
        }).setOrigin(0.5, 0.5).setVisible(false);

        // Listen for global events
        window.addEventListener('xp_collected', this.handleXp as EventListener);
        window.addEventListener('alchemyQueueUpdated', this.handleQueue as EventListener);
        window.addEventListener('boss_spawned', this.handleBossSpawn as EventListener);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener('xp_collected', this.handleXp as EventListener);
            window.removeEventListener('alchemyQueueUpdated', this.handleQueue as EventListener);
            window.removeEventListener('boss_spawned', this.handleBossSpawn as EventListener);
            this.bossWarningTween?.stop();
        });
    }

    private handleXp = (e: CustomEvent<number>) => {
        this.currentXp += e.detail;
        if (this.currentXp >= this.xpToNextLevel) {
            this.currentLevel++;
            this.currentXp -= this.xpToNextLevel;
            this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
            // Note: Pause/Juice logic is still handled in MainScene.
        }
        this.xpText.setText(`Level: ${this.currentLevel} | XP: ${Math.floor(this.currentXp)}/${this.xpToNextLevel}`);
    }

    private handleQueue = (e: CustomEvent<Element[]>) => {
        const elements = e.detail;
        this.queueText.setText(`Queue: [ ${elements.join(' + ')} ]`);
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
            this.bossWarningTween?.stop();
            this.bossWarningText.setVisible(false);
            this.bossWarningText.setAlpha(1);
        });
    }
}
