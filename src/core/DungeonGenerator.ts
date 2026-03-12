import * as ROT from 'rot-js';

export const TILE_SIZE = 16;

export enum TileType {
    WALL = 0,
    FLOOR = 1,
    DOOR = 2,
    PILLAR = 3,
    OBSTACLE = 4,
}

export class DungeonGenerator {
    public map: number[][] = [];
    public width: number;
    public height: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.generate();
    }

    public generate() {
        // Initialize with all walls
        this.map = Array(this.height).fill(0).map(() => Array(this.width).fill(TileType.WALL));

        // Use rot-js Digger algorithm for premium random dungeon layouts
        const digger = new ROT.Map.Digger(this.width, this.height, {
            roomWidth: [4, 16],
            roomHeight: [4, 16],
            corridorLength: [2, 10],
            dugPercentage: 0.25
        });

        digger.create((x, y, value) => {
            if (value === 0) {
                this.map[y][x] = TileType.FLOOR;
            } else {
                this.map[y][x] = TileType.WALL;
            }
        });

        // Add Pillars to rooms with variety
        const rooms = digger.getRooms();
        rooms.forEach((room) => {
            const rw = room.getRight() - room.getLeft() + 1;
            const rh = room.getBottom() - room.getTop() + 1;
            const left = room.getLeft();
            const top = room.getTop();
            const right = room.getRight();
            const bottom = room.getBottom();

            // 70% chance to have any pillars at all
            if (Math.random() < 0.3) return;

            const patternRoll = Math.random();
            const centerX = Math.floor((left + right) / 2);
            const centerY = Math.floor((top + bottom) / 2);

            if (rw >= 7 && rh >= 7) {
                // Large Room Patterns
                if (patternRoll < 0.4) {
                    // Classic 2x2
                    this.map[centerY - 1][centerX - 1] = TileType.PILLAR;
                    this.map[centerY - 1][centerX + 1] = TileType.PILLAR;
                    this.map[centerY + 1][centerX - 1] = TileType.PILLAR;
                    this.map[centerY + 1][centerX + 1] = TileType.PILLAR;
                } else if (patternRoll < 0.7) {
                    // Cross pattern (3 pillars)
                    this.map[centerY][centerX] = TileType.PILLAR;
                    if (rh >= 9) {
                        this.map[centerY - 2][centerX] = TileType.PILLAR;
                        this.map[centerY + 2][centerX] = TileType.PILLAR;
                    }
                } else {
                    // Scattered (3-5 pillars)
                    const count = 3 + Math.floor(Math.random() * 3);
                    for (let i = 0; i < count; i++) {
                        const px = left + 1 + Math.floor(Math.random() * (rw - 2));
                        const py = top + 1 + Math.floor(Math.random() * (rh - 2));
                        if (this.map[py][px] === TileType.FLOOR) this.map[py][px] = TileType.PILLAR;
                    }
                }
            } else if (rw >= 5 && rh >= 5) {
                // Medium Room Patterns
                if (patternRoll < 0.5) {
                    // Solo Pillar
                    this.map[centerY][centerX] = TileType.PILLAR;
                } else {
                    // Horizontal or Vertical Pair
                    if (rw > rh) {
                        this.map[centerY][centerX - 1] = TileType.PILLAR;
                        this.map[centerY][centerX + 1] = TileType.PILLAR;
                    } else {
                        this.map[centerY - 1][centerX] = TileType.PILLAR;
                        this.map[centerY + 1][centerX] = TileType.PILLAR;
                    }
                }
            } else if (rw >= 4 && rh >= 4) {
                // Small Room: 30% chance of a solo pillar
                if (Math.random() < 0.3) {
                    this.map[centerY][centerX] = TileType.PILLAR;
                }
            }
        });

        // 1칸 너비의 좁은 미로를 2칸으로 확장 (사용자 요청)
        this.widenPaths();

        // Ensure boundary
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    this.map[y][x] = TileType.WALL;
                }
            }
        }
    }

    /**
     * 1칸 너비의 좁은 복도를 감지하여 2칸 너비로 확장합니다.
     */
    private widenPaths() {
        const changes: { x: number, y: number }[] = [];
        // 맵 내부를 순회하며 좁은 구간 확인
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.map[y][x] === TileType.FLOOR) {
                    // 1. 수평으로 좁은 길 (위아래가 벽)
                    if (this.map[y - 1][x] === TileType.WALL && this.map[y + 1][x] === TileType.WALL) {
                        // 아래쪽 벽을 허물어 2칸 확보
                        if (y + 1 < this.height - 1) {
                            changes.push({ x: x, y: y + 1 });
                        }
                    }
                    // 2. 수직으로 좁은 길 (좌우가 벽)
                    if (this.map[y][x - 1] === TileType.WALL && this.map[y][x + 1] === TileType.WALL) {
                        // 오른쪽 벽을 허물어 2칸 확보
                        if (x + 1 < this.width - 1) {
                            changes.push({ x: x + 1, y: y });
                        }
                    }
                }
            }
        }

        // 수집된 변경 사항 일괄 적용
        changes.forEach(p => {
            this.map[p.y][p.x] = TileType.FLOOR;
        });
    }





    public isFloor(xPixel: number, yPixel: number): boolean {
        const tx = Math.floor(xPixel / TILE_SIZE);
        const ty = Math.floor(yPixel / TILE_SIZE);
        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return false;
        return this.map[ty][tx] !== TileType.WALL;
    }

    private hasClearance(tx: number, ty: number): boolean {
        if (tx <= 1 || tx >= this.width - 2 || ty <= 1 || ty >= this.height - 2) return false;
        return this.map[ty][tx] === TileType.FLOOR &&
            this.map[ty - 1][tx] === TileType.FLOOR &&
            this.map[ty + 1][tx] === TileType.FLOOR &&
            this.map[ty][tx - 1] === TileType.FLOOR &&
            this.map[ty][tx + 1] === TileType.FLOOR &&
            this.map[ty - 1][tx - 1] === TileType.FLOOR &&
            this.map[ty - 1][tx + 1] === TileType.FLOOR &&
            this.map[ty + 1][tx - 1] === TileType.FLOOR &&
            this.map[ty + 1][tx + 1] === TileType.FLOOR;
    }

    public getRandomFloorPixel(): { x: number, y: number } {
        let tx, ty;
        let attempts = 0;
        do {
            tx = Math.floor(Math.random() * this.width);
            ty = Math.floor(Math.random() * this.height);
            attempts++;
            if (attempts > 2000) {
                return { x: (this.width * TILE_SIZE) / 2, y: (this.height * TILE_SIZE) / 2 };
            }
        } while (!this.hasClearance(tx, ty));

        return {
            x: tx * TILE_SIZE + TILE_SIZE / 2,
            y: ty * TILE_SIZE + TILE_SIZE / 2
        };
    }

    public isFloorRect(xPixel: number, yPixel: number, pw: number, ph: number): boolean {
        const minX = Math.floor((xPixel - pw / 2) / TILE_SIZE);
        const maxX = Math.floor((xPixel + pw / 2) / TILE_SIZE);
        const minY = Math.floor((yPixel - ph / 2) / TILE_SIZE);
        const maxY = Math.floor((yPixel + ph / 2) / TILE_SIZE);

        for (let checkX = minX; checkX <= maxX; checkX++) {
            for (let checkY = minY; checkY <= maxY; checkY++) {
                if (checkX < 0 || checkX >= this.width || checkY < 0 || checkY >= this.height) return false;
                
                const tile = this.map[checkY][checkX];
                if (tile === TileType.WALL) return false;
                
                if (tile === TileType.PILLAR) {
                    // 기둥의 베이스라인(+11px)과 캐릭터의 발 위치(yPixel + ph/2)를 비교하여 
                    // 시각적으로 기둥 뒤에 있을 때만 충돌 처리
                    const pillarBaseY = checkY * TILE_SIZE + 11;
                    const charGroundY = yPixel + (ph / 2);
                    if (charGroundY < pillarBaseY) return false;
                }
            }
        }
        return true;
    }

    public getFloorPixelNear(xPixel: number, yPixel: number, minRadius: number, maxRadius: number): { x: number, y: number } {
        let tx, ty;
        let attempts = 0;

        const centerTx = Math.floor(xPixel / TILE_SIZE);
        const centerTy = Math.floor(yPixel / TILE_SIZE);
        const minTileRadius = Math.floor(minRadius / TILE_SIZE);
        const maxTileRadius = Math.floor(maxRadius / TILE_SIZE);

        do {
            const angle = Math.random() * Math.PI * 2;
            const r = minTileRadius + Math.random() * (maxTileRadius - minTileRadius);
            tx = Math.floor(centerTx + Math.cos(angle) * r);
            ty = Math.floor(centerTy + Math.sin(angle) * r);

            tx = Math.max(0, Math.min(this.width - 1, tx));
            ty = Math.max(0, Math.min(this.height - 1, ty));

            attempts++;
            if (attempts > 500) {
                return this.getRandomFloorPixel();
            }
        } while (!this.hasClearance(tx, ty));

        return {
            x: tx * TILE_SIZE + TILE_SIZE / 2,
            y: ty * TILE_SIZE + TILE_SIZE / 2
        };
    }

    /**
     * 맵 가장자리에 벽으로 완전히 둘러싸인 비밀 방을 생성합니다.
     * 방 크기: 내부 6x5 (벽 포함 8x7)
     * 입구: 방 위쪽 벽 중앙에 1칸 문 위치
     * 문 밖에서 방까지 접근할 수 있도록 복도를 뚫어줍니다.
     * 
     * @returns 문 위치(픽셀), 방 내부 바닥 좌표들(픽셀)
     */
    public carveSecretRoom(): { doorPixel: { x: number; y: number }; floorPixels: { x: number; y: number }[] } {
        const roomW = 6; // 내부 폭
        const roomH = 5; // 내부 높이
        const BORDER = 6;

        let attempts = 0;
        let roomX = 0, roomY = 0; // Initialize to avoid 'used before assignment'
        let foundSpot = false;

        // Find a spot that is currently ALL WALLS to hide the room
        while (attempts < 50 && !foundSpot) {
            roomX = BORDER + Math.floor(Math.random() * (this.width - roomW - BORDER * 2));
            roomY = BORDER + Math.floor(Math.random() * (this.height - roomH - BORDER * 2));

            let allWalls = true;
            // Check a slightly larger area to ensure clearance around the room
            for (let dy = -2; dy <= roomH + 2; dy++) {
                for (let dx = -2; dx <= roomW + 2; dx++) {
                    const checkY = roomY + dy;
                    const checkX = roomX + dx;
                    if (checkY < 0 || checkY >= this.height || checkX < 0 || checkX >= this.width || this.map[checkY][checkX] !== TileType.WALL) {
                        allWalls = false;
                        break;
                    }
                }
                if (!allWalls) break;
            }
            if (allWalls) foundSpot = true;
            attempts++;
        }

        if (!foundSpot) {
            // Fallback to a fixed position if no suitable random spot is found
            roomX = Math.floor(this.width / 2) - Math.floor(roomW / 2);
            roomY = this.height - BORDER - roomH - 2;
            // Ensure fallback position is within bounds and clear
            for (let dy = -2; dy <= roomH + 2; dy++) {
                for (let dx = -2; dx <= roomW + 2; dx++) {
                    const checkY = roomY + dy;
                    const checkX = roomX + dx;
                    if (checkY < 0 || checkY >= this.height || checkX < 0 || checkX >= this.width) {
                        // Adjust if out of bounds
                        roomY = Math.max(BORDER, Math.min(this.height - BORDER - roomH - 2, roomY));
                        roomX = Math.max(BORDER, Math.min(this.width - BORDER - roomW - 2, roomX));
                        break;
                    }
                }
            }
        }

        // 방 외벽 (roomW+2 x roomH+2)
        for (let y = roomY - 1; y <= roomY + roomH; y++) {
            for (let x = roomX - 1; x <= roomX + roomW; x++) {
                this.map[y][x] = TileType.WALL;
            }
        }

        // 방 내부 바닥
        const floorPixels: { x: number; y: number }[] = [];
        for (let y = roomY; y < roomY + roomH; y++) {
            for (let x = roomX; x < roomX + roomW; x++) {
                this.map[y][x] = TileType.FLOOR;
                floorPixels.push({ x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 });
            }
        }

        // 문 위치: 방 윗벽 중앙에 2칸 뚫기 (도어 스프라이트가 32x32 이므로 2타일 차지)
        const doorTX = roomX + 2; // Adjusted to be fixed relative to roomX
        const doorTY = roomY - 1;
        this.map[doorTY][doorTX] = TileType.DOOR;
        this.map[doorTY][doorTX + 1] = TileType.DOOR;

        // 문 바깥에서부터 가장 가까운 기존 던전 바닥을 찾아 복도 뚫기 (BFS)
        const startX = doorTX;
        const startY = doorTY - 1;
        const queue: { x: number, y: number, path: { x: number, y: number }[] }[] = [{ x: startX, y: startY, path: [] }];
        const visited = new Set<string>();
        visited.add(`${startX},${startY}`);

        let connectionPath: { x: number, y: number }[] = [];
        let found = false;

        while (queue.length > 0) {
            const { x, y, path } = queue.shift()!;
            
            // 주변에 이미 뚫린 바닥이 있는지 확인 (현재 뚫고 있는 방/문 구역 제외)
            if (this.map[y][x] === TileType.FLOOR && (y < roomY - 1 || y > roomY + roomH || x < roomX - 1 || x > roomX + roomW)) {
                connectionPath = path;
                found = true;
                break;
            }

            const directions = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
            for (const { dx, dy } of directions) {
                const nx = x + dx;
                const ny = y + dy;
                // 맵 가장자리 2칸을 제외한 영역 탐색
                if (ny >= 2 && ny < this.height - 2 && nx >= 2 && nx < this.width - 2 && !visited.has(`${nx},${ny}`)) {
                    visited.add(`${nx},${ny}`);
                    queue.push({ x: nx, y: ny, path: [...path, { x: nx, y: ny }] });
                }
            }
            if (queue.length > 5000) break; // 탐색 범위를 5000으로 대폭 확장
        }

        // 경로를 따라 2칸 너비 복도 뚫기
        if (found) {
            // 1. 시작점 확실히 뚫기 (문 바로 앞)
            this.map[startY][startX] = TileType.FLOOR;
            this.map[startY][startX + 1] = TileType.FLOOR;

            // 2. BFS가 찾은 경로 따라가며 2칸 너비 복도 생성
            for (const p of connectionPath) {
                this.map[p.y][p.x] = TileType.FLOOR;
                // 진행 방향에 따라 수직/수평으로 2칸 확보
                if (p.x + 1 < this.width - 1) this.map[p.y][p.x + 1] = TileType.FLOOR;
                if (p.y + 1 < this.height - 1) this.map[p.y + 1][p.x] = TileType.FLOOR;
            }
        } else {
            // Fallback: 위로 직진 (시작점 포함)
            let cy = startY;
            while (cy > 2) {
                this.map[cy][startX] = TileType.FLOOR;
                this.map[cy][startX + 1] = TileType.FLOOR;
                if (this.map[cy - 1][startX] === TileType.FLOOR || this.map[cy][startX - 1] === TileType.FLOOR) break;
                cy--;
            }
        }

        return {
            doorPixel: {
                x: doorTX * TILE_SIZE + TILE_SIZE,            // Center of the 2-tile wide door (16*x + 16)
                y: doorTY * TILE_SIZE + TILE_SIZE / 2 + 8     // Adding 8 perfectly aligns the door top-left to doorTY*16
            },
            floorPixels
        };
    }
}
