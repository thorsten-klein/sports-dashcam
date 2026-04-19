/**
 * BaseRecorder - shared state and logic for MJPEG and regular video recording.
 *
 * Subclasses must implement:
 *   _startRecording()  — start the media capture loop
 *   _storeFullVideo(chunks, sessionId, startTime, endTime)  — assemble + store
 *   _storeClip(chunks, clipId, startTime, endTime)          — assemble + store clip
 */
class BaseRecorder {
    constructor(videoElement, cameraId, settings, cacheManager) {
        this.videoElement = videoElement;
        this.cameraId = cameraId;
        this.settings = settings;
        this.cacheManager = cacheManager;
        this.isRecording = false;
        this.segments = [];
        this.maxSegments = 0;
        this.segmentTimer = null;
        this.rotation = 0;
        this.mirrored = false;
        this.isMjpeg = false; // overridden by MjpegRecorder
        this._intervalMs = 2000; // overridden by each subclass
    }

    updateSettings(settings) {
        this.settings = settings;
        this.updateMaxSegments();
    }

    updateRotation(rotation, mirrored) {
        this.rotation = rotation || 0;
        this.mirrored = mirrored || false;
    }

    updateMaxSegments() {
        const totalBufferDuration = (this.settings.preTagDuration || 10) + (this.settings.postTagDuration || 2);
        this.maxSegments = Math.ceil((totalBufferDuration * 1000) / this._intervalMs);
    }

    async start() {
        if (this.isRecording) return;
        await this._startRecording();
        this.isRecording = true;
    }

    stop() {
        this.isRecording = false;
        if (this.segmentTimer) {
            clearTimeout(this.segmentTimer);
            clearInterval(this.segmentTimer);
            this.segmentTimer = null;
        }
    }

    /**
     * Apply rotation + mirroring transform to a 2D canvas context.
     * Call after ctx.translate(cx, cy).
     */
    applyCanvasTransform(ctx, sourceWidth, sourceHeight) {
        ctx.rotate((this.rotation * Math.PI) / 180);
        if (this.mirrored) ctx.scale(-1, 1);
        ctx.drawImage(this.videoElement, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
    }

    getSegmentsForTag() {
        return this.segments;
    }

    async createFullVideo(sessionId, startTime) {
        const endTime = Date.now();
        try {
            const chunks = await this.cacheManager.getRecordingChunks(this.cameraId, startTime, endTime);
            if (chunks.length === 0) return { success: false, error: 'No recording data available' };
            return await this._storeFullVideo(chunks, sessionId, startTime, endTime);
        } catch (error) {
            console.error('Error creating full video:', error);
            return { success: false, error: error.message };
        }
    }

    async createClipFromCache(tagTimestamp, clipId) {
        const startTime = tagTimestamp - (this.settings.preTagDuration || 10) * 1000;
        const endTime = tagTimestamp + (this.settings.postTagDuration || 2) * 1000;
        try {
            const chunks = await this.cacheManager.getRecordingChunks(this.cameraId, startTime, endTime);
            if (chunks.length === 0) return { success: false, error: 'No recording data available for this time range' };
            return await this._storeClip(chunks, clipId, startTime, endTime);
        } catch (error) {
            console.error('Error creating clip from cache:', error);
            return { success: false, error: error.message };
        }
    }
}

// ---------------------------------------------------------------------------

/**
 * VideoRecorder - MediaRecorder-based recording for regular video streams.
 */
class VideoRecorder extends BaseRecorder {
    constructor(videoElement, cameraId, settings, cacheManager) {
        super(videoElement, cameraId, settings, cacheManager);
        this.isMjpeg = false;
        this.segmentDuration = 2000; // ms per segment
        this._intervalMs = this.segmentDuration;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.rotationCanvas = null;
        this.updateMaxSegments();
    }

