/**
 * SettingsController - manages loading, saving and the settings dialog.
 *
 * Receives `app` for cross-module calls (renderHotkeysList, populateTagSelector,
 * videoRecorders, updateTagButtonVisibility).
 */

const DEFAULT_HOTKEYS = [
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

class SettingsController {
    constructor(app) {
        this.app = app;
        this.dialog = document.getElementById('settingsDialog');
        this.preTagInput = document.getElementById('preTagDuration');
        this.postTagInput = document.getElementById('postTagDuration');
        this.tagLabelCountInput = document.getElementById('tagLabelCount');
    }

    // ── Persistence ──────────────────────────────────────────────────────────

    load() {
        const defaultSettings = {
            preTagDuration: 10,
            postTagDuration: 2,
            hotkeys: DEFAULT_HOTKEYS,
            tagLabelCount: 4,
            enabledTags: ['A', 'B', 'C', 'D']
        };

        const saved = localStorage.getItem('videoTagger_settings');
        const settings = saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;

        if (!settings.hotkeys || settings.hotkeys.length === 0) {
            settings.hotkeys = DEFAULT_HOTKEYS;
        } else {
            // Migration: add tagLabel to existing hotkeys that don't have it
            settings.hotkeys = settings.hotkeys.map(hotkey =>
                hotkey.tagLabel ? hotkey : { ...hotkey, tagLabel: 'A' }
            );
        }

        if (!settings.enabledTags) {
            settings.enabledTags = ['A', 'B', 'C', 'D'].slice(0, settings.tagLabelCount);
        }

        return settings;
    }

    saveToStorage() {
        localStorage.setItem('videoTagger_settings', JSON.stringify(this.app.settings));
    }

    // ── Dialog ────────────────────────────────────────────────────────────────

    open() {
        this.preTagInput.value = this.app.settings.preTagDuration;
        this.postTagInput.value = this.app.settings.postTagDuration;
        this.tagLabelCountInput.value = this.app.settings.tagLabelCount;
        this.app.hotkeyController.renderHotkeysList();
        this.switchTab('general');
        this.dialog.classList.add('active');
    }

    close() {
        this.dialog.classList.remove('active');
    }

    adjustDuration(type, change) {
        const input = type === 'preTag' ? this.preTagInput : this.postTagInput;
        const newValue = Math.min(120, Math.max(0, (parseInt(input.value) || 10) + change));
        input.value = newValue;
    }

    adjustTagLabelCount(change) {
        const newValue = Math.min(10, Math.max(1, (parseInt(this.tagLabelCountInput.value) || 4) + change));
        this.tagLabelCountInput.value = newValue;
    }

    save() {
        const preTagDuration = parseInt(this.preTagInput.value);
        const postTagDuration = parseInt(this.postTagInput.value);
        const tagLabelCount = parseInt(this.tagLabelCountInput.value);

        if (preTagDuration < 0 || preTagDuration > 120 || postTagDuration < 0 || postTagDuration > 120) return;
        if (tagLabelCount < 1 || tagLabelCount > 10) return;

        const allTags = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        this.app.settings.preTagDuration = preTagDuration;
        this.app.settings.postTagDuration = postTagDuration;
        this.app.settings.tagLabelCount = tagLabelCount;
        this.app.settings.enabledTags = allTags.slice(0, tagLabelCount);
        this.saveToStorage();

        this.app.videoRecorders.forEach(recorder => recorder.updateSettings(this.app.settings));
        this.app.updateTagButtonVisibility();
        this.close();
    }

    switchTab(tab) {
        document.getElementById('generalSettingsTab').classList.toggle('active', tab === 'general');
        document.getElementById('hotkeySettingsTab').classList.toggle('active', tab === 'hotkey');
        document.getElementById('generalSettingsContent').classList.toggle('hidden', tab !== 'general');
        document.getElementById('hotkeySettingsContent').classList.toggle('hidden', tab !== 'hotkey');
        document.getElementById('hotkeyControlsBar').classList.toggle('hidden', tab !== 'hotkey');

        if (tab === 'hotkey') {
            this.app.hotkeyController.renderHotkeysList();
            this.app.hotkeyController.populateTagSelector();
        }
    }
}
