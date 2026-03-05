import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        // Background Image
        this.add.image(width / 2, height / 2, 'main_bg')
            .setDisplaySize(width, height);

        // START Button (Same style as GameOver RETRY)
        const startBtn = this.add.rectangle(width / 2, height / 2 + 150, 240, 70, 0x3d2b1f, 0.8)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(3, 0xffd700);

        this.add.text(width / 2, height / 2 + 150, 'START', {
            fontFamily: '"MedievalSharp", cursive',
            fontSize: '40px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        startBtn.on('pointerdown', () => {
            if (this.cache.audio.exists('select_bgm')) {
                this.sound.play('select_bgm', { volume: 0.5 }); // Quick sound feedback
            }

            // Unlock audio context
            const soundManager = this.sound as any;
            if (soundManager.context?.state === 'suspended') {
                soundManager.context.resume();
            }

            // Play select BGM if not already playing
            const isPlaying = this.sound.getAllPlaying().some(s => s.key === 'select_bgm');
            if (!isPlaying && this.cache.audio.exists('select_bgm')) {
                this.sound.play('select_bgm', { loop: true, volume: 0.4 });
            }

            // Transition to character select
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                this.scene.start('CharacterSelectScene');
            });
        });

        // Hover Effects
        startBtn.on('pointerover', () => {
            startBtn.setFillStyle(0x5a4030, 1);
            startBtn.setScale(1.05);
        });
        startBtn.on('pointerout', () => {
            startBtn.setFillStyle(0x3d2b1f, 0.8);
            startBtn.setScale(1);
        });

    }
}
