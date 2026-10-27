import os from 'node:os';

import { vi } from 'vitest';

export const app = {
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
};

export const autoUpdater = {
  checkForUpdates: () => {
    /* no-op */
  },
  on: () => {
    /* no-op */
  },
  setFeedURL: () => {
    /* no-op */
  },
  quitAndInstall: vi.fn(),
};

export const dialog = {
  showMessageBox: vi.fn(),
};
