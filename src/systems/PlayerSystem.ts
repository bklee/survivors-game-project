import { addComponent, defineQuery, hasComponent } from 'bitecs';
import { CharacterData } from '../constants/CharacterConfig';
import { Animation, Position, Velocity, Player } from '../components';
import { world } from '../core/World';
import { globalStats } from '../core/PlayerStats';

const playerQuery = defineQuery([Position, Velocity, Player]);

export class PlayerSystem {
    private charData: CharacterData;
    private stateTime: number = 0;

    private keys: Record<string, boolean> = {};
    private isDashing: boolean = false;
    private dashCooldown: number = 0;

    // 모바일 터치 입력 — 첫 터치 위치 = 가상 조이스틱 중심, 드래그 방향 = 이동
    private touchActive: boolean = false;
    private touchOriginX: number = 0;
    private touchOriginY: number = 0;
    private touchCurrentX: number = 0;
    private touchCurrentY: number = 0;

    constructor(charData: CharacterData) {
        this.charData = charData;
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'ShiftLeft' && this.dashCooldown <= 0) {
                this.isDashing = true;
                this.dashCooldown = 2000;
                setTimeout(() => {
                    this.isDashing = false;
                }, 300);
            }
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        const onTouchStart = (e: TouchEvent) => {
            const t = e.touches[0];
            if (!t) return;
            this.touchOriginX = t.clientX;
            this.touchOriginY = t.clientY;
            this.touchCurrentX = t.clientX;
            this.touchCurrentY = t.clientY;
            this.touchActive = true;
        };
        const onTouchMove = (e: TouchEvent) => {
            if (!this.touchActive) return;
            const t = e.touches[0];
            if (!t) return;
            this.touchCurrentX = t.clientX;
            this.touchCurrentY = t.clientY;
        };
        const onTouchEnd = (e: TouchEvent) => {
            if (e.touches.length === 0) this.touchActive = false;
        };
        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', onTouchEnd, { passive: true });
        window.addEventListener('touchcancel', onTouchEnd, { passive: true });
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

        // 모바일 터치 입력 — 키보드 입력 없을 때만 적용 (충돌 방지)
        if (inputX === 0 && inputY === 0 && this.touchActive) {
            const dx = this.touchCurrentX - this.touchOriginX;
            const dy = this.touchCurrentY - this.touchOriginY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const DEAD_ZONE = 20; // px — 미세한 떨림 무시
            if (dist > DEAD_ZONE) {
                inputX = dx / dist;
                inputY = dy / dist;
            }
        }

        const ents = playerQuery(world);
        for (let i = 0; i < ents.length; i++) {
            const eid = ents[i];

            if (!hasComponent(world, Animation, eid)) {
                addComponent(world, Animation, eid);
                Animation.frameStart[eid] = 0;
                Animation.frameEnd[eid] = 3;
                Animation.frameRate[eid] = 10;
                Animation.timer[eid] = 0;
            }

            let speed = this.isDashing ? 600 : this.charData.baseStats.speed;
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
