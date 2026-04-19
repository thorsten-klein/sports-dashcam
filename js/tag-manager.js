/**
 * TagManager - Handles saved video tags/clips management and localStorage persistence
 */
class TagManager extends LocalStorageRepository {
    constructor() {
        super('videoTagger_tags');
        this.tags = this.loadFromStorage();
    }

    _getItems() { return this.tags; }

    generateId() { return super.generateId('tag'); }

    /**
     * Add a new tag/clip
     */
    addTag(cameraId, cameraName, clipData) {
        const tag = {
            id: this.generateId(),
            cameraId,
            cameraName,
            filename: clipData.filename,
            duration: clipData.duration,
            segments: clipData.segments,
            size: clipData.size,
            recordingMode: clipData.recordingMode || 'simulation',
            timestamp: new Date().toISOString(),
            note: clipData.note,
            clipId: clipData.clipId,
            isMjpeg: clipData.isMjpeg || false,
            frameCount: clipData.frameCount || 0,
            preTagDuration: clipData.preTagDuration,
            postTagDuration: clipData.postTagDuration,
            tagTimestamp: clipData.tagTimestamp,
            thumbnail: clipData.thumbnail,
            label: clipData.label
        };

        // Add to beginning of array (newest first)
        this.tags.unshift(tag);

        // Keep only last 100 tags to avoid localStorage overflow
        if (this.tags.length > 100) {
            this.tags = this.tags.slice(0, 100);
        }

        this.saveToStorage();
        return tag;
    }

    /**
     * Remove a tag by ID
     */
    removeTag(tagId) {
        this.tags = this.tags.filter(t => t.id !== tagId);
        this.saveToStorage();
    }

    /**
     * Get a tag by ID
     */
    getTag(tagId) {
        return this.tags.find(t => t.id === tagId);
    }

    /**
     * Update a tag by ID
     */
    updateTag(tagId, updates) {
        const index = this.tags.findIndex(t => t.id === tagId);
        if (index !== -1) {
            this.tags[index] = { ...this.tags[index], ...updates };
            this.saveToStorage();
            return this.tags[index];
        }
        return null;
    }

    /**
     * Get all tags
     */
    getAllTags() {
        return [...this.tags];
    }

    /**
     * Get tags for a specific camera
     */
    getTagsByCamera(cameraId) {
        return this.tags.filter(t => t.cameraId === cameraId);
    }

    /**
     * Clear all tags - caller is responsible for user confirmation.
     */
    clearAll() {
        this.tags = [];
        this.saveToStorage();
    }

    /**
     * Get tags count
     */
    getCount() {
        return this.tags.length;
    }

    /**
     * Get total storage used (in bytes)
     */
    getStorageSize() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? new Blob([data]).size : 0;
        } catch {
            return 0;
        }
    }
}
