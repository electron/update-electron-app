const updater = require('.')
const repo = 'some-owner/some-repo'
const electron = {
  app: {
    getVersion: () => { return '1.2.3' },
    isReady: () => { return true },
    on: (eventName) => { /* no-op */ }
  },
  autoUpdater: {
    checkForUpdates: () =>  { /* no-op */ },
    on: (eventName) => { /* no-op */ },
    setFeedURL: () =>  { /* no-op */ }
  },
  dialog: {
    showMessageBox: () =>  { /* no-op */ }
  }
}

test('exports a function', () => {
  expect(typeof updater).toBe('function')
})

describe('repository', () => {
  test('is required', () => {
    expect(() => {
      updater({electron})
    }).toThrowError('repo is required and should be in the format `owner/repo`')
  })
})

describe('host', () => {
  test('must a valid HTTPS URL', () => {
    expect(() => {
      updater({repo, electron, host: 'http://example.com'})
    }).toThrowError('host must be a valid HTTPS URL')
  })
})

describe('debug', () => {
  test('must be a boolean', () => {
    expect(() => {
      updater({repo, electron, debug: 'yep'})
    }).toThrowError('debug must be a boolean')
  })
})

describe('updateInterval', () => {
  test('must be 30 seconds or more', () => {
    expect(() => {
      updater({repo, electron, updateInterval: '20 seconds'})
    }).toThrowError('updateInterval must be `30 seconds` or more')
  })
  
  test('must be a string', () => {
    expect(() => {
      updater({repo, electron, updateInterval: 3000})
    }).toThrowError('updateInterval must be a human-friendly string interval like `90 seconds`')
  })
})


