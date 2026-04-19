/**
 * CameraManager - Handles camera CRUD operations and localStorage persistence
 */
class CameraManager extends LocalStorageRepository {
    constructor() {
        super('videoTagger_cameras');
        this.cameras = this.loadFromStorage();
    }

    _getItems() { return this.cameras; }

    generateId() { return super.generateId('camera'); }

    /**
     * Add a new camera
     */
    addCamera(name, url) {
        const camera = {
            id: this.generateId(),
            name,
            url,
            rotation: 0,  // 0, 90, 180, 270 degrees
            mirrored: false,  // Horizontal flip
            isConnected: true,  // Connection status
            isRecording: false,  // Recording status
            createdAt: new Date().toISOString()
        };

        this.cameras.push(camera);
        this.saveToStorage();
        return camera;
    }

    /**
     * Remove a camera by ID
     */
    removeCamera(cameraId) {
        this.cameras = this.cameras.filter(c => c.id !== cameraId);
        this.saveToStorage();
    }

    /**
     * Get a camera by ID
     */
    getCamera(cameraId) {
        return this.cameras.find(c => c.id === cameraId);
    }

    /**
     * Get all cameras
     */
    getAllCameras() {
        return [...this.cameras];
    }

    /**
     * Update camera properties
     */
    updateCamera(cameraId, updates) {
        const camera = this.getCamera(cameraId);
        if (camera) {
            Object.assign(camera, updates);
            this.saveToStorage();
            return camera;
        }
        return null;
    }

    /**
     * Clear all cameras
     */
    clearAll() {
        this.cameras = [];
        this.saveToStorage();
    }
}
