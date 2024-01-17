import assert from 'assert';
import isURL from 'is-url';
import ms from 'ms';
import gh from 'github-url-to-object';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { format } from 'util';

import { app } from 'electron';

export interface ILogger {
  log(message: string): void;
  info(message: string): void;
  error(message: string): void;
  warn(message: string): void;
}

export enum UpdateSourceType {
  ElectronPublicUpdateService,
  StaticStorage,
}

export interface IElectronUpdateServiceSource {
  type: UpdateSourceType.ElectronPublicUpdateService;
  /**
   * @param {String} repo A GitHub repository in the format `owner/repo`.
   *                      Defaults to your `package.json`'s `"repository"` field
   */
  repo?: string;
  /**
   * @param {String} host Defaults to `https://update.electronjs.org`
   */
  host?: string;
}

export interface IStaticUpdateSource {
  type: UpdateSourceType.StaticStorage;
  /**
   * @param {String} baseUrl Base URL for your static storage provider where your
   *                         updates are stored
   */
  baseUrl: string;
}

export type IUpdateSource = IElectronUpdateServiceSource | IStaticUpdateSource;

export interface IUpdateElectronAppOptions<L = ILogger> {
  /**
   * @param {String} repo A GitHub repository in the format `owner/repo`.
   *                      Defaults to your `package.json`'s `"repository"` field
   * @deprecated Use the new `updateSource` option
   */
  readonly repo?: string;
  /**
   * @param {String} host Defaults to `https://update.electronjs.org`
   * @deprecated Use the new `updateSource` option
   */
  readonly host?: string;
  readonly updateSource?: IUpdateSource;
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

const pkg = require('../package.json');
const userAgent = format('%s/%s (%s: %s)', pkg.name, pkg.version, os.platform(), os.arch());
const supportedPlatforms = ['darwin', 'win32'];

class updateElectronClass {
  isActive: boolean = false;
  isChecking: boolean = false;
  isError: boolean = false;
  isDownloading: boolean = false;
  isDownloaded: boolean = false;
  updateTimer?: NodeJS.Timer;

  dialogTitle: string = 'Application Update';
  dialogDetail: string =
    'A new version has been downloaded. Restart the application to apply the updates.';
  dialogButtonRestart: string = 'Restart';
  dialogButtonLater: string = 'Later';

  setup(opts: IUpdateElectronAppOptions = {}) {
    // check for bad input early, so it will be logged during development
    const safeOpts = this.validateInput(opts);

    // don't attempt to update during development
    if (!app.isPackaged) {
      const message =
        'update-electron-app config looks good; aborting updates since app is in development mode';
      opts.logger ? opts.logger.log(message) : console.log(message);
      return;
    }

    if (safeOpts.electron.app.isReady()) this.initUpdater(safeOpts);
    else app.on('ready', () => this.initUpdater(safeOpts));
  }

