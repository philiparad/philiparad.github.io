/* Milestone 48: capture bootstrap-time failures before any calculator module loads.
   No network, storage, telemetry or changes to calculator behavior. */
(function () {
    'use strict';
    const MAX_ERRORS = 20;
    const errors = [];
    function record(kind, description) {
        if (errors.length >= MAX_ERRORS) return;
        const message = String(description == null ? 'Unknown error' : description).slice(0, 500);
        errors.push(kind + ': ' + message);
    }
    Object.defineProperty(window, 'FX991_BOOT_DIAGNOSTICS', {
        value: Object.freeze({ errors }),
        configurable: false,
        enumerable: false,
        writable: false
    });
    window.addEventListener('error', function (event) {
        // Ignore unrelated resource-load errors; report JavaScript runtime errors.
        if (typeof event.message === 'string' && event.message) {
            record('error', event.message);
        }
    }, true);
    window.addEventListener('unhandledrejection', function (event) {
        const reason = event.reason;
        record('unhandledrejection', reason && reason.message ? reason.message : reason);
    });
}());
