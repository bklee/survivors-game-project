import Phaser from 'phaser';
import { Element } from '../alchemy/AlchemySystem';

export class UIScene extends Phaser.Scene {
    private xpText!: Phaser.GameObjects.Text;
    private queueText!: Phaser.GameObjects.Text;

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

        // Listen for global events
        window.addEventListener('xp_collected', this.handleXp as EventListener);
        window.addEventListener('alchemyQueueUpdated', this.handleQueue as EventListener);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener('xp_collected', this.handleXp as EventListener);
            window.removeEventListener('alchemyQueueUpdated', this.handleQueue as EventListener);
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
}
