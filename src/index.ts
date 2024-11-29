import ms from 'ms';
import gh from 'github-url-to-object';

import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { format } from 'node:util';

import { app, autoUpdater, dialog } from 'electron';

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
   * @param {String} host Base HTTPS URL of the update server.
   *                      Defaults to `https://update.electronjs.org`
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
const isHttpsUrl = (maybeURL: string) => {
  try {
    const { protocol } = new URL(maybeURL);
    return protocol === 'https:';
  } catch (e) {
    return false;
  }
};

export function updateElectronApp(opts: IUpdateElectronAppOptions = {}) {
  // check for bad input early, so it will be logged during development
  const safeOpts = validateInput(opts);

  // don't attempt to update during development
  if (!app.isPackaged) {
    const message =
      'update-electron-app config looks good; aborting updates since app is in development mode';
    opts.logger ? opts.logger.log(message) : console.log(message);
    return;
  }

  if (app.isReady()) {
    initUpdater(safeOpts);
  } else {
    app.on('ready', () => initUpdater(safeOpts));
  }
}

function initUpdater(opts: ReturnType<typeof validateInput>) {
  const { updateSource, updateInterval, logger } = opts;

  // exit early on unsupported platforms, e.g. `linux`
  if (!supportedPlatforms.includes(process?.platform)) {
    log(
      `Electron's autoUpdater does not support the '${process.platform}' platform. Ref: https://www.electronjs.org/docs/latest/api/auto-updater#platform-notices`,
    );
    return;
  }

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
  });

  autoUpdater.on('checking-for-update', () => {
    log('checking-for-update');
  });

  autoUpdater.on('update-available', () => {
    log('update-available; downloading...');
  });

  autoUpdater.on('update-not-available', () => {
    log('update-not-available');
  });

  if (opts.notifyUser) {
    autoUpdater.on(
      'update-downloaded',
      (event, releaseNotes, releaseName, releaseDate, updateURL) => {
        log('update-downloaded', [event, releaseNotes, releaseName, releaseDate, updateURL]);

        const dialogOpts = {
          type: 'info',
          buttons: ['Restart', 'Later'],
          title: 'Application Update',
          message: process.platform === 'win32' ? releaseNotes : releaseName,
          detail:
            'A new version has been downloaded. Restart the application to apply the updates.',
        };

        dialog.showMessageBox(dialogOpts).then(({ response }) => {
          if (response === 0) autoUpdater.quitAndInstall();
        });
      },
    );
  }

  // check for updates right away and keep checking later
  autoUpdater.checkForUpdates();
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, ms(updateInterval));
}

function guessRepo() {
  const pkgBuf = fs.readFileSync(path.join(app.getAppPath(), 'package.json'));
  const pkg = JSON.parse(pkgBuf.toString());
  const repoString = pkg.repository?.url || pkg.repository;
  const repoObject = gh(repoString);
  assert(repoObject, "repo not found. Add repository string to your app's package.json file");
  return `${repoObject.user}/${repoObject.repo}`;
}

function validateInput(opts: IUpdateElectronAppOptions) {
  const defaults = {
    host: 'https://update.electronjs.org',
    updateInterval: '10 minutes',
    logger: console,
    notifyUser: true,
  };
  const { host, updateInterval, logger, notifyUser } = Object.assign({}, defaults, opts);

  let updateSource = opts.updateSource;
  // Handle migration from old properties + default to update service
  if (!updateSource) {
    updateSource = {
      type: UpdateSourceType.ElectronPublicUpdateService,
      repo: opts.repo || guessRepo(),
      host,
    };
  }

  switch (updateSource.type) {
    case UpdateSourceType.ElectronPublicUpdateService: {
      assert(
        updateSource.repo?.includes('/'),
        'repo is required and should be in the format `owner/repo`',
      );

      assert(updateSource.host && isHttpsUrl(updateSource.host), 'host must be a valid HTTPS URL');
      break;
    }
    case UpdateSourceType.StaticStorage: {
      assert(
        updateSource.baseUrl && isHttpsUrl(updateSource.baseUrl),
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

  return { updateSource, updateInterval, logger, notifyUser };
}
