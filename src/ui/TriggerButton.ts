import Phaser from 'phaser';
import { SynergyEffect } from '../components/alchemy';
import {
    TRIGGER_ACTIVE_DURATION_MS,
    TRIGGER_COOLDOWN_AFTER_END_MS,
    TRIGGER_BUTTON_RADIUS_PX,
} from '../constants/GameConfig';

export class TriggerButton {
    private scene: Phaser.Scene;
    private circle: Phaser.GameObjects.Arc;
    private label: Phaser.GameObjects.Text;
    private cooldownText: Phaser.GameObjects.Text;
    private container: Phaser.GameObjects.Container;
    private playerEid: number | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        const x = scene.scale.width - 80;
        const y = scene.scale.height - 80;

        this.container = scene.add.container(x, y);
        this.container.setDepth(1000);
        this.container.setScrollFactor(0);

        this.circle = scene.add.circle(0, 0, TRIGGER_BUTTON_RADIUS_PX, 0xffaa00, 0.85);
        this.circle.setStrokeStyle(3, 0xffffff, 1);
        this.circle.setInteractive({ useHandCursor: true });
        this.circle.setScrollFactor(0); // 자식 전파 보정
        this.container.add(this.circle);

        this.label = scene.add.text(0, 0, '⚡', { fontSize: '28px' });
        this.label.setOrigin(0.5);
        this.label.setScrollFactor(0);
        this.container.add(this.label);

        this.cooldownText = scene.add.text(0, 0, '', {
            fontSize: '16px',
            color: '#ffffff',
            fontStyle: 'bold',
        });
        this.cooldownText.setOrigin(0.5);
        this.cooldownText.setScrollFactor(0);
        this.container.add(this.cooldownText);

        this.circle.on('pointerdown', () => this.onPress());
    }

    setPlayerEid(eid: number): void {
        this.playerEid = eid;
    }

    private canActivate(now: number): boolean {
        if (this.playerEid === null) return false;
        if (SynergyEffect.synergyId[this.playerEid] < 0) return false;
        if (now < SynergyEffect.boostCooldownUntil[this.playerEid]) return false;
        if (now < SynergyEffect.boostActiveUntil[this.playerEid]) return false;
        return true;
    }

    private onPress(): void {
        if (this.playerEid === null) return;
        const now = this.scene.time.now;
        if (!this.canActivate(now)) return;
        SynergyEffect.boostActiveUntil[this.playerEid] = now + TRIGGER_ACTIVE_DURATION_MS;
        SynergyEffect.boostCooldownUntil[this.playerEid] =
            now + TRIGGER_ACTIVE_DURATION_MS + TRIGGER_COOLDOWN_AFTER_END_MS;
    }

    update(): void {
        if (this.playerEid === null) return;
        const now = this.scene.time.now;

        if (now < SynergyEffect.boostActiveUntil[this.playerEid]) {
            this.circle.setFillStyle(0xffd700, 1.0);
            this.cooldownText.setText('');
        } else if (now < SynergyEffect.boostCooldownUntil[this.playerEid]) {
            this.circle.setFillStyle(0x555555, 0.7);
            const remaining = Math.ceil(
                (SynergyEffect.boostCooldownUntil[this.playerEid] - now) / 1000,
            );
            this.cooldownText.setText(String(remaining));
        } else if (SynergyEffect.synergyId[this.playerEid] >= 0) {
            this.circle.setFillStyle(0xffaa00, 0.85);
            this.cooldownText.setText('');
        } else {
            this.circle.setFillStyle(0x222222, 0.5);
            this.cooldownText.setText('');
        }
    }

    destroy(): void {
        this.container.destroy();
    }
}
