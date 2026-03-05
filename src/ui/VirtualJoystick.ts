import Phaser from 'phaser';

export class VirtualJoystick {
    private scene: Phaser.Scene;
    private x: number;
    private y: number;
    private radius: number;
    private background!: Phaser.GameObjects.Graphics;
    private thumb!: Phaser.GameObjects.Graphics;
    private panel!: Phaser.GameObjects.Graphics;
    private activePointer: Phaser.Input.Pointer | null = null;
    public isDown: boolean = false;
    public vector: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);

    constructor(scene: Phaser.Scene, x: number, y: number, radius: number = 50) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.createJoysticGraphics();
        this.setupInput();
    }

    private createJoysticGraphics() {
        // Subtle background panel for the joystick area
        this.panel = this.scene.add.graphics();
        this.panel.fillStyle(0x000000, 0.3);
        this.panel.fillRoundedRect(this.x - this.radius * 2, this.y - this.radius * 1.5, this.radius * 4, this.radius * 3, 20);
        this.panel.lineStyle(2, 0xffffff, 0.1);
        this.panel.strokeRoundedRect(this.x - this.radius * 2, this.y - this.radius * 1.5, this.radius * 4, this.radius * 3, 20);
        this.panel.setScrollFactor(0);
        this.panel.setDepth(99);

        this.background = this.scene.add.graphics();
        this.background.lineStyle(6, 0xffffff, 0.2);
        this.background.strokeCircle(this.x, this.y, this.radius);
        this.background.lineStyle(2, 0xffffff, 0.4);
        this.background.strokeCircle(this.x, this.y, this.radius * 0.8);
        this.background.setScrollFactor(0);
        this.background.setDepth(100);

        this.thumb = this.scene.add.graphics();
        this.thumb.fillStyle(0x00ffff, 0.5);
        this.thumb.fillCircle(this.x, this.y, this.radius * 0.6);
        this.thumb.lineStyle(2, 0xffffff, 0.8);
        this.thumb.strokeCircle(this.x, this.y, this.radius * 0.6);
        this.thumb.setScrollFactor(0);
        this.thumb.setDepth(101);
    }

    private setupInput() {
        this.scene.input.on('pointerdown', this.onPointerDown, this);
        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);
    }

    private onPointerDown(pointer: Phaser.Input.Pointer) {
        if (this.activePointer) return;

        const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.x, this.y);
        if (dist < this.radius * 1.5) {
            this.isDown = true;
            this.activePointer = pointer;
            this.updateThumbPosition(pointer);
        }
    }

    private onPointerMove(pointer: Phaser.Input.Pointer) {
        if (!this.isDown || this.activePointer !== pointer) return;
        this.updateThumbPosition(pointer);
    }

    private onPointerUp(pointer: Phaser.Input.Pointer) {
        if (!this.isDown || this.activePointer !== pointer) return;
        this.isDown = false;
        this.activePointer = null;
        this.vector.set(0, 0);
        this.drawThumb(this.x, this.y);
    }

    private drawThumb(x: number, y: number) {
        this.thumb.clear();
        this.thumb.fillStyle(0x00ffff, 0.5);
        this.thumb.fillCircle(x, y, this.radius * 0.6);
        this.thumb.lineStyle(2, 0xffffff, 0.8);
        this.thumb.strokeCircle(x, y, this.radius * 0.6);
    }

    private updateThumbPosition(pointer: Phaser.Input.Pointer) {
        const dx = pointer.x - this.x;
        const dy = pointer.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let thumbX = pointer.x;
        let thumbY = pointer.y;

        if (dist > this.radius) {
            const angle = Math.atan2(dy, dx);
            thumbX = this.x + Math.cos(angle) * this.radius;
            thumbY = this.y + Math.sin(angle) * this.radius;
        }

        this.drawThumb(thumbX, thumbY);

        // Calculate normalized vector for movement
        const angle = Math.atan2(thumbY - this.y, thumbX - this.x);
        const distanceRatio = Math.min(dist / this.radius, 1);

        this.vector.set(Math.cos(angle) * distanceRatio, Math.sin(angle) * distanceRatio);
    }

    public setVisible(state: boolean) {
        if (this.panel) this.panel.setVisible(state);
        if (this.background) this.background.setVisible(state);
        if (this.thumb) this.thumb.setVisible(state);
    }
}
