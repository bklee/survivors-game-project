import { defineQuery } from 'bitecs';
import { Position, Velocity, Player } from '../components';
import { world } from '../core/World';
import { globalStats } from '../core/PlayerStats';

// For simplicity, a very basic player state
export enum PlayerCharacter {
    RABBIT, // bunny hop
    BEAR, // dance range attack
    PANDA, // rolling dash
}

const playerQuery = defineQuery([Position, Velocity, Player]);

export class PlayerSystem {
    private character: PlayerCharacter = PlayerCharacter.RABBIT;
    private stateTime: number = 0;

    private keys: Record<string, boolean> = {};
    private isDashing: boolean = false;
    private dashCooldown: number = 0;

    constructor() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'ShiftLeft' && this.dashCooldown <= 0) {
                this.isDashing = true;
                this.dashCooldown = 2000;
                setTimeout(() => { this.isDashing = false; }, 300);
            }
        });
        window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    }

    public update(dt: number) {
        this.stateTime += dt;
        if (this.dashCooldown > 0) this.dashCooldown -= dt;

        let inputX = 0;
        let inputY = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) inputY -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) inputY += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) inputX -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) inputX += 1;

        const ents = playerQuery(world);
        for (let i = 0; i < ents.length; i++) {
            const eid = ents[i];
            let speed = 200;

            switch (this.character) {
                case PlayerCharacter.RABBIT:
                    const hopPhase = Math.sin(this.stateTime / 100);
                    speed = 200 + (hopPhase > 0 ? hopPhase * 100 : 0);
                    break;
                case PlayerCharacter.BEAR:
                    speed = 150;
                    break;
                case PlayerCharacter.PANDA:
                    speed = this.isDashing ? 600 : 180;
                    break;
            }

            speed *= globalStats.moveSpeedMult;

            const mag = Math.sqrt(inputX * inputX + inputY * inputY);
            if (mag > 0) {
                Velocity.x[eid] = (inputX / mag) * speed;
                Velocity.y[eid] = (inputY / mag) * speed;
            } else {
                Velocity.x[eid] = 0;
                Velocity.y[eid] = 0;
            }
        }
    }
}
