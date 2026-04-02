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

    it.each([
      ['owner/repo', 'owner/repo'],
      ['https://github.com/owner/repo', 'owner/repo'],
      ['https://github.com/owner/repo.git', 'owner/repo'],
      ['git+https://github.com/owner/repo.git', 'owner/repo'],
      ['git@github.com:owner/repo.git', 'owner/repo'],
      ['github:owner/repo', 'owner/repo'],
      ['https://github.com/owner/my-repo.js', 'owner/my-repo.js'],
      ['https://github.com/owner/my_repo', 'owner/my_repo'],
    ])('parses repo from %s', (repository, expected) => {
      fs.writeFileSync(packageJson, JSON.stringify({ repository }));
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      updateElectronApp();
      expect(logSpy).toHaveBeenCalledWith('feedURL', expect.stringContaining(`/${expected}/`));
      logSpy.mockRestore();
    });

    it.each([['https://github.com/owner/repo'], ['https://github.com/owner/repo.git']])(
      'parses repo from repository.url: %s',
      (url) => {
        fs.writeFileSync(packageJson, JSON.stringify({ repository: { url } }));
        const logSpy = jest.spyOn(console, 'log').mockImplementation();
        updateElectronApp();
        expect(logSpy).toHaveBeenCalledWith('feedURL', expect.stringContaining('/owner/repo/'));
        logSpy.mockRestore();
      },
    );

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
        updateElectronApp({ repo, updateInterval: 20_000 });
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
