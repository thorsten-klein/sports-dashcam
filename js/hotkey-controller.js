/**
 * HotkeyController - Manages keyboard hotkeys and gesture detection
 */
class HotkeyController {
    constructor(app) {
        this.app = app;
        this.selectedTagForHotkey = null;
        this.currentDetectionTagLabel = null;
        this.pendingHotkey = null;
        this.hotkeyDetectionHandler = null;
        this.hotkeyPreventionHandler = null;
        this.gestureDetectionHandlers = null;
        this.gestureDetectorOverlay = null;
        this.tagChangeMenuCloseHandler = null;
        this.tagChangeMenuScrollHandler = null;
        this.gestureHandlers = null;
    }

    // ========== Hotkey Management ==========

    renderTagHotkeysList() {
        const container = document.getElementById('tagHotkeysList');
        container.innerHTML = '';

        // Get the current tag count from the input (for real-time updates)
        const currentTagCount = parseInt(this.app.tagLabelCountInput.value) || this.app.settings.tagLabelCount;

        // Remove duplicates by creating a unique key for each hotkey
        const uniqueHotkeys = [];
        const seen = new Set();

        this.app.settings.hotkeys.forEach(hotkey => {
            const key = `${hotkey.tagLabel}-${hotkey.type}-${hotkey.label}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueHotkeys.push(hotkey);
            }
        });

        // Sort by tagLabel (A-J)
        uniqueHotkeys.sort((a, b) => {
            const tagA = a.tagLabel || 'A';
            const tagB = b.tagLabel || 'A';
            return tagA.localeCompare(tagB);
        });

        // Create list items
        if (uniqueHotkeys.length === 0) {
            const empty = document.createElement('div');
            empty.style.padding = '24px';
            empty.style.textAlign = 'center';
            empty.style.color = 'var(--on-surface-variant)';
            empty.style.fontSize = '14px';
            empty.textContent = 'No hotkeys configured. Use the buttons below to add hotkeys.';
            container.appendChild(empty);
        } else {
            uniqueHotkeys.forEach(hotkey => {
                const item = this.createHotkeyItem(hotkey, currentTagCount);
                container.appendChild(item);
            });
        }
    }

    createHotkeyItem(hotkey, currentTagCount = null) {
        const hotkeyIndex = this.app.settings.hotkeys.indexOf(hotkey);

        const item = document.createElement('div');
        item.className = 'hotkey-item';

        // Column 1: Tag badge with optional disabled badge
        const tagColumn = document.createElement('div');
        tagColumn.className = 'tag-column';

        const tagBadge = document.createElement('div');
        tagBadge.className = 'tag-badge';
        tagBadge.textContent = hotkey.tagLabel || 'A';
        tagBadge.style.backgroundColor = this.getTagColor(hotkey.tagLabel || 'A');
        tagBadge.style.color = 'white';
        tagBadge.style.cursor = 'pointer';

        tagColumn.appendChild(tagBadge);

        // Check if tag is disabled based on current tag count
        const tagCount = currentTagCount !== null ? currentTagCount : this.app.settings.tagLabelCount;
        const allEnabledTags = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].slice(0, tagCount);
        const isEnabled = allEnabledTags.includes(hotkey.tagLabel);

        if (!isEnabled) {
            const disabledBadge = document.createElement('span');
            disabledBadge.className = 'disabled-badge';
            disabledBadge.textContent = 'DISABLED';
            tagColumn.appendChild(disabledBadge);
        }

        // Column 2: Hotkey info (type icon + label)
        const hotkeyInfo = document.createElement('div');
        hotkeyInfo.className = 'hotkey-info';

        const typeIcon = document.createElement('span');
        typeIcon.className = 'material-icons hotkey-type-icon';
        typeIcon.textContent = hotkey.type === 'gesture' ? 'gesture' : 'keyboard';

        const labelText = document.createElement('span');
        labelText.className = 'hotkey-label-text';
        labelText.textContent = hotkey.label;

        hotkeyInfo.appendChild(typeIcon);
        hotkeyInfo.appendChild(labelText);

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'hotkey-delete';
        deleteBtn.innerHTML = '<span class="material-icons">delete</span>';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeHotkey(hotkeyIndex);
        });

        item.appendChild(tagColumn);
        item.appendChild(hotkeyInfo);
        item.appendChild(deleteBtn);

        // Add click handler to tag badge after item is constructed
        this.addTagChangeHandlers(tagBadge, hotkey, item);

        return item;
    }

    addTagChangeHandlers(element, hotkey, hotkeyItem) {
        // Single click handler
        element.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showTagChangeMenu(hotkeyItem, hotkey);
        });
    }

    showTagChangeMenu(hotkeyItem, hotkey) {
        const menu = document.getElementById('tagChangeMenu');
        const badgesContainer = document.getElementById('tagChangeBadges');
        badgesContainer.innerHTML = '';

        // Get the current tag count from the input (for real-time updates)
        const currentTagCount = parseInt(this.app.tagLabelCountInput.value) || this.app.settings.tagLabelCount;
        const allTags = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].slice(0, currentTagCount);

        allTags.forEach(tag => {
            const badge = document.createElement('div');
            badge.className = 'tag-change-badge';
            badge.textContent = tag;
            badge.style.backgroundColor = this.getTagColor(tag);

            badge.addEventListener('click', () => {
                // Update the hotkey's tag
                hotkey.tagLabel = tag;
                this.app.saveSettingsToStorage();
                this.renderHotkeysList();
                this.hideTagChangeMenu();
            });

            badgesContainer.appendChild(badge);
        });

        // Position the menu below and aligned with the hotkey item.
        // Use viewport coordinates with position:fixed so the dialog's
        // overflow:auto cannot clip the menu.
        const itemRect = hotkeyItem.getBoundingClientRect();

        let left = itemRect.left;
        let top = itemRect.bottom;

        // Clamp so the menu doesn't overflow the right edge of the viewport
        const menuWidth = itemRect.width;
        if (left + menuWidth > window.innerWidth) {
            left = window.innerWidth - menuWidth - 8;
        }

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.style.width = `${menuWidth}px`;

        menu.classList.remove('hidden');

        // Close menu when clicking outside or scrolling
        const closeHandler = (e) => {
            if (!menu.contains(e.target)) {
                this.hideTagChangeMenu();
                this.removeTagChangeMenuListeners();
            }
        };

        const scrollHandler = () => {
            this.hideTagChangeMenu();
            this.removeTagChangeMenuListeners();
        };

        // Store handlers for cleanup
        this.tagChangeMenuCloseHandler = closeHandler;
        this.tagChangeMenuScrollHandler = scrollHandler;

        // Delay to avoid immediate close from the same click
        setTimeout(() => {
            document.addEventListener('click', closeHandler);
            document.addEventListener('mousedown', closeHandler);
            document.addEventListener('scroll', scrollHandler, true); // Use capture phase to catch all scroll events
        }, 100);
    }

    removeTagChangeMenuListeners() {
        if (this.tagChangeMenuCloseHandler) {
            document.removeEventListener('click', this.tagChangeMenuCloseHandler);
            document.removeEventListener('mousedown', this.tagChangeMenuCloseHandler);
            this.tagChangeMenuCloseHandler = null;
        }
        if (this.tagChangeMenuScrollHandler) {
            document.removeEventListener('scroll', this.tagChangeMenuScrollHandler, true);
            this.tagChangeMenuScrollHandler = null;
        }
    }

    hideTagChangeMenu() {
        const menu = document.getElementById('tagChangeMenu');
        menu.classList.add('hidden');
        this.removeTagChangeMenuListeners();
    }

    getTagColor(tagLabel) {
        const colors = {
            'A': '#F44336',
            'B': '#2196F3',
            'C': '#4CAF50',
            'D': '#FF9800',
            'E': '#9C27B0',
            'F': '#00BCD4',
            'G': '#FFEB3B',
            'H': '#E91E63',
            'I': '#795548',
            'J': '#607D8B'
        };
        return colors[tagLabel] || '#9E9E9E';
    }

    renderHotkeysList() {
        // Deprecated - redirect to new method
        this.renderTagHotkeysList();
    }

    populateTagSelector() {
        const tagSelector = document.getElementById('tagSelector');
        tagSelector.innerHTML = '';

        // Get the current value from the input field (not saved settings)
        const currentTagCount = parseInt(this.app.tagLabelCountInput.value) || this.app.settings.tagLabelCount;
        const allTags = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].slice(0, currentTagCount);

        // Track selected tag (default to first tag)
        if (!this.selectedTagForHotkey || !allTags.includes(this.selectedTagForHotkey)) {
            this.selectedTagForHotkey = allTags[0];
        }

        allTags.forEach(tag => {
            const badge = document.createElement('div');
            badge.className = 'tag-selector-badge';
            badge.textContent = tag;
            badge.style.backgroundColor = this.getTagColor(tag);

            // Mark as selected if this is the selected tag
            if (tag === this.selectedTagForHotkey) {
                badge.classList.add('selected');
            }

            // Click handler to select this tag
            badge.addEventListener('click', () => {
                // Remove selected class from all badges
                tagSelector.querySelectorAll('.tag-selector-badge').forEach(b => {
                    b.classList.remove('selected');
                });
                // Add selected class to this badge
                badge.classList.add('selected');
                this.selectedTagForHotkey = tag;
            });

            tagSelector.appendChild(badge);
        });
    }

    startHotkeyDetection(tagLabel = 'A') {
        const detector = document.getElementById('hotkeyDetector');
        const debugInfo = document.getElementById('hotkeyDebugInfo');
        const message = document.getElementById('hotkeyDetectorMessage');
        const cancelBtn = document.getElementById('cancelDetectHotkey');
        const confirmBtn = document.getElementById('confirmDetectHotkey');

        detector.classList.remove('hidden');
        debugInfo.style.display = 'none';
        message.textContent = 'Press any key combination...';
        confirmBtn.classList.add('hidden');

        // Store tagLabel for use in the handler
        this.currentDetectionTagLabel = tagLabel;
        this.pendingHotkey = null;

        // Prevent ALL key events during detection to avoid browser shortcuts
        const preventAllKeys = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        const handleKeyPress = (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Only proceed if a non-modifier key is pressed
            // This allows users to press Ctrl, Shift, Alt first, then the actual key
            if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
                // Just update the display, don't capture yet
                return;
            }

            const parts = [];
            if (e.ctrlKey) parts.push('Ctrl');
            if (e.altKey) parts.push('Alt');
            if (e.shiftKey) parts.push('Shift');
            if (e.metaKey) parts.push('Meta');

            // Add the actual key (capitalize single letters)
            let keyName = e.key === ' ' ? 'Space' : e.key;
            if (keyName.length === 1 && keyName >= 'a' && keyName <= 'z') {
                keyName = keyName.toUpperCase();
            }
            parts.push(keyName);

            const label = parts.join('+');
            const hotkey = {
                type: 'keyboard',
                label: label,
                ctrlKey: e.ctrlKey,
                altKey: e.altKey,
                shiftKey: e.shiftKey,
                metaKey: e.metaKey,
                key: e.key,
                code: e.code, // Also store code for backup matching
                keyCode: e.keyCode, // Store keyCode for legacy support
                tagLabel: this.currentDetectionTagLabel
            };

            // Store the hotkey for confirmation
            this.pendingHotkey = hotkey;

            // Show confirmation UI (but keep listening for updates)
            const message = document.getElementById('hotkeyDetectorMessage');
            const confirmBtn = document.getElementById('confirmDetectHotkey');

            message.textContent = `Detected: ${label}`;
            confirmBtn.classList.remove('hidden');
        };

        // Install prevention handlers first (capture phase)
        document.addEventListener('keydown', preventAllKeys, { capture: true });
        document.addEventListener('keyup', preventAllKeys, { capture: true });

        this.hotkeyDetectionHandler = handleKeyPress;
        this.hotkeyPreventionHandler = preventAllKeys;
        document.addEventListener('keydown', handleKeyPress, { capture: true });
    }

    cancelHotkeyDetection() {
        const detector = document.getElementById('hotkeyDetector');
        const debugInfo = document.getElementById('hotkeyDebugInfo');
        detector.classList.add('hidden');
        if (debugInfo) {
            debugInfo.style.display = 'none';
        }
        if (this.hotkeyDetectionHandler) {
            document.removeEventListener('keydown', this.hotkeyDetectionHandler, true);
            this.hotkeyDetectionHandler = null;
        }
        if (this.hotkeyPreventionHandler) {
            document.removeEventListener('keydown', this.hotkeyPreventionHandler, true);
            document.removeEventListener('keyup', this.hotkeyPreventionHandler, true);
            this.hotkeyPreventionHandler = null;
        }
        this.pendingHotkey = null;
    }

    async confirmHotkeyDetection() {
        if (this.pendingHotkey) {
            await this.addHotkeyWithConflictCheck(this.pendingHotkey);
            this.pendingHotkey = null;
        }
        this.cancelHotkeyDetection();
    }

    startGestureDetection(tagLabel = 'A') {
        const detector = document.getElementById('gestureDetector');
        detector.classList.remove('hidden');

        // Store tagLabel for use in the handler
        this.currentDetectionTagLabel = tagLabel;

        let mouseStartTime = 0;
        let mouseStartX = 0;
        let mouseStartY = 0;
        let clickCount = 0;
        let clickTimer = null;

        const handleMouseDown = (e) => {
            mouseStartTime = Date.now();
            mouseStartX = e.clientX;
            mouseStartY = e.clientY;

            // Count clicks
            clickCount++;
            clearTimeout(clickTimer);
            clickTimer = setTimeout(() => {
                clickCount = 0;
            }, 500);
        };

        const handleMouseUp = (e) => {
            const mouseEndTime = Date.now();
            const mouseEndX = e.clientX;
            const mouseEndY = e.clientY;

            const duration = mouseEndTime - mouseStartTime;
            const deltaX = mouseEndX - mouseStartX;
            const deltaY = mouseEndY - mouseStartY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            let gesture = null;

            // Long press (hold for > 500ms)
            if (duration > 500 && distance < 30) {
                gesture = {
                    type: 'gesture',
                    label: 'Long Press',
                    gestureType: 'longpress',
                    tagLabel: this.currentDetectionTagLabel
                };
            }
            // Swipe detection
            else if (distance > 100) {
                const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
                let direction;
                if (angle > -45 && angle <= 45) direction = 'Right';
                else if (angle > 45 && angle <= 135) direction = 'Down';
                else if (angle > -135 && angle <= -45) direction = 'Up';
                else direction = 'Left';

                gesture = {
                    type: 'gesture',
                    label: `Swipe ${direction}`,
                    gestureType: 'swipe',
                    direction: direction.toLowerCase(),
                    tagLabel: this.currentDetectionTagLabel
                };
            }
            // Multi-click
            else if (clickCount >= 2) {
                gesture = {
                    type: 'gesture',
                    label: `${clickCount} Clicks`,
                    gestureType: 'multiclick',
                    clicks: clickCount,
                    tagLabel: this.currentDetectionTagLabel
                };
            }

            if (gesture) {
                this.addHotkeyWithConflictCheck(gesture).then(() => {
                    this.cancelGestureDetection();
                });
            }
        };

        const detectorOverlay = detector.querySelector('.detector-overlay');
        detectorOverlay.addEventListener('mousedown', handleMouseDown);
        detectorOverlay.addEventListener('mouseup', handleMouseUp);

        this.gestureDetectionHandlers = { mouseDown: handleMouseDown, mouseUp: handleMouseUp };
        this.gestureDetectorOverlay = detectorOverlay;
    }

    cancelGestureDetection() {
        const detector = document.getElementById('gestureDetector');
        detector.classList.add('hidden');

        if (this.gestureDetectionHandlers && this.gestureDetectorOverlay) {
            this.gestureDetectorOverlay.removeEventListener('mousedown', this.gestureDetectionHandlers.mouseDown);
            this.gestureDetectorOverlay.removeEventListener('mouseup', this.gestureDetectionHandlers.mouseUp);
            this.gestureDetectionHandlers = null;
            this.gestureDetectorOverlay = null;
        }
    }

    removeHotkey(index) {
        this.app.settings.hotkeys.splice(index, 1);
        this.app.saveSettingsToStorage();
        this.renderHotkeysList();
    }

    /**
     * Check if a hotkey conflicts with an existing one
     * Returns the conflicting hotkey info or null
     */
    findConflictingHotkey(newHotkey) {
        return this.app.settings.hotkeys.find(existing => {
            // Skip if same tag
            if (existing.tagLabel === newHotkey.tagLabel) {
                return false;
            }

            // For keyboard hotkeys
            if (newHotkey.type === 'keyboard' && existing.type === 'keyboard') {
                // Match by key + modifiers
                return existing.key === newHotkey.key &&
                       existing.ctrlKey === newHotkey.ctrlKey &&
                       existing.altKey === newHotkey.altKey &&
                       existing.shiftKey === newHotkey.shiftKey &&
                       existing.metaKey === newHotkey.metaKey;
            }

            // For gestures
            if (newHotkey.type === 'gesture' && existing.type === 'gesture') {
                // Match by gesture type and details
                if (existing.gestureType !== newHotkey.gestureType) {
                    return false;
                }

                if (newHotkey.gestureType === 'swipe') {
                    return existing.direction === newHotkey.direction;
                } else if (newHotkey.gestureType === 'multiclick') {
                    return existing.clicks === newHotkey.clicks;
                } else if (newHotkey.gestureType === 'longpress') {
                    return true; // Only one long press
                }
            }

            return false;
        });
    }

    /**
     * Add a hotkey with conflict detection
     */
    async addHotkeyWithConflictCheck(hotkey) {
        const conflict = this.findConflictingHotkey(hotkey);

        if (conflict) {
            // Show confirmation dialog
            const message = `The hotkey "<strong>${hotkey.label}</strong>" is already assigned to <strong>Tag ${conflict.tagLabel}</strong>.<br><br>Do you want to reassign it to <strong>Tag ${hotkey.tagLabel}</strong>?<br><br>(The hotkey will be removed from Tag ${conflict.tagLabel})`;

            const confirmed = await this.showHotkeyConflictDialog(message);

            if (!confirmed) {
                // User cancelled
                return false;
            }

            // Remove the conflicting hotkey
            const conflictIndex = this.app.settings.hotkeys.indexOf(conflict);
            if (conflictIndex !== -1) {
                this.app.settings.hotkeys.splice(conflictIndex, 1);
            }
        }

        // Add the new hotkey
        this.app.settings.hotkeys.push(hotkey);
        this.app.saveSettingsToStorage();
        this.renderHotkeysList();
        return true;
    }

    showHotkeyConflictDialog(message, confirmText = 'Reassign') {
        return new Promise((resolve) => {
            const dialog = document.getElementById('hotkeyConflictDialog');
            const messageEl = document.getElementById('hotkeyConflictMessage');
            const confirmBtn = document.getElementById('confirmHotkeyConflict');
            const cancelBtn = document.getElementById('cancelHotkeyConflict');
            const closeBtn = document.getElementById('closeHotkeyConflictDialog');

            messageEl.innerHTML = message;
            confirmBtn.textContent = confirmText;
            dialog.classList.add('active');

            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                dialog.classList.remove('active');
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
                closeBtn.removeEventListener('click', handleCancel);
            };

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            closeBtn.addEventListener('click', handleCancel);
        });
    }

    async resetHotkeysToDefault() {
        const message = 'Reset all hotkeys to default settings?<br><br>This will remove all custom hotkeys.';
        const confirmed = await this.showHotkeyConflictDialog(message, 'Reset');

        if (!confirmed) {
            return;
        }

        // Get default hotkeys from settings controller
        const defaultHotkeys = [
            // Tag A - Swipe Left, 1, KeyA
            { type: 'gesture', label: 'Swipe Left', tagLabel: 'A', gestureType: 'swipe', direction: 'left' },
            { type: 'keyboard', label: '1', tagLabel: 'A', key: '1', code: 'Digit1', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
            { type: 'keyboard', label: 'a', tagLabel: 'A', key: 'a', code: 'KeyA', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },

            // Tag B - Swipe Right, 2, KeyB
            { type: 'gesture', label: 'Swipe Right', tagLabel: 'B', gestureType: 'swipe', direction: 'right' },
            { type: 'keyboard', label: '2', tagLabel: 'B', key: '2', code: 'Digit2', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
            { type: 'keyboard', label: 'b', tagLabel: 'B', key: 'b', code: 'KeyB', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },

            // Tag C - Swipe Up, 3, KeyC
            { type: 'gesture', label: 'Swipe Up', tagLabel: 'C', gestureType: 'swipe', direction: 'up' },
            { type: 'keyboard', label: '3', tagLabel: 'C', key: '3', code: 'Digit3', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
            { type: 'keyboard', label: 'c', tagLabel: 'C', key: 'c', code: 'KeyC', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },

            // Tag D - Swipe Down, 4, KeyD
            { type: 'gesture', label: 'Swipe Down', tagLabel: 'D', gestureType: 'swipe', direction: 'down' },
            { type: 'keyboard', label: '4', tagLabel: 'D', key: '4', code: 'Digit4', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
            { type: 'keyboard', label: 'd', tagLabel: 'D', key: 'd', code: 'KeyD', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },

            // Tag E - 5, KeyE
            { type: 'keyboard', label: '5', tagLabel: 'E', key: '5', code: 'Digit5', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
            { type: 'keyboard', label: 'e', tagLabel: 'E', key: 'e', code: 'KeyE', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },

            // Tag F - 6, KeyF
            { type: 'keyboard', label: '6', tagLabel: 'F', key: '6', code: 'Digit6', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
            { type: 'keyboard', label: 'f', tagLabel: 'F', key: 'f', code: 'KeyF', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },

            // Tag G - 7, KeyG
            { type: 'keyboard', label: '7', tagLabel: 'G', key: '7', code: 'Digit7', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
            { type: 'keyboard', label: 'g', tagLabel: 'G', key: 'g', code: 'KeyG', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },

            // Tag H - 8, KeyH
            { type: 'keyboard', label: '8', tagLabel: 'H', key: '8', code: 'Digit8', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
            { type: 'keyboard', label: 'h', tagLabel: 'H', key: 'h', code: 'KeyH', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },

            // Tag I - 9, KeyI
            { type: 'keyboard', label: '9', tagLabel: 'I', key: '9', code: 'Digit9', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
            { type: 'keyboard', label: 'i', tagLabel: 'I', key: 'i', code: 'KeyI', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },

            // Tag J - 0, KeyJ
            { type: 'keyboard', label: '0', tagLabel: 'J', key: '0', code: 'Digit0', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
            { type: 'keyboard', label: 'j', tagLabel: 'J', key: 'j', code: 'KeyJ', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false }
        ];

        this.app.settings.hotkeys = defaultHotkeys;
        this.app.saveSettingsToStorage();
        this.renderHotkeysList();
        this.app.showToast('Hotkeys reset to default');
    }

    setupGlobalHotkeyListeners() {
        // Click blocker when locked
        document.addEventListener('click', (e) => {
            if (this.app.isLocked && !e.target.closest('#unlockBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.app.showLockScreenGestureInfo('Click blocked - screen is locked');
            }
        }, true);

        // Keyboard listener
        document.addEventListener('keydown', (e) => {
            // Check if any dialog is open (skip hotkeys)
            if (document.querySelector('.dialog-overlay.active') && !this.app.isLocked) {
                return;
            }

            // Allow hotkeys when locked
            if (!this.app.isLocked && document.querySelector('.dialog-overlay.active')) {
                return;
            }

            // Log key press for debugging

            this.app.settings.hotkeys.forEach(hotkey => {
                if (hotkey.type === 'keyboard') {
                    // Check if modifier keys match
                    const ctrlMatch = hotkey.ctrlKey === e.ctrlKey;
                    const altMatch = hotkey.altKey === e.altKey;
                    const shiftMatch = hotkey.shiftKey === e.shiftKey;
                    const metaMatch = hotkey.metaKey === e.metaKey;

                    // Try multiple matching strategies for better compatibility
                    // 1. Try exact key match
                    let keyMatch = hotkey.key === e.key;

                    // 2. If no match, try code match (more reliable for physical keys)
                    if (!keyMatch && hotkey.code && e.code) {
                        keyMatch = hotkey.code === e.code;
                    }

                    // 3. If still no match, try keyCode (legacy, but some remotes use this)
                    if (!keyMatch && hotkey.keyCode && e.keyCode) {
                        keyMatch = hotkey.keyCode === e.keyCode;
                    }

                    // 4. Case-insensitive key match as fallback
                    if (!keyMatch && hotkey.key && e.key) {
                        keyMatch = hotkey.key.toLowerCase() === e.key.toLowerCase();
                    }

                    if (ctrlMatch && altMatch && shiftMatch && metaMatch && keyMatch) {
                        e.preventDefault();

                        // Show toast notification for detected hotkey
                        this.app.showToast(this.app.formatHotkeyDisplay(hotkey), 1500);

                        if (this.app.isLocked) {
                            this.app.showLockScreenGestureInfo(`Hotkey detected: ${this.app.formatHotkeyDisplay(hotkey)}`);
                        }
                        this.app.tagAllRecordingCameras();
                    }
                }
            });
        });

        // Shared gesture detection logic
        const processGesture = (startTime, startX, startY, endTime, endX, endY, eventSource) => {
            const duration = endTime - startTime;
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            // Update tap count only for actual taps (short duration and small distance)
            // NOT for swipes or long presses
            const isTap = distance < 30 && duration < 500;

            if (isTap) {
                const now = Date.now();
                const timeSinceLastTap = now - lastTapTime;

                if (timeSinceLastTap <= 300) {
                    tapCount++;
                } else {
                    tapCount = 1;
                }

                lastTapTime = now;

                clearTimeout(tapTimer);
                tapTimer = setTimeout(() => {
                    tapCount = 0;
                    lastTapTime = 0;
                }, 300);
            } else {
                // Not a tap, so don't count it
                // Reset tap count if this is a different gesture
                clearTimeout(tapTimer);
                tapCount = 0;
                lastTapTime = 0;
            }


            // First, detect what gesture was performed (if any)
            let detectedGesture = null;
            let detectedGestureName = '';

            // Check for swipe (distance > 100)
            if (distance > 100) {
                const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
                let direction;
                if (angle > -45 && angle <= 45) direction = 'right';
                else if (angle > 45 && angle <= 135) direction = 'down';
                else if (angle > -135 && angle <= -45) direction = 'up';
                else direction = 'left';

                detectedGesture = { type: 'swipe', direction: direction };
                detectedGestureName = `Swipe ${direction.charAt(0).toUpperCase() + direction.slice(1)}`;
            }
            // Check for long press (duration > 500ms and small movement)
            else if (duration > 500 && distance < 30) {
                detectedGesture = { type: 'longpress' };
                detectedGestureName = 'Long Press';
            }
            // Check for multi-tap (multiple taps in quick succession with small movement)
            else if (tapCount > 1 && distance < 30) {
                detectedGesture = { type: 'multiclick', count: tapCount };
                detectedGestureName = `${tapCount} Tap${tapCount > 1 ? 's' : ''}`;
            }

            // Show toast and log for any detected gesture
            if (detectedGesture) {
                this.app.showToast(detectedGestureName, 1500);
            } else {
            }

            // Now check if the detected gesture matches a configured hotkey
            if (detectedGesture) {
                this.app.settings.hotkeys.forEach(hotkey => {
                    if (hotkey.type === 'gesture') {
                        let match = false;

                        if (hotkey.gestureType === 'longpress' && detectedGesture.type === 'longpress') {
                            match = true;
                        } else if (hotkey.gestureType === 'swipe' && detectedGesture.type === 'swipe') {
                            if (hotkey.direction === detectedGesture.direction) {
                                match = true;
                            }
                        } else if ((hotkey.gestureType === 'multiclick' || hotkey.gestureType === 'multitap') && detectedGesture.type === 'multiclick') {
                            if ((hotkey.clicks || hotkey.taps) === detectedGesture.count) {
                                match = true;
                            }
                        }

                        if (match) {
                            if (this.app.isLocked) {
                                this.app.showLockScreenGestureInfo(`Gesture detected: ${detectedGestureName} - Tagging`);
                            }
                            this.app.tagAllRecordingCameras();
                        }
                    }
                });
            }
        };

        // Mouse/Touch gesture listener (unified)
        let gestureStartTime = 0;
        let gestureStartX = 0;
        let gestureStartY = 0;
        let tapCount = 0;
        let tapTimer = null;
        let lastTapTime = 0;

        // Handle both mouse and touch events with the same logic
        const handleGestureStart = (x, y, target) => {
            // Skip if clicking inside a dialog (unless locked, then still allow)
            if (!this.app.isLocked && target.closest('.dialog-overlay.active')) {
                return;
            }

            // Allow unlock button when locked
            if (this.app.isLocked && target.closest('#unlockBtn')) {
                return;
            }

            gestureStartTime = Date.now();
            gestureStartX = x;
            gestureStartY = y;

        };

        const handleGestureEnd = (x, y, target, eventSource) => {
            // Skip if clicking inside a dialog (unless locked)
            if (!this.app.isLocked && target.closest('.dialog-overlay.active')) {
                return;
            }

            // Allow unlock button when locked
            if (this.app.isLocked && target.closest('#unlockBtn')) {
                return;
            }

            const gestureEndTime = Date.now();

            processGesture(gestureStartTime, gestureStartX, gestureStartY, gestureEndTime, x, y, eventSource);
        };

        // Store gesture handlers for adding/removing on lock/unlock
        this.gestureHandlers = {
            mousedown: (e) => {
                if (!this.app.isLocked) return; // Only work when locked
                // Prevent text selection during gestures
                e.preventDefault();
                handleGestureStart(e.clientX, e.clientY, e.target);
            },
            mouseup: (e) => {
                if (!this.app.isLocked) return; // Only work when locked
                handleGestureEnd(e.clientX, e.clientY, e.target, 'mouse');
            },
            touchstart: (e) => {
                if (!this.app.isLocked) return; // Only work when locked
                if (e.touches.length > 0) {
                    // Prevent text selection and scrolling during gestures
                    e.preventDefault();
                    handleGestureStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
                }
            },
            touchend: (e) => {
                if (!this.app.isLocked) return; // Only work when locked
                if (e.changedTouches.length > 0) {
                    handleGestureEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY, e.target, 'touch');
                }
            }
        };

        // Gesture detection is only active when screen is locked
        // Listeners are added in lockScreen() and removed in unlockScreen()
    }
}
