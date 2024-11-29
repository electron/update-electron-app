import os from 'node:os';

module.exports = {
  app: {
    getVersion: () => {
      return '1.2.3';
    },
    isReady: () => true,
    on: () => {
      /* no-op */
    },
    getAppPath: () => {
      return os.tmpdir();
    },
    isPackaged: true,
  },
  autoUpdater: {
    checkForUpdates: () => {
      /* no-op */
    },
    on: () => {
      /* no-op */
    },
    setFeedURL: () => {
      /* no-op */
    },
  },
  dialog: {
    showMessageBox: () => {
      /* no-op */
    },
  },
};
