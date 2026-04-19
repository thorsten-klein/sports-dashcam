/**
 * CameraController - Manages camera lifecycle, rendering, and settings
 */
class CameraController {
    constructor(app) {
        this.app = app;
        this.currentCameraId = null;
    }

    openCameraSettingsDialog(cameraId) {
        this.currentCameraId = cameraId;
        const camera = this.app.cameraManager.getCamera(cameraId);
        if (!camera) return;

        // Populate fields with current camera data
        document.getElementById('editCameraName').value = camera.name;
        document.getElementById('editCameraUrl').value = camera.url;

        // Update rotation display
        const rotation = camera.rotation || 0;
        document.getElementById('currentRotation').textContent = `Current rotation: ${rotation}°`;

        // Update mirror button state
        this.updateMirrorButtonState();

        this.app.cameraSettingsDialog.classList.add('active');
    }

    closeCameraSettingsDialog() {
        this.app.cameraSettingsDialog.classList.remove('active');
        this.currentCameraId = null;
    }

    saveCameraSettings() {
        if (!this.currentCameraId) return;

        const camera = this.app.cameraManager.getCamera(this.currentCameraId);
        if (!camera) return;

        const newName = document.getElementById('editCameraName').value.trim();
        const newUrl = document.getElementById('editCameraUrl').value.trim();

        if (!newName || !newUrl) {
            return;
        }

        if (!this.isValidUrl(newUrl)) {
            return;
        }

        const oldUrl = camera.url;

        // Update camera in manager
        this.app.cameraManager.updateCamera(this.currentCameraId, {
            name: newName,
            url: newUrl
        });

        // Update camera card display
        this.updateCameraCard(this.currentCameraId);

        // If URL changed, reload the video stream
        if (oldUrl !== newUrl) {
            this.reloadVideoStream(this.currentCameraId);
        }

        this.closeCameraSettingsDialog();
    }

    updateCameraCard(cameraId) {
        const camera = this.app.cameraManager.getCamera(cameraId);
        if (!camera) return;

        const card = document.getElementById(`camera-${cameraId}`);
        if (!card) return;

        // Update name and URL display
        const nameElement = card.querySelector('.camera-info h3');
        const urlElement = card.querySelector('.camera-url');

        if (nameElement) {
            nameElement.textContent = camera.name;
        }

        if (urlElement) {
            urlElement.textContent = camera.url;
            urlElement.title = camera.url;
        }
    }

    rotateCamera(degrees) {
        if (!this.currentCameraId) return;

        const camera = this.app.cameraManager.getCamera(this.currentCameraId);
        if (!camera) return;

        // Calculate new rotation (0, 90, 180, 270)
        const currentRotation = camera.rotation || 0;
        let newRotation = (currentRotation + degrees) % 360;
        if (newRotation < 0) newRotation += 360;

        // Update camera rotation
        this.app.cameraManager.updateCamera(this.currentCameraId, { rotation: newRotation });

        // Apply rotation to video element
        this.applyRotation(this.currentCameraId, newRotation);

        // Update display
        document.getElementById('currentRotation').textContent = `Current rotation: ${newRotation}°`;
    }

    applyRotation(cameraId, rotation) {
        const camera = this.app.cameraManager.getCamera(cameraId);
        const videoElement = document.getElementById(`video-${cameraId}`);
        const videoContainer = document.querySelector(`#camera-${cameraId} .camera-video-container`);

        if (videoElement && camera) {
            const mirrored = camera.mirrored || false;
            const scaleX = mirrored ? -1 : 1;

            // For 90° and 270° rotations, scale up to fill the container properly
            // This compensates for the aspect ratio swap
            let scale = 1;
            if (rotation === 90 || rotation === 270) {
                // Assuming typical 16:9 video, scale by aspect ratio to fill portrait container
                scale = 16 / 9;
            }

            videoElement.style.transform = `rotate(${rotation}deg) scale(${scale}) scaleX(${scaleX})`;

            // Adjust container aspect ratio for 90° and 270° rotations
            if (videoContainer) {
                if (rotation === 90 || rotation === 270) {
                    // Portrait orientation - invert aspect ratio
                    videoContainer.style.aspectRatio = '9 / 16';
                } else {
                    // Landscape orientation - normal aspect ratio
                    videoContainer.style.aspectRatio = '16 / 9';
                }
            }

            // Update recorder with rotation settings
            const recorder = this.app.videoRecorders.get(cameraId);
            if (recorder) {
                recorder.updateRotation(rotation, mirrored);
            }
        }
    }

