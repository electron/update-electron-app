const updater = require('.')
const repo = 'some-owner/some-repo'
const os = require('os')
const tmpdir = os.tmpdir()
const fs = require('fs')
const path = require('path')
const electron = {
  app: {
    getVersion: () => { return '1.2.3' },
    isReady: () => { return true },
    on: (eventName) => { /* no-op */ },
    getAppPath: () => { return tmpdir }
  },
  autoUpdater: {
    checkForUpdates: () => { /* no-op */ },
    on: (eventName) => { /* no-op */ },
    setFeedURL: () => { /* no-op */ }
  },
  dialog: {
    showMessageBox: () => { /* no-op */ }
  }
}

test('exports a function', () => {
  expect(typeof updater).toBe('function')
})

describe('repository', () => {
  fs.writeFileSync(
    path.join(tmpdir, 'package.json'),
    JSON.stringify({})
  )

  test('is required', () => {
    expect(() => {
      updater({electron})
    }).toThrowError('repo not found. Add repository string to your app\'s package.json file')
  })

  test('from opts', () => {
    updater({electron, repo: 'foo/bar'})
  })

  test('from package.json', () => {
    fs.writeFileSync(
      path.join(tmpdir, 'package.json'),
      JSON.stringify({repository: 'foo/bar'})
    )
    updater({electron})
  })
})

describe('host', () => {
  test('must a valid HTTPS URL', () => {
    expect(() => {
      updater({repo, electron, host: 'http://example.com'})
    }).toThrowError('host must be a valid HTTPS URL')
  })
})

describe('logger', () => {
  test('must be an object defining a `log` function', () => {
    expect(() => {
      updater({repo, electron, logger: 'yep'})
    }).toThrowError('logger.log is not a function')
  })
})

describe('updateInterval', () => {
  test('must be 5 minutes or more', () => {
    expect(() => {
      updater({repo, electron, updateInterval: '20 seconds'})
    }).toThrowError('updateInterval must be `5 minutes` or more')
  })

  test('must be a string', () => {
    expect(() => {
      updater({repo, electron, updateInterval: 3000})
    }).toThrowError('updateInterval must be a human-friendly string interval like `20 minutes`')
  })
})
