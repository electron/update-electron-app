# :construction: WIP NOTHING TO SEE HERE YET :construction:

# update-electron-app 

> A drop-in module that adds autoUpdating capabilities to Electron apps

## Installation

```sh
npm i update-electron-app
```

## Usage

Drop this anywhere in your main process:

```js
require('update-electron-app')({
  repo: 'ummoji/ummoji-desktop'
})
```

The module will automatically wait for your app's `ready` event to fire.

## API

### `update(options)`

Options:

- `repo` String (required) - A GitHub repository in the format `owner/repo`
- `host` String (optional) - Defaults to `https://electron-update-server.herokuapp.com`
- `updateInterval` String (optional) - How frequently to check for updates. Defaults to `1 minute`
- `debug` Boolean (optional) - Display debug output. Defaults to `true`

## Tests

```sh
npm install
npm test
```

## License

MIT