    toggleCameraMirror() {
        if (!this.currentCameraId) return;

        const camera = this.app.cameraManager.getCamera(this.currentCameraId);
        if (!camera) return;

        // Toggle mirrored state
        const newMirrored = !(camera.mirrored || false);

        // Update camera mirrored property
        this.app.cameraManager.updateCamera(this.currentCameraId, { mirrored: newMirrored });

        // Apply transform to video element
        this.applyRotation(this.currentCameraId, camera.rotation || 0);

        // Update button state
        this.updateMirrorButtonState();
    }

    updateMirrorButtonState() {
        if (!this.currentCameraId) return;

        const camera = this.app.cameraManager.getCamera(this.currentCameraId);
        if (!camera) return;

        const mirrorButton = document.getElementById('mirrorButton');
        if (mirrorButton) {
            const mirrored = camera.mirrored || false;
            if (mirrored) {
                mirrorButton.classList.add('btn-primary');
                mirrorButton.classList.remove('btn-secondary');
            } else {
                mirrorButton.classList.add('btn-secondary');
                mirrorButton.classList.remove('btn-primary');
            }
        }
    }

    addCamera() {
        const name = this.app.cameraNameInput.value.trim();
        const url = this.app.cameraUrlInput.value.trim();

        if (!name || !url) {
            return;
        }

        if (!this.isValidUrl(url)) {
            return;
        }

        const camera = this.app.cameraManager.addCamera(name, url);
        this.renderCamera(camera);
        this.updateEmptyState();
        this.app.updateTagButtonVisibility();
        this.app.closeAddCameraDialog();
    }

    isValidUrl(url) {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    }

    removeCamera(cameraId) {
        const camera = this.app.cameraManager.getCamera(cameraId);
        if (!camera) return;

        if (confirm(`Remove camera "${camera.name}"?`)) {
            // Stop and cleanup recorder
            const recorder = this.app.videoRecorders.get(cameraId);
            if (recorder) {
                recorder.stop();
                this.app.videoRecorders.delete(cameraId);
            }

            // Cleanup state
            this.app.recordingStartTimes.delete(cameraId);
            this.app.cameraConnections.delete(cameraId);
            this.app.cameraErrors.delete(cameraId);
            this.app.cameraReady.delete(cameraId);

            this.app.cameraManager.removeCamera(cameraId);
            document.getElementById(`camera-${cameraId}`)?.remove();
            this.updateEmptyState();
            this.app.updateTagButtonVisibility();
        }
    }

    loadCameras() {
        const cameras = this.app.cameraManager.getAllCameras();
        cameras.forEach(camera => this.renderCamera(camera));
        this.updateEmptyState();
        this.app.updateTagButtonVisibility();
    }

