export const TILE_SIZE = 16;

export enum TileType {
    WALL = 0,
    FLOOR = 1,
    DOOR = 2,
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
        const fillProbability = 0.40;
        this.map = Array(this.height).fill(0).map(() => Array(this.width).fill(TileType.FLOOR));

        // 1. Initial Random Fill
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    this.map[y][x] = TileType.WALL;
                } else {
                    this.map[y][x] = (Math.random() < fillProbability) ? TileType.WALL : TileType.FLOOR;
                }
            }
        }

        // 2. Cellular Automata Smoothing
        const numSteps = 5;
        for (let i = 0; i < numSteps; i++) {
            const nextMap = Array(this.height).fill(0).map(() => Array(this.width).fill(TileType.FLOOR));
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const wallCount = this.getSurroundingWallCount(x, y);
                    if (this.map[y][x] === TileType.WALL) {
                        nextMap[y][x] = wallCount >= 4 ? TileType.WALL : TileType.FLOOR;
                    } else {
                        nextMap[y][x] = wallCount >= 5 ? TileType.WALL : TileType.FLOOR;
                    }

                    // Enforce solid boundary
                    const BORDER = 4;
                    if (x < BORDER || x >= this.width - BORDER || y < BORDER || y >= this.height - BORDER) {
                        nextMap[y][x] = TileType.WALL;
                    }
                }
            }
            this.map = nextMap;
        }

        // 3. Clear the center to guarantee a safe starting spot
        const cx = Math.floor(this.width / 2);
        const cy = Math.floor(this.height / 2);
        for (let y = cy - 8; y <= cy + 8; y++) {
            for (let x = cx - 8; x <= cx + 8; x++) {
                if (y > 0 && y < this.height && x > 0 && x < this.width) {
                    this.map[y][x] = TileType.FLOOR;
                }
            }
        }
    }

    private getSurroundingWallCount(gridX: number, gridY: number): number {
        let wallCount = 0;
        for (let y = gridY - 1; y <= gridY + 1; y++) {
            for (let x = gridX - 1; x <= gridX + 1; x++) {
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    if (x !== gridX || y !== gridY) {
                        if (this.map[y][x] === TileType.WALL) {
                            wallCount++;
                        }
                    }
                } else {
                    wallCount++;
                }
            }
        }
        return wallCount;
    }

    public isFloor(xPixel: number, yPixel: number): boolean {
        const tx = Math.floor(xPixel / TILE_SIZE);
        const ty = Math.floor(yPixel / TILE_SIZE);
        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return false;
        return this.map[ty][tx] !== TileType.WALL;
    }

    private hasClearance(tx: number, ty: number): boolean {
        if (tx <= 1 || tx >= this.width - 2 || ty <= 1 || ty >= this.height - 2) return false;
        return this.map[ty][tx] !== TileType.WALL &&
            this.map[ty - 1][tx] !== TileType.WALL &&
            this.map[ty + 1][tx] !== TileType.WALL &&
            this.map[ty][tx - 1] !== TileType.WALL &&
            this.map[ty][tx + 1] !== TileType.WALL &&
            this.map[ty - 1][tx - 1] !== TileType.WALL &&
            this.map[ty - 1][tx + 1] !== TileType.WALL &&
            this.map[ty + 1][tx - 1] !== TileType.WALL &&
            this.map[ty + 1][tx + 1] !== TileType.WALL;
    }

    public getRandomFloorPixel(): { x: number, y: number } {
        let tx, ty;
        let attempts = 0;
        do {
            tx = Math.floor(Math.random() * this.width);
            ty = Math.floor(Math.random() * this.height);
            attempts++;
            if (attempts > 1000) {
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
                if (this.map[checkY][checkX] === TileType.WALL) return false;
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
            if (attempts > 100) {
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

        // 맵 하단 가장자리에 방 배치 (BORDER 안쪽에 들어가도록)
        const BORDER = 6;
        let roomX = BORDER + 2 + Math.floor(Math.random() * (this.width - roomW - BORDER * 2 - 4));
        let roomY = this.height - BORDER - roomH - 2;

        // 방 외벽 (roomW+2 x roomH+2)
        for (let y = roomY - 1; y <= roomY + roomH; y++) {
            for (let x = roomX - 1; x <= roomX + roomW; x++) {
                if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
                    this.map[y][x] = TileType.WALL;
                }
            }
        }

        // 방 내부 바닥
        const floorPixels: { x: number; y: number }[] = [];
        for (let y = roomY; y < roomY + roomH; y++) {
            for (let x = roomX; x < roomX + roomW; x++) {
                if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
                    this.map[y][x] = TileType.FLOOR;
                    floorPixels.push({
                        x: x * TILE_SIZE + TILE_SIZE / 2,
                        y: y * TILE_SIZE + TILE_SIZE / 2
                    });
                }
            }
        }

        // 문 위치: 방 윗벽 중앙에 2칸 뚫기 (도어 스프라이트가 32x32 이므로 2타일 차지)
        const doorTX = roomX + Math.floor(roomW / 2) - 1;
        const doorTY = roomY - 1;
        if (doorTY >= 0 && doorTY < this.height && doorTX >= 0 && doorTX + 1 < this.width) {
            this.map[doorTY][doorTX] = TileType.DOOR;
            this.map[doorTY][doorTX + 1] = TileType.DOOR;
        }

        // 문 위쪽으로 복도를 뚫어서 메인 던전과 연결 (최대 20타일)
        for (let cy = doorTY - 1; cy >= Math.max(0, doorTY - 20); cy--) {
            let reachedMain = false;
            if (doorTX >= 0 && doorTX + 1 < this.width && cy >= 0 && cy < this.height) {
                // 이미 메인 던전의 FLOOR에 도달하면 중단
                if (this.map[cy][doorTX] !== TileType.WALL || this.map[cy][doorTX + 1] !== TileType.WALL) {
                    reachedMain = true;
                }
                this.map[cy][doorTX] = TileType.FLOOR;
                this.map[cy][doorTX + 1] = TileType.FLOOR;
                // 복도 양옆은 벽이어야 자연스러움
                if (doorTX - 1 >= 0 && this.map[cy][doorTX - 1] !== TileType.WALL) {
                    reachedMain = true;
                }
                if (doorTX + 2 < this.width && this.map[cy][doorTX + 2] !== TileType.WALL) {
                    reachedMain = true;
                }
            }
            if (reachedMain) break;
        }

        return {
            doorPixel: {
                x: doorTX * TILE_SIZE + TILE_SIZE,            // Center of the 2-tile wide door (16*x + 16)
                y: doorTY * TILE_SIZE + TILE_SIZE / 2 + 8     // Shift down 8 pixels to align base with wall_top
            },
            floorPixels
        };
    }
}
