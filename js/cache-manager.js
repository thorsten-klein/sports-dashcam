/**
 * CacheManager - Handles IndexedDB storage for video recordings
 */
class CacheManager {
    constructor() {
        this.dbName = 'SportsDashcamDB';
        this.version = 1;
        this.db = null;
    }

    /**
     * Initialize the database
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Store for continuous recordings
                if (!db.objectStoreNames.contains('recordings')) {
                    const recordingStore = db.createObjectStore('recordings', { keyPath: 'id', autoIncrement: true });
                    recordingStore.createIndex('cameraId', 'cameraId', { unique: false });
                    recordingStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Store for tagged clips
                if (!db.objectStoreNames.contains('clips')) {
                    const clipStore = db.createObjectStore('clips', { keyPath: 'id' });
                    clipStore.createIndex('cameraId', 'cameraId', { unique: false });
                    clipStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

            };
        });
    }

    /**
     * Wrap a single IDBRequest in a Promise.
     */
    _req(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Store a recording frame/chunk
     */
    async storeRecordingChunk(cameraId, data, timestamp, type = 'blob') {
        if (!this.db) {
            console.error('Database not initialized');
            return;
        }

        const store = this.db.transaction(['recordings'], 'readwrite').objectStore('recordings');
        return this._req(store.add({ cameraId, data, timestamp, type }));
    }

    /**
     * Get recording chunks within a time range
     */
    async getRecordingChunks(cameraId, startTime, endTime) {
        if (!this.db) {
            console.error('Database not initialized');
            return [];
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['recordings'], 'readonly');
            const store = transaction.objectStore('recordings');
            const index = store.index('cameraId');

            const chunks = [];
            const range = IDBKeyRange.only(cameraId);

            const request = index.openCursor(range);
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const record = cursor.value;
                    if (record.timestamp >= startTime && record.timestamp <= endTime) {
                        chunks.push(record);
                    }
                    cursor.continue();
                } else {
                    resolve(chunks.sort((a, b) => a.timestamp - b.timestamp));
                }
            };
            request.onerror = () => {
                console.error('Error getting chunks:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Store a tagged clip
     */
    async storeClip(clipId, cameraId, data, metadata) {
        if (!this.db) return Promise.reject(new Error('Database not initialized'));

        const store = this.db.transaction(['clips'], 'readwrite').objectStore('clips');
        await this._req(store.put({ id: clipId, cameraId, data, metadata, timestamp: Date.now() }));
    }

    /**
     * Get a clip by ID. Returns null if not found or DB not ready.
     */
    async getClip(clipId) {
        if (!this.db) { console.error('Database not initialized'); return null; }
        return this._req(this.db.transaction(['clips'], 'readonly').objectStore('clips').get(clipId));
    }

    /**
     * Delete old recording chunks (keep only recent data)
     */
    async cleanOldRecordings(maxAge = 3600000) {
        if (!this.db) return;
        const cutoffTime = Date.now() - maxAge;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['recordings'], 'readwrite');
            const store = transaction.objectStore('recordings');
            const index = store.index('timestamp');

            const range = IDBKeyRange.upperBound(cutoffTime);
            const request = index.openCursor(range);

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete a clip. Throws if DB not ready.
     */
    async deleteClip(clipId) {
        if (!this.db) throw new Error('Database not initialized');
        await this._req(this.db.transaction(['clips'], 'readwrite').objectStore('clips').delete(clipId));
    }
}
