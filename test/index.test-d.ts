import { expectType } from 'tsd'
import { updateElectronApp, UpdateSourceType } from '../'

expectType<void>(updateElectronApp())

const customLogger = {
  log: (): void => {
    return
  },
  info: (): void => {
    return
  },
  error: (): void => {
    return
  },
  warn: (): void => {
    return
  }
}

updateElectronApp({
  logger: customLogger,
  host: "https://github.com",
  notifyUser: true,
  repo: "HashimotoYT/hab",
  updateInterval: "10 minutes",
});

updateElectronApp()

updateElectronApp({
  logger: console,
})

updateElectronApp({
  updateSource: {
    type: UpdateSourceType.ElectronPublicUpdateService,
  }
})

updateElectronApp({
  updateSource: {
    type: UpdateSourceType.ElectronPublicUpdateService,
    repo: 'a/b',
    host: 'https://bar'
  }
})

updateElectronApp({
  updateSource: {
    type: UpdateSourceType.StaticStorage,
    baseUrl: 'https://foo',
  }
})
