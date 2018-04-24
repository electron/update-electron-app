# update-electron-app 

> A drop-in module that adds autoUpdating capabilities to Electron apps

Powered by the free and open-source [update.electronjs.org](https://update.electronjs.org) service.

![screenshot](screenshot.png)

## Installation

```sh
npm i update-electron-app
```

## Usage

Drop this anywhere in your main process:

```js
require('update-electron-app')()
```

That's it! Here's what happens by default:

- Repository URL is found in your app's `package.json` file.
- Your app will check for updates at startup, then every ten minutes. This interval is [configurable](#API).
- No need to wait for your app's `ready` event; the module figures that out.
- If an update is found, it will automatically be downloaded in the background.
- When an update is finished downloading, a dialog is displayed allowing the user to restart the app now or later.

## API

### `update(options)`

Options:

- `repo` String (optional) - A GitHub repository in the format `owner/repo`. Defaults to your `package.json`'s `"repository"` field
- `host` String (optional) - Defaults to `https://update.electronjs.org`
- `updateInterval` String (optional) - How frequently to check for updates. Defaults to `10 minutes`. Minimum allowed interval is `5 minutes`.
- `debug` Boolean (optional) - Display debug output. Defaults to `true`

## License

MIT

## See Also

If your app is packaged with `electron-builder`, you may not need this module. 
Builder has its own built-in mechanism for updating apps. Find out more at 
[electron.build/auto-update](https://www.electron.build/auto-update.).