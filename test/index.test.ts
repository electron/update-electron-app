import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { updateElectronApp } from '..';
const repo = 'some-owner/some-repo';

jest.mock('electron');

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
  });

  describe('updateInterval', () => {
    it('must be 5 minutes or more', () => {
      expect(() => {
        updateElectronApp({ repo, updateInterval: '20 seconds' });
      }).toThrow('updateInterval must be `5 minutes` or more');
    });
  });
});
