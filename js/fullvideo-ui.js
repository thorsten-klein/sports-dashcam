/**
 * FullVideoUI - UI controller for full video recordings sidebar
 * Requires: FullVideoManager, CacheManager
 */
class FullVideoUI {
    constructor(app) {
        this.app = app;
        this.fullVideoManager = app.fullVideoManager;
        this.cacheManager = app.cacheManager;
        this.fullVideosList = document.getElementById('fullVideosList');
        this.fullVideosEmpty = document.getElementById('fullVideosEmpty');
    }

    loadFullVideos() {
        // Clean up any incomplete recordings from previous interrupted sessions
        this.fullVideoManager.removeIncompleteRecordings();

        // Clear existing content
        this.fullVideosList.innerHTML = '';

        const fullVideos = this.fullVideoManager.getAllFullVideos();
        console.log('Loading full videos:', fullVideos.length);

        // Group videos by date
        const videosByDate = Utils.groupByDate(fullVideos);

        // Render videos with date separators
        videosByDate.forEach(group => {
            // Add date separator
            const separator = Utils.createDateSeparator(group.date);
            this.fullVideosList.appendChild(separator);

            // Add videos for this date
            group.items.forEach(video => {
                const videoItem = this.createFullVideoItem(video, false);
                this.fullVideosList.appendChild(videoItem);
            });
        });

        this.updateFullVideosEmptyState();

        // Generate missing thumbnails for full videos
        fullVideos.forEach(video => {
            if (!video.thumbnail) {
                this.app.tagUI.generateMissingThumbnail(video, 'fullvideo');
            }
        });
    }

    renderFullVideo(video, isInProgress = false) {
        const videoDate = Utils.getDateString(new Date(video.timestamp));
        Utils.renderItemIntoDateList(this.fullVideosList, videoDate, this.createFullVideoItem(video, isInProgress));
    }

    updateFullVideoItem(video) {
        const existingItem = document.getElementById(`fullvideo-${video.id}`);
        if (existingItem) {
            // Replace with updated version
            const updatedItem = this.createFullVideoItem(video, false);
            existingItem.replaceWith(updatedItem);
        }
    }

    createFullVideoItem(video, isInProgress = false) {
        const item = document.createElement('div');
        item.className = 'tag-item';
        item.id = `fullvideo-${video.id}`;

        // Add special styling for in-progress recordings
        if (isInProgress || video.isRecording) {
            item.style.borderLeft = '4px solid #f44336';
            item.style.backgroundColor = 'rgba(244, 67, 54, 0.05)';
        }

        const date = new Date(video.timestamp);
        const timeStr = Utils.formatTime(date);
        const dateStr = Utils.formatDate(date);

        let durationText, typeText, sizeText;

        if (isInProgress || video.isRecording) {
            // In-progress recording
            durationText = 'Recording...';
            typeText = 'Recording';
            sizeText = 'In Progress';

            item.innerHTML = `
                <div class="tag-thumbnail">
                    <img src="${video.thumbnail || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'90\'%3E%3Crect width=\'120\' height=\'90\' fill=\'%23E7E0EC\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-family=\'Arial\' font-size=\'14\' fill=\'%2349454F\'%3ELoading...%3C/text%3E%3C/svg%3E'}" alt="Thumbnail" />
                </div>
                <div class="tag-content">
                    <div class="tag-header">
                        <div class="tag-title" style="display: flex; align-items: center; gap: 8px;">
                            <span class="recording-dot-large" style="animation: pulse 1.5s infinite;"></span>
                            <span title="${Utils.escapeHtml(video.filename || video.cameraName)}">${Utils.escapeHtml(video.filename || video.cameraName)}</span>
                        </div>
                        <button class="tag-delete" data-video-id="${video.id}" title="Delete video" style="opacity: 0.5;" disabled>
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                    <div class="tag-info">
                        <div class="tag-info-row">
                            <span class="material-icons">schedule</span>
                            <span>${timeStr} - ${dateStr}</span>
                        </div>
                        <div class="tag-info-row">
                            <span class="material-icons">timer</span>
                            <span>${durationText}</span>
                        </div>
                        <div class="tag-info-row">
                            <span class="material-icons">storage</span>
                            <span>${sizeText}</span>
                        </div>
                    </div>
                </div>
            `;

            // Don't attach click event for in-progress videos
            return item;
        } else {
            // Completed recording
            const durationMin = Math.floor(video.duration / 60);
            const durationSec = Math.floor(video.duration % 60);
            durationText = `${durationMin}m ${durationSec}s`;

            typeText = video.type === 'mjpeg-full-video' ? 'MJPEG' : 'Video';
            sizeText = video.size ? Utils.formatBytes(video.size) : `${video.frameCount} frames`;

            item.innerHTML = `
                <div class="tag-thumbnail">
                    <img src="${video.thumbnail || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'90\'%3E%3Crect width=\'120\' height=\'90\' fill=\'%23E7E0EC\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-family=\'Arial\' font-size=\'14\' fill=\'%2349454F\'%3ELoading...%3C/text%3E%3C/svg%3E'}" alt="Thumbnail" />
                </div>
                <div class="tag-content">
                    <div class="tag-header">
                        <div class="tag-title" title="${Utils.escapeHtml(video.filename || video.cameraName)}">${Utils.escapeHtml(video.filename || video.cameraName)}</div>
                        <button class="tag-delete" data-video-id="${video.id}" title="Delete video">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                    <div class="tag-info">
                        <div class="tag-info-row">
                            <span class="material-icons">schedule</span>
                            <span>${timeStr} - ${dateStr}</span>
                        </div>
                        <div class="tag-info-row">
                            <span class="material-icons">timer</span>
                            <span>${durationText}</span>
                        </div>
                        <div class="tag-info-row">
                            <span class="material-icons">storage</span>
                            <span>${sizeText}</span>
                        </div>
                    </div>
                </div>
            `;

            // Attach delete event listener
            item.querySelector('.tag-delete').addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.removeFullVideo(video.id);
            });

