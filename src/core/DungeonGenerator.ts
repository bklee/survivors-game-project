export const TILE_SIZE = 16;
export const MAP_WIDTH = 250; // 4000px
export const MAP_HEIGHT = 250; // 4000px

export enum TileType {
    WALL = 0,
    FLOOR = 1,
}


export class DungeonGenerator {
    public map: number[][] = [];

    constructor() {
        this.generate();
    }

    public generate() {
        // Create an open Survivor-style arena (All Floor)
        this.map = Array(MAP_HEIGHT).fill(0).map(() => Array(MAP_WIDTH).fill(TileType.FLOOR));

        // 1. Create solid wall boundary
        const BORDER_SIZE = 4;
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (x < BORDER_SIZE || x >= MAP_WIDTH - BORDER_SIZE || y < BORDER_SIZE || y >= MAP_HEIGHT - BORDER_SIZE) {
                    this.map[y][x] = TileType.WALL;
                }
            }
        }

        // 2. Scatter structural pillars/obstacles to make the map interesting
        const numPillars = 250;
        for (let i = 0; i < numPillars; i++) {
            const pw = Math.floor(Math.random() * 3) + 2; // Pillar width 2~4
            const ph = Math.floor(Math.random() * 3) + 2; // Pillar height 2~4
            const px = Math.floor(Math.random() * (MAP_WIDTH - 20)) + 10;
            const py = Math.floor(Math.random() * (MAP_HEIGHT - 20)) + 10;

            // Keep the center absolutely clear for player spawn
            const cx = MAP_WIDTH / 2;
            const cy = MAP_HEIGHT / 2;
            if (Math.abs(px - cx) < 30 && Math.abs(py - cy) < 30) {
                continue;
            }

            for (let y = py; y < py + ph; y++) {
                for (let x = px; x < px + pw; x++) {
                    this.map[y][x] = TileType.WALL;
                }
            }
        }
    }

    public isFloor(xPixel: number, yPixel: number): boolean {
        const tx = Math.floor(xPixel / TILE_SIZE);
        const ty = Math.floor(yPixel / TILE_SIZE);
        if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return false;
        return this.map[ty][tx] === TileType.FLOOR;
    }

    private hasClearance(tx: number, ty: number): boolean {
        if (tx <= 1 || tx >= MAP_WIDTH - 2 || ty <= 1 || ty >= MAP_HEIGHT - 2) return false;
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
            tx = Math.floor(Math.random() * MAP_WIDTH);
            ty = Math.floor(Math.random() * MAP_HEIGHT);
            attempts++;
            if (attempts > 1000) {
                return { x: (MAP_WIDTH * TILE_SIZE) / 2, y: (MAP_HEIGHT * TILE_SIZE) / 2 };
            }
        } while (!this.hasClearance(tx, ty));

        return {
            x: tx * TILE_SIZE + TILE_SIZE / 2,
            y: ty * TILE_SIZE + TILE_SIZE / 2
        };
    }

    public isFloorRect(xPixel: number, yPixel: number, width: number, height: number): boolean {
        const minX = Math.floor((xPixel - width / 2) / TILE_SIZE);
        const maxX = Math.floor((xPixel + width / 2) / TILE_SIZE);
        const minY = Math.floor((yPixel - height / 2) / TILE_SIZE);
        const maxY = Math.floor((yPixel + height / 2) / TILE_SIZE);

        for (let checkX = minX; checkX <= maxX; checkX++) {
            for (let checkY = minY; checkY <= maxY; checkY++) {
                if (checkX < 0 || checkX >= MAP_WIDTH || checkY < 0 || checkY >= MAP_HEIGHT) return false;
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

            tx = Math.max(0, Math.min(MAP_WIDTH - 1, tx));
            ty = Math.max(0, Math.min(MAP_HEIGHT - 1, ty));

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