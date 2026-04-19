/**
 * TagUI - UI rendering and interaction for the tags sidebar
 * Depends on: TagManager, CacheManager (via app)
 */
class TagUI {
    constructor(app) {
        this.app = app;
        this.tagManager = app.tagManager;
        this.cacheManager = app.cacheManager;
        this.tagsList = document.getElementById('tagsList');
        this.tagsEmpty = document.getElementById('tagsEmpty');
        this.deleteDateDialog = document.getElementById('deleteDateDialog');
        this.deleteDateTitle = document.getElementById('deleteDateTitle');
        this.deleteDateType = null;
        this.deleteDateValue = null;
    }

    // ========== Tags Management ==========

    loadTags() {
        // Clear existing content
        this.tagsList.innerHTML = '';

        const tags = this.tagManager.getAllTags();

        // Group tags by date
        const tagsByDate = Utils.groupByDate(tags);

        // Render tags with date separators
        tagsByDate.forEach(group => {
            // Add date separator
            const separator = Utils.createDateSeparator(group.date);
            this.tagsList.appendChild(separator);

            // Add tags for this date
            group.items.forEach(tag => {
                const tagItem = this.createTagItem(tag);
                this.tagsList.appendChild(tagItem);
            });
        });

        this.updateTagsEmptyState();
        this.updateTagFilterVisibility();
        this.applyTagFilters();

        // Generate missing thumbnails for tags
        tags.forEach(tag => {
            if (!tag.thumbnail) {
                this.generateMissingThumbnail(tag, 'tag');
            }
        });
    }

    async generateMissingThumbnail(item, itemType) {
        try {
            // Determine the correct clip ID to use
            const clipIdToUse = itemType === 'tag' ? (item.clipId || item.id) : (item.sessionId || item.id);

            console.log(`Attempting to generate thumbnail for ${itemType} ${item.id} using clipId: ${clipIdToUse}`);

            // Get the video data from cache
            const clipRecord = await this.cacheManager.getClip(clipIdToUse);
            if (!clipRecord) {
                console.warn(`No video data found in cache for ${itemType} ${item.id} (clipId: ${clipIdToUse})`);
                return;
            }

            console.log(`Found clip data for ${clipIdToUse}, type: ${clipRecord.metadata?.type}, data:`, clipRecord.data);

            let thumbnail = null;

            // Generate thumbnail based on type (use clipRecord.data not clipRecord.blob)
            if (clipRecord.metadata?.type === 'mjpeg-sequence' || clipRecord.metadata?.type === 'mjpeg-full-video') {
                // For MJPEG, use the first frame
                if (Array.isArray(clipRecord.data) && clipRecord.data.length > 0) {
                    console.log(`Generating thumbnail from MJPEG first frame for ${item.id}, frames: ${clipRecord.data.length}`);
                    thumbnail = await this.generateThumbnailFromFrame(clipRecord.data[0]);
                } else {
                    console.warn(`MJPEG clip has no frames: ${clipIdToUse}`, clipRecord.data);
                }
            } else {
                // For regular video
                console.log(`Generating thumbnail from video for ${item.id}`);
                thumbnail = await this.generateThumbnailFromVideo(clipRecord.data);
            }

            if (thumbnail) {
                console.log(`Successfully generated thumbnail for ${itemType} ${item.id}`);

                // Update the item
                item.thumbnail = thumbnail;

                // Save to storage
                if (itemType === 'tag') {
                    this.tagManager.updateTag(item.id, { thumbnail });
                } else if (itemType === 'fullvideo') {
                    // Update in fullVideoManager
                    const videos = this.app.fullVideoManager.getAllFullVideos();
                    const videoIndex = videos.findIndex(v => v.id === item.id);
                    if (videoIndex !== -1) {
                        videos[videoIndex].thumbnail = thumbnail;
                        this.app.fullVideoManager.saveToStorage();
                    }
                }

                // Update cache metadata
                await this.cacheManager.storeClip(clipIdToUse, item.cameraId, clipRecord.data, {
                    ...clipRecord.metadata,
                    thumbnail
                });

                // Update DOM element
                const element = document.getElementById(itemType === 'tag' ? `tag-${item.id}` : `fullvideo-${item.id}`);
                if (element) {
                    const imgElement = element.querySelector('.tag-thumbnail img');
                    if (imgElement) {
                        imgElement.src = thumbnail;
                        console.log(`Updated thumbnail in DOM for ${itemType} ${item.id}`);
                    }
                }
            } else {
                console.warn(`Failed to generate thumbnail for ${itemType} ${item.id}`);
            }
        } catch (error) {
            console.error(`Error generating thumbnail for ${itemType} ${item.id}:`, error);
        }
    }

    generateThumbnailFromFrame(frameBlob) {
        return Utils.thumbnailFromImageBlob(frameBlob);
    }

    generateThumbnailFromVideo(videoBlob) {
        return Utils.thumbnailFromVideoBlob(videoBlob);
    }

    toggleTagFilter(filterButton) {
        filterButton.classList.toggle('active');
        this.applyTagFilters();
    }