            // Attach click event to open video player
            item.addEventListener('click', (e) => {
                if (e.target.closest('.tag-delete')) return;
                this.openFullVideoPlayer(video);
            });
        }

        return item;
    }

    async removeFullVideo(videoId) {
        // Get video info before deletion
        const videos = this.fullVideoManager.getAllFullVideos();
        const video = videos.find(v => v.id === videoId);
        const videoDate = video ? Utils.getDateString(new Date(video.timestamp)) : null;

        // Delete from cache
        try {
            await this.cacheManager.deleteClip(videoId);
            console.log('Deleted full video from cache:', videoId);
        } catch (error) {
            console.error('Error deleting full video from cache:', error);
        }

        // Remove from manager
        this.fullVideoManager.removeFullVideo(videoId);

        // Remove from DOM
        document.getElementById(`fullvideo-${videoId}`)?.remove();

        // Clean up empty date separator if needed
        if (videoDate) {
            Utils.cleanupEmptyDateSeparator(this.fullVideosList, videoDate);
        }

        this.updateFullVideosEmptyState();
    }

    async openFullVideoPlayer(video) {
        // Reuse the same video player logic as tags
        const fullVideoData = {
            clipId: video.sessionId,
            filename: video.filename || `${video.cameraName} - Full Recording`,
            timestamp: video.timestamp,
            cameraName: video.cameraName,
            duration: video.duration,
            isMjpeg: video.type === 'mjpeg-full-video'
        };

        await this.app.openVideoPlayer(fullVideoData);
    }

    updateFullVideosEmptyState() {
        const hasVideos = this.fullVideoManager.getCount() > 0;
        const clearAllContainer = document.getElementById('clearAllFullVideosContainer');

        if (hasVideos) {
            this.fullVideosEmpty.classList.add('hidden');
            this.fullVideosList.classList.remove('hidden');
            clearAllContainer.classList.remove('hidden');
        } else {
            this.fullVideosEmpty.classList.remove('hidden');
            this.fullVideosList.classList.add('hidden');
            clearAllContainer.classList.add('hidden');
        }
    }

    async clearAllFullVideos() {
        if (!confirm('Clear all full videos?')) return;
        const videos = this.fullVideoManager.getAllFullVideos();

        this.fullVideoManager.clearAll();

        // Delete all clips from cache
        for (const video of videos) {
            try {
                await this.cacheManager.deleteClip(video.sessionId);
                console.log('Deleted full video from cache:', video.sessionId);
            } catch (error) {
                console.error('Error deleting full video from cache:', error);
            }
        }

        this.fullVideosList.innerHTML = '';
        this.updateFullVideosEmptyState();
    }

    async deleteVideosByDate(dateString) {
        const videos = this.fullVideoManager.getAllFullVideos();
        const videosToDelete = videos.filter(video => {
            const videoDate = new Date(video.timestamp).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            return videoDate === dateString;
        });

        for (const video of videosToDelete) {
            if (video.videoId) {
                try {
                    await this.cacheManager.deleteClip(video.sessionId || video.id);
                } catch (error) {
                    console.error('Error deleting video from cache:', error);
                }
            }
            this.fullVideoManager.removeFullVideo(video.id);
            const videoElement = document.getElementById('fullVideosList').querySelector(`[data-video-id="${video.id}"]`);
            if (videoElement) {
                videoElement.remove();
            }
        }

        // Clean up the date separator
        Utils.cleanupEmptyDateSeparator(document.getElementById('fullVideosList'), dateString);
        this.updateFullVideosEmptyState();

        this.app.showToast(`Deleted ${videosToDelete.length} video${videosToDelete.length !== 1 ? 's' : ''} from ${dateString}`);
    }
}
