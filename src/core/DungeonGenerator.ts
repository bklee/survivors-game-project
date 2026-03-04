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
        // Create an open Survivor-style arena (All Floor)
        this.map = Array(this.height).fill(0).map(() => Array(this.width).fill(TileType.FLOOR));

        // 1. Create solid wall boundary
        const BORDER_SIZE = 4;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (x < BORDER_SIZE || x >= this.width - BORDER_SIZE || y < BORDER_SIZE || y >= this.height - BORDER_SIZE) {
                    this.map[y][x] = TileType.WALL;
                }
            }
        }

        // 2. Scatter structural pillars/obstacles to make the map interesting
        // Number of pillars scales with map area
        const area = this.width * this.height;
        const numPillars = Math.floor(area * 0.004); 
        for (let i = 0; i < numPillars; i++) {
            const pw = Math.floor(Math.random() * 3) + 2; // Pillar width 2~4
            const ph = Math.floor(Math.random() * 3) + 2; // Pillar height 2~4
            const px = Math.floor(Math.random() * (this.width - 20)) + 10;
            const py = Math.floor(Math.random() * (this.height - 20)) + 10;

            // Keep the center absolutely clear for player spawn
            const cx = this.width / 2;
            const cy = this.height / 2;
            if (Math.abs(px - cx) < 30 && Math.abs(py - cy) < 30) {
                continue;
            }

            for (let y = py; y < py + ph; y++) {
                if (y >= this.height) continue;
                for (let x = px; x < px + pw; x++) {
                    if (x >= this.width) continue;
                    this.map[y][x] = TileType.WALL;
                }
            }
        }
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
