# update-electron-app

> A drop-in module that adds autoUpdating capabilities to Electron apps

[![Test](https://github.com/electron/update-electron-app/actions/workflows/test.yml/badge.svg)](https://github.com/electron/update-electron-app/actions/workflows/test.yml)
[![npm version](http://img.shields.io/npm/v/update-electron-app.svg)](https://npmjs.org/package/update-electron-app)

Supports multiple update sources:
* The free and open-source [update.electronjs.org](https://update.electronjs.org) service.
* Static file storage E.g. S3, Google Cloud Storage, etc.

![screenshot](screenshot.png)

## Requirements

Before using this module, make sure your Electron app meets these criteria:

- Your app runs on macOS or Windows
- Your builds are [code signed] **(macOS only)**
- **If** using `update.electronjs.org`
  - Your app has a public GitHub repository
  - Your builds are published to GitHub Releases
- **If** using static file storage
  - Your builds are published to S3 or other similar static file host using a tool like `@electron-forge/publisher-s3`

## Installation

```sh
npm i update-electron-app
```

## Usage

### With `update.electronjs.org`

Drop this anywhere in your main process:

```js
const { updateElectronApp } = require('update-electron-app')
updateElectronApp()
```

By default your repository URL is found in [your app's `package.json` file](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#repository).

You can also specify custom options:

```js
const { updateElectronApp, UpdateSourceType } = require('update-electron-app')
updateElectronApp({
  updateSource: {
    type: UpdateSourceType.ElectronPublicUpdateService,
    repo: 'github-user/repo'
  },
  updateInterval: '1 hour',
  logger: require('electron-log')
})
```

### With static file storage

```js
const { updateElectronApp, UpdateSourceType } = require('update-electron-app')
updateElectronApp({
  updateSource: {
    type: UpdateSourceType.StaticStorage,
    baseUrl: `https://my-bucket.s3.amazonaws.com/my-app-updates/${process.platform}/${process.arch}`
  }
})
```

## What happens?

Once you've called `updateElectronApp` as documented above, that's it! Here's what happens by default:

- Your app will check for updates at startup, then every ten minutes. This interval is [configurable](#API).
- No need to wait for your app's `ready` event; the module figures that out.
- If an update is found, it will automatically be downloaded in the background.
- When an update is finished downloading, a dialog is displayed allowing the user to restart the app now or later.

## API

### `update(options)`

Additional Options:

- `updateInterval` String (optional) - How frequently to check for updates. Defaults to `10 minutes`. Minimum allowed interval is `5 minutes`. This is a human readable interval supported by the [`ms`](https://github.com/vercel/ms#readme) module
- `logger` Object (optional) - A custom logger object that defines a `log` function. Defaults to `console`. See [electron-log](https://github.com/megahertz/electron-log), a module that aggregates logs from main and renderer processes into a single file.
- `notifyUser` Boolean (optional) - Defaults to `true`.  When enabled the user will be
  prompted to apply the update immediately after download.

## FAQ

### What kinds of assets do I need to build?

For macOS, you'll need to build a `.zip` file.
Use [electron-forge] or [electron-installer-zip] to package your app as a zip.

For Windows, you'll need to build a `.exe` and `.nupkg` files with [electron-forge] or [electron-winstaller].

### Why is my app launching multiple times?

Windows apps have an update process that requires multiple application restarts.
You can use the [electron-squirrel-startup](https://github.com/mongodb-js/electron-squirrel-startup) module to improve this
behavior.

### Can I use this module by uploading my private app's builds to a public GitHub repository?

Yes :)

### I want to manually upload my builds to a static storage solution, where do I put them?

If you publish your builds manually ensure the file structure is:
* `**/{platform}/{arch}/{artifact}`

For example that means that these files should exist:
* `**/win32/x64/RELEASES`
* `**/darwin/arm64/RELEASES.json`
* `**/darwin/arm64/My App v1.0.0.zip` (or something similar)
* ...

#### How does this module handle GitHub release states?

If using the public update service, the https://update.electronjs.org server handles release fetching logic.
Only releases that have valid SemVer tags and are _not_ marked as draft or pre-release will be collected by
the update service.

The latest release returned by the [`repos/{owner}/{repo}/releases`](https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#list-releases)
GitHub API containing all requisite binaries will be the update target.

## License

MIT

[electron-forge]: https://github.com/electron/forge
[electron-installer-zip]: https://github.com/electron-userland/electron-installer-zip
[electron-winstaller]: https://github.com/electron/windows-installer
[code signed]: https://www.electronjs.org/docs/latest/tutorial/code-signing
