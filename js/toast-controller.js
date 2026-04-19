/**
 * ToastController - manages the toast notification banner.
 */
class ToastController {
    constructor() {
        this.el = document.getElementById('toast');
        this.messageEl = document.getElementById('toastMessage');
        this._timeout = null;
    }

    show(message, duration = 3000) {
        if (this._timeout) clearTimeout(this._timeout);
        this.messageEl.textContent = message;
        this.el.classList.add('show');
        this._timeout = setTimeout(() => {
            this.el.classList.remove('show');
            this._timeout = null;
        }, duration);
    }
}