    applyTagFilters() {
        const filters = document.querySelectorAll('.tag-filter');
        const enabledCategories = new Set();

        filters.forEach(filter => {
            if (filter.classList.contains('active')) {
                enabledCategories.add(filter.dataset.category);
            }
        });

        // Show/hide tags based on enabled categories
        const tagItems = this.tagsList.querySelectorAll('.tag-item');
        tagItems.forEach(tagItem => {
            const category = tagItem.dataset.category;
            if (enabledCategories.has(category)) {
                tagItem.style.display = '';
            } else {
                tagItem.style.display = 'none';
            }
        });

        // Hide date separators that have no visible tags
        const dateSeparators = this.tagsList.querySelectorAll('.date-separator');
        dateSeparators.forEach(separator => {
            let nextElement = separator.nextElementSibling;
            let hasVisibleTags = false;

            while (nextElement && !nextElement.classList.contains('date-separator')) {
                if (nextElement.classList.contains('tag-item') && nextElement.style.display !== 'none') {
                    hasVisibleTags = true;
                    break;
                }
                nextElement = nextElement.nextElementSibling;
            }

            separator.style.display = hasVisibleTags ? '' : 'none';
        });

        this.updateTagsEmptyState();
    }

    updateTagFilterVisibility() {
        const tagLabelCount = this.app.settings.tagLabelCount || 4;
        const filters = document.querySelectorAll('.tag-filter');

        filters.forEach((filter, index) => {
            if (index < tagLabelCount) {
                filter.style.display = '';
            } else {
                filter.style.display = 'none';
            }
        });
    }

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

    renderTag(tag) {
        const tagDate = Utils.getDateString(new Date(tag.timestamp));
        Utils.renderItemIntoDateList(this.tagsList, tagDate, this.createTagItem(tag));
    }