  initUpdater(opts: ReturnType<typeof this.validateInput>) {
    const { updateSource, updateInterval, logger, electron } = opts;

    // exit early on unsupported platforms, e.g. `linux`
    if (!supportedPlatforms.includes(process?.platform)) {
      log(
        `Electron's autoUpdater does not support the '${process.platform}' platform. Ref: https://www.electronjs.org/docs/latest/api/auto-updater#platform-notices`,
      );
      return;
    }

    const { app, autoUpdater, dialog } = electron;
    let feedURL: string;
    let serverType: 'default' | 'json' = 'default';
    switch (updateSource.type) {
      case UpdateSourceType.ElectronPublicUpdateService: {
        feedURL = `${updateSource.host}/${updateSource.repo}/${process.platform}-${
          process.arch
        }/${app.getVersion()}`;
        break;
      }
      case UpdateSourceType.StaticStorage: {
        feedURL = updateSource.baseUrl;
        if (process.platform === 'darwin') {
          feedURL += '/RELEASES.json';
          serverType = 'json';
        }
        break;
      }
    }

    const requestHeaders = { 'User-Agent': userAgent };

    function log(...args: any[]) {
      logger.log(...args);
    }

    log('feedURL', feedURL);
    log('requestHeaders', requestHeaders);
    autoUpdater.setFeedURL({
      url: feedURL,
      headers: requestHeaders,
      serverType,
    });

    autoUpdater.on('error', (err) => {
      log('updater error');
      log(err);
      this.isChecking = false;
      this.isError = true;
    });

    autoUpdater.on('checking-for-update', () => {
      log('checking-for-update');
      this.isChecking = true;
      this.isError = false;
    });

    autoUpdater.on('update-available', () => {
      log('update-available; downloading...');
      this.isChecking = false;
      this.isDownloading = true;
    });

    autoUpdater.on('update-not-available', () => {
      log('update-not-available');
      this.isChecking = false;
    });

    if (opts.notifyUser) {
      autoUpdater.on(
        'update-downloaded',
        (event, releaseNotes, releaseName, releaseDate, updateURL) => {
          log('update-downloaded', [event, releaseNotes, releaseName, releaseDate, updateURL]);
          this.isDownloading = false;
          this.isDownloaded = true;

          const dialogOpts = {
            type: 'info',
            buttons: [this.dialogButtonRestart, this.dialogButtonLater],
            title: this.dialogTitle,
            message: process.platform === 'win32' ? releaseNotes : releaseName,
            detail: this.dialogDetail,
          };

          dialog.showMessageBox(dialogOpts).then(({ response }) => {
            if (response === 0) autoUpdater.quitAndInstall();
          });
        },
      );
    }

    this.isActive = true;
    // Clear up any previous timer we have initiated in case of a reconfiguration
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    // check for updates right away and keep checking later
    autoUpdater.checkForUpdates();
    this.updateTimer = setInterval(() => {
      autoUpdater.checkForUpdates();
    }, ms(updateInterval));
  }

  cancelUpdateTimer() {
    clearInterval(this.updateTimer);
    this.isActive = false;
  }

  guessRepo(electron: typeof Electron.Main) {
    const pkgBuf = fs.readFileSync(path.join(electron.app.getAppPath(), 'package.json'));
    const pkg = JSON.parse(pkgBuf.toString());
    const repoString = pkg.repository?.url || pkg.repository;
    const repoObject = gh(repoString);
    assert(repoObject, "repo not found. Add repository string to your app's package.json file");
    return `${repoObject.user}/${repoObject.repo}`;
  }

  validateInput(opts: IUpdateElectronAppOptions) {
    const defaults = {
      host: 'https://update.electronjs.org',
      updateInterval: '10 minutes',
      logger: console,
      notifyUser: true,
    };
    const { host, updateInterval, logger, notifyUser } = Object.assign({}, defaults, opts);

    // allows electron to be mocked in tests
    const electron: typeof Electron.Main = (opts as any).electron || require('electron');

    let updateSource = opts.updateSource;
    // Handle migration from old properties + default to update service
    if (!updateSource) {
      updateSource = {
        type: UpdateSourceType.ElectronPublicUpdateService,
        repo: opts.repo || this.guessRepo(electron),
        host,
      };
    }

    switch (updateSource.type) {
      case UpdateSourceType.ElectronPublicUpdateService: {
        assert(
          updateSource.repo?.includes('/'),
          'repo is required and should be in the format `owner/repo`',
        );

        assert(
          updateSource.host && isURL(updateSource.host) && updateSource.host.startsWith('https:'),
          'host must be a valid HTTPS URL',
        );
        break;
      }
      case UpdateSourceType.StaticStorage: {
        assert(
          updateSource.baseUrl &&
            isURL(updateSource.baseUrl) &&
            updateSource.baseUrl.startsWith('https:'),
          'baseUrl must be a valid HTTPS URL',
        );
        break;
      }
    }

    assert(
      typeof updateInterval === 'string' && updateInterval.match(/^\d+/),
      'updateInterval must be a human-friendly string interval like `20 minutes`',
    );

    assert(ms(updateInterval) >= 5 * 60 * 1000, 'updateInterval must be `5 minutes` or more');

    assert(logger && typeof logger.log, 'function');

    return { updateSource, updateInterval, logger, electron, notifyUser };
  }
}

const updateElectron = new updateElectronClass();
const updateElectronApp = updateElectron.setup;

export { updateElectron, updateElectronApp };
