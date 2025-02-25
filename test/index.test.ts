import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { autoUpdater, dialog } from 'electron';

import {
  updateElectronApp,
  makeUserNotifier,
  IUpdateInfo,
  IUpdateDialogStrings,
  UpdateSourceType,
} from '../src';
const repo = 'some-owner/some-repo';

beforeEach(() => {
  jest.useFakeTimers();
});

describe('updateElectronApp', () => {
  it('is a function', () => {
    expect(typeof updateElectronApp).toBe('function');
  });

  describe('repository', () => {
    const tmpdir = os.tmpdir();
    const packageJson = path.join(tmpdir, 'package.json');
    beforeAll(() => {
      fs.writeFileSync(packageJson, JSON.stringify({}));
    });

    it('is required', () => {
      expect(() => {
        updateElectronApp();
      }).toThrow("repo not found. Add repository string to your app's package.json file");
    });

    it('from opts', () => {
      updateElectronApp({ repo: 'foo/bar' });
    });

    it('from package.json', () => {
      fs.writeFileSync(packageJson, JSON.stringify({ repository: 'foo/bar' }));
      updateElectronApp();
    });

    afterAll(() => {
      fs.rmSync(packageJson);
    });
  });

  describe('host', () => {
    it('must a valid HTTPS URL', () => {
      expect(() => {
        updateElectronApp({ repo, host: 'http://example.com' });
      }).toThrow('host must be a valid HTTPS URL');
    });

    it('from default', () => {
      updateElectronApp({
        updateSource: {
          type: UpdateSourceType.ElectronPublicUpdateService,
          repo,
        },
      });
    });
  });

  describe('updateInterval', () => {
    it('must be 5 minutes or more', () => {
      expect(() => {
        updateElectronApp({ repo, updateInterval: '20 seconds' });
      }).toThrow('updateInterval must be `5 minutes` or more');
    });
  });
});

describe('makeUserNotifier', () => {
  const fakeUpdateInfo: IUpdateInfo = {
    event: {} as Electron.Event,
    releaseNotes: 'new release',
    releaseName: 'v13.3.7',
    releaseDate: new Date(),
    updateURL: 'https://fake-update.url',
  };

  beforeEach(() => {
    jest.mocked(dialog.showMessageBox).mockReset();
  });

  it('is a function that returns a callback function', () => {
    expect(typeof makeUserNotifier).toBe('function');
    expect(typeof makeUserNotifier()).toBe('function');
  });

  describe('callback', () => {
    it.each([
      ['does', 0, 1],
      ['does not', 1, 0],
    ])('%s call autoUpdater.quitAndInstall if the user responds with %i', (_, response, called) => {
      jest
        .mocked(dialog.showMessageBox)
        .mockResolvedValueOnce({ response, checkboxChecked: false });
      const notifier = makeUserNotifier();
      notifier(fakeUpdateInfo);

      expect(dialog.showMessageBox).toHaveBeenCalled();
      // quitAndInstall is only called after the showMessageBox promise resolves
      process.nextTick(() => {
        expect(autoUpdater.quitAndInstall).toHaveBeenCalledTimes(called);
      });
    });
  });

  it('can customize dialog properties', () => {
    const strings: IUpdateDialogStrings = {
      title: 'Custom Update Title',
      detail: 'Custom update details',
      restartButtonText: 'Custom restart string',
      laterButtonText: 'Maybe not',
    };

    jest.mocked(dialog.showMessageBox).mockResolvedValue({ response: 0, checkboxChecked: false });
    const notifier = makeUserNotifier(strings);
    notifier(fakeUpdateInfo);
    expect(dialog.showMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({
        buttons: [strings.restartButtonText, strings.laterButtonText],
        title: strings.title,
        detail: strings.detail,
      }),
    );
  });
});

describe('autoCheck', () => {
  it('make sure checkForUpdates is called', () => {
    const checkForUpdatesSpy = jest
      .spyOn(autoUpdater, 'checkForUpdates')
      .mockImplementation(() => Promise.resolve());

    updateElectronApp({ repo: 'foo/bar' });

    expect(checkForUpdatesSpy).toHaveBeenCalled();

    checkForUpdatesSpy.mockRestore();
  });

  it('make sure checkForUpdates is not called', () => {
    const checkForUpdatesSpy = jest
      .spyOn(autoUpdater, 'checkForUpdates')
      .mockImplementation(() => Promise.resolve());

    updateElectronApp({ repo: 'foo/bar', autoCheck: false });

    expect(checkForUpdatesSpy).not.toHaveBeenCalled();

    checkForUpdatesSpy.mockRestore();
  });
});
