/**
 * FullVideoManager - Manages full video recordings metadata
 */
class FullVideoManager extends LocalStorageRepository {
    constructor() {
        super('videoTagger_fullVideos');
        this.fullVideos = this.loadFromStorage();
    }

    _getItems() { return this.fullVideos; }

    /**
     * Add an in-progress recording placeholder
     */
    addInProgressRecording(cameraId, cameraName, startTime) {
        const sessionId = `fullvideo_${cameraId}_${startTime}`;

        // Check if already exists
        const existingIndex = this.fullVideos.findIndex(v => v.id === sessionId);
        if (existingIndex !== -1) {
            return this.fullVideos[existingIndex];
        }

        // Format timestamp as YYYYMMDD-HHMMSS
        const formattedTime = Utils.formatTimestamp(new Date(startTime));

        const filename = `${cameraName}-${formattedTime}`;

        const inProgressVideo = {
            id: sessionId,
            cameraId,
            cameraName,
            filename: filename,
            timestamp: startTime,
            duration: 0,
            type: 'in-progress',
            isRecording: true,
            sessionId: sessionId
        };

        this.fullVideos.unshift(inProgressVideo);
        this.saveToStorage();
        return inProgressVideo;
    }

    /**
     * Update an in-progress recording to completed
     */
    updateInProgressToCompleted(sessionId, videoData) {
        const index = this.fullVideos.findIndex(v => v.id === sessionId);
        if (index === -1) return null;

        const existingVideo = this.fullVideos[index];

        // Update with actual data
        this.fullVideos[index] = {
            ...existingVideo,
            duration: videoData.duration,
            type: videoData.type,
            frameCount: videoData.frameCount,
            size: videoData.size || 0,
            mimeType: videoData.mimeType,
            isRecording: false,
            thumbnail: videoData.thumbnail
        };

        this.saveToStorage();
        return this.fullVideos[index];
    }

    /**
     * Add a full video
     */
    addFullVideo(cameraId, cameraName, videoData, startTime) {
        // Format timestamp as YYYYMMDD-HHMMSS
        const formattedTime = Utils.formatTimestamp(new Date(startTime));

        const filename = `${cameraName}-${formattedTime}`;

        const fullVideo = {
            id: videoData.sessionId,
            cameraId,
            cameraName,
            filename: filename,
            timestamp: startTime,
            duration: videoData.duration,
            type: videoData.type,
            frameCount: videoData.frameCount,
            size: videoData.size || 0,
            mimeType: videoData.mimeType,
            sessionId: videoData.sessionId,
            thumbnail: videoData.thumbnail
        };

        this.fullVideos.unshift(fullVideo); // Add to beginning
        this.saveToStorage();
        return fullVideo;
    }

    /**
     * Remove a full video
     */
    removeFullVideo(videoId) {
        this.fullVideos = this.fullVideos.filter(v => v.id !== videoId);
        this.saveToStorage();
    }

    /**
     * Get all full videos
     */
    getAllFullVideos() {
        return [...this.fullVideos];
    }

    /**
     * Get full videos count
     */
    getCount() {
        return this.fullVideos.length;
    }

    /**
     * Remove incomplete recordings (e.g., from interrupted sessions)
     */
    removeIncompleteRecordings() {
        const beforeCount = this.fullVideos.length;
        this.fullVideos = this.fullVideos.filter(v => !v.isRecording && v.type !== 'in-progress');
        const afterCount = this.fullVideos.length;

        if (beforeCount !== afterCount) {
            this.saveToStorage();
        }

        return beforeCount - afterCount;
    }

    /**
     * Clear all full videos - caller is responsible for user confirmation.
     */
    clearAll() {
        if (this.fullVideos.length === 0) return false;
        this.fullVideos = [];
        this.saveToStorage();
        return true;
    }
}