    renderCamera(camera) {
        try {
            const card = this.createCameraCard(camera);

            // Ensure both cameraGrid and addCameraCard exist before inserting
            if (!this.app.cameraGrid || !this.app.addCameraCard) {
                console.error(`Cannot render camera ${camera.id}: cameraGrid or addCameraCard not found`);
                return;
            }

            // Insert before add-camera-card to ensure it's always last
            this.app.cameraGrid.insertBefore(card, this.app.addCameraCard);

            // Verify the card was actually inserted
            const insertedCard = document.getElementById(`camera-${camera.id}`);
            if (!insertedCard) {
                console.error(`Camera card ${camera.id} was not found in DOM after insertion!`);
                return;
            }

            // Force a reflow to ensure the card and all its children are fully in the DOM
            // This is critical for Firefox/WebKit with parallel workers
            void card.offsetHeight;

        // Initialize error state (default to no error)
        this.app.cameraErrors.set(camera.id, false);

        // Initialize ready state (default to not ready - will be set to true when stream loads)
        this.app.cameraReady.set(camera.id, false);

        // Restore connection status from saved data (default to connected if not set)
        const isConnected = camera.isConnected !== undefined ? camera.isConnected : true;
        this.app.cameraConnections.set(camera.id, isConnected);

        // Clear recording status (recordings should not resume after page refresh)
        if (camera.isRecording) {
            this.app.cameraManager.updateCamera(camera.id, { isRecording: false });
        }

        // Only initialize video player if camera is connected
        if (isConnected) {
            // Initialize video player and recorder after a brief delay
            // This ensures DOM is fully settled, especially important for Firefox/WebKit with parallel workers
            setTimeout(() => {
                this.initializeVideoPlayer(camera);
            }, 10);
        } else {
            // If camera should be disconnected, disconnect it immediately
            setTimeout(() => {
                this.disconnectCamera(camera.id);
            }, 10);
        }
        } catch (error) {
            console.error(`Error rendering camera ${camera.id}:`, error);
            // Try to clean up if card was partially created
            const partialCard = document.getElementById(`camera-${camera.id}`);
            if (partialCard) {
                partialCard.remove();
            }
        }
    }

    createCameraCard(camera) {
        try {
            const card = document.createElement('div');
            card.className = 'camera-card';
            card.id = `camera-${camera.id}`;

            card.innerHTML = `
            <div class="camera-header">
                <div class="camera-info">
                    <h3>
                        <span class="connection-status-dot" id="status-dot-${camera.id}"></span>
                        ${Utils.escapeHtml(camera.name)}
                    </h3>
                    <div class="camera-url" title="${Utils.escapeHtml(camera.url)}">${Utils.escapeHtml(camera.url)}</div>
                    <div class="camera-stream-status" id="stream-status-${camera.id}">Connecting...</div>
                </div>
                <div class="camera-actions">
                    <button class="icon-button" data-action="disconnect" data-camera-id="${camera.id}" id="disconnect-btn-${camera.id}" title="Disconnect Camera">
                        <span class="material-icons">power_settings_new</span>
                    </button>
                    <button class="icon-button" data-action="settings" data-camera-id="${camera.id}" title="Camera Settings">
                        <span class="material-icons">settings</span>
                    </button>
                    <button class="icon-button" data-action="remove" data-camera-id="${camera.id}" title="Remove Camera">
                        <span class="material-icons">delete</span>
                    </button>
                </div>
            </div>
            <div class="camera-video-container" id="video-container-${camera.id}">
                <video class="camera-video" id="video-${camera.id}" muted autoplay playsinline></video>
                <div class="video-overlay" id="overlay-${camera.id}">
                    <div class="spinner"></div>
                </div>
                <div class="video-recording-indicator hidden" id="recording-indicator-${camera.id}">
                    <div class="recording-dot-large"></div>
                </div>
                <button class="video-reload-btn" id="reload-${camera.id}" title="Reload stream">
                    <span class="material-icons">sync</span>
                </button>
            </div>
        `;

        // Attach event listeners
        card.querySelector('[data-action="disconnect"]').addEventListener('click', () => {
            this.toggleCameraConnection(camera.id);
        });

        card.querySelector('[data-action="settings"]').addEventListener('click', () => {
            this.openCameraSettingsDialog(camera.id);
        });

        card.querySelector('[data-action="remove"]').addEventListener('click', () => {
            this.removeCamera(camera.id);
        });

            card.querySelector(`#reload-${camera.id}`).addEventListener('click', () => {
                this.reloadVideoStream(camera.id);
            });

            return card;
        } catch (error) {
            console.error(`Error creating camera card for ${camera.id}:`, error);
            throw error;
        }
    }

