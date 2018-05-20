// Type definitions for update-electron-app 1.1.2
// Project: https://github.com/electron/update-electron-app
// Definitions by: HashimotoYT <hashimoto.stream@gmail.com>

declare function updater(
    opts?: {
        repo?: string,
        host?: string,
        updateInterval?: string,
        logger?: Object
    }
): any

export = updater;
