import Phaser from 'phaser';

export class AudioManager {
    private scene: Phaser.Scene;
    private bgm!: Phaser.Sound.BaseSound;
    private sfxPool: Map<string, Phaser.Sound.BaseSound[]> = new Map();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public playBGM(key: string) {
        if (this.bgm) {
            this.bgm.stop();
        }
        this.bgm = this.scene.sound.add(key, { loop: true, volume: 0.5 });
        this.bgm.play();
    }

    public playSFX(key: string, x: number, y: number) {
        // Implement spatial audio / distance-based attenuation
        const cx = this.scene.cameras.main.scrollX + this.scene.cameras.main.width / 2;
        const cy = this.scene.cameras.main.scrollY + this.scene.cameras.main.height / 2;

        const dist = Phaser.Math.Distance.Between(cx, cy, x, y);
        const maxDist = 800; // Beyond this distance, sound is barely audible

        let volume = 1 - dist / maxDist;
        if (volume < 0) volume = 0;

        // rudimentary priority system - don't play if too far
        if (volume < 0.1) return;

        this.scene.sound.play(key, { volume });
    }
}
