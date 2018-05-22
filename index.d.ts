// Type definitions for update-electron-app 1.1.2
// Project: https://github.com/electron/update-electron-app
// Definitions by: HashimotoYT <hashimoto.stream@gmail.com>

export function updater(
    opts?: {
        /**
         * @param {String} repo A GitHub repository in the format `owner/repo`.
         *                      Defaults to your `package.json`'s `"repository"` field
         */
        repo?: string;
        /**
         * @param {String} host Defaults to `https://update.electronjs.org`
         */
        host?: string;
        /**
         * @param {String} updateInterval How frequently to check for updates. Defaults to `10 minutes`.
         *                                Minimum allowed interval is `5 minutes`.
         */
        updateInterval?: string;
        /**
         * @param {Object} logger A custom logger object that defines a `log` function.
         *                        Defaults to `console`. See electron-log, a module
         *                        that aggregates logs from main and renderer processes into a single file.
         */
        logger?: ILogger;
    },
): void;

interface ILogger {
    log(message: string): void;
    info(message: string): void;
    error(message: string): void;
    warn(message: string): void;
}
