export const TILE_SIZE = 16;

export enum TileType {
    WALL = 0,
    FLOOR = 1,
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
        return this.map[ty][tx] === TileType.FLOOR;
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
                if (this.map[checkY][checkX] !== TileType.FLOOR) return false;
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
}
