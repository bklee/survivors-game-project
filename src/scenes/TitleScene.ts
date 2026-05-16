import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        // Background Image
        this.add.image(width / 2, height / 2, 'main_bg').setDisplaySize(width, height);

        // Home Button (Top Left)
        const homeBtn = this.add
            .text(20, 20, '🏠 Home', {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '24px',
                color: '#ffffff',
                backgroundColor: '#00000088',
                padding: { x: 10, y: 5 },
            })
            .setInteractive({ useHandCursor: true });

        homeBtn.on('pointerdown', () => {
            window.location.href = 'https://games.blocktalker.co.kr/';
        });

        homeBtn.on('pointerover', () => homeBtn.setTint(0xffff00));
        homeBtn.on('pointerout', () => homeBtn.clearTint());

        // START Button (Same style as GameOver RETRY)
        const startBtn = this.add
            .rectangle(width / 2, height / 2 + 150, 240, 70, 0x3d2b1f, 0.8)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(3, 0xffd700);

        const startText = this.add
            .text(width / 2, height / 2 + 150, 'START', {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '40px',
                color: '#ffffff',
                fontStyle: 'bold',
            })
            .setOrigin(0.5);

        // Pulsing Animation to make it blink/attract attention
        this.tweens.add({
            targets: [startBtn, startText],
            alpha: 0.5,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

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
            const isPlaying = this.sound.getAllPlaying().some((s) => s.key === 'select_bgm');
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

        // SKILL TREE Button
        const skillBtn = this.add
            .rectangle(width / 2, height / 2 + 240, 240, 55, 0x1a2b3d, 0.8)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x4db8ff);

        this.add
            .text(width / 2, height / 2 + 240, '스킬 트리', {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '28px',
                color: '#4db8ff',
                fontStyle: 'bold',
            })
            .setOrigin(0.5);

        skillBtn.on('pointerdown', () => {
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                this.scene.start('SkillTreeScene');
            });
        });
        skillBtn.on('pointerover', () => {
            skillBtn.setFillStyle(0x253d52, 1);
            skillBtn.setScale(1.04);
        });
        skillBtn.on('pointerout', () => {
            skillBtn.setFillStyle(0x1a2b3d, 0.8);
            skillBtn.setScale(1);
        });

        // CODEX Button
        const codexBtn = this.add
            .rectangle(width / 2, height / 2 + 310, 240, 55, 0x2d1a3d, 0.8)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0xcc88ff);

        this.add
            .text(width / 2, height / 2 + 310, '시너지 도감', {
                fontFamily: '"MedievalSharp", cursive',
                fontSize: '28px',
                color: '#cc88ff',
                fontStyle: 'bold',
            })
            .setOrigin(0.5);

        codexBtn.on('pointerdown', () => {
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                this.scene.start('CodexScene');
            });
        });
        codexBtn.on('pointerover', () => {
            codexBtn.setFillStyle(0x3d2552, 1);
            codexBtn.setScale(1.04);
        });
        codexBtn.on('pointerout', () => {
            codexBtn.setFillStyle(0x2d1a3d, 0.8);
            codexBtn.setScale(1);
        });
    }
}
