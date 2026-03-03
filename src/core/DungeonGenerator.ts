export const TILE_SIZE = 16;
export const MAP_WIDTH = 250; // 4000px
export const MAP_HEIGHT = 250; // 4000px

export enum TileType {
    WALL = 0,
    FLOOR = 1,
}

interface Room {
    x: number;
    y: number;
    w: number;
    h: number;
}

export class DungeonGenerator {
    public map: number[][] = [];
    private rooms: Room[] = [];

    constructor() {
        this.generate();
    }

    public generate() {
        // Initialize with walls
        this.map = Array(MAP_HEIGHT).fill(0).map(() => Array(MAP_WIDTH).fill(TileType.WALL));
        this.rooms = [];

        const numRooms = 15;
        const minSize = 8;
        const maxSize = 20;

        for (let i = 0; i < numRooms; i++) {
            const w = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
            const h = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
            let x = Math.floor(Math.random() * (MAP_WIDTH - w - 2)) + 1;
            let y = Math.floor(Math.random() * (MAP_HEIGHT - h - 2)) + 1;

            // Force first room to be exactly at the center
            if (i === 0) {
                x = Math.floor(MAP_WIDTH / 2) - Math.floor(w / 2);
                y = Math.floor(MAP_HEIGHT / 2) - Math.floor(h / 2);
            }

            const newRoom: Room = { x, y, w, h };
            
            let failed = false;
            // Don't check intersection for the first room
            if (i > 0) {
                for (const otherRoom of this.rooms) {
                    if (this.intersects(newRoom, otherRoom)) {
                        failed = true;
                        break;
                    }
                }
            }

            if (!failed) {
                this.createRoom(newRoom);
                if (this.rooms.length > 0) {
                    const prevRoom = this.rooms[this.rooms.length - 1];
                    this.createCorridor(prevRoom, newRoom);
                }
                this.rooms.push(newRoom);
            }
        }
    }

    private intersects(a: Room, b: Room): boolean {
        return (a.x <= b.x + b.w && a.x + a.w >= b.x &&
                a.y <= b.y + b.h && a.y + a.h >= b.y);
    }

    private createRoom(r: Room) {
        for (let y = r.y; y < r.y + r.h; y++) {
            for (let x = r.x; x < r.x + r.w; x++) {
                this.map[y][x] = TileType.FLOOR;
            }
        }
    }

    private createCorridor(r1: Room, r2: Room) {
        const cx1 = Math.floor(r1.x + r1.w / 2);
        const cy1 = Math.floor(r1.y + r1.h / 2);
        const cx2 = Math.floor(r2.x + r2.w / 2);
        const cy2 = Math.floor(r2.y + r2.h / 2);

        // Randomly start with horizontal or vertical
        if (Math.random() > 0.5) {
            this.createHCorridor(cx1, cx2, cy1);
            this.createVCorridor(cy1, cy2, cx2);
        } else {
            this.createVCorridor(cy1, cy2, cx1);
            this.createHCorridor(cx1, cx2, cy2);
        }
    }

    private createHCorridor(x1: number, x2: number, y: number) {
        const min = Math.min(x1, x2);
        const max = Math.max(x1, x2);
        for (let x = min; x <= max; x++) {
            // Make corridor 3 tiles wide for better movement
            if (this.map[y]) this.map[y][x] = TileType.FLOOR;
            if (this.map[y+1]) this.map[y+1][x] = TileType.FLOOR;
            if (this.map[y-1]) this.map[y-1][x] = TileType.FLOOR;
        }
    }

    private createVCorridor(y1: number, y2: number, x: number) {
        const min = Math.min(y1, y2);
        const max = Math.max(y1, y2);
        for (let y = min; y <= max; y++) {
            // 3 tiles wide
            if (this.map[y]) {
                this.map[y][x] = TileType.FLOOR;
                this.map[y][x+1] = TileType.FLOOR;
                this.map[y][x-1] = TileType.FLOOR;
            }
        }
    }

    public isFloor(xPixel: number, yPixel: number): boolean {
        const tx = Math.floor(xPixel / TILE_SIZE);
        const ty = Math.floor(yPixel / TILE_SIZE);
        if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return false;
        return this.map[ty][tx] === TileType.FLOOR;
    }

    public getRandomFloorPixel(): {x: number, y: number} {
        let tx, ty;
        let attempts = 0;
        do {
            tx = Math.floor(Math.random() * MAP_WIDTH);
            ty = Math.floor(Math.random() * MAP_HEIGHT);
            attempts++;
            if (attempts > 1000) {
                return { x: (MAP_WIDTH * TILE_SIZE) / 2, y: (MAP_HEIGHT * TILE_SIZE) / 2 };
            }
        } while (this.map[ty][tx] !== TileType.FLOOR);
        
        return {
            x: tx * TILE_SIZE + TILE_SIZE/2,
            y: ty * TILE_SIZE + TILE_SIZE/2
        };
    }

    public getFloorPixelNear(xPixel: number, yPixel: number, maxRadius: number): {x: number, y: number} {
        let tx, ty;
        let attempts = 0;
        
        const centerTx = Math.floor(xPixel / TILE_SIZE);
        const centerTy = Math.floor(yPixel / TILE_SIZE);
        const tileRadius = Math.floor(maxRadius / TILE_SIZE);

        do {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * tileRadius;
            tx = Math.floor(centerTx + Math.cos(angle) * r);
            ty = Math.floor(centerTy + Math.sin(angle) * r);
            
            tx = Math.max(0, Math.min(MAP_WIDTH - 1, tx));
            ty = Math.max(0, Math.min(MAP_HEIGHT - 1, ty));
            
            attempts++;
            if (attempts > 100) {
                return this.getRandomFloorPixel();
            }
        } while (this.map[ty][tx] !== TileType.FLOOR);
        
        return {
            x: tx * TILE_SIZE + TILE_SIZE/2,
            y: ty * TILE_SIZE + TILE_SIZE/2
        };
    }

}