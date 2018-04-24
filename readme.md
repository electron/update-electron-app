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
- `debug` Boolean (optional) - Display debug output. Defaults to `true`

## Tests

```sh
npm install
npm test
```

## License

MIT
