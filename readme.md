# update-electron-app 

> A drop-in module that adds autoUpdating capabilities to Electron apps

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

The module will automatically wait for your app's `ready` event to fire.

## API

### `update(options)`

Options:

- `repo` String (optional) - A GitHub repository in the format `owner/repo`. Defaults to your `package.json`'s `"repository"` field
- `host` String (optional) - Defaults to `https://update.electronjs.org`
- `updateInterval` String (optional) - How frequently to check for updates. Defaults to `1 minute`
- `logger` Object (optional) - A custom logger object that defines a `log` function. Defaults to `console`. See [electron-log](https://github.com/megahertz/electron-log), a module that aggregates logs from main and renderer processes into a single file.

## License

MIT
