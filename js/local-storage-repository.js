/**
 * LocalStorageRepository - Base class for localStorage-backed data managers.
 * Subclasses must implement _getItems() returning the current data array,
 * and must call loadFromStorage() in their constructor.
 */
class LocalStorageRepository {
    constructor(storageKey) {
        this.storageKey = storageKey;
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error(`Error loading ${this.storageKey} from storage:`, error);
            return [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this._getItems()));
        } catch (error) {
            console.error(`Error saving ${this.storageKey} to storage:`, error);
        }
    }

    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
}
