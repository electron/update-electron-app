import ms from 'ms';
import gh from 'github-url-to-object';

import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { format } from 'node:util';

import { app, autoUpdater, dialog, Event } from 'electron';

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

export interface IUpdateInfo {
  event: Event;
  releaseNotes: string;
  releaseName: string;
  releaseDate: Date;
  updateURL: string;
}

export interface IUpdateDialogStrings {
  /**
   * @param {String} title The title of the dialog box.
   *                       Defaults to `Application Update`
   */
  title?: string;
  /**
   * @param {String} detail The text of the dialog box.
   *                        Defaults to `A new version has been downloaded. Restart the application to apply the updates.`
   */
  detail?: string;
  /**
   * @param {String} restartButtonText The text of the restart button.
   *                                   Defaults to `Restart`
   */
  restartButtonText?: string;
  /**
   * @param {String} laterButtonText The text of the later button.
   *                                 Defaults to `Later`
   */
  laterButtonText?: string;
}

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
   * @param {Boolean} autoCheck Decides whether to automatically check for updates
   *                            Defaults to `true`.
   */
  readonly autoCheck?: boolean;
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
  /**
   * Optional callback that replaces the default user prompt dialog whenever the 'update-downloaded' event
   * is fired. Only runs if {@link notifyUser} is `true`.
   *
   * @param info - Information pertaining to the available update.
   */
  readonly onNotifyUser?: (info: IUpdateInfo) => void;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require('../package.json');
const userAgent = format('%s/%s (%s: %s)', pkg.name, pkg.version, os.platform(), os.arch());
const supportedPlatforms = ['darwin', 'win32'];
const isHttpsUrl = (maybeURL: string) => {
  try {
    const { protocol } = new URL(maybeURL);
    return protocol === 'https:';
  } catch {
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
    if (opts.logger) {
      opts.logger.log(message);
    } else {
      console.log(message);
    }
    return;
  }

  if (app.isReady()) {
    initUpdater(safeOpts);
  } else {
    app.on('ready', () => initUpdater(safeOpts));
  }
}

function initUpdater(opts: ReturnType<typeof validateInput>) {
  const { updateSource, updateInterval, autoCheck, logger } = opts;

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        if (typeof opts.onNotifyUser !== 'function') {
          assert(
            opts.onNotifyUser === undefined,
            'onNotifyUser option must be a callback function or undefined',
          );
          log('update-downloaded: notifyUser is true, opening default dialog');
          opts.onNotifyUser = makeUserNotifier();
        } else {
          log('update-downloaded: notifyUser is true, running custom onNotifyUser callback');
        }

        opts.onNotifyUser({
          event,
          releaseNotes,
          releaseDate,
          releaseName,
          updateURL,
        });
      },
    );
  }

  if (autoCheck) {
    // check for updates right away and keep checking later
    autoUpdater.checkForUpdates();
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, ms(updateInterval));
  }
}

/**
 * Helper function that generates a callback for use with {@link IUpdateElectronAppOptions.onNotifyUser}.
 *
 * @param dialogProps - Text to display in the dialog.
 */
export function makeUserNotifier(dialogProps?: IUpdateDialogStrings): (info: IUpdateInfo) => void {
  const defaultDialogMessages = {
    title: 'Application Update',
    detail: 'A new version has been downloaded. Restart the application to apply the updates.',
    restartButtonText: 'Restart',
    laterButtonText: 'Later',
  };

  const assignedDialog = Object.assign({}, defaultDialogMessages, dialogProps);

  return (info: IUpdateInfo) => {
    const { releaseNotes, releaseName } = info;
    const { title, restartButtonText, laterButtonText, detail } = assignedDialog;

    const dialogOpts: Electron.MessageBoxOptions = {
      type: 'info',
      buttons: [restartButtonText, laterButtonText],
      title,
      message: process.platform === 'win32' ? releaseNotes : releaseName,
      detail,
    };

    dialog.showMessageBox(dialogOpts).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  };
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
    autoCheck: true,
    logger: console,
    notifyUser: true,
  };

  const { host, updateInterval, autoCheck, logger, notifyUser, onNotifyUser } = Object.assign(
    {},
    defaults,
    opts,
  );

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

      if (!updateSource.host) {
        updateSource.host = host;
      }

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
  assert(ms(updateInterval) < 2 ** 31, 'updateInterval must fit in a signed 32-bit integer');

  assert(logger && typeof logger.log, 'function');

  return { updateSource, updateInterval, autoCheck, logger, notifyUser, onNotifyUser };
}