    async _startRecording() {
        try {
            let stream;
            if (this.rotation !== 0 || this.mirrored) {
                stream = await this._createRotatedCanvasStream();
            } else {
                stream = this.videoElement.captureStream
                    ? this.videoElement.captureStream()
                    : this.videoElement.mozCaptureStream();
            }

            if (!stream) {
                console.error('captureStream not supported for this stream');
                return;
            }

            const options = this._getMediaRecorderOptions();
            this.mediaRecorder = new MediaRecorder(stream, options);
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) this.recordedChunks.push(event.data);
            };
            this.mediaRecorder.onstop = async () => { await this._processSegment(); };
            this._startSegmentRecording();
        } catch (error) {
            console.error('MediaRecorder error:', error);
        }
    }

    stop() {
        super.stop();
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.rotationCanvas = null;
    }

    async _createRotatedCanvasStream() {
        const sourceWidth = this.videoElement.videoWidth || 640;
        const sourceHeight = this.videoElement.videoHeight || 480;

        this.rotationCanvas = document.createElement('canvas');
        const ctx = this.rotationCanvas.getContext('2d');

        if (this.rotation === 90 || this.rotation === 270) {
            this.rotationCanvas.width = sourceHeight;
            this.rotationCanvas.height = sourceWidth;
        } else {
            this.rotationCanvas.width = sourceWidth;
            this.rotationCanvas.height = sourceHeight;
        }

        const drawFrame = () => {
            if (!this.isRecording || !this.rotationCanvas) return;
            ctx.save();
            ctx.clearRect(0, 0, this.rotationCanvas.width, this.rotationCanvas.height);
            ctx.translate(this.rotationCanvas.width / 2, this.rotationCanvas.height / 2);
            this.applyCanvasTransform(ctx, sourceWidth, sourceHeight);
            ctx.restore();
            requestAnimationFrame(drawFrame);
        };
        drawFrame();
        return this.rotationCanvas.captureStream(30);
    }

    _getMediaRecorderOptions() {
        const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
        for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                return { mimeType };
            }
        }
        return {};
    }

    _startSegmentRecording() {
        if (!this.mediaRecorder) return;
        this.recordedChunks = [];
        this.mediaRecorder.start();
        this.segmentTimer = setTimeout(() => {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
                setTimeout(() => this._startSegmentRecording(), 100);
            }
        }, this.segmentDuration);
    }

    async _processSegment() {
        if (this.recordedChunks.length === 0) {
            return;
        }
        const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder.mimeType });
        const timestamp = Date.now();
        try {
            const id = await this.cacheManager.storeRecordingChunk(this.cameraId, blob, timestamp, 'video-chunk');
        } catch (error) {
            console.error('Error storing chunk to cache:', error);
        }
        this.segments.push({ blob, timestamp, duration: this.segmentDuration / 1000 });
        if (this.segments.length > this.maxSegments) this.segments.shift();
    }

    generateThumbnail(videoBlob) {
        return Utils.thumbnailFromVideoBlob(videoBlob);
    }

    async _storeFullVideo(chunks, sessionId, startTime, endTime) {
        const blobs = chunks.map(c => c.data);
        const combinedBlob = new Blob(blobs, { type: chunks[0].data.type });
        const duration = (endTime - startTime) / 1000;
        const thumbnail = await this.generateThumbnail(combinedBlob);
        await this.cacheManager.storeClip(sessionId, this.cameraId, combinedBlob, {
            type: 'full-video', duration, mimeType: combinedBlob.type, startTime, endTime, thumbnail
        });
        return { success: true, sessionId, type: 'full-video', duration, size: combinedBlob.size, mimeType: combinedBlob.type, thumbnail };
    }

    async _storeClip(chunks, clipId, startTime, endTime) {
        const blobs = chunks.map(c => c.data);
        const combinedBlob = new Blob(blobs, { type: chunks[0].data.type });
        const duration = (endTime - startTime) / 1000;
        const thumbnail = await this.generateThumbnail(combinedBlob);
        await this.cacheManager.storeClip(clipId, this.cameraId, combinedBlob, {
            startTime, endTime, duration, mimeType: combinedBlob.type, thumbnail
        });
        return { success: true, clipId, mimeType: combinedBlob.type, duration, thumbnail };
    }

    async getClipBlob() {
        if (this.segments.length === 0) return { success: false, error: 'No video segments available. Start recording first.' };
        try {
            const blobs = this.segments.map(s => s.blob);
            const combinedBlob = new Blob(blobs, { type: this.mediaRecorder.mimeType });
            return { success: true, blob: combinedBlob, mimeType: this.mediaRecorder.mimeType };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async saveClip() {
        if (this.segments.length === 0) return { success: false, error: 'No video segments available. Start recording first.' };
        const timestamp = Utils.formatTimestamp(new Date(), '_');
        return this._saveRealVideo(`video_${timestamp}_${this.cameraId}`);
    }

    async _saveRealVideo(filename) {
        try {
            const blobs = this.segments.map(s => s.blob);
            const combinedBlob = new Blob(blobs, { type: this.mediaRecorder.mimeType });
            const ext = combinedBlob.type.includes('mp4') ? 'mp4' : 'webm';
            const fullFilename = `${filename}.${ext}`;
            const url = URL.createObjectURL(combinedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fullFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 100);
            const durationSeconds = this.segments.reduce((sum, s) => sum + s.duration, 0);
            return { success: true, filename: fullFilename, size: combinedBlob.size, duration: durationSeconds.toFixed(1), segments: this.segments.length };
        } catch (error) {
            console.error('Error saving video:', error);
            return { success: false, error: error.message };
        }
    }
}

// ---------------------------------------------------------------------------

/**
 * MjpegRecorder - interval-based JPEG frame capture for MJPEG streams.
 */
class MjpegRecorder extends BaseRecorder {
    constructor(videoElement, cameraId, settings, cacheManager) {
        super(videoElement, cameraId, settings, cacheManager);
        this.isMjpeg = true;
        this.captureInterval = 67; // ~15 fps
        this._intervalMs = this.captureInterval;
        this.corsErrorLogged = false;
        this.updateMaxSegments();
    }

    async _startRecording() {
        this.segmentTimer = setInterval(async () => {
            try {
                const frameData = await this._captureFrame();
                const timestamp = Date.now();
                if (frameData) {
                    await this.cacheManager.storeRecordingChunk(this.cameraId, frameData, timestamp, 'mjpeg-frame');
                }
                this.segments.push({ timestamp, duration: this.captureInterval / 1000, mjpeg: true });
                if (this.segments.length > this.maxSegments) this.segments.shift();
            } catch (error) {
                if (!error.message || !error.message.includes('Tainted canvases')) {
                    console.error('Error in MJPEG capture loop:', error);
                }
            }
        }, this.captureInterval);
    }

    async _captureFrame() {
        try {
            const sourceWidth = this.videoElement.naturalWidth || this.videoElement.width || 640;
            const sourceHeight = this.videoElement.naturalHeight || this.videoElement.height || 480;
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (this.rotation === 90 || this.rotation === 270) {
                canvas.width = sourceHeight;
                canvas.height = sourceWidth;
            } else {
                canvas.width = sourceWidth;
                canvas.height = sourceHeight;
            }

            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            this.applyCanvasTransform(ctx, sourceWidth, sourceHeight);
            ctx.restore();

            return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85));
        } catch (error) {
            if (!this.corsErrorLogged) {
                console.warn('MJPEG frame capture blocked by CORS policy. Recording will track timing only.');
                console.warn('To enable frame capture, run the app from an HTTP server or configure CORS on the camera.');
                this.corsErrorLogged = true;
            }
            return null;
        }
    }

    generateThumbnail(frames) {
        if (!Array.isArray(frames) || frames.length === 0) return Promise.resolve(null);
        return Utils.thumbnailFromImageBlob(frames[0]);
    }

    async _storeFullVideo(chunks, sessionId, startTime, endTime) {
        const frames = chunks.map(c => c.data);
        const duration = (endTime - startTime) / 1000;
        const thumbnail = await this.generateThumbnail(frames);
        await this.cacheManager.storeClip(sessionId, this.cameraId, frames, {
            type: 'mjpeg-full-video', frameCount: frames.length, duration, startTime, endTime, thumbnail
        });
        return { success: true, sessionId, type: 'mjpeg-full-video', duration, frameCount: frames.length, thumbnail };
    }

    async _storeClip(chunks, clipId) {
        const frames = chunks.map(c => c.data);
        const duration = chunks.length * (this.captureInterval / 1000);
        const thumbnail = await this.generateThumbnail(frames);
        await this.cacheManager.storeClip(clipId, this.cameraId, frames, {
            type: 'mjpeg-sequence', frameCount: frames.length, duration, thumbnail
        });
        return { success: true, clipId, type: 'mjpeg-sequence', frameCount: frames.length, duration, thumbnail };
    }
}
