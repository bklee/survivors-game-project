import Phaser from 'phaser';
import { VFXSystem } from './VFXSystem';

export let isHitStopped = false;

export class JuicePipeline {
    private scene: Phaser.Scene;
    private hitStopTimer?: Phaser.Time.TimerEvent;
    private hitStopEndTime = 0;
    private damageTextPool: Phaser.GameObjects.Text[] = [];
    private damageTextPoolIndex = 0;
    public vfx: VFXSystem;
    private readonly damageTextStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        fontSize: '24px',
        color: '#ff0000',
        stroke: '#ffffff',
        strokeThickness: 2,
        fontFamily: 'monospace, sans-serif',
        fontStyle: 'bold',
    };
    private static readonly DAMAGE_TEXT_POOL_SIZE = 256;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown, this);
        this.vfx = new VFXSystem(scene);
    }

    public hitStop(durationMS: number) {
        if (durationMS <= 0) {
            return;
        }

        const now = this.scene.time.now;
        this.hitStopEndTime = Math.max(this.hitStopEndTime, now + durationMS);
        isHitStopped = true;

        if (this.hitStopTimer) {
            this.hitStopTimer.remove(false);
        }

        this.hitStopTimer = this.scene.time.delayedCall(this.hitStopEndTime - now, () => {
            isHitStopped = false;
            this.hitStopTimer = undefined;
            this.hitStopEndTime = 0;
        });
    }

    public screenShake(intensity: number = 0.01, duration: number = 100) {
        this.scene.cameras.main.shake(duration, intensity);
    }

    public whiteFlash(duration: number = 50) {
        this.scene.cameras.main.flash(duration, 255, 255, 255);
    }

    public squashAndStretch(target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image) {
        this.scene.tweens.add({
            targets: target,
            scaleX: target.scaleX * 1.5,
            scaleY: target.scaleY * 0.5,
            duration: 100,
            yoyo: true,
            ease: 'Sine.easeInOut',
        });
    }

    public damageNumber(x: number, y: number, amount: number) {
        const text = this.getDamageText();
        text
            .setText(amount.toString())
            .setPosition(x, y)
            .setAlpha(1)
            .setScale(1)
            .setVisible(true)
            .setActive(true)
            .setOrigin(0.5);

        this.scene.tweens.add({
            targets: text,
            y: y - 50,
            alpha: 0,
            duration: 800,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                text.setVisible(false).setActive(false);
            },
        });
    }

    private getDamageText(): Phaser.GameObjects.Text {
        if (this.damageTextPool.length < JuicePipeline.DAMAGE_TEXT_POOL_SIZE) {
            const text = this.scene.add
                .text(0, 0, '', this.damageTextStyle)
                .setVisible(false)
                .setActive(false)
                .setOrigin(0.5);
            this.damageTextPool.push(text);
            return text;
        }

        const text = this.damageTextPool[this.damageTextPoolIndex];
        this.damageTextPoolIndex =
            (this.damageTextPoolIndex + 1) % JuicePipeline.DAMAGE_TEXT_POOL_SIZE;
        this.scene.tweens.killTweensOf(text);
        return text;
    }

    private handleSceneShutdown() {
        if (this.hitStopTimer) {
            this.hitStopTimer.remove(false);
            this.hitStopTimer = undefined;
        }
        if (isHitStopped) {
            isHitStopped = false;
        }
        this.hitStopEndTime = 0;

        for (const text of this.damageTextPool) {
            text.destroy();
        }
        this.damageTextPool = [];
        this.damageTextPoolIndex = 0;
    }
}
