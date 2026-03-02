import { Scene } from 'phaser';

export class MainScene extends Scene {
    constructor() {
        super('MainScene');
    }

    create() {
        this.add
            .text(640, 360, "Alchemist's Night", {
                fontSize: '48px',
                color: '#ffffff',
            })
            .setOrigin(0.5);
    }
}
