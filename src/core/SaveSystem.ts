// using simple localStorage wrapped to simulate indexedDB style async
export type PlayerData = {
    alchemyEssence: number; // Replaced coins with lore-accurate currency
    unlockedSpells: string[];
    unlockedCharacters: string[];
    skillTreeNodes: {
        id: string;
        level: number;
    }[];
    alchemyEncyclopedia: {
        spellId: string;
        timesCasted: number;
    }[];
};

export class SaveSystem {
    private static DB_NAME = 'AlchemistsNight_DB';
    private static STORE_NAME = 'player_data';
    private static KEY = 'save_slot_1';
    private static dbPromise: Promise<IDBDatabase> | null = null;

    private static getDB(): Promise<IDBDatabase> {
        if (!this.dbPromise) {
            this.dbPromise = new Promise((resolve, reject) => {
                const request = indexedDB.open(this.DB_NAME, 1);
                
                request.onupgradeneeded = (event) => {
                    const db = (event.target as IDBOpenDBRequest).result;
                    if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                        db.createObjectStore(this.STORE_NAME);
                    }
                };

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }
        return this.dbPromise;
    }

    public static async save(data: PlayerData): Promise<void> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(this.STORE_NAME, 'readwrite');
                const store = tx.objectStore(this.STORE_NAME);
                const request = store.put(data, this.KEY);
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error('IndexedDB save failed, falling back to localStorage', e);
            localStorage.setItem(this.DB_NAME, JSON.stringify(data));
        }
    }

    public static async load(): Promise<PlayerData> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(this.STORE_NAME, 'readonly');
                const store = tx.objectStore(this.STORE_NAME);
                const request = store.get(this.KEY);
                
                request.onsuccess = () => {
                    if (request.result) {
                        resolve(request.result as PlayerData);
                    } else {
                        resolve(this.getDefaultData());
                    }
                };
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error('IndexedDB load failed, falling back to localStorage', e);
            const data = localStorage.getItem(this.DB_NAME);
            return data ? JSON.parse(data) : this.getDefaultData();
        }
    }

    public static getDefaultData(): PlayerData {
        return {
            alchemyEssence: 0,
            unlockedSpells: ['fireball', 'ice_nova', 'explosive_gas'], // Basic spells
            unlockedCharacters: ['fire_alchemist'],
            skillTreeNodes: [],
            alchemyEncyclopedia: [],
        };
    }
}
