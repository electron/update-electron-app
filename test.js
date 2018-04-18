// const proxyquire = require('proxyquire')
// const mock = require('mock-require')

// const updater = mock('./index.js', {
//   'electron': {
//     app: {},
//     autoUpdater: {},
//     dialog: {}
//   }
// })

// TODO: Figure out how to mock require('electron')

xtest('exports a function', () => {
  expect(typeof updater).toBe('function')
})
