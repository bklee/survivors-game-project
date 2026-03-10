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
        // Initialize with all walls
        this.map = Array(this.height).fill(0).map(() => Array(this.width).fill(TileType.WALL));

        // Use a 50x50 center portion for the example layout
        const ox = Math.floor(this.width / 2) - 25;
        const oy = Math.floor(this.height / 2) - 20;

        // --- ROOM A (Top Left) ---
        this.fillRect(ox + 5, oy + 5, 12, 8, TileType.FLOOR);

        // --- ROOM B (Top Center) ---
        this.fillRect(ox + 22, oy + 3, 10, 10, TileType.FLOOR);
        // Connect A to B
        this.fillRect(ox + 17, oy + 8, 5, 2, TileType.FLOOR);

        // --- ROOM C (Central Pillar Room) ---
        this.fillRect(ox + 15, oy + 18, 18, 12, TileType.FLOOR);
        // Connect B to C
        this.fillRect(ox + 26, oy + 13, 2, 5, TileType.FLOOR);
        // 4 Pillars in a row as seen in map_example3
        for (let i = 0; i < 4; i++) {
            this.map[oy + 24][ox + 19 + i * 3] = TileType.WALL;
        }

        // --- ROOM D (Long Path Right) ---
        this.fillRect(ox + 33, oy + 22, 10, 4, TileType.FLOOR); // Corridor
        this.fillRect(ox + 43, oy + 15, 12, 20, TileType.FLOOR); // Room D
        // Central block (black hole) in Room D
        this.fillRect(ox + 47, oy + 21, 4, 8, TileType.WALL);

        // --- ROOM E (Bottom Area) ---
        // Corridor through door (central room bottom)
        this.map[oy + 30][ox + 23] = TileType.DOOR;
        this.map[oy + 30][ox + 24] = TileType.DOOR;
        this.fillRect(ox + 21, oy + 31, 6, 8, TileType.FLOOR);

        // Room F (Bottom Left)
        this.fillRect(ox + 8, oy + 31, 10, 10, TileType.FLOOR);
        this.fillRect(ox + 18, oy + 35, 3, 2, TileType.FLOOR); // connection

        // Ensure boundary
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    this.map[y][x] = TileType.WALL;
                }
            }
        }
    }

    private fillRect(x: number, y: number, w: number, h: number, type: TileType) {
        for (let row = y; row < y + h; row++) {
            for (let col = x; col < x + w; col++) {
                if (row >= 0 && row < this.height && col >= 0 && col < this.width) {
                    this.map[row][col] = type;
                }
            }
        }
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
                y: doorTY * TILE_SIZE + TILE_SIZE / 2 + 8     // Adding 8 perfectly aligns the door top-left to doorTY*16
            },
            floorPixels
        };
    }
}