    initializeVideoPlayer(camera, retryCount = 0) {
        const video = document.getElementById(`video-${camera.id}`);
        const overlay = document.getElementById(`overlay-${camera.id}`);
        const streamStatus = document.getElementById(`stream-status-${camera.id}`);
        const recordingIndicator = document.getElementById(`recording-indicator-${camera.id}`);

        // Ensure all required DOM elements exist before proceeding
        // If they don't exist, this is likely a timing issue, so we'll retry with exponential backoff
        if (!video || !overlay || !streamStatus || !recordingIndicator) {
            if (retryCount < 10) {
                const delay = Math.min(10 * Math.pow(2, retryCount), 500); // Max 500ms
                console.warn(`DOM elements not ready for camera ${camera.id}, retry ${retryCount + 1} in ${delay}ms`);
                setTimeout(() => this.initializeVideoPlayer(camera, retryCount + 1), delay);
                return;
            } else {
                console.error(`Failed to initialize video player for camera ${camera.id} after ${retryCount} retries`);
                return;
            }
        }

        let errorDetails = null;
        let mjpegAttempted = false;

        // Detect stream format by checking Content-Type header.
        // Also tracks whether the server confirmed it is alive (200 OK received) so
        // tryMjpeg() can mark the camera ready immediately without waiting for img
        // rendering internals (which headless WebKit never exposes for MJPEG).
        let serverConfirmed = false;

        const detectStreamFormat = async () => {
            try {

                // Fetch with a timeout - we only need headers
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);

                try {
                    const response = await fetch(camera.url, {
                        method: 'GET',
                        cache: 'no-cache',
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    // 200 OK = server is alive and streaming.
                    if (response.ok) serverConfirmed = true;

                    // Get Content-Type from headers
                    const contentType = response.headers.get('Content-Type');

                    // Immediately cancel the body — we only needed the headers.
                    // Leaving the body open keeps a persistent MJPEG connection alive
                    // in the background; under high test parallelism this saturates the
                    // server and causes sporadic detection timeouts.
                    if (response.body) {
                        response.body.cancel().catch(() => {});
                    }

                    // MJPEG streams use multipart/x-mixed-replace
                    if (contentType && contentType.includes('multipart/x-mixed-replace')) {
                        return 'mjpeg';
                    }

                    // Check for video formats
                    if (contentType && (contentType.includes('video/') || contentType.includes('application/vnd.apple.mpegurl'))) {
                        return 'video';
                    }

                    // If we can't determine from headers, return null and we'll try both
                    return null;
                } finally {
                    clearTimeout(timeoutId);
                }
            } catch (error) {
                // Ignore AbortError (expected on timeout)
                if (error.name !== 'AbortError') {
                    console.warn(`Failed to detect format for camera ${camera.id}:`, error);
                }
                // On error, return null and try both methods
                return null;
            }
        };

        // Try MJPEG
        const tryMjpeg = () => {
            mjpegAttempted = true;

            // Replace video element with img for MJPEG
            const currentElement = document.getElementById(`video-${camera.id}`);
            const img = document.createElement('img');
            img.className = 'camera-video';
            img.id = `video-${camera.id}`;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            img.crossOrigin = 'anonymous'; // Required for canvas recording

            currentElement.parentNode.replaceChild(img, currentElement);

            const onMjpegReady = () => {
                // Guard: may be called from multiple paths (onload, naturalWidth poll,
                // serverConfirmed fast-path, or probe below).
                if (this.app.cameraReady.get(camera.id)) return;

                this.app.cameraErrors.set(camera.id, false);
                this.app.cameraReady.set(camera.id, true);

                overlay.classList.add('hidden');
                streamStatus.textContent = 'Connected (MJPEG)';
                errorDetails = null;

                // Initialize recorder for MJPEG
                const recorder = new MjpegRecorder(img, camera.id, this.app.settings, this.app.cacheManager);
                this.app.videoRecorders.set(camera.id, recorder);

                // Apply rotation and mirroring (must be after recorder is created)
                this.applyRotation(camera.id, camera.rotation || 0);

                this.app.updateTagButtonVisibility();
            };

            img.onload = onMjpegReady;

            // naturalWidth polling: fires on browsers that update it for MJPEG (e.g. Chromium).
            const pollInterval = setInterval(() => {
                if (this.app.cameraConnections.get(camera.id) === false) {
                    clearInterval(pollInterval);
                    return;
                }
                if (this.app.cameraReady.get(camera.id)) {
                    clearInterval(pollInterval);
                    return;
                }
                if (img.naturalWidth > 0) {
                    clearInterval(pollInterval);
                    onMjpegReady();
                }
            }, 100);

            img.src = camera.url;

            if (serverConfirmed) {
                // Fast-path for headless browsers (e.g. WebKit) that never expose MJPEG frame
                // state via img.onload or naturalWidth.  Format detection already issued a GET
                // to the stream URL and received a 200 OK with a multipart Content-Type, which
                // proves the server is alive and data is flowing.  We can therefore declare the
                // camera ready immediately without waiting for img rendering internals.
                img.onerror = () => {
                    clearInterval(pollInterval);
                    // Already confirmed live — WebKit fires onerror for MJPEG as a rendering
                    // limitation, not a real failure.  Ignore if already ready.
                    if (this.app.cameraConnections.get(camera.id) === false) return;
                    if (this.app.cameraReady.get(camera.id)) return;
                    // Shouldn't reach here normally, but guard anyway.
                    tryVideo();
                };
                onMjpegReady();
            } else {
                // Format detection timed out or returned null before reaching tryMjpeg.
                // Probe in parallel with img loading.  The probe drives the outcome:
                //   - probe ok + multipart  → onMjpegReady()
                //   - probe ok + other type → tryVideo()
                //   - probe fails/timeout   → tryVideo()
                // img.onerror is suppressed while the probe is pending so that
                // WebKit's spurious onerror for live MJPEG streams doesn't race
                // ahead and replace the img element before the probe resolves.
                let probeSettled = false;
                let videoFallbackCalled = false;

                const fallbackToVideo = () => {
                    if (videoFallbackCalled) return;
                    videoFallbackCalled = true;
                    tryVideo();
                };

                img.onerror = () => {
                    clearInterval(pollInterval);
                    if (this.app.cameraConnections.get(camera.id) === false) return;
                    if (this.app.cameraReady.get(camera.id)) return;
                    // Suppress the fallback until the probe has settled — WebKit fires
                    // onerror quickly for MJPEG, but the probe may still confirm liveness.
                    if (!probeSettled) return;
                    fallbackToVideo();
                };

                // Probe with retries: transient server load can cause a single probe
                // to time out even on localhost.  Retry up to MAX_PROBE_ATTEMPTS times
                // with a short per-attempt timeout so we recover quickly.
                const MAX_PROBE_ATTEMPTS = 4;
                const PROBE_ATTEMPT_TIMEOUT = 1500; // ms per attempt
                let probeAttempts = 0;

                const runProbe = () => {
                    probeAttempts++;
                    const probeCtrl = new AbortController();
                    const probeTimeout = setTimeout(() => probeCtrl.abort(), PROBE_ATTEMPT_TIMEOUT);
                    fetch(camera.url, { cache: 'no-cache', signal: probeCtrl.signal })
                        .then(resp => {
                            clearTimeout(probeTimeout);
                            probeSettled = true;
                            const ct = resp.headers.get('Content-Type') || '';
                            if (resp.body) resp.body.cancel().catch(() => {});
                            if (resp.ok && ct.includes('multipart/x-mixed-replace')) {
                                onMjpegReady();
                            } else {
                                fallbackToVideo();
                            }
                        })
                        .catch(() => {
                            clearTimeout(probeTimeout);
                            if (probeAttempts < MAX_PROBE_ATTEMPTS &&
                                    !this.app.cameraReady.get(camera.id) &&
                                    this.app.cameraConnections.get(camera.id) !== false) {
                                console.warn(`MJPEG probe attempt ${probeAttempts} failed for camera ${camera.id}, retrying…`);
                                setTimeout(runProbe, 100);
                            } else {
                                probeSettled = true;
                                fallbackToVideo();
                            }
                        });
                };

                runProbe();
            }
        };

        // Try regular video
        const tryVideo = () => {

            // Replace img element with video (if we came from MJPEG attempt)
            const currentElement = document.getElementById(`video-${camera.id}`);
            const videoElement = document.createElement('video');
            videoElement.className = 'camera-video';
            videoElement.id = `video-${camera.id}`;
            videoElement.muted = true;
            videoElement.autoplay = true;
            videoElement.setAttribute('playsinline', '');

            currentElement.parentNode.replaceChild(videoElement, currentElement);
            videoElement.src = camera.url;

            // Initialize video recorder
            const recorder = new VideoRecorder(videoElement, camera.id, this.app.settings, this.app.cacheManager);
            this.app.videoRecorders.set(camera.id, recorder);

            // Video event handlers
            videoElement.addEventListener('loadedmetadata', () => {
                // Video worked! Clear error state and mark as ready
                this.app.cameraErrors.set(camera.id, false);
                this.app.cameraReady.set(camera.id, true);

                overlay.classList.add('hidden');
                streamStatus.textContent = 'Connected';
                errorDetails = null;

                // Apply rotation and mirroring
                this.applyRotation(camera.id, camera.rotation || 0);

                        this.app.updateTagButtonVisibility();
            });

            videoElement.addEventListener('error', (e) => {
                if (this.app.cameraConnections.get(camera.id) === false) {
                    return;
                }

                // If we haven't tried MJPEG yet, try it as fallback
                if (!mjpegAttempted) {
                    tryMjpeg();
                    return;
                }

                // Both MJPEG and video failed, show error
                this.app.cameraErrors.set(camera.id, true);
                this.app.cameraReady.set(camera.id, false);

                overlay.classList.remove('hidden');
                overlay.innerHTML = '<span class="material-icons" style="font-size: 48px; cursor: pointer;" title="Click for error details">error</span>';
                streamStatus.textContent = 'Error loading stream';
                recordingIndicator.classList.add('hidden');

                const mediaError = videoElement.error;
                let errorMessage = 'Unknown error';
                if (mediaError) {
                    switch(mediaError.code) {
                        case mediaError.MEDIA_ERR_ABORTED:
                            errorMessage = 'Media loading aborted';
                            break;
                        case mediaError.MEDIA_ERR_NETWORK:
                            errorMessage = 'Network error while loading media';
                            break;
                        case mediaError.MEDIA_ERR_DECODE:
                            errorMessage = 'Media decoding error';
                            break;
                        case mediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                            errorMessage = 'Media format not supported';
                            break;
                    }
                    if (mediaError.message) {
                        errorMessage += ': ' + mediaError.message;
                    }
                }

                errorDetails = `Error loading stream from ${camera.url}\n\nError: ${errorMessage}\nError code: ${mediaError ? mediaError.code : 'N/A'}\n\nTried: ${mjpegAttempted ? 'MJPEG and Video' : 'Video only'}\n\nPossible causes:\n- Camera is offline or unreachable\n- Unsupported video format\n- CORS policy blocking the request\n- Network connectivity issues`;
                console.error(`Stream error for camera ${camera.id}:`, errorDetails, e);

                        this.app.updateTagButtonVisibility();
            });

            videoElement.addEventListener('play', () => {
                overlay.classList.add('hidden');
            });

            videoElement.addEventListener('waiting', () => {
                // Optional: show buffering state
            });
        };

        // Click handler for showing error details
        const videoContainer = document.querySelector(`#camera-${camera.id} .camera-video-container`);
        if (videoContainer) {
            videoContainer.addEventListener('click', () => {
                if (errorDetails) {
                    alert(errorDetails);
                }
            });
        }

        // Detect format and start with appropriate player
        (async () => {
            const detectedFormat = await detectStreamFormat();

            if (detectedFormat === 'mjpeg') {
                tryMjpeg();
            } else if (detectedFormat === 'video') {
                tryVideo();
            } else {
                // Could not detect format, try video first (most common), fallback to MJPEG if it fails
                tryVideo();
            }
        })();
    }

    reloadVideoStream(cameraId) {
        const camera = this.app.cameraManager.getCamera(cameraId);
        if (!camera) return;

        const videoElement = document.getElementById(`video-${camera.id}`);
        const streamStatus = document.getElementById(`stream-status-${camera.id}`);
        const overlay = document.getElementById(`overlay-${camera.id}`);

        streamStatus.textContent = 'Reloading...';
        overlay.classList.remove('hidden');
        overlay.innerHTML = '<div class="spinner"></div>';

        // Clear error state and mark as not ready on reload attempt
        this.app.cameraErrors.set(cameraId, false);
        this.app.cameraReady.set(cameraId, false);

        // Stop current recorder
        const recorder = this.app.videoRecorders.get(cameraId);
        if (recorder) {
            recorder.stop();
        }

        // Reload the stream
        if (videoElement.tagName === 'IMG') {
            // MJPEG - force reload by adding timestamp
            const url = new URL(camera.url);
            url.searchParams.set('_t', Date.now());
            videoElement.src = url.toString();
        } else {
            // Regular video - reload
            videoElement.load();
        }

        // Update button visibility
        this.app.updateTagButtonVisibility();
    }

    toggleCameraConnection(cameraId) {
        const isConnected = this.app.cameraConnections.get(cameraId) !== false; // default to connected

        if (isConnected) {
            this.disconnectCamera(cameraId);
        } else {
            this.reconnectCamera(cameraId);
        }
    }

    disconnectCamera(cameraId) {
        const camera = this.app.cameraManager.getCamera(cameraId);
        if (!camera) return;

        // Stop recording if active
        const recordBtn = document.getElementById(`record-btn-${cameraId}`);
        if (recordBtn && recordBtn.classList.contains('recording')) {
            this.app.toggleRecording(cameraId);
        }

        const videoElement = document.getElementById(`video-${camera.id}`);
        const disconnectBtn = document.getElementById(`disconnect-btn-${camera.id}`);
        const statusDot = document.getElementById(`status-dot-${camera.id}`);
        const videoContainer = document.getElementById(`video-container-${camera.id}`);
        const controlsContainer = document.getElementById(`controls-${camera.id}`);
        const streamStatus = document.getElementById(`stream-status-${camera.id}`);

        // Mark as disconnected first (important for error handlers)
        this.app.cameraConnections.set(cameraId, false);

        // Clear error state and ready state when disconnecting
        this.app.cameraErrors.set(cameraId, false);
        this.app.cameraReady.set(cameraId, false);

        // Save disconnected status
        this.app.cameraManager.updateCamera(cameraId, { isConnected: false, isRecording: false });

        // Stop current recorder
        const recorder = this.app.videoRecorders.get(cameraId);
        if (recorder) {
            recorder.stop();
        }

        // Clear video source
        if (videoElement) {
            if (videoElement.tagName === 'IMG') {
                // MJPEG - clear src
                videoElement.src = '';
            } else {
                // Regular video - clear src and stop
                videoElement.src = '';
                videoElement.load();
            }
        }

        // Update button
        if (disconnectBtn) disconnectBtn.title = 'Reconnect Camera';

        // Update status dot to red
        if (statusDot) statusDot.classList.add('disconnected');

        // Hide video container, stream status, and controls
        if (streamStatus) streamStatus.style.display = 'none';
        if (videoContainer) videoContainer.style.display = 'none';
        if (controlsContainer) controlsContainer.style.display = 'none';

        this.app.updateTagButtonVisibility();
    }

    reconnectCamera(cameraId) {
        const camera = this.app.cameraManager.getCamera(cameraId);
        if (!camera) return;

        const videoElement = document.getElementById(`video-${camera.id}`);
        const overlay = document.getElementById(`overlay-${camera.id}`);
        const disconnectBtn = document.getElementById(`disconnect-btn-${camera.id}`);
        const statusDot = document.getElementById(`status-dot-${camera.id}`);
        const videoContainer = document.getElementById(`video-container-${camera.id}`);
        const controlsContainer = document.getElementById(`controls-${camera.id}`);
        const streamStatus = document.getElementById(`stream-status-${camera.id}`);

        // Show video container, stream status, and controls
        if (streamStatus) {
            streamStatus.style.display = 'block';
            streamStatus.textContent = 'Connecting...';
        }
        if (videoContainer) videoContainer.style.display = 'block';
        if (controlsContainer) controlsContainer.style.display = 'block';

        // Update UI to show connecting
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.innerHTML = '<div class="spinner"></div>';
        }

        // Update button
        if (disconnectBtn) disconnectBtn.title = 'Disconnect Camera';

        // Update status dot to green
        if (statusDot) statusDot.classList.remove('disconnected');

        // Mark as connected
        this.app.cameraConnections.set(cameraId, true);

        // Save connected status
        this.app.cameraManager.updateCamera(cameraId, { isConnected: true });

        // Check if the camera was never initialized (e.g., page loaded with camera disconnected)
        // If no recorder exists, we need to initialize the video player from scratch
        const recorder = this.app.videoRecorders.get(cameraId);
        if (!recorder) {
            // Camera was never initialized - run full initialization
            this.initializeVideoPlayer(camera);
            return;
        }

        // Reconnect the stream
        if (videoElement) {
            if (videoElement.tagName === 'IMG') {
                // MJPEG - create a fresh img element to ensure onload fires reliably
                const url = new URL(camera.url);
                url.searchParams.set('_t', Date.now());

                const img = document.createElement('img');
                img.className = 'camera-video';
                img.id = `video-${camera.id}`;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                img.crossOrigin = 'anonymous';

                videoElement.parentNode.replaceChild(img, videoElement);

                const onMjpegReady = () => {
                    if (this.app.cameraReady.get(cameraId)) return;
                    this.app.cameraErrors.set(cameraId, false);
                    this.app.cameraReady.set(cameraId, true);
                    if (overlay) overlay.classList.add('hidden');
                    if (streamStatus) streamStatus.textContent = 'Connected (MJPEG)';
                    this.app.updateTagButtonVisibility();
                };

                img.onload = onMjpegReady;

                // Polling fallback: Chromium doesn't fire img.onload for MJPEG streams
                const pollInterval = setInterval(() => {
                    if (this.app.cameraConnections.get(cameraId) === false) {
                        clearInterval(pollInterval);
                        return;
                    }
                    if (this.app.cameraReady.get(cameraId)) {
                        clearInterval(pollInterval);
                        return;
                    }
                    if (img.naturalWidth > 0) {
                        clearInterval(pollInterval);
                        onMjpegReady();
                    }
                }, 100);

                // Streaming probe to confirm the reconnected stream is live.
                // On Chromium, reader.read() returns bytes immediately.
                // On WebKit, multipart body streaming throws "Load failed", but resp.ok
                // (200 OK with multipart Content-Type) is itself confirmation the server
                // is alive, so we fire onMjpegReady in that case too.
                const probeController = new AbortController();
                (async () => {
                    try {
                        const resp = await fetch(url.toString(), {
                            cache: 'no-cache',
                            signal: probeController.signal
                        });
                        if (!resp.ok) return;
                        let dataConfirmed = false;
                        if (resp.body) {
                            try {
                                const reader = resp.body.getReader();
                                const { done, value } = await reader.read();
                                reader.cancel().catch(() => {});
                                dataConfirmed = !done && value && value.length > 0;
                            } catch (_) {
                                // WebKit cannot stream multipart — resp.ok is confirmation.
                                dataConfirmed = true;
                            }
                        } else {
                            dataConfirmed = true;
                        }
                        if (dataConfirmed) {
                            clearInterval(pollInterval);
                            onMjpegReady();
                        }
                    } catch (e) {
                        // AbortError on disconnect; other errors ignored.
                    }
                })();

                img.onerror = () => {
                    clearInterval(pollInterval);
                    probeController.abort();
                };

                img.src = url.toString();

                // Re-apply rotation/mirroring to the new element
                this.applyRotation(cameraId, camera.rotation || 0);
            } else {
                // Regular video - reload
                videoElement.src = camera.url;
                videoElement.load();
            }
        }

        this.app.updateTagButtonVisibility();
    }

    updateEmptyState() {
        const hasCameras = this.app.cameraManager.getAllCameras().length > 0;

        if (hasCameras) {
            this.app.emptyState.classList.add('hidden');
            this.app.cameraGrid.classList.remove('hidden');
            this.app.addCameraCard.classList.remove('hidden');
        } else {
            this.app.emptyState.classList.remove('hidden');
            this.app.cameraGrid.classList.add('hidden');
            this.app.addCameraCard.classList.add('hidden');
        }
    }
}
