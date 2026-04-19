class RecordingController {
    constructor(app) {
        this.app = app;
    }

    async toggleRecording(cameraId) {
        const recorder = this.app.videoRecorders.get(cameraId);
        const camera = this.app.cameraManager.getCamera(cameraId);
        if (!recorder || !camera) return;

        const recordingIndicator = document.getElementById(`recording-indicator-${cameraId}`);
        const streamStatus = document.getElementById(`stream-status-${cameraId}`);

        if (recorder.isRecording) {
            // Stop recording and save full video
            const startTime = this.app.recordingStartTimes.get(cameraId);

            recordingIndicator.classList.add('hidden');

            // Update stream status back to connected
            const isMjpeg = recorder.isMjpeg;
            streamStatus.textContent = isMjpeg ? 'Connected (MJPEG)' : 'Connected';

            // Save recording status
            this.app.cameraManager.updateCamera(cameraId, { isRecording: false });

            // Create full video after a short delay to ensure last chunks are saved
            if (startTime) {
                const sessionId = `fullvideo_${cameraId}_${startTime}`;

                // Stop recording
                recorder.stop();

                // Wait a bit for final chunks to be processed
                setTimeout(async () => {
                    try {
                        const result = await recorder.createFullVideo(sessionId, startTime);

                        if (result.success) {
                            // Update the in-progress video to completed
                            const updatedVideo = this.app.fullVideoManager.updateInProgressToCompleted(sessionId, result);
                            if (updatedVideo) {
                                // Update the rendered item
                                this.app.fullVideoUI.updateFullVideoItem(updatedVideo);
                            } else {
                                // Fallback: add as new if update failed
                                const fullVideo = this.app.fullVideoManager.addFullVideo(cameraId, camera.name, result, startTime);
                                this.app.fullVideoUI.renderFullVideo(fullVideo);
                            }
                            this.app.fullVideoUI.updateFullVideosEmptyState();
                        } else {
                            console.error('Failed to create full video:', result.error);
                            // Remove the in-progress item on failure
                            this.app.fullVideoManager.removeFullVideo(sessionId);
                            document.getElementById(`fullvideo-${sessionId}`)?.remove();
                            this.app.fullVideoUI.updateFullVideosEmptyState();
                        }
                    } catch (error) {
                        console.error('Error creating full video:', error);
                        // Remove the in-progress item on error
                        this.app.fullVideoManager.removeFullVideo(sessionId);
                        document.getElementById(`fullvideo-${sessionId}`)?.remove();
                        this.app.fullVideoUI.updateFullVideosEmptyState();
                    }
                }, 500);

                this.app.recordingStartTimes.delete(cameraId);
            } else {
                console.warn('No start time recorded for camera', cameraId);
                recorder.stop();
            }
        } else {
            // Start recording
            const startTime = Date.now();
            this.app.recordingStartTimes.set(cameraId, startTime);
            await recorder.start();
            recordingIndicator.classList.remove('hidden');

            // Update stream status to show recording
            const isMjpeg = recorder.isMjpeg;
            streamStatus.textContent = isMjpeg ? 'Recording (MJPEG)' : 'Recording';

            // Save recording status
            this.app.cameraManager.updateCamera(cameraId, { isRecording: true });

            // Add in-progress item to full videos list
            const inProgressVideo = this.app.fullVideoManager.addInProgressRecording(cameraId, camera.name, startTime);
            this.app.fullVideoUI.renderFullVideo(inProgressVideo, true);
            this.app.fullVideoUI.updateFullVideosEmptyState();
        }

        // Update tag button visibility
        this.updateTagButtonVisibility();
    }

    updateTagButtonVisibility() {
        const startRecordingBtn = document.getElementById('startRecordingBtn');
        const tagButtonsContainer = document.getElementById('tagButtonsContainer');
        let recordingCount = 0;
        let totalCameras = 0;
        let allReady = true;

        // Count cameras and check if all are ready
        this.app.videoRecorders.forEach((recorder, cameraId) => {
            const camera = this.app.cameraManager.getCamera(cameraId);
            const isConnected = this.app.cameraConnections.get(cameraId) !== false;
            const isReady = this.app.cameraReady.get(cameraId) === true;

            if (camera && isConnected) {
                totalCameras++;
                if (!isReady) {
                    allReady = false;
                }
                if (recorder.isRecording) {
                    recordingCount++;
                }
            }
        });

        // Update visibility of individual tag buttons based on tagLabelCount setting
        const tagLabelCount = this.app.settings.tagLabelCount || 4;
        const tagButtons = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        tagButtons.forEach((label, index) => {
            const button = document.getElementById(`tagButton${label}`);
            if (button) {
                if (index < tagLabelCount) {
                    button.classList.remove('hidden');
                } else {
                    button.classList.add('hidden');
                }
            }
        });

        if (recordingCount > 0) {
            // Recording in progress
            // Update record button to stop mode (red)
            startRecordingBtn.disabled = false;
            startRecordingBtn.classList.add('recording');
            startRecordingBtn.title = 'Stop Recording';
            const icon = startRecordingBtn.querySelector('.material-icons');
            if (icon) icon.textContent = 'stop';

            // Show tag buttons container
            tagButtonsContainer.classList.remove('hidden');
        } else if (totalCameras > 0) {
            // Hide tag buttons container
            tagButtonsContainer.classList.add('hidden');

            // Update record button to record mode
            startRecordingBtn.classList.remove('recording');
            startRecordingBtn.title = 'Start Recording';
            const icon = startRecordingBtn.querySelector('.material-icons');
            if (icon) icon.textContent = 'fiber_manual_record';

            // Check if all cameras are ready
            if (!allReady) {
                // Disable start recording button - cameras not ready yet
                startRecordingBtn.disabled = true;
            } else {
                // Enable start recording button
                startRecordingBtn.disabled = false;
            }
        } else {
            // No cameras, disable record button and hide tag buttons
            startRecordingBtn.disabled = true;
            startRecordingBtn.classList.remove('recording');
            startRecordingBtn.title = 'Start Recording';
            const icon = startRecordingBtn.querySelector('.material-icons');
            if (icon) icon.textContent = 'fiber_manual_record';
            tagButtonsContainer.classList.add('hidden');
        }

        // Update filter visibility
        this.app.tagUI.updateTagFilterVisibility();
    }

    showDisabledTagButton(message = 'Camera Error') {
        const tagButton = document.getElementById('tagButton');

        // Show tag button as disabled
        tagButton.classList.remove('hidden');
        tagButton.disabled = true;
        tagButton.style.opacity = '0.5';
        tagButton.style.cursor = 'not-allowed';
        tagButton.innerHTML = `
            <span class="material-icons">bookmark</span>
            <span>Tag (${message})</span>
        `;
    }

    async saveVideoClip(cameraId, label = 'A') {
        const recorder = this.app.videoRecorders.get(cameraId);
        const camera = this.app.cameraManager.getCamera(cameraId);

        if (!recorder || !camera) return;

        // Compute tag timing up front so the catch path can reuse the same values.
        const tagTimestamp = Date.now();
        const recordingStartTime = this.app.recordingStartTimes.get(cameraId);
        const requestedPreTagDuration = this.app.settings.preTagDuration * 1000;
        const actualPreTagDuration = Math.min(requestedPreTagDuration, tagTimestamp - recordingStartTime);
        const videoStartTime = tagTimestamp - actualPreTagDuration;
        const tagOffsetSeconds = Math.round(actualPreTagDuration / 1000);
        const filename = `${camera.name}-${Utils.formatTimestamp(new Date(videoStartTime))}-at-${tagOffsetSeconds}s`;
        const totalDuration = this.app.settings.preTagDuration + this.app.settings.postTagDuration;
        const clipId = `clip_${cameraId}_${tagTimestamp}`;

        try {
            // Check for duplicate filenames and ignore if exists
            const existingTags = this.app.tagManager.getAllTags();
            if (existingTags.some(t => t.filename === filename)) {
                return { success: false, cameraName: camera.name, duplicate: true };
            }

            // Create tag with metadata first
            const tagData = {
                filename,
                duration: totalDuration,
                segments: recorder.segments.length,
                size: 0,
                preTagDuration: this.app.settings.preTagDuration,
                postTagDuration: this.app.settings.postTagDuration,
                clipId,
                tagTimestamp,
                isMjpeg: recorder.isMjpeg,
                frameCount: 0,
                label
            };

            const tag = this.app.tagManager.addTag(cameraId, camera.name, tagData);
            this.app.tagUI.renderTag(tag);
            this.app.tagUI.updateTagsEmptyState();
            this.updateTagButtonVisibility();
            this.app.switchTab('tags');

            // Wait for postTag duration before creating clip
            setTimeout(async () => {
                try {
                    const result = await recorder.createClipFromCache(tagTimestamp, clipId);

                    // Update tag with actual duration, frame count, and thumbnail if available
                    if (result.success) {
                        if (result.duration !== undefined) {
                            tag.duration = result.duration;
                        }
                        if (result.frameCount) {
                            tag.frameCount = result.frameCount;
                        }
                        if (result.thumbnail) {
                            tag.thumbnail = result.thumbnail;
                        }
                        this.app.tagManager.saveToStorage();

                        // Update the rendered tag
                        const tagElement = document.getElementById(`tag-${tag.id}`);
                        if (tagElement) {
                            const sizeElement = tagElement.querySelector('.tag-info-row:nth-child(3) span:nth-child(2)');
                            if (sizeElement) {
                                if (recorder.isMjpeg && result.frameCount) {
                                    sizeElement.textContent = `${tag.duration.toFixed(1)}s (${result.frameCount} frames)`;
                                } else {
                                    sizeElement.textContent = `${tag.duration.toFixed(1)}s`;
                                }
                            }

                            // Update thumbnail if available
                            if (result.thumbnail) {
                                const thumbnailElement = tagElement.querySelector('.tag-thumbnail img');
                                if (thumbnailElement) {
                                    thumbnailElement.src = result.thumbnail;
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error creating delayed clip:', err);
                }
            }, this.app.settings.postTagDuration * 1000);

            return { success: true, cameraName: camera.name, filename };
        } catch (error) {
            console.error('Error saving clip:', error);

            // Still create a minimal tag entry even when video save fails.
            const tagData = {
                filename,
                duration: totalDuration,
                segments: 0,
                size: 0,
                preTagDuration: this.app.settings.preTagDuration,
                postTagDuration: this.app.settings.postTagDuration,
                videoUrl: null
            };

            const tag = this.app.tagManager.addTag(cameraId, camera.name, tagData);
            this.app.tagUI.renderTag(tag);
            this.app.tagUI.updateTagsEmptyState();
            this.updateTagButtonVisibility();
            this.app.switchTab('tags');

            return { success: true, cameraName: camera.name, error: error.message };
        }
    }

    async toggleRecordingAll() {
        // Check if any cameras are currently recording
        let anyRecording = false;
        this.app.videoRecorders.forEach((recorder) => {
            if (recorder.isRecording) {
                anyRecording = true;
            }
        });

        if (anyRecording) {
            // Stop all recording cameras
            await this.stopRecordingAllCameras();
        } else {
            // Start recording on all cameras
            await this.startRecordingAllCameras();
        }
    }

    async stopRecordingAllCameras() {
        const startRecordingBtn = document.getElementById('startRecordingBtn');
        startRecordingBtn.disabled = true;

        // Find all cameras that are currently recording
        const camerasToStop = [];
        this.app.videoRecorders.forEach((recorder, cameraId) => {
            if (recorder.isRecording) {
                camerasToStop.push(cameraId);
            }
        });

        // Stop recording on all cameras
        for (const cameraId of camerasToStop) {
            await this.toggleRecording(cameraId);
        }

        startRecordingBtn.disabled = false;
    }

    async startRecordingAllCameras() {
        const startRecordingBtn = document.getElementById('startRecordingBtn');
        startRecordingBtn.disabled = true;

        // Find all connected cameras that are not recording
        const camerasToRecord = [];
        let notReady = false;

        this.app.videoRecorders.forEach((recorder, cameraId) => {
            const isConnected = this.app.cameraConnections.get(cameraId) !== false;
            const isReady = this.app.cameraReady.get(cameraId) === true;

            if (isConnected && !recorder.isRecording) {
                if (!isReady) {
                    notReady = true;
                } else {
                    camerasToRecord.push(cameraId);
                }
            }
        });

        if (camerasToRecord.length === 0) {
            startRecordingBtn.disabled = false;

            // If cameras are not ready, button will already be in disabled state from updateTagButtonVisibility
            if (notReady) {
                this.app.showToast('Cannot start recording: One or more cameras are not ready');
            }
            return;
        }

        // If any camera is not ready, don't start recording
        if (notReady) {
            startRecordingBtn.disabled = false;
            this.app.showToast('Cannot start recording: One or more cameras are not ready');
            return;
        }

        // Start recording on all cameras
        for (const cameraId of camerasToRecord) {
            await this.toggleRecording(cameraId);
        }

        startRecordingBtn.disabled = false;
    }

    async tagAllRecordingCameras(label = 'A') {
        // Find all cameras that are currently recording
        const recordingCameras = [];
        this.app.videoRecorders.forEach((recorder, cameraId) => {
            if (recorder.isRecording) {
                recordingCameras.push(cameraId);
            }
        });

        if (recordingCameras.length === 0) {
            return;
        }

        // Save clips from all recording cameras with the specified label
        await Promise.all(
            recordingCameras.map(cameraId => this.saveVideoClip(cameraId, label))
        );
    }
}
