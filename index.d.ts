declare namespace updateElectronApp {
  export interface ILogger {
    log(message: string): void;
    info(message: string): void;
    error(message: string): void;
    warn(message: string): void;
  }

  export interface IUpdateElectronAppOptions<L = ILogger> {
    /**
     * @param {String} repo A GitHub repository in the format `owner/repo`.
     *                      Defaults to your `package.json`'s `"repository"` field
     */
    readonly repo?: string;
    /**
     * @param {String} host Defaults to `https://update.electronjs.org`
     */
    readonly host?: string;
    /**
     * @param {String} updateInterval How frequently to check for updates. Defaults to `10 minutes`.
     *                                Minimum allowed interval is `5 minutes`.
     */
    readonly updateInterval?: string;
    /**
     * @param {Object} logger A custom logger object that defines a `log` function.
     *                        Defaults to `console`. See electron-log, a module
     *                        that aggregates logs from main and renderer processes into a single file.
     */
    readonly logger?: L;
    /**
     * @param {Boolean} notifyUser Defaults to `true`.  When enabled the user will be
     *                             prompted to apply the update immediately after download.
     */
    readonly notifyUser?: boolean;
  }
}

declare function updater<L = updateElectronApp.ILogger>(
  opts?: updateElectronApp.IUpdateElectronAppOptions<L>
): void;

export = updater
