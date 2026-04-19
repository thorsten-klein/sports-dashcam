/**
 * Shared utility functions used across multiple modules.
 */
const Utils = {
    /**
     * Format a Date as YYYYMMDD{sep}HHMMSS.
     * Default separator '-' matches tag/video filenames in app.js and FullVideoManager.
     * Pass '_' for legacy VideoRecorder filenames.
     */
    formatTimestamp(date, sep = '-') {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}${sep}${hours}${minutes}${seconds}`;
    },

    /**
     * Generate a 120×90 JPEG thumbnail data-URL from a video Blob.
     * Returns null on failure.
     */
    thumbnailFromVideoBlob(videoBlob) {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const maxWidth = 120, maxHeight = 90;
            const video = document.createElement('video');
            video.muted = true;
            video.playsInline = true;
            video.preload = 'metadata';

            return new Promise((resolve, reject) => {
                let generated = false;
                const capture = () => {
                    if (generated) return;
                    generated = true;
                    let w = video.videoWidth, h = video.videoHeight;
                    if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
                    if (h > maxHeight) { w = (w * maxHeight) / h; h = maxHeight; }
                    canvas.width = w; canvas.height = h;
                    ctx.drawImage(video, 0, 0, w, h);
                    const thumb = canvas.toDataURL('image/jpeg', 0.7);
                    URL.revokeObjectURL(video.src);
                    resolve(thumb);
                };
                video.onloadeddata = () => { video.currentTime = 0.1; };
                video.onseeked = capture;
                video.onloadedmetadata = () => {
                    setTimeout(() => { if (!generated && video.readyState >= 2) capture(); }, 200);
                };
                video.onerror = (e) => {
                    URL.revokeObjectURL(video.src);
                    reject(new Error('Failed to load video: ' + (e.message || 'Unknown error')));
                };
                video.src = URL.createObjectURL(videoBlob);
                video.load();
            });
        } catch (error) {
            console.error('Error generating video thumbnail:', error);
            return Promise.resolve(null);
        }
    },

    /**
     * Generate a 120×90 JPEG thumbnail data-URL from an image Blob (e.g. MJPEG frame).
     * Returns null on failure.
     */
    thumbnailFromImageBlob(imageBlob) {
        return new Promise((resolve) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const maxWidth = 120, maxHeight = 90;

            img.onload = () => {
                let w = img.width, h = img.height;
                if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
                if (h > maxHeight) { w = (w * maxHeight) / h; h = maxHeight; }
                canvas.width = w; canvas.height = h;
                ctx.drawImage(img, 0, 0, w, h);
                URL.revokeObjectURL(img.src);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = () => {
                URL.revokeObjectURL(img.src);
                console.error('Error generating image thumbnail');
                resolve(null);
            };
            img.src = URL.createObjectURL(imageBlob);
        });
    },

    // ========== Shared UI helpers ==========

    /** Escape text for safe HTML insertion. */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /** Format a Date as "HH:MM:SS AM/PM". */
    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },

    /** Format a Date as "Mon DD, YYYY". */
    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    /** Format a byte count as a human-readable string. */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    /** Return 'YYYY-MM-DD' for a given Date. */
    getDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Group an array of objects (each with a .timestamp field) by date.
     * Returns [{date: 'YYYY-MM-DD', items: [...]}, ...] sorted newest-first.
     */
    groupByDate(items) {
        const groups = new Map();
        items.forEach(item => {
            const date = Utils.getDateString(new Date(item.timestamp));
            if (!groups.has(date)) groups.set(date, []);
            groups.get(date).push(item);
        });
        return Array.from(groups.entries())
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([date, items]) => ({ date, items }));
    },

    /**
     * Create a date-separator DOM element for use in tag/fullvideo lists.
     */
    createDateSeparator(dateString) {
        const separator = document.createElement('div');
        separator.className = 'date-separator';
        separator.setAttribute('data-date', dateString);
        separator.innerHTML = `
            <div class="date-separator-line"></div>
            <div class="date-separator-text-wrapper">
                <div class="date-separator-text">${dateString}</div>
                <button class="date-delete-btn" data-date="${dateString}" title="Delete all from ${dateString}">
                    <span class="material-icons">delete</span>
                </button>
            </div>
            <div class="date-separator-line"></div>
        `;
        return separator;
    },

    /**
     * Remove the date-separator for dateString from containerElement if no
     * sibling tag-item / fullvideo-item remains under it.
     */
    cleanupEmptyDateSeparator(containerElement, dateString) {
        const separator = containerElement.querySelector(`[data-date="${dateString}"]`);
        if (!separator) return;
        let hasItems = false;
        let next = separator.nextElementSibling;
        while (next) {
            if (next.classList.contains('date-separator')) break;
            if (next.classList.contains('tag-item') || next.id?.startsWith('fullvideo-')) {
                hasItems = true;
                break;
            }
            next = next.nextElementSibling;
        }
        if (!hasItems) separator.remove();
    },

    /**
     * Insert itemEl into listEl under the date-separator for dateString.
     * Creates the separator if it doesn't exist yet (newest-first ordering).
     */
    renderItemIntoDateList(listEl, dateString, itemEl) {
        const existingSeparator = listEl.querySelector(`[data-date="${dateString}"]`);
        if (!existingSeparator) {
            const separator = Utils.createDateSeparator(dateString);
            const firstChild = listEl.firstChild;
            if (firstChild) {
                listEl.insertBefore(separator, firstChild);
                listEl.insertBefore(itemEl, firstChild);
            } else {
                listEl.appendChild(separator);
                listEl.appendChild(itemEl);
            }
        } else {
            listEl.insertBefore(itemEl, existingSeparator.nextSibling);
        }
    }
};
