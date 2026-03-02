export class SpatialHash {
    private cellSize: number;
    private cells: Map<string, number[]>;

    constructor(cellSize: number = 64) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    public insert(eid: number, x: number, y: number) {
        const key = this.getKey(x, y);
        if (!this.cells.has(key)) {
            this.cells.set(key, [eid]);
        } else {
            this.cells.get(key)!.push(eid);
        }
    }

    public remove(eid: number, x: number, y: number) {
        const key = this.getKey(x, y);
        const cell = this.cells.get(key);
        if (cell) {
            const idx = cell.indexOf(eid);
            if (idx > -1) {
                cell.splice(idx, 1);
            }
        }
    }

    public clear() {
        this.cells.clear();
    }

    public queryRect(x: number, y: number, w: number, h: number): number[] {
        const results: number[] = [];
        const minX = Math.floor((x - w / 2) / this.cellSize);
        const maxX = Math.floor((x + w / 2) / this.cellSize);
        const minY = Math.floor((y - h / 2) / this.cellSize);
        const maxY = Math.floor((y + h / 2) / this.cellSize);

        for (let i = minX; i <= maxX; i++) {
            for (let j = minY; j <= maxY; j++) {
                const key = `${i},${j}`;
                const cell = this.cells.get(key);
                if (cell) {
                    for (const eid of cell) {
                        if (!results.includes(eid)) {
                            results.push(eid);
                        }
                    }
                }
            }
        }

        return results;
    }

    private getKey(x: number, y: number): string {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        return `${cx},${cy}`;
    }
}