    createTagItem(tag) {
        const item = document.createElement('div');
        item.className = 'tag-item';
        item.id = `tag-${tag.id}`;

        // Add category data attribute for filtering
        const category = tag.label || 'A';
        item.dataset.category = category;

        const date = new Date(tag.timestamp);
        const timeStr = Utils.formatTime(date);
        const dateStr = Utils.formatDate(date);

        const preTag = tag.preTagDuration || 0;
        const postTag = tag.postTagDuration || 0;
        const durationFormatted = typeof tag.duration === 'number' ? tag.duration.toFixed(1) : tag.duration;
        const durationText = preTag > 0 || postTag > 0
            ? `${durationFormatted}s (-${preTag}s / +${postTag}s)`
            : `${durationFormatted}s`;

        // Show both duration and frame count for MJPEG, duration and size for regular video
        const sizeStr = tag.isMjpeg
            ? (tag.frameCount ? `${durationFormatted}s (${tag.frameCount} frames)` : `${durationFormatted}s (Loading ...)`)
            : `${durationFormatted}s (${Utils.formatBytes(tag.size)})`;

        // Get color for this category
        const categoryColor = VideoTaggerApp.TAG_COLORS[category] || '#999';

        item.innerHTML = `
            <div class="tag-category-indicator" style="background-color: ${categoryColor};" title="Category ${category}">
                ${category}
            </div>
            <div class="tag-thumbnail">
                <img src="${tag.thumbnail || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'90\'%3E%3Crect width=\'120\' height=\'90\' fill=\'%23E7E0EC\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-family=\'Arial\' font-size=\'14\' fill=\'%2349454F\'%3ELoading...%3C/text%3E%3C/svg%3E'}" alt="Thumbnail" />
            </div>
            <div class="tag-content">
                <div class="tag-header">
                    <div class="tag-title" title="${Utils.escapeHtml(tag.filename)}">${Utils.escapeHtml(tag.filename)}</div>
                    <button class="tag-delete" data-tag-id="${tag.id}" title="Delete tag">
                        <span class="material-icons">delete</span>
                    </button>
                </div>
                <div class="tag-info">
                    <div class="tag-info-row">
                        <span class="material-icons">videocam</span>
                        <span>${Utils.escapeHtml(tag.cameraName)}</span>
                    </div>
                    <div class="tag-info-row">
                        <span class="material-icons">schedule</span>
                        <span>${timeStr} - ${dateStr}</span>
                    </div>
                    <div class="tag-info-row">
                        <span class="material-icons">timer</span>
                        <span>${sizeStr}</span>
                    </div>
                </div>
            </div>
        `;

        // Fetch actual duration from clip metadata and update if different
        if (tag.clipId) {
            this.cacheManager.getClip(tag.clipId).then(clip => {
                if (clip && clip.metadata && clip.metadata.duration !== undefined) {
                    const actualDuration = clip.metadata.duration;
                    if (Math.abs(actualDuration - tag.duration) > 0.1) {
                        // Update tag with actual duration
                        tag.duration = actualDuration;
                        if (clip.metadata.frameCount) {
                            tag.frameCount = clip.metadata.frameCount;
                        }
                        this.tagManager.saveToStorage();

                        // Update displayed duration
                        const sizeElement = item.querySelector('.tag-info-row:nth-child(3) span:nth-child(2)');
                        if (sizeElement) {
                            const newDurationFormatted = actualDuration.toFixed(1);
                            if (tag.isMjpeg && tag.frameCount) {
                                sizeElement.textContent = `${newDurationFormatted}s (${tag.frameCount} frames)`;
                            } else {
                                sizeElement.textContent = `${newDurationFormatted}s`;
                            }
                        }
                    }
                }
            }).catch(err => {
                console.error('Error fetching clip metadata for duration:', err);
            });
        }

        // Attach delete event listener
        item.querySelector('.tag-delete').addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.removeTag(tag.id);
        });

        // Attach click event to open video player
        item.addEventListener('click', (e) => {
            // Don't open if clicking the delete button
            if (e.target.closest('.tag-delete')) return;
            this.app.openVideoPlayer(tag);
        });

        return item;
    }

    async removeTag(tagId) {
        const tags = this.tagManager.getAllTags();
        const tag = tags.find(t => t.id === tagId);

        // Delete clip from cache if it exists
        if (tag && tag.clipId) {
            try {
                await this.cacheManager.deleteClip(tag.clipId);
                console.log('Deleted clip from cache:', tag.clipId);
            } catch (error) {
                console.error('Error deleting clip from cache:', error);
            }
        }

        // Get the date of the tag being removed
        const tagDate = tag ? Utils.getDateString(new Date(tag.timestamp)) : null;

        this.tagManager.removeTag(tagId);
        document.getElementById(`tag-${tagId}`)?.remove();

        // Clean up empty date separator if needed
        if (tagDate) {
            Utils.cleanupEmptyDateSeparator(this.tagsList, tagDate);
        }

        this.updateTagsEmptyState();
        this.app.updateTagButtonVisibility();
    }

    async clearAllTags() {
        if (!confirm('Clear all saved video tags? This cannot be undone.')) return;
        const tags = this.tagManager.getAllTags();

        this.tagManager.clearAll();

        // Delete all tag clips from cache
        for (const tag of tags) {
            if (tag.clipId) {
                try {
                    await this.cacheManager.deleteClip(tag.clipId);
                    console.log('Deleted clip from cache:', tag.clipId);
                } catch (error) {
                    console.error('Error deleting clip from cache:', error);
                }
            }
        }

        this.tagsList.innerHTML = '';
        this.updateTagsEmptyState();
        this.app.updateTagButtonVisibility();
    }

    openDeleteDateDialog(date, type) {
        this.deleteDateType = type;
        this.deleteDateValue = date;
        document.getElementById('deleteDateText').textContent = date;
        document.getElementById('deleteDateDialog').classList.add('active');
    }

    closeDeleteDateDialog() {
        document.getElementById('deleteDateDialog').classList.remove('active');
        this.deleteDateType = null;
        this.deleteDateValue = null;
    }

    async deleteTagsByDate(dateString) {
        const tags = this.tagManager.getAllTags();
        const tagsToDelete = tags.filter(tag => {
            const tagDate = new Date(tag.timestamp).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            return tagDate === dateString;
        });

        for (const tag of tagsToDelete) {
            if (tag.clipId) {
                try {
                    await this.cacheManager.deleteClip(tag.clipId);
                } catch (error) {
                    console.error('Error deleting clip from cache:', error);
                }
            }
            this.tagManager.removeTag(tag.id);
            const tagElement = this.tagsList.querySelector(`[data-tag-id="${tag.id}"]`);
            if (tagElement) {
                tagElement.remove();
            }
        }

        // Clean up the date separator
        Utils.cleanupEmptyDateSeparator(this.tagsList, dateString);
        this.updateTagsEmptyState();
        this.app.updateTagButtonVisibility();

        this.app.showToast(`Deleted ${tagsToDelete.length} video${tagsToDelete.length !== 1 ? 's' : ''} from ${dateString}`);
    }

    setupDateDeleteHandlers() {
        this.tagsList.addEventListener('click', (e) => {
            const dateDeleteBtn = e.target.closest('.date-delete-btn');
            if (dateDeleteBtn) {
                e.stopPropagation();
                const date = dateDeleteBtn.getAttribute('data-date');
                this.openDeleteDateDialog(date, 'tags');
            }
        });

        document.getElementById('fullVideosList').addEventListener('click', (e) => {
            const dateDeleteBtn = e.target.closest('.date-delete-btn');
            if (dateDeleteBtn) {
                e.stopPropagation();
                const date = dateDeleteBtn.getAttribute('data-date');
                this.openDeleteDateDialog(date, 'videos');
            }
        });
    }

    updateTagsEmptyState() {
        const hasTags = this.tagManager.getCount() > 0;
        const clearAllContainer = document.getElementById('clearAllTagsContainer');

        if (hasTags) {
            this.tagsEmpty.classList.add('hidden');
            this.tagsList.classList.remove('hidden');
            clearAllContainer.classList.remove('hidden');
        } else {
            this.tagsEmpty.classList.remove('hidden');
            this.tagsList.classList.add('hidden');
            clearAllContainer.classList.add('hidden');
        }
    }
}
