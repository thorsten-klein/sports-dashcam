/**
 * SportsDashcamApp - Main application controller
 * Requires: CameraManager, VideoRecorder, TagManager
 */
class SportsDashcamApp {
    static get TAG_COLORS() {
        return {
            'A': '#F44336', // red
            'B': '#2196F3', // blue
            'C': '#4CAF50', // green
            'D': '#FF9800', // orange
            'E': '#9C27B0', // purple
            'F': '#00BCD4', // cyan
            'G': '#FFEB3B', // yellow
            'H': '#E91E63', // pink
            'I': '#795548', // brown
            'J': '#607D8B'  // blue-grey
        };
    }

    constructor() {
        this.cameraManager = new CameraManager();
        this.tagManager = new TagManager();
        this.fullVideoManager = new FullVideoManager();
        this.cacheManager = new CacheManager();
        this.videoRecorders = new Map();
        this.recordingStartTimes = new Map();
        this.cameraConnections = new Map();
        this.cameraErrors = new Map();
        this.cameraReady = new Map();
        this.settingsController = new SettingsController(this);
        this.settings = this.settingsController.load();
        this.wakeLock = null;
        this.tagUI = new TagUI(this);
        this.fullVideoUI = new FullVideoUI(this);
        this.cameraController = new CameraController(this);
        this.hotkeyController = new HotkeyController(this);
        this.recordingController = new RecordingController(this);
        this.downloadAbortController = null;

        // Store the initialization promise so tests can wait for it
        this.ready = this.init();
    }

    async init() {
        try {
            // Initialize cache
            await this.cacheManager.init();

            this.initializeElements();
            this.attachEventListeners();
            this.tagUI.setupDateDeleteHandlers();
            this.cameraController.loadCameras();
            this.tagUI.loadTags();
            this.fullVideoUI.loadFullVideos();
            this.requestWakeLock();

            // Clean old recordings periodically
            setInterval(() => this.cacheManager.cleanOldRecordings(), 300000); // Every 5 minutes
        } catch (error) {
            console.error('Error initializing app:', error);
        }
    }

    initializeElements() {
        // Main elements
        this.emptyState = document.getElementById('emptyState');
        this.cameraGrid = document.getElementById('cameraGrid');
        this.addCameraCard = document.getElementById('addCameraCard');

        // Tags sidebar — DOM refs owned by TagUI
        this.tagsList = this.tagUI.tagsList;
        this.tagsEmpty = this.tagUI.tagsEmpty;

        // Full videos sidebar — DOM refs owned by FullVideoUI
        this.fullVideosEmpty = this.fullVideoUI.fullVideosEmpty;
        this.fullVideosList = this.fullVideoUI.fullVideosList;

        // Add Camera Dialog
        this.addCameraDialog = document.getElementById('addCameraDialog');
        this.cameraNameInput = document.getElementById('cameraName');
        this.cameraUrlInput = document.getElementById('cameraUrl');

        // Settings Dialog — DOM refs now owned by SettingsController
        this.settingsDialog = document.getElementById('settingsDialog');
        this.preTagDurationInput = this.settingsController.preTagInput;
        this.postTagDurationInput = this.settingsController.postTagInput;
        this.tagLabelCountInput = this.settingsController.tagLabelCountInput;

        // Camera Settings Dialog
        this.cameraSettingsDialog = document.getElementById('cameraSettingsDialog');

        // Video Player Dialog
        this.videoPlayerDialog = document.getElementById('videoPlayerDialog');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.currentVideoBlob = null;

        // Toast
        this.toastController = new ToastController();

        // Lock Screen
        this.lockScreenOverlay = document.getElementById('lockScreenOverlay');
        this.lockScreenGestureInfo = document.getElementById('lockScreenGestureInfo');
        this.isLocked = false;
    }

    attachEventListeners() {
        // Add Camera buttons
        document.getElementById('addFirstCamera').addEventListener('click', () => this.openAddCameraDialog());
        document.getElementById('addCameraCard').addEventListener('click', () => this.openAddCameraDialog());

        // Add Camera Dialog
        document.getElementById('closeAddDialog').addEventListener('click', () => this.closeAddCameraDialog());
        document.getElementById('cancelAddCamera').addEventListener('click', () => this.closeAddCameraDialog());
        document.getElementById('confirmAddCamera').addEventListener('click', () => this.cameraController.addCamera());

        // Settings Dialog
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettingsDialog());
        document.getElementById('cancelSettings').addEventListener('click', () => this.closeSettingsDialog());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        document.getElementById('preTagIncrease').addEventListener('click', () => this.adjustDuration('preTag', 1));
        document.getElementById('preTagDecrease').addEventListener('click', () => this.adjustDuration('preTag', -1));
        document.getElementById('postTagIncrease').addEventListener('click', () => this.adjustDuration('postTag', 1));
        document.getElementById('postTagDecrease').addEventListener('click', () => this.adjustDuration('postTag', -1));
        document.getElementById('tagLabelIncrease').addEventListener('click', () => this.adjustTagLabelCount(1));
        document.getElementById('tagLabelDecrease').addEventListener('click', () => this.adjustTagLabelCount(-1));

        // Settings Tabs
        document.getElementById('generalSettingsTab').addEventListener('click', () => this.switchSettingsTab('general'));
        document.getElementById('hotkeySettingsTab').addEventListener('click', () => this.switchSettingsTab('hotkey'));

        // Backup and Restore
        document.getElementById('backupSettings').addEventListener('click', () => this.backupSettings());
        document.getElementById('restoreSettings').addEventListener('click', () => this.openRestoreDialog());
        document.getElementById('restoreFileInput').addEventListener('change', (e) => this.restoreSettingsFromFile(e));

        // Hotkey Management
        document.getElementById('detectHotkey').addEventListener('click', () => {
            const selectedTag = this.hotkeyController.selectedTagForHotkey || 'A';
            this.hotkeyController.startHotkeyDetection(selectedTag);
        });
        document.getElementById('detectGesture').addEventListener('click', () => {
            const selectedTag = this.hotkeyController.selectedTagForHotkey || 'A';
            this.hotkeyController.startGestureDetection(selectedTag);
        });
        document.getElementById('cancelDetectHotkey').addEventListener('click', () => this.hotkeyController.cancelHotkeyDetection());
        document.getElementById('confirmDetectHotkey').addEventListener('click', () => this.hotkeyController.confirmHotkeyDetection());
        document.getElementById('cancelDetectGesture').addEventListener('click', () => this.hotkeyController.cancelGestureDetection());
        document.getElementById('resetHotkeys').addEventListener('click', () => this.hotkeyController.resetHotkeysToDefault());

        // Global hotkey and gesture listeners
        this.hotkeyController.setupGlobalHotkeyListeners();

