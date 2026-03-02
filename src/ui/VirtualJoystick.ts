import Phaser from 'phaser';

export class VirtualJoystick {
    private scene: Phaser.Scene;
    private x: number;
    private y: number;
    private radius: number;
    private background!: Phaser.GameObjects.Graphics;
    private thumb!: Phaser.GameObjects.Graphics;

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
        this.background = this.scene.add.graphics();
        this.background.lineStyle(4, 0x888888, 0.5);
        this.background.strokeCircle(this.x, this.y, this.radius);

        this.thumb = this.scene.add.graphics();
        this.thumb.fillStyle(0xcccccc, 0.8);
        this.thumb.fillCircle(this.x, this.y, this.radius / 2);
    }

    private setupInput() {
        this.scene.input.on('pointerdown', this.onPointerDown, this);
        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);
    }

    private onPointerDown(pointer: Phaser.Input.Pointer) {
        const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.x, this.y);
        if (dist < this.radius * 2) {
            this.isDown = true;
            this.updateThumbPosition(pointer);
        }
    }

    private onPointerMove(pointer: Phaser.Input.Pointer) {
        if (!this.isDown) return;
        this.updateThumbPosition(pointer);
    }

    private onPointerUp() {
        if (!this.isDown) return;
        this.isDown = false;
        this.vector.set(0, 0);
        this.thumb.clear();
        this.thumb.fillStyle(0xcccccc, 0.8);
        this.thumb.fillCircle(this.x, this.y, this.radius / 2);
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

        this.thumb.clear();
        this.thumb.fillStyle(0xcccccc, 0.8);
        this.thumb.fillCircle(thumbX, thumbY, this.radius / 2);

        // Calculate normalized vector for movement
        const angle = Math.atan2(thumbY - this.y, thumbX - this.x);
        const distanceRatio = Math.min(dist / this.radius, 1);

        this.vector.set(Math.cos(angle) * distanceRatio, Math.sin(angle) * distanceRatio);
    }
}
