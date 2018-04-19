const assert = require('assert')
const isURL = require('is-url')
const isDev = require('electron-is-dev')
const ms = require('ms')

module.exports = function updater (opts = {}) {
  // check for bad input early, so it will be logged during development
  opts = validateInput(opts)

  // don't attempt to update during development
  if (isDev) {
    if (opts.debug) {
      console.log('update-electron-app config looks good; aborting updates since app is in development mode')
    }
    return
  }

  opts.electron.app.isReady()
    ? initUpdater(opts)
    : opts.electron.app.on('ready', () => initUpdater(opts))
}

function initUpdater (opts) {
  const {host, repo, updateInterval, debug, electron} = opts
  const {app, autoUpdater, dialog} = electron
  const feedURL = `${host}/${repo}/${process.platform}/${app.getVersion()}`

  function log () {
    if (debug) console.log.apply(console, arguments)
  }

  log('feedURL', feedURL)
  autoUpdater.setFeedURL(feedURL)

  setInterval(() => { autoUpdater.checkForUpdates() }, updateInterval)

  autoUpdater.on('error', err => {
    log('updater error')
    log(err)
  })

  autoUpdater.on('checking-for-update', () => {
    log('checking-for-update')
  })

  autoUpdater.on('update-available', () => {
    log('update-available; downloading...')
  })

  autoUpdater.on('update-not-available', () => {
    log('update-not-available')
  })

  autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName, releaseDate, updateURL) => {
    log('update-downloaded', arguments)

    const dialogOpts = {
      type: 'info',
      buttons: ['Restart', 'Later'],
      title: 'Application Update',
      message: process.platform === 'win32' ? releaseNotes : releaseName,
      detail: 'A new version has been downloaded. Restart the application to apply the updates.'
    }

    dialog.showMessageBox(dialogOpts, (response) => {
      if (response === 0) autoUpdater.quitAndInstall()
    })
  })
}

function validateInput (opts) {
  const defaults = {
    host: 'https://update.electronjs.org',
    updateInterval: '60 seconds',
    debug: true
  }
  const {host, repo, updateInterval, debug} = Object.assign({}, defaults, opts)

  // allows electron to be mocked in tests
  const electron = opts.electron || require('electron')

  assert(
    repo && repo.length && repo.includes('/'),
    'repo is required and should be in the format `owner/repo`'
  )

  assert(
    isURL(host) && host.startsWith('https'),
    'host must be a valid HTTPS URL'
  )

  assert(
    typeof updateInterval === 'string' && updateInterval.match(/^\d+/),
    'updateInterval must be a human-friendly string interval like `90 seconds`'
  )

  assert(
    ms(updateInterval) >= 30 * 1000,
    'updateInterval must be `30 seconds` or more'
  )

  assert(
    typeof debug === 'boolean',
    'debug must be a boolean'
  )

  return {host, repo, updateInterval, debug, electron}
}