        // Fullscreen button
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());

        // Lock screen
        document.getElementById('lockScreenBtn').addEventListener('click', () => this.lockScreen());
        document.getElementById('unlockBtn').addEventListener('click', () => this.unlockScreen());

        // Camera Settings Dialog
        document.getElementById('closeCameraSettingsDialog').addEventListener('click', () => this.cameraController.closeCameraSettingsDialog());
        document.getElementById('cancelCameraSettings').addEventListener('click', () => this.cameraController.closeCameraSettingsDialog());
        document.getElementById('saveCameraSettings').addEventListener('click', () => this.cameraController.saveCameraSettings());
        document.getElementById('rotateLeft').addEventListener('click', () => this.cameraController.rotateCamera(-90));
        document.getElementById('rotateRight').addEventListener('click', () => this.cameraController.rotateCamera(90));
        document.getElementById('mirrorButton').addEventListener('click', () => this.cameraController.toggleCameraMirror());

        // Close dialogs on overlay click
        this.addCameraDialog.addEventListener('click', (e) => {
            if (e.target === this.addCameraDialog) this.closeAddCameraDialog();
        });
        this.settingsDialog.addEventListener('click', (e) => {
            if (e.target === this.settingsDialog) this.closeSettingsDialog();
        });
        this.cameraSettingsDialog.addEventListener('click', (e) => {
            if (e.target === this.cameraSettingsDialog) this.cameraController.closeCameraSettingsDialog();
        });

        // Enter key handling
        this.cameraUrlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.cameraController.addCamera();
        });

        // Clear all tags
        document.getElementById('clearAllTags').addEventListener('click', async () => {
            await this.tagUI.clearAllTags();
        });

        // Clear all full videos
        document.getElementById('clearAllFullVideos').addEventListener('click', async () => {
            await this.fullVideoUI.clearAllFullVideos();
        });

        // Delete Date Dialog
        document.getElementById('closeDeleteDateDialog').addEventListener('click', () => this.tagUI.closeDeleteDateDialog());
        document.getElementById('cancelDeleteDate').addEventListener('click', () => this.tagUI.closeDeleteDateDialog());
        document.getElementById('confirmDeleteDate').addEventListener('click', () => this.confirmDeleteByDate());

        // Sidebar tabs
        document.getElementById('camerasTab').addEventListener('click', () => this.switchTab('cameras'));
        document.getElementById('tagsTab').addEventListener('click', () => this.switchTab('tags'));
        document.getElementById('fullVideosTab').addEventListener('click', () => this.switchTab('fullVideos'));

        // Start/Stop Recording button
        document.getElementById('startRecordingBtn').addEventListener('click', () => this.recordingController.toggleRecordingAll());

        // Tag buttons
        document.getElementById('tagButtonA').addEventListener('click', () => this.recordingController.tagAllRecordingCameras('A'));
        document.getElementById('tagButtonB').addEventListener('click', () => this.recordingController.tagAllRecordingCameras('B'));
        document.getElementById('tagButtonC').addEventListener('click', () => this.recordingController.tagAllRecordingCameras('C'));
        document.getElementById('tagButtonD').addEventListener('click', () => this.recordingController.tagAllRecordingCameras('D'));
        document.getElementById('tagButtonE').addEventListener('click', () => this.recordingController.tagAllRecordingCameras('E'));
        document.getElementById('tagButtonF').addEventListener('click', () => this.recordingController.tagAllRecordingCameras('F'));
        document.getElementById('tagButtonG').addEventListener('click', () => this.recordingController.tagAllRecordingCameras('G'));
        document.getElementById('tagButtonH').addEventListener('click', () => this.recordingController.tagAllRecordingCameras('H'));
        document.getElementById('tagButtonI').addEventListener('click', () => this.recordingController.tagAllRecordingCameras('I'));
        document.getElementById('tagButtonJ').addEventListener('click', () => this.recordingController.tagAllRecordingCameras('J'));

        // Tag category filters
        document.querySelectorAll('.tag-filter').forEach(filter => {
            filter.addEventListener('click', () => this.tagUI.toggleTagFilter(filter));
        });

        // Video Player Dialog
        document.getElementById('closeVideoPlayer').addEventListener('click', () => this.closeVideoPlayer());
        document.getElementById('closeVideoPlayerBtn').addEventListener('click', () => this.closeVideoPlayer());
        document.getElementById('downloadVideo').addEventListener('click', () => this.downloadCurrentVideo());
        document.getElementById('abortDownload').addEventListener('click', () => this.abortDownload());
        document.getElementById('deleteVideoPlayer').addEventListener('click', () => this.deleteCurrentVideo());
        this.videoPlayerDialog.addEventListener('click', (e) => {
            if (e.target === this.videoPlayerDialog) this.closeVideoPlayer();
        });

        // Listen for fullscreen changes (e.g., when user presses ESC)
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
    }


    loadSettings() { return this.settingsController.load(); }
    saveSettingsToStorage() { this.settingsController.saveToStorage(); }

    openAddCameraDialog() {
        // Ensure inputs are cleared before showing dialog
        this.cameraNameInput.value = '';
        this.cameraUrlInput.value = '';
        // Force a reflow to ensure the cleared values are committed
        void this.cameraNameInput.offsetHeight;
        void this.cameraUrlInput.offsetHeight;
        this.addCameraDialog.classList.add('active');
        // Focus the name input synchronously so the focus is set before any external
        // interaction (e.g. automated tests) starts filling inputs.  A delayed focus
        // races with fill() sequences and can steal focus mid-fill.
        this.cameraNameInput.focus();
    }

    closeAddCameraDialog() {
        this.addCameraDialog.classList.remove('active');
    }

    openSettingsDialog() { this.settingsController.open(); }
    closeSettingsDialog() { this.settingsController.close(); }
    adjustDuration(type, change) { this.settingsController.adjustDuration(type, change); }
    adjustTagLabelCount(change) { this.settingsController.adjustTagLabelCount(change); }

    toggleRecording(cameraId) { return this.recordingController.toggleRecording(cameraId); }
    updateTagButtonVisibility() { return this.recordingController.updateTagButtonVisibility(); }
    tagAllRecordingCameras(label) { return this.recordingController.tagAllRecordingCameras(label); }

    saveSettings() { this.settingsController.save(); }

    backupSettings() {
        // Collect all application data
        const backup = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            cameras: this.cameraManager.getAllCameras(),
            settings: this.settings
        };

        // Create JSON file
        const dataStr = JSON.stringify(backup, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        // Generate filename with timestamp
        const date = new Date();
        const filename = `sports-dashcam-backup-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}.json`;

        // Download the file
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);

        this.showToast('Settings backed up successfully');
    }

    openRestoreDialog() {
        document.getElementById('restoreFileInput').click();
    }

    async restoreSettingsFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const backup = JSON.parse(text);

            // Validate backup structure
            if (!backup.version || !backup.cameras || !backup.settings) {
                throw new Error('Invalid backup file format');
            }

            // Confirm restore
            if (!confirm('This will overwrite all settings, e.g. cameras and hotkeys. Continue?')) {
                event.target.value = ''; // Reset file input
                return;
            }

            // Restore cameras
            this.cameraManager.cameras = backup.cameras;
            this.cameraManager.saveToStorage();

            // Restore settings
            this.settings = backup.settings;
            this.saveSettingsToStorage();

            // Restore tags
            if (backup.tags) {
                this.tagManager.tags = backup.tags;
                this.tagManager.saveToStorage();
            }

            // Restore full videos
            // (intentionally skipped — existing full videos are preserved)

            this.showToast('Settings restored successfully. Reloading page...');

            // Reload page to apply changes
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error('Error restoring settings:', error);
            this.showToast('Failed to restore settings: ' + error.message);
        }

        // Reset file input
        event.target.value = '';
    }

    // ========== Settings Tabs ==========

    switchSettingsTab(tab) { this.settingsController.switchTab(tab); }

    showToast(message, duration = 3000) {
        this.toastController.show(message, duration);
    }

    escapeHtml(text) { return Utils.escapeHtml(text); }

    // ========== Tags Management ==========

    /**
     * Regenerate thumbnails for all tags and full videos
     * Useful for fixing missing thumbnails on existing videos
     * @param {boolean} force - If true, regenerate even if thumbnail already exists
     */
    async regenerateAllThumbnails(force = false) {

        const tags = this.tagManager.getAllTags();
        const fullVideos = this.fullVideoManager.getAllFullVideos();

        let tagsProcessed = 0;
        let tagsSuccess = 0;
        let tagsSkipped = 0;
        let tagsFailed = 0;
        let videosProcessed = 0;
        let videosSuccess = 0;
        let videosSkipped = 0;
        let videosFailed = 0;

        // Process tags
        for (const tag of tags) {
            tagsProcessed++;
            if (!force && tag.thumbnail) {
                tagsSkipped++;
                continue;
            }

            // Temporarily clear thumbnail if forcing regeneration
            if (force && tag.thumbnail) {
                tag.thumbnail = null;
            }

            await this.tagUI.generateMissingThumbnail(tag, 'tag');

            // Check if thumbnail was generated
            const updatedTag = this.tagManager.getTag(tag.id);
            if (updatedTag && updatedTag.thumbnail) {
                tagsSuccess++;
            } else {
                tagsFailed++;
            }
        }

        // Process full videos
        for (const video of fullVideos) {
            videosProcessed++;
            if (!force && video.thumbnail) {
                videosSkipped++;
                continue;
            }

            // Temporarily clear thumbnail if forcing regeneration
            if (force && video.thumbnail) {
                video.thumbnail = null;
            }

            await this.tagUI.generateMissingThumbnail(video, 'fullvideo');

            // Check if thumbnail was generated
            const videos = this.fullVideoManager.getAllFullVideos();
            const updatedVideo = videos.find(v => v.id === video.id);
            if (updatedVideo && updatedVideo.thumbnail) {
                videosSuccess++;
            } else {
                videosFailed++;
            }
        }

        const report = `
Thumbnail Regeneration Complete:
  Tags: ${tagsSuccess} generated, ${tagsSkipped} skipped, ${tagsFailed} failed (${tagsProcessed} total)
  Videos: ${videosSuccess} generated, ${videosSkipped} skipped, ${videosFailed} failed (${videosProcessed} total)
        `;

        alert(report);

        // Reload the UI to show updated thumbnails
        this.tagUI.loadTags();
        this.fullVideoUI.loadFullVideos();

        return {
            tags: { processed: tagsProcessed, success: tagsSuccess, skipped: tagsSkipped, failed: tagsFailed },
            videos: { processed: videosProcessed, success: videosSuccess, skipped: videosSkipped, failed: videosFailed }
        };
    }


    async confirmDeleteByDate() {
        if (!this.tagUI.deleteDateValue || !this.tagUI.deleteDateType) return;

        const date = this.tagUI.deleteDateValue;
        const type = this.tagUI.deleteDateType;

        this.tagUI.closeDeleteDateDialog();

        if (type === 'tags') {
            await this.tagUI.deleteTagsByDate(date);
        } else if (type === 'videos') {
            await this.fullVideoUI.deleteVideosByDate(date);
        }
    }

    // ========== Wake Lock & Fullscreen ==========

    /**
     * Request wake lock to prevent screen from sleeping
     */
    async requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');

                this.wakeLock.addEventListener('release', () => {
                });

                // Re-request wake lock when page becomes visible again
                document.addEventListener('visibilitychange', async () => {
                    if (document.visibilityState === 'visible' && this.wakeLock !== null) {
                        try {
                            this.wakeLock = await navigator.wakeLock.request('screen');
                        } catch (err) {
                            console.error('Failed to re-acquire wake lock:', err);
                        }
                    }
                });
            } else {
                console.warn('Wake Lock API not supported');
            }
        } catch (err) {
            console.error('Wake Lock error:', err);
        }
    }

    /**
     * Toggle fullscreen mode
     */
    async toggleFullscreen() {
        try {
            if (!document.fullscreenElement) {
                // Enter fullscreen
                await document.documentElement.requestFullscreen();
            } else {
                // Exit fullscreen
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error('Fullscreen error:', err);
        }
    }

    /**
     * Handle fullscreen state changes
     */
    handleFullscreenChange() {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const icon = fullscreenBtn.querySelector('.material-icons');

        if (document.fullscreenElement) {
            icon.textContent = 'fullscreen_exit';
            fullscreenBtn.title = 'Exit Fullscreen';
        } else {
            icon.textContent = 'fullscreen';
            fullscreenBtn.title = 'Toggle Fullscreen';
        }
    }

    /**
     * Lock the screen - prevent all interactions except gestures and unlock button
     */
    lockScreen() {
        this.isLocked = true;
        this.lockScreenOverlay.classList.add('active');
        this.lockScreenGestureInfo.textContent = '';

        // Add gesture listeners when locked
        document.addEventListener('mousedown', this.hotkeyController.gestureHandlers.mousedown);
        document.addEventListener('mouseup', this.hotkeyController.gestureHandlers.mouseup);
        document.addEventListener('touchstart', this.hotkeyController.gestureHandlers.touchstart, { passive: false }); // Not passive so we can preventDefault
        document.addEventListener('touchend', this.hotkeyController.gestureHandlers.touchend, { passive: true });

    }

    /**
     * Unlock the screen
     */
    unlockScreen() {
        this.isLocked = false;
        this.lockScreenOverlay.classList.remove('active');
        this.lockScreenGestureInfo.textContent = '';

        // Remove gesture listeners when unlocked
        document.removeEventListener('mousedown', this.hotkeyController.gestureHandlers.mousedown);
        document.removeEventListener('mouseup', this.hotkeyController.gestureHandlers.mouseup);
        document.removeEventListener('touchstart', this.hotkeyController.gestureHandlers.touchstart);
        document.removeEventListener('touchend', this.hotkeyController.gestureHandlers.touchend);

        console.log('🔓 Screen unlocked - gesture detection disabled');
    }

    /**
     * Show gesture detection info on lock screen
     */
    showLockScreenGestureInfo(message) {
        if (!this.isLocked) return;

        this.lockScreenGestureInfo.textContent = message;
        this.lockScreenGestureInfo.style.opacity = '1';

        // Fade out after 2 seconds
        setTimeout(() => {
            this.lockScreenGestureInfo.style.opacity = '0.6';
        }, 2000);
    }

    /**
     * Format hotkey for display
     */
    formatHotkeyDisplay(hotkey) {
        if (hotkey.type === 'keyboard') {
            const parts = [];
            if (hotkey.ctrlKey) parts.push('Ctrl');
            if (hotkey.altKey) parts.push('Alt');
            if (hotkey.shiftKey) parts.push('Shift');
            if (hotkey.metaKey) parts.push('Meta');
            parts.push(hotkey.key.toUpperCase());
            return parts.join('+');
        } else if (hotkey.type === 'gesture') {
            if (hotkey.gestureType === 'swipe') {
                return `Swipe ${hotkey.direction}`;
            } else if (hotkey.gestureType === 'multitap') {
                return `${hotkey.taps} Taps`;
            } else if (hotkey.gestureType === 'longpress') {
                return 'Long Press';
            }
        }
        return 'Unknown';
    }

    // ========== Video Player ==========

    buildSpeedControlPanelHTML(prefix) {
        return `
            <div style="position: relative;">
                <button id="${prefix}SpeedBtn" class="mjpeg-control-btn" title="Playback speed" style="min-width: 60px; font-size: 12px; font-weight: bold;">
                    <span id="${prefix}SpeedLabel">1.0x</span>
                </button>
                <div class="speed-control-panel hidden" id="${prefix}SpeedPanel" style="position: absolute; bottom: 100%; left: 0; margin-bottom: 8px; background: rgba(0,0,0,0.95); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 1000; min-width: 300px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span style="font-size: 14px; font-weight: 500; color: white;">Playback Speed</span>
                        <button id="${prefix}SpeedReset" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; color: white; font-size: 11px; padding: 4px 8px; cursor: pointer; transition: all 0.2s;">Reset</button>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <button class="mjpeg-control-btn" id="${prefix}SpeedDecrease" style="width: 32px; height: 32px;">
                            <span class="material-icons" style="font-size: 18px;">remove</span>
                        </button>
                        <div style="flex: 1; position: relative;">
                            <div id="${prefix}SliderTrack" style="height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; position: relative; overflow: hidden;">
                                <div id="${prefix}SliderFill" style="height: 100%; background: #4CAF50; width: 44.4%; transition: width 0.1s;"></div>
                            </div>
                            <input type="range" id="${prefix}SpeedSlider" min="0.2" max="2" step="0.1" value="1" style="position: absolute; top: -3px; left: 0; width: 100%; height: 12px; opacity: 0; cursor: pointer;">
                            <div id="${prefix}SliderThumb" style="position: absolute; top: -3px; left: 44.4%; transform: translateX(-50%); width: 12px; height: 12px; background: white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3); pointer-events: none; transition: left 0.1s;"></div>
                        </div>
                        <button class="mjpeg-control-btn" id="${prefix}SpeedIncrease" style="width: 32px; height: 32px;">
                            <span class="material-icons" style="font-size: 18px;">add</span>
                        </button>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 8px;">
                        <span>0.2x</span>
                        <span>2.0x</span>
                    </div>
                    <div style="text-align: center; font-size: 16px; font-weight: 500; color: #4CAF50;" id="${prefix}SpeedValue">1.0x</div>
                </div>
            </div>`;
    }

    async openVideoPlayer(tag) {
        if (!tag.clipId) {
            console.warn('No clip ID available for this tag');
            return;
        }

        this.currentVideoBlob = tag;

        // Update title with category badge
        const titleElement = document.getElementById('videoPlayerTitle');
        const category = tag.label || 'A';
        const categoryColor = SportsDashcamApp.TAG_COLORS[category] || '#999';

        titleElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div class="tag-category-indicator" style="background-color: ${categoryColor};" title="Category ${category}">
                    ${category}
                </div>
                <span>${Utils.escapeHtml(tag.filename)}</span>
            </div>
        `;

        const date = new Date(tag.timestamp);
        const playerContent = document.querySelector('.video-player-content');

        // Show loading
        playerContent.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="spinner"></div>
                <p>Loading clip...</p>
            </div>
        `;
        this.videoPlayerDialog.classList.add('active');

        try {
            // Load clip from cache
            const clip = await this.cacheManager.getClip(tag.clipId);

            if (!clip) {
                playerContent.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <p>Clip not found in cache</p>
                    </div>
                `;
                return;
            }

            if (tag.isMjpeg && (clip.metadata.type === 'mjpeg-sequence' || clip.metadata.type === 'mjpeg-full-video')) {
                // Show MJPEG sequence player
                this.renderMjpegPlayer(clip, tag, date, playerContent);
            } else {
                // Show regular video player
                const videoUrl = URL.createObjectURL(clip.data);
                playerContent.innerHTML = `
                    <div style="position: relative; background: #000; border-radius: 8px;">
                        <video id="videoPlayer" controls autoplay style="width: 100%; max-height: 70vh; background: #000; border-radius: 8px 8px 0 0;">
                            Your browser does not support video playback.
                        </video>
                        <div style="background: rgba(0,0,0,0.8); padding: 12px; border-radius: 0 0 8px 8px; color: white; display: flex; align-items: center; gap: 12px;">
                            ${this.buildSpeedControlPanelHTML('video')}
                        </div>
                    </div>
                    <div class="video-player-info">
                        <p><strong>Camera:</strong> ${Utils.escapeHtml(tag.cameraName)}</p>
                        <p><strong>Time:</strong> ${Utils.formatTime(date)} - ${Utils.formatDate(date)}</p>
                        <p><strong>Duration:</strong> ${tag.duration}s${tag.preTagDuration !== undefined ? ` (-${tag.preTagDuration}s / +${tag.postTagDuration}s)` : ''}</p>
                    </div>
                `;
                this.videoPlayer = document.getElementById('videoPlayer');
                this.videoPlayer.src = videoUrl;

                // Setup speed control for regular video
                this.setupVideoSpeedControl();
            }
        } catch (error) {
            console.error('Error loading clip:', error);
            playerContent.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <p>Error loading clip: ${error.message}</p>
                </div>
            `;
        }
    }

    renderMjpegPlayer(clip, tag, date, playerContent) {
        const frames = clip.data;
        let currentFrame = 0;
        // Use actual duration from clip metadata (67ms per frame)
        const duration = clip.metadata.duration || (frames.length * 0.067);

        playerContent.innerHTML = `
            <div id="mjpegPlayerContainer" style="position: relative; background: #000;">
                <img id="mjpegPlayer" style="width: 100%; max-height: 70vh; object-fit: contain; background: #000; border-radius: 8px 8px 0 0; transition: transform 0.3s ease;">
                <button id="mjpegRotateBtn" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); border: none; border-radius: 50%; width: 48px; height: 48px; color: white; cursor: pointer; display: none; z-index: 10;">
                    <span class="material-icons">screen_rotation</span>
                </button>
                <div id="mjpegControls" style="background: rgba(0,0,0,0.8); padding: 12px; border-radius: 0 0 8px 8px; color: white;">
                    <div id="mjpegProgressContainer" style="width: 100%; height: 24px; background: rgba(255,255,255,0.2); border-radius: 4px; cursor: pointer; margin-bottom: 12px; position: relative; display: flex; align-items: center; user-select: none;">
                        <div id="mjpegProgressBar" style="width: 0%; height: 100%; background: #4CAF50; border-radius: 4px; position: absolute; left: 0; top: 0; pointer-events: none;"></div>
                        <div id="mjpegProgressThumb" style="position: absolute; top: 50%; transform: translate(-50%, -50%); width: 20px; height: 20px; background: white; border-radius: 50%; left: 0%; box-shadow: 0 2px 4px rgba(0,0,0,0.3); pointer-events: none;"></div>
                        <div id="mjpegProgressTime" style="position: absolute; left: 50%; transform: translateX(-50%); font-size: 11px; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8); z-index: 1; white-space: nowrap; pointer-events: none;">0.0s (Frame 1/${frames.length})</div>
                        <div id="mjpegEndTime" style="position: absolute; right: 8px; font-size: 11px; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8); z-index: 1; white-space: nowrap; pointer-events: none;">0:00 (Frame ${frames.length})</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; justify-content: space-between;">
                        ${this.buildSpeedControlPanelHTML('mjpeg')}
                        <div style="display: flex; align-items: center; gap: 8px; flex: 1; justify-content: center;">
                            <button id="mjpegFirst" class="mjpeg-control-btn" title="Go to first frame">
                                <span class="material-icons">first_page</span>
                            </button>
                            <button id="mjpegPrev1s" class="mjpeg-control-btn" title="Previous 1 second">
                                <span style="font-size: 12px; font-weight: bold;">-1s</span>
                            </button>
                            <button id="mjpegPrev10" class="mjpeg-control-btn" title="Previous 10 frames">
                                <span class="material-icons">fast_rewind</span>
                            </button>
                            <button id="mjpegPrevFrame" class="mjpeg-control-btn" title="Previous frame">
                                <span class="material-icons">chevron_left</span>
                            </button>
                            <button id="mjpegPlayPause" class="mjpeg-control-btn mjpeg-play-btn" title="Play">
                                <span class="material-icons">play_arrow</span>
                            </button>
                            <button id="mjpegNextFrame" class="mjpeg-control-btn" title="Next frame">
                                <span class="material-icons">chevron_right</span>
                            </button>
                            <button id="mjpegNext10" class="mjpeg-control-btn" title="Next 10 frames">
                                <span class="material-icons">fast_forward</span>
                            </button>
                            <button id="mjpegNext1s" class="mjpeg-control-btn" title="Next 1 second">
                                <span style="font-size: 12px; font-weight: bold;">+1s</span>
                            </button>
                            <button id="mjpegLast" class="mjpeg-control-btn" title="Go to last frame">
                                <span class="material-icons">last_page</span>
                            </button>
                        </div>
                        <button id="mjpegFullscreenBtn" class="mjpeg-control-btn" title="Fullscreen" style="margin-left: 8px;">
                            <span class="material-icons">fullscreen</span>
                        </button>
                    </div>
                </div>
            </div>
            <div class="video-player-info">
                <p><strong>Type:</strong> MJPEG Sequence</p>
                <p><strong>Camera:</strong> ${Utils.escapeHtml(tag.cameraName)}</p>
                <p><strong>Time:</strong> ${Utils.formatTime(date)} - ${Utils.formatDate(date)}</p>
                <p><strong>Frames:</strong> ${frames.length}</p>
                <p><strong>Duration:</strong> ${duration}s</p>
            </div>
        `;

        const imgElement = document.getElementById('mjpegPlayer');
        const playPauseBtn = document.getElementById('mjpegPlayPause');
        const playPauseIcon = playPauseBtn.querySelector('.material-icons');
        const progressBar = document.getElementById('mjpegProgressBar');
        const progressThumb = document.getElementById('mjpegProgressThumb');
        const progressContainer = document.getElementById('mjpegProgressContainer');
        const progressTime = document.getElementById('mjpegProgressTime');
        const endTime = document.getElementById('mjpegEndTime');
        const playerContainer = document.getElementById('mjpegPlayerContainer');
        const controlsPanel = document.getElementById('mjpegControls');
        const fullscreenBtn = document.getElementById('mjpegFullscreenBtn');
        const rotateBtn = document.getElementById('mjpegRotateBtn');
        const speedBtn = document.getElementById('mjpegSpeedBtn');
        const speedPanel = document.getElementById('mjpegSpeedPanel');
        const speedLabel = document.getElementById('mjpegSpeedLabel');
        const speedValue = document.getElementById('mjpegSpeedValue');
        const speedSlider = document.getElementById('mjpegSpeedSlider');
        const speedIncrease = document.getElementById('mjpegSpeedIncrease');
        const speedDecrease = document.getElementById('mjpegSpeedDecrease');
        const speedReset = document.getElementById('mjpegSpeedReset');
        let playing = false;
        let playInterval = null;
        let currentRotation = 0;
        let isFullscreen = false;
        let playbackSpeed = 1.0;
        const baseFrameInterval = 67; // Base interval: 67ms for 15 FPS

        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = (seconds % 60).toFixed(1);
            return mins > 0 ? `${mins}:${secs.padStart(4, '0')}` : `${secs}s`;
        };

        // Set end time display
        endTime.textContent = `${formatTime(duration)} (Frame ${frames.length})`;

        const showFrame = (index) => {
            // Clamp index to valid range
            currentFrame = Math.max(0, Math.min(index, frames.length - 1));

            if (frames[currentFrame]) {
                const url = URL.createObjectURL(frames[currentFrame]);
                imgElement.src = url;

                // Calculate current time based on frame position
                const currentTime = (currentFrame / frames.length) * duration;

                // Update progress bar
                const progress = (currentFrame / (frames.length - 1)) * 100;
                progressBar.style.width = `${progress}%`;
                progressThumb.style.left = `${progress}%`;

                // Update progress time display
                progressTime.textContent = `${formatTime(currentTime)} (Frame ${currentFrame + 1}/${frames.length})`;
            }
        };

        // Adaptive controls positioning based on orientation
        const updateControlsPosition = () => {
            const isLandscape = window.innerWidth > window.innerHeight;

            if (isFullscreen && isLandscape) {
                // Overlay controls in fullscreen landscape
                controlsPanel.style.position = 'absolute';
                controlsPanel.style.bottom = '0';
                controlsPanel.style.left = '0';
                controlsPanel.style.right = '0';
                controlsPanel.style.borderRadius = '0';
                imgElement.style.maxHeight = '100vh';
                imgElement.style.height = '100vh';
                imgElement.style.borderRadius = '0';
            } else {
                // Normal positioning
                controlsPanel.style.position = 'relative';
                controlsPanel.style.bottom = 'auto';
                controlsPanel.style.left = 'auto';
                controlsPanel.style.right = 'auto';
                controlsPanel.style.borderRadius = isFullscreen ? '0' : '0 0 8px 8px';
                imgElement.style.maxHeight = isFullscreen ? '100vh' : '70vh';
                imgElement.style.height = 'auto';
                imgElement.style.borderRadius = isFullscreen ? '0' : '8px 8px 0 0';
            }
        };

        // Fullscreen functionality
        const toggleFullscreen = () => {
            if (!document.fullscreenElement) {
                playerContainer.requestFullscreen().then(() => {
                    isFullscreen = true;
                    fullscreenBtn.querySelector('.material-icons').textContent = 'fullscreen_exit';
                    rotateBtn.style.display = 'block';
                    updateControlsPosition();
                }).catch(err => {
                    console.error('Error entering fullscreen:', err);
                });
            } else {
                document.exitFullscreen().then(() => {
                    isFullscreen = false;
                    fullscreenBtn.querySelector('.material-icons').textContent = 'fullscreen';
                    rotateBtn.style.display = 'none';
                    updateControlsPosition();
                }).catch(err => {
                    console.error('Error exiting fullscreen:', err);
                });
            }
        };

        // Rotation functionality
        const rotateVideo = () => {
            currentRotation = (currentRotation + 90) % 360;
            imgElement.style.transform = `rotate(${currentRotation}deg)`;
        };

        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                isFullscreen = false;
                fullscreenBtn.querySelector('.material-icons').textContent = 'fullscreen';
                rotateBtn.style.display = 'none';
                currentRotation = 0;
                imgElement.style.transform = 'rotate(0deg)';
                updateControlsPosition();
            }
        });

        // Listen for orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(updateControlsPosition, 100);
        });

        // Listen for resize events (for desktop)
        window.addEventListener('resize', updateControlsPosition);

        // Fullscreen button
        fullscreenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFullscreen();
        });

        // Rotation button
        rotateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            rotateVideo();
        });

        // Speed control
        speedBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            speedPanel.classList.toggle('hidden');
        });

        speedSlider.addEventListener('input', (e) => {
            updateMjpegSpeed(parseFloat(e.target.value));
        });

        speedIncrease.addEventListener('click', () => {
            updateMjpegSpeed(playbackSpeed + 0.1);
        });

        speedDecrease.addEventListener('click', () => {
            updateMjpegSpeed(playbackSpeed - 0.1);
        });

        speedReset.addEventListener('click', () => {
            updateMjpegSpeed(1.0);
        });

        speedReset.addEventListener('mouseenter', () => {
            speedReset.style.background = 'rgba(255,255,255,0.2)';
        });

        speedReset.addEventListener('mouseleave', () => {
            speedReset.style.background = 'rgba(255,255,255,0.1)';
        });

        // Close speed panel when clicking outside
        document.addEventListener('click', (e) => {
            if (!speedPanel.contains(e.target) && !speedBtn.contains(e.target)) {
                speedPanel.classList.add('hidden');
            }
        });

        const togglePlayPause = () => {
            playing = !playing;

            if (playing) {
                // If at the end, restart from frame 0
                if (currentFrame >= frames.length - 1) {
                    currentFrame = 0;
                }

                playPauseIcon.textContent = 'pause';
                playPauseBtn.title = 'Pause';
                const interval = baseFrameInterval / playbackSpeed;
                playInterval = setInterval(() => {
                    currentFrame++;

                    // If we've reached the end, stay at last frame and pause
                    if (currentFrame >= frames.length) {
                        currentFrame = frames.length - 1;
                        showFrame(currentFrame);
                        togglePlayPause(); // This will pause playback
                    } else {
                        showFrame(currentFrame);
                    }
                }, interval);
            } else {
                playPauseIcon.textContent = 'play_arrow';
                playPauseBtn.title = 'Play';
                if (playInterval) {
                    clearInterval(playInterval);
                    playInterval = null;
                }
            }
        };

        const updateMjpegSpeed = (speed) => {
            // Clamp speed between 0.2 and 2.0
            speed = Math.max(0.2, Math.min(2.0, speed));
            // Round to 1 decimal place
            speed = Math.round(speed * 10) / 10;

            playbackSpeed = speed;

            // Calculate percentage (0.2 = 0%, 2.0 = 100%)
            const percentage = ((speed - 0.2) / (2.0 - 0.2)) * 100;

            // Update UI
            speedLabel.textContent = `${speed.toFixed(1)}x`;
            speedValue.textContent = `${speed.toFixed(1)}x`;
            speedSlider.value = speed;

            const sliderFill = document.getElementById('mjpegSliderFill');
            const sliderThumb = document.getElementById('mjpegSliderThumb');
            if (sliderFill) sliderFill.style.width = `${percentage}%`;
            if (sliderThumb) sliderThumb.style.left = `${percentage}%`;

            // If currently playing, restart with new speed
            if (playing) {
                togglePlayPause(); // Pause
                togglePlayPause(); // Resume with new speed
            }
        };

        // Calculate frames per second for 1s jumps
        const framesPerSecond = Math.round(frames.length / duration);

        // Play/Pause button
        playPauseBtn.addEventListener('click', togglePlayPause);

        // Go to first frame
        document.getElementById('mjpegFirst').addEventListener('click', () => {
            if (playing) togglePlayPause();
            showFrame(0);
        });

        // Previous 1 second
        document.getElementById('mjpegPrev1s').addEventListener('click', () => {
            if (playing) togglePlayPause();
            showFrame(currentFrame - framesPerSecond);
        });

        // Previous 10 frames
        document.getElementById('mjpegPrev10').addEventListener('click', () => {
            if (playing) togglePlayPause();
            showFrame(currentFrame - 10);
        });

        // Previous frame
        document.getElementById('mjpegPrevFrame').addEventListener('click', () => {
            if (playing) togglePlayPause();
            showFrame(currentFrame - 1);
        });

        // Next frame
        document.getElementById('mjpegNextFrame').addEventListener('click', () => {
            if (playing) togglePlayPause();
            showFrame(currentFrame + 1);
        });

        // Next 10 frames
        document.getElementById('mjpegNext10').addEventListener('click', () => {
            if (playing) togglePlayPause();
            showFrame(currentFrame + 10);
        });

        // Next 1 second
        document.getElementById('mjpegNext1s').addEventListener('click', () => {
            if (playing) togglePlayPause();
            showFrame(currentFrame + framesPerSecond);
        });

        // Go to last frame
        document.getElementById('mjpegLast').addEventListener('click', () => {
            if (playing) togglePlayPause();
            showFrame(frames.length - 1);
        });

        // Progress bar drag and click to seek
        let isDragging = false;
        let dragJustEnded = false;
        let lastValidFrame = 0;

        const seekToPosition = (clientX) => {
            const rect = progressContainer.getBoundingClientRect();
            const x = clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, x / rect.width));
            const targetFrame = Math.round(percentage * (frames.length - 1));
            lastValidFrame = targetFrame;
            showFrame(targetFrame);
        };

        progressContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            dragJustEnded = false;
            if (playing) togglePlayPause();
            seekToPosition(e.clientX);
            e.preventDefault();
            e.stopPropagation();
        });

        const handleMouseMove = (e) => {
            if (isDragging) {
                seekToPosition(e.clientX);
                e.preventDefault();
                e.stopPropagation();
            }
        };

        const handleMouseUp = (e) => {
            if (isDragging) {
                // Seek to final position
                seekToPosition(e.clientX);
                isDragging = false;
                dragJustEnded = true;
                // Clear the flag after a short delay
                setTimeout(() => {
                    dragJustEnded = false;
                }, 100);
                e.preventDefault();
                e.stopPropagation();
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        // Prevent dialog from closing when drag just ended
        this.videoPlayerDialog.addEventListener('click', (e) => {
            if (dragJustEnded) {
                e.stopPropagation();
            }
        }, true);

        // Show first frame
        showFrame(0);
    }

    closeVideoPlayer() {
        this.videoPlayerDialog.classList.remove('active');
        if (this.videoPlayer && this.videoPlayer.pause) {
            this.videoPlayer.pause();
            this.videoPlayer.src = '';
        }
        this.currentVideoBlob = null;

        // Hide speed panels if they exist
        const videoSpeedPanel = document.getElementById('videoSpeedPanel');
        const mjpegSpeedPanel = document.getElementById('mjpegSpeedPanel');
        if (videoSpeedPanel) videoSpeedPanel.classList.add('hidden');
        if (mjpegSpeedPanel) mjpegSpeedPanel.classList.add('hidden');
    }

    setupVideoSpeedControl() {
        const speedBtn = document.getElementById('videoSpeedBtn');
        const speedPanel = document.getElementById('videoSpeedPanel');
        const speedLabel = document.getElementById('videoSpeedLabel');
        const speedValue = document.getElementById('videoSpeedValue');
        const speedSlider = document.getElementById('videoSpeedSlider');
        const speedIncrease = document.getElementById('videoSpeedIncrease');
        const speedDecrease = document.getElementById('videoSpeedDecrease');
        const speedReset = document.getElementById('videoSpeedReset');
        const sliderFill = document.getElementById('videoSliderFill');
        const sliderThumb = document.getElementById('videoSliderThumb');

        if (!speedBtn || !speedPanel) return;

        const updateSpeed = (speed) => {
            // Clamp speed between 0.2 and 2.0
            speed = Math.max(0.2, Math.min(2.0, speed));
            // Round to 1 decimal place
            speed = Math.round(speed * 10) / 10;

            // Calculate percentage (0.2 = 0%, 2.0 = 100%)
            const percentage = ((speed - 0.2) / (2.0 - 0.2)) * 100;

            // Update video playback rate
            if (this.videoPlayer) {
                this.videoPlayer.playbackRate = speed;
            }

            // Update UI
            speedLabel.textContent = `${speed.toFixed(1)}x`;
            speedValue.textContent = `${speed.toFixed(1)}x`;
            speedSlider.value = speed;
            if (sliderFill) sliderFill.style.width = `${percentage}%`;
            if (sliderThumb) sliderThumb.style.left = `${percentage}%`;
        };

        speedBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            speedPanel.classList.toggle('hidden');
        });

        speedSlider.addEventListener('input', (e) => {
            updateSpeed(parseFloat(e.target.value));
        });

        speedIncrease.addEventListener('click', () => {
            updateSpeed(parseFloat(speedSlider.value) + 0.1);
        });

        speedDecrease.addEventListener('click', () => {
            updateSpeed(parseFloat(speedSlider.value) - 0.1);
        });

        speedReset.addEventListener('click', () => {
            updateSpeed(1.0);
        });

        speedReset.addEventListener('mouseenter', () => {
            speedReset.style.background = 'rgba(255,255,255,0.2)';
        });

        speedReset.addEventListener('mouseleave', () => {
            speedReset.style.background = 'rgba(255,255,255,0.1)';
        });

        // Close speed panel when clicking outside
        document.addEventListener('click', (e) => {
            if (!speedPanel.contains(e.target) && !speedBtn.contains(e.target)) {
                speedPanel.classList.add('hidden');
            }
        });

        // Initialize to 1.0x
        updateSpeed(1.0);
    }

    async deleteCurrentVideo() {
        if (!this.currentVideoBlob) {
            return;
        }

        const video = this.currentVideoBlob;

        // Confirm deletion
        if (!confirm(`Delete "${video.filename}"?`)) {
            return;
        }

        try {
            // Check if it's a tag or full video by looking for it in the tag manager
            const tags = this.tagManager.getAllTags();
            const tagMatch = tags.find(t => t.clipId === video.clipId);

            if (tagMatch) {
                // It's a tag
                await this.tagUI.removeTag(tagMatch.id);
                this.showToast('Tag deleted');
            } else {
                // It's a full video
                await this.fullVideoUI.removeFullVideo(video.clipId);
                this.showToast('Video deleted');
            }

            // Close the video player
            this.closeVideoPlayer();
        } catch (error) {
            console.error('Error deleting video:', error);
            alert('Failed to delete video');
        }
    }

    abortDownload() {
        if (this.downloadAbortController) {
            this.downloadAbortController.abort();
            this.downloadAbortController = null;
        }

        // Hide progress
        const progressContainer = document.getElementById('downloadProgress');
        const downloadBtn = document.getElementById('downloadVideo');
        progressContainer.classList.add('hidden');
        downloadBtn.disabled = false;

        this.showToast('Download cancelled');
    }

    async downloadCurrentVideo() {
        if (!this.currentVideoBlob) {
            return;
        }

        const tag = this.currentVideoBlob;
        const downloadBtn = document.getElementById('downloadVideo');
        const progressContainer = document.getElementById('downloadProgress');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');

        // Create abort controller for this download
        this.downloadAbortController = new AbortController();
        const signal = this.downloadAbortController.signal;

        try {
            // Disable download button and show progress
            downloadBtn.disabled = true;
            progressContainer.classList.remove('hidden');
            progressBar.style.width = '0%';
            progressText.textContent = 'Preparing download...';

            // Check if aborted
            if (signal.aborted) {
                throw new Error('Download aborted');
            }

            // Load clip from cache
            const clip = await this.cacheManager.getClip(tag.clipId);

            if (!clip) {
                alert('Video clip not found in cache');
                return;
            }

            const a = document.createElement('a');

            if (tag.isMjpeg && (clip.metadata.type === 'mjpeg-sequence' || clip.metadata.type === 'mjpeg-full-video')) {
                // For MJPEG, create a video from frames
                if (clip.data && clip.data.length > 0) {
                    await this.createVideoFromFrames(clip.data, tag.filename, (progress) => {
                        progressBar.style.width = `${progress}%`;
                        progressText.textContent = `Processing frames: ${Math.round(progress)}%`;
                    }, signal);
                } else {
                    alert('No frames available for download');
                }
            } else {
                // Regular video - download the blob
                progressBar.style.width = '50%';
                progressText.textContent = 'Creating download link...';

                const url = URL.createObjectURL(clip.data);
                const ext = clip.data.type.includes('mp4') ? 'mp4' : 'webm';

                progressBar.style.width = '100%';
                progressText.textContent = 'Starting download...';

                a.href = url;
                a.download = `${tag.filename}.${ext}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            // Hide progress after a short delay
            setTimeout(() => {
                progressContainer.classList.add('hidden');
                this.downloadAbortController = null;
            }, 1000);
        } catch (error) {
            console.error('Error downloading video:', error);
            // Don't show alert if download was aborted
            if (error.message !== 'Download aborted') {
                alert('Failed to download video');
            }
            progressContainer.classList.add('hidden');
        } finally {
            downloadBtn.disabled = false;
            this.downloadAbortController = null;
        }
    }

    /**
     * Create a video file from MJPEG frames
     */
    async createVideoFromFrames(frames, filename, onProgress = null, signal = null) {
        return new Promise(async (resolve, reject) => {
            try {
                // Check if aborted
                if (signal && signal.aborted) {
                    reject(new Error('Download aborted'));
                    return;
                }
                // Create a canvas for rendering frames
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Load first frame to get dimensions
                const firstImg = await this.loadImage(frames[0]);
                canvas.width = firstImg.width;
                canvas.height = firstImg.height;

                // Create video stream from canvas
                const stream = canvas.captureStream(15); // 15 FPS
                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'video/webm;codecs=vp9',
                    videoBitsPerSecond: 2500000
                });

                const chunks = [];
                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        chunks.push(e.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    if (onProgress) onProgress(100);
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${filename}.webm`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    resolve();
                };

                mediaRecorder.onerror = (e) => {
                    reject(e.error);
                };

                // Start recording
                mediaRecorder.start();

                // Draw frames at 15 FPS (67ms per frame)
                let frameIndex = 0;
                const totalFrames = frames.length;
                const drawFrame = async () => {
                    // Check if aborted
                    if (signal && signal.aborted) {
                        mediaRecorder.stop();
                        reject(new Error('Download aborted'));
                        return;
                    }

                    if (frameIndex < frames.length) {
                        const img = await this.loadImage(frames[frameIndex]);
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        frameIndex++;

                        // Report progress
                        if (onProgress) {
                            const progress = (frameIndex / totalFrames) * 90; // 0-90%, leave 10% for final processing
                            onProgress(progress);
                        }

                        setTimeout(drawFrame, 67);
                    } else {
                        // All frames drawn, stop recording
                        if (onProgress) onProgress(95);
                        setTimeout(() => {
                            mediaRecorder.stop();
                        }, 100);
                    }
                };

                drawFrame();
            } catch (error) {
                console.error('Error creating video from frames:', error);
                alert('Failed to create video from frames');
                reject(error);
            }
        });
    }

    /**
     * Load an image from a blob
     */
    async loadImage(blob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
        });
    }

    /**
     * Capture a snapshot from an MJPEG stream
     */
    async captureSnapshot(imgElement) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = imgElement.naturalWidth || imgElement.width || 640;
            canvas.height = imgElement.naturalHeight || imgElement.height || 480;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

            // Convert to blob URL
            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(URL.createObjectURL(blob));
                    } else {
                        resolve(null);
                    }
                }, 'image/jpeg', 0.9);
            });
        } catch (error) {
            console.error('Error capturing snapshot:', error);
            return null;
        }
    }

    // ========== Sidebar Tabs ==========

    switchTab(tab) {
        // Remove active class from all tabs
        document.getElementById('camerasTab').classList.remove('active');
        document.getElementById('tagsTab').classList.remove('active');
        document.getElementById('fullVideosTab').classList.remove('active');

        // Hide all tab contents
        document.getElementById('camerasTabContent').classList.add('hidden');
        document.getElementById('tagsTabContent').classList.add('hidden');
        document.getElementById('fullVideosTabContent').classList.add('hidden');

        // Activate the selected tab
        if (tab === 'cameras') {
            document.getElementById('camerasTab').classList.add('active');
            document.getElementById('camerasTabContent').classList.remove('hidden');
        } else if (tab === 'tags') {
            document.getElementById('tagsTab').classList.add('active');
            document.getElementById('tagsTabContent').classList.remove('hidden');
        } else if (tab === 'fullVideos') {
            document.getElementById('fullVideosTab').classList.add('active');
            document.getElementById('fullVideosTabContent').classList.remove('hidden');
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        const app = new SportsDashcamApp();
        window.sportsDashcamApp = app; // Make accessible immediately for debugging/tests
        await app.ready; // Wait for initialization to complete
        console.log('SportsDashcamApp ready');
    });
} else {
    (async () => {
        const app = new SportsDashcamApp();
        window.sportsDashcamApp = app; // Make accessible immediately for debugging/tests
        await app.ready; // Wait for initialization to complete
        console.log('SportsDashcamApp ready');
    })();
}
