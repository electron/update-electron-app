const assert = require('assert')
const isURL = require('is-url')
const isDev = require('electron-is-dev')
const ms = require('ms')
const gh = require('github-url-to-object')
const path = require('path')
const fs = require('fs')
const os = require('os')
const {format} = require('util')
const pkg = require('./package.json')
const userAgent = format(
  '%s/%s (%s: %s)',
  pkg.name,
  pkg.version,
  os.platform(),
  os.arch()
)
const supportedPlatforms = ['darwin', 'win32']

module.exports = function updater (opts = {}) {
  // check for bad input early, so it will be logged during development
  opts = validateInput(opts)

  // don't attempt to update during development
  if (isDev) {
    const message = 'update-electron-app config looks good; aborting updates since app is in development mode'
    opts.logger ? opts.logger.log(message) : console.log(message)
    return
  }

  opts.electron.app.isReady()
    ? initUpdater(opts)
    : opts.electron.app.on('ready', () => initUpdater(opts))
}

function initUpdater (opts) {
  const {host, repo, updateInterval, logger, electron} = opts
  const {app, autoUpdater, dialog} = electron
  const feedURL = `${host}/${repo}/${process.platform}/${app.getVersion()}`
  const requestHeaders = {'User-Agent': userAgent}

  function log (...args) {
    logger.log(...args)
  }

  // exit early on unsupported platforms, e.g. `linux`
  if (typeof process !== 'undefined' && process.platform && !supportedPlatforms.includes(process.platform)) {
    log(`Electron's autoUpdater does not support the '${process.platform}' platform`)
    return
  }

  log('feedURL', feedURL)
  log('requestHeaders', requestHeaders)
  autoUpdater.setFeedURL(feedURL, requestHeaders)

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

  // check for updates right away and keep checking later
  autoUpdater.checkForUpdates()
  setInterval(() => { autoUpdater.checkForUpdates() }, ms(updateInterval))
}

function validateInput (opts) {
  const defaults = {
    host: 'https://update.electronjs.org',
    updateInterval: '10 minutes',
    logger: console
  }
  const {host, updateInterval, logger} = Object.assign({}, defaults, opts)

  // allows electron to be mocked in tests
  const electron = opts.electron || require('electron')

  let repo = opts.repo
  if (!repo) {
    const pkgBuf = fs.readFileSync(path.join(electron.app.getAppPath(), 'package.json'))
    const pkg = JSON.parse(pkgBuf.toString())
    const repoString = (pkg.repository && pkg.repository.url) || pkg.repository
    const repoObject = gh(repoString)
    assert(
      repoObject,
      'repo not found. Add repository string to your app\'s package.json file'
    )
    repo = `${repoObject.user}/${repoObject.repo}`
  }

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
    'updateInterval must be a human-friendly string interval like `20 minutes`'
  )

  assert(
    ms(updateInterval) >= 5 * 60 * 1000,
    'updateInterval must be `5 minutes` or more'
  )

  assert(
    logger && typeof logger.log,
    'function'
  )

  return {host, repo, updateInterval, logger, electron}
}
