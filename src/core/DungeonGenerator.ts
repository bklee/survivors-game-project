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
            roomWidth: [4, 12],
            roomHeight: [4, 10],
            corridorLength: [2, 10],
            dugPercentage: 0.25
        });

        digger.create((x, y, value) => {
            // value: 0 for floor, 1 for wall in rot-js
            if (value === 0) {
                this.map[y][x] = TileType.FLOOR;
            } else {
                this.map[y][x] = TileType.WALL;
            }
        });

        // Add Pillars to rooms (similar to map_example3 style but randomized)
        const rooms = digger.getRooms();
        rooms.forEach((room) => {
            const left = room.getLeft();
            const top = room.getTop();
            const right = room.getRight();
            const bottom = room.getBottom();

            // Only add pillars to large enough rooms
            if (right - left > 5 && bottom - top > 5) {
                // Draw 2-4 pillars inside
                const centerX = Math.floor((left + right) / 2);
                const centerY = Math.floor((top + bottom) / 2);

                // Example: 2x2 pillars near center
                this.map[centerY - 1][centerX - 1] = TileType.PILLAR;
                this.map[centerY - 1][centerX + 1] = TileType.PILLAR;
                this.map[centerY + 1][centerX - 1] = TileType.PILLAR;
                this.map[centerY + 1][centerX + 1] = TileType.PILLAR;
            }
        });

        // Ensure boundary
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    this.map[y][x] = TileType.WALL;
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
                if (this.map[checkY][checkX] === TileType.WALL || this.map[checkY][checkX] === TileType.PILLAR) return false;
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

        // 문 바깥에서부터 가장 가까운 기존 던전 바닥을 찾아 복도 뚫기
        let cy = doorTY - 1;
        let cx = doorTX;
        let connected = false;

        // 위로 계속 뚫어보다가 끝까지 가면 안되니까 메인 바닥을 만날 때까지 일단 위로
        while (cy > 2) {
            this.map[cy][cx] = TileType.FLOOR;
            this.map[cy][cx + 1] = TileType.FLOOR; // 2칸 너비 복도

            // 바로 근처에 다른 뚫려있는 빈 공간(방/복도)이 있는지 확인 (현재 뚫고있는 복도 제외)
            if (cy - 1 >= 0 && (this.map[cy - 1][cx] === TileType.FLOOR || this.map[cy - 1][cx + 1] === TileType.FLOOR)) {
                connected = true;
                break;
            }
            if (cx - 1 >= 0 && this.map[cy][cx - 1] === TileType.FLOOR) {
                connected = true; break;
            }
            if (cx + 2 < this.width && this.map[cy][cx + 2] === TileType.FLOOR) {
                connected = true; break;
            }
            cy--;
        }

        // 만약 위로 쭉 뚫었는데도 연결을 못찾았다면 가로로 뚫어서라도 연결 (무조건 연결 보장)
        if (!connected) {
            let leftSearch = cx;
            let rightSearch = cx;
            while (leftSearch > 2 || rightSearch < this.width - 2) {
                if (leftSearch > 2) {
                    leftSearch--;
                    this.map[cy][leftSearch] = TileType.FLOOR;
                    if (this.map[cy - 1][leftSearch] === TileType.FLOOR || this.map[cy + 1][leftSearch] === TileType.FLOOR) break;
                }
                if (rightSearch < this.width - 2) {
                    rightSearch++;
                    this.map[cy][rightSearch] = TileType.FLOOR;
                    if (this.map[cy - 1][rightSearch] === TileType.FLOOR || this.map[cy + 1][rightSearch] === TileType.FLOOR) break;
                }
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
